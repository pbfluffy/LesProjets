import { useRef, useState } from 'react'
import { auth } from '../firebase'
import { uploadDogPhoto, compareDogPhotos } from '../photoUpload'
import { findNearbyDogs, findCandidates, createDogWithSighting, addSightingToDog, friendlinessColor, cosineSimilarity } from '../hooks/useDogs'
import { readExifGps } from '../exifGps'
import { interp } from '../LangContext'
import styles from './ReportFlow.module.css'

const LOCATE_TIMEOUT_MS = 10000
const FRIENDLINESS_OPTIONS = ['friendly', 'neutral', 'cautious']
const FRIENDLINESS_BTN_CLASS = { green: 'friendlinessBtnGreen', amber: 'friendlinessBtnAmber', red: 'friendlinessBtnRed' }
// sameDog:true ranks above any non-match regardless of confidence (+10),
// then by confidence, then closest distance wins ties.
const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1 }

function rankByAiVerdict(nearby, resultsById) {
  return nearby
    .map((c) => ({ ...c, aiVerdict: resultsById.get(c.dog.id) || null }))
    .sort((a, b) => {
      const scoreOf = (c) => (c.aiVerdict?.sameDog ? 10 + (CONFIDENCE_RANK[c.aiVerdict.confidence] || 0) : 0)
      return (scoreOf(b) - scoreOf(a)) || (a.distance - b.distance)
    })
}

// Wraps navigator.geolocation.getCurrentPosition in a Promise with its OWN
// timeout guard — some browsers/embedded webviews never invoke either
// callback when location services are off at the OS level, ignoring the
// `timeout` option entirely, which otherwise leaves the UI stuck forever on
// "Getting your location…".
function getCurrentPositionSafe(timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      reject({ code: 3 }) // matches GeolocationPositionError.TIMEOUT
    }, timeoutMs + 2000)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(pos)
      },
      (err) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(err)
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    )
  })
}

// step: 'pick' | 'locating' | 'uploading' | 'comparing' | 'candidates' | 'confirm' | 'submitting' | 'success'
export default function ReportFlow({ user, dogs, t, lang, onSignIn, onDone, presetDog }) {
  const [step, setStep] = useState('pick')
  const [error, setError] = useState(null)
  const [coords, setCoords] = useState(null)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [tags, setTags] = useState(null)
  const [embedding, setEmbedding] = useState(null)
  const [candidates, setCandidates] = useState([])
  // The dog this sighting is confirmed to be — from a candidate pick or a
  // preset "report another sighting" shortcut. Null means "brand new dog".
  const [targetDog, setTargetDog] = useState(null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [friendliness, setFriendliness] = useState(null)
  const [anonymous, setAnonymous] = useState(false)
  const [successInfo, setSuccessInfo] = useState(null)
  // The file + coords behind the most recent upload attempt — kept around
  // (not just passed as local args) so a transient network failure mid-
  // upload can offer a one-tap retry instead of making the reporter re-pick
  // the photo and re-grant location all over again.
  const [pendingUpload, setPendingUpload] = useState(null)
  const fileRef = useRef(null)

  function reset() {
    setStep('pick')
    setError(null)
    setCoords(null)
    setPhotoUrl(null)
    setTags(null)
    setEmbedding(null)
    setCandidates([])
    setTargetDog(null)
    setName('')
    setNote('')
    setFriendliness(null)
    setAnonymous(false)
    setSuccessInfo(null)
    setPendingUpload(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    // Try the photo's own EXIF GPS first — more accurate when there's a gap
    // between taking the photo and reporting it, and skips the location
    // prompt entirely when it's present. Falls back to device geolocation
    // when absent (most photos shared via messaging apps have it stripped).
    const exifCoords = await readExifGps(file)
    if (exifCoords) {
      setCoords(exifCoords)
      await doUpload(file, exifCoords.lat, exifCoords.lng)
      return
    }

    if (!('geolocation' in navigator)) {
      setError(t.mapLocateUnsupported)
      return
    }

    setStep('locating')
    try {
      const pos = await getCurrentPositionSafe(LOCATE_TIMEOUT_MS)
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      setCoords({ lat, lng })
      await doUpload(file, lat, lng)
    } catch (err) {
      setError(err.code === 1 ? t.reportLocationDenied : t.reportLocationError)
      setStep('pick')
    }
  }

  function retryUpload() {
    if (!pendingUpload) return
    setError(null)
    doUpload(pendingUpload.file, pendingUpload.lat, pendingUpload.lng)
  }

  async function doUpload(file, lat, lng) {
    setStep('uploading')
    setPendingUpload({ file, lat, lng })
    try {
      const idToken = await auth.currentUser.getIdToken()
      const result = await uploadDogPhoto({ file, lat, lng, idToken })
      setPendingUpload(null)
      setPhotoUrl(result.photoUrl)
      setTags(result.tags || null)
      setEmbedding(result.embedding || null)

      if (presetDog) {
        setTargetDog(presetDog)
        setStep('confirm')
        return
      }

      // similarity is a display-only supplementary signal (see cosineSimilarity's
      // doc comment) — attached here so it survives into both the AI-verdict
      // path (rankByAiVerdict spreads ...c) and the tag-overlap fallback below.
      const nearby = findNearbyDogs(dogs, { lat, lng }, 500, 5).map((c) => ({
        ...c,
        similarity: cosineSimilarity(result.embedding, c.dog.latestEmbedding),
      }))
      if (nearby.length === 0) {
        setCandidates([])
        setStep('candidates')
        return
      }

      setStep('comparing')
      const withPhoto = nearby.filter(({ dog }) => dog.latestPhotoUrl)
      try {
        const { results } = await compareDogPhotos({
          newPhotoUrl: result.photoUrl,
          candidates: withPhoto.map(({ dog }) => ({ id: dog.id, photoUrl: dog.latestPhotoUrl })),
          idToken,
        })
        const byId = new Map((results || []).map((r) => [r.id, r]))
        setCandidates(rankByAiVerdict(nearby, byId))
      } catch {
        // AI compare failed entirely (network/server error) — fall back to
        // the old distance + text-tag-overlap ranking rather than blocking
        // the report.
        setCandidates(findCandidates(dogs, { lat, lng, tags: result.tags, embedding: result.embedding }, 500, 5))
      }
      setStep('candidates')
    } catch (err) {
      setError(err.message || t.reportUploadError)
      setStep('pick')
    }
  }

  function pickCandidate(dog) {
    setTargetDog(dog)
    setStep('confirm')
  }

  function pickNewDog() {
    setTargetDog(null)
    setStep('confirm')
  }

  async function submitReport() {
    setStep('submitting')
    try {
      if (targetDog) {
        await addSightingToDog({
          dogId: targetDog.id, user, photoUrl, tags, embedding, lat: coords.lat, lng: coords.lng, note, friendliness, anonymous,
        })
        setSuccessInfo({ matched: true, name: targetDog.name || t.dogUnnamed })
      } else {
        await createDogWithSighting({
          user, photoUrl, tags, embedding, lat: coords.lat, lng: coords.lng, name, note, friendliness, anonymous,
        })
        setSuccessInfo({ matched: false })
      }
      setStep('success')
    } catch (err) {
      setError(err.message || 'Something went wrong saving that.')
      setStep('confirm')
    }
  }

  if (!user) {
    return (
      <div className={styles.wrap}>
        <p className={styles.signInMsg}>{t.signInRequired}</p>
        <button type="button" className={styles.primaryBtn} onClick={onSignIn}>
          {t.signInWithGoogle}
        </button>
      </div>
    )
  }

  const showCollarWarning = tags?.hasCollar && (step === 'candidates' || step === 'confirm')

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>{t.reportTitle}</h2>

      {error && <p className={styles.error}>{error}</p>}
      {showCollarWarning && <p className={styles.collarWarning}>{t.reportPossibleOwnerWarning}</p>}

      {step === 'pick' && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            className={styles.hiddenFile}
            id="majon-file-input"
          />
          <label htmlFor="majon-file-input" className={styles.primaryBtn}>
            {t.reportTakePhoto}
          </label>
          {error && pendingUpload && (
            <button type="button" className={styles.secondaryBtn} onClick={retryUpload}>
              {t.reportRetryUpload}
            </button>
          )}
        </>
      )}

      {step === 'locating' && <p className={styles.status}>{t.reportGettingLocation}</p>}
      {step === 'uploading' && <p className={styles.status}>{t.reportUploading}</p>}
      {step === 'comparing' && <p className={styles.status}>{t.reportComparing}</p>}
      {step === 'submitting' && <p className={styles.status}>{t.reportSubmitting}</p>}

      {step === 'candidates' && (
        <div className={styles.candidatesBlock}>
          {photoUrl && <img src={photoUrl} alt="" className={styles.previewPhoto} />}
          <h3 className={styles.subTitle}>{t.reportCandidatesTitle}</h3>
          {candidates.length === 0 && <p className={styles.hint}>{t.reportNoCandidates}</p>}
          {candidates.length > 0 && (
            <p className={styles.hint}>{interp(t.reportCandidatesHint, { n: candidates.length })}</p>
          )}
          <ul className={styles.candidateList}>
            {candidates.map(({ dog, distance, aiVerdict, similarity }) => (
              <li key={dog.id} className={styles.candidateCard}>
                {dog.latestPhotoUrl && <img src={dog.latestPhotoUrl} alt="" className={styles.candidateThumb} />}
                <div className={styles.candidateInfo}>
                  <div className={styles.candidateName}>{dog.name || t.dogUnnamed}</div>
                  <div className={styles.candidateDistance}>{interp(t.distanceAway, { d: Math.round(distance) })}</div>
                  {similarity != null && (
                    <div className={styles.candidateDistance}>
                      {interp(t.reportPhotoSimilarity, { pct: Math.round(similarity * 100) })}
                    </div>
                  )}
                  {aiVerdict?.sameDog && (
                    <span className={aiVerdict.confidence === 'high' ? styles.tagGreen : styles.tagAmber}>
                      {aiVerdict.confidence === 'high' ? t.reportLikelyMatch : t.reportPossibleMatch}
                    </span>
                  )}
                </div>
                <button type="button" className={styles.matchBtn} onClick={() => pickCandidate(dog)}>
                  {t.reportSameDog}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className={styles.secondaryBtn} onClick={pickNewDog}>
            {t.reportNotListed}
          </button>
        </div>
      )}

      {step === 'confirm' && (
        <div className={styles.newDogBlock}>
          {photoUrl && <img src={photoUrl} alt="" className={styles.previewPhoto} />}
          {targetDog ? (
            <p className={styles.hint}>{interp(t.reportConfirmReportingOf, { name: targetDog.name || t.dogUnnamed })}</p>
          ) : (
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t.reportNameLabel}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.reportNamePlaceholder}
                maxLength={40}
              />
            </label>
          )}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>{t.friendlinessLabel}</span>
            <div className={styles.friendlinessRow}>
              {FRIENDLINESS_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`${styles.friendlinessBtn} ${friendliness === opt ? styles[FRIENDLINESS_BTN_CLASS[friendlinessColor(opt)]] : ''}`}
                  onClick={() => setFriendliness(friendliness === opt ? null : opt)}
                >
                  {t[`friendliness${opt.charAt(0).toUpperCase()}${opt.slice(1)}`]}
                </button>
              ))}
            </div>
          </div>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t.reportNoteLabel}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.reportNotePlaceholder}
              maxLength={280}
              rows={3}
            />
          </label>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            <span>{t.reportAnonymousLabel}</span>
          </label>
          <button type="button" className={styles.primaryBtn} onClick={submitReport}>
            {t.reportSubmit}
          </button>
        </div>
      )}

      {step === 'success' && (
        <div className={styles.successBlock}>
          <p className={styles.successMsg}>
            {successInfo?.matched
              ? interp(t.reportSuccessMatched, { name: successInfo.name })
              : t.reportSuccessNew}
          </p>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              reset()
              onDone?.()
            }}
          >
            {t.reportAnother}
          </button>
        </div>
      )}
    </div>
  )
}
