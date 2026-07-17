import { useRef, useState } from 'react'
import { auth } from '../firebase'
import { uploadDogPhoto } from '../photoUpload'
import { findCandidates, createDogWithSighting, addSightingToDog } from '../hooks/useDogs'
import { interp } from '../LangContext'
import styles from './ReportFlow.module.css'

// step: 'pick' | 'locating' | 'uploading' | 'candidates' | 'newDog' | 'submitting' | 'success'
export default function ReportFlow({ user, dogs, t, lang, onSignIn, onDone, presetDog }) {
  const [step, setStep] = useState(presetDog ? 'pick' : 'pick')
  const [error, setError] = useState(null)
  const [coords, setCoords] = useState(null)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [tags, setTags] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [successInfo, setSuccessInfo] = useState(null)
  const fileRef = useRef(null)

  function reset() {
    setStep('pick')
    setError(null)
    setCoords(null)
    setPhotoUrl(null)
    setTags(null)
    setCandidates([])
    setName('')
    setNote('')
    setSuccessInfo(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (!('geolocation' in navigator)) {
      setError(t.mapLocateUnsupported)
      return
    }

    setStep('locating')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        await doUpload(file, lat, lng)
      },
      (err) => {
        setError(err.code === 1 ? t.reportLocationDenied : t.reportLocationError)
        setStep('pick')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  async function doUpload(file, lat, lng) {
    setStep('uploading')
    try {
      const idToken = await auth.currentUser.getIdToken()
      const result = await uploadDogPhoto({ file, lat, lng, idToken })
      setPhotoUrl(result.photoUrl)
      setTags(result.tags || null)

      if (presetDog) {
        setStep('newDog') // reuse the note-entry screen, submit will target presetDog
        return
      }

      const found = findCandidates(dogs, { lat, lng, tags: result.tags }, 500, 5)
      setCandidates(found)
      setStep('candidates')
    } catch (err) {
      setError(err.message || t.reportUploadError)
      setStep('pick')
    }
  }

  async function confirmMatch(dogId, dogName) {
    setStep('submitting')
    try {
      await addSightingToDog({
        dogId, user, photoUrl, tags, lat: coords.lat, lng: coords.lng, note,
      })
      setSuccessInfo({ matched: true, name: dogName })
      setStep('success')
    } catch (err) {
      setError(err.message || 'Something went wrong saving that.')
      setStep('candidates')
    }
  }

  async function submitNewOrPreset() {
    setStep('submitting')
    try {
      if (presetDog) {
        await addSightingToDog({
          dogId: presetDog.id, user, photoUrl, tags, lat: coords.lat, lng: coords.lng, note,
        })
        setSuccessInfo({ matched: true, name: presetDog.name || t.dogUnnamed })
      } else {
        await createDogWithSighting({
          user, photoUrl, tags, lat: coords.lat, lng: coords.lng, name, note,
        })
        setSuccessInfo({ matched: false })
      }
      setStep('success')
    } catch (err) {
      setError(err.message || 'Something went wrong saving that.')
      setStep('newDog')
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

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>{t.reportTitle}</h2>

      {error && <p className={styles.error}>{error}</p>}

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
        </>
      )}

      {step === 'locating' && <p className={styles.status}>{t.reportGettingLocation}</p>}
      {step === 'uploading' && <p className={styles.status}>{t.reportUploading}</p>}
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
            {candidates.map(({ dog, distance }) => (
              <li key={dog.id} className={styles.candidateCard}>
                {dog.latestPhotoUrl && <img src={dog.latestPhotoUrl} alt="" className={styles.candidateThumb} />}
                <div className={styles.candidateInfo}>
                  <div className={styles.candidateName}>{dog.name || t.dogUnnamed}</div>
                  <div className={styles.candidateDistance}>{interp(t.distanceAway, { d: Math.round(distance) })}</div>
                </div>
                <button
                  type="button"
                  className={styles.matchBtn}
                  onClick={() => confirmMatch(dog.id, dog.name || t.dogUnnamed)}
                >
                  {t.reportSameDog}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className={styles.secondaryBtn} onClick={() => setStep('newDog')}>
            {t.reportNotListed}
          </button>
        </div>
      )}

      {step === 'newDog' && (
        <div className={styles.newDogBlock}>
          {photoUrl && <img src={photoUrl} alt="" className={styles.previewPhoto} />}
          {!presetDog && (
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
          <button type="button" className={styles.primaryBtn} onClick={submitNewOrPreset}>
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
