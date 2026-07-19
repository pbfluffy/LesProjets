import { useState } from 'react'
import {
  useSightings, renameDog, summarizeFriendliness, deleteSighting, detachSighting, mergeDogs,
  useFlags, flagDog, dismissFlag, deleteDogEntirely, friendlinessColor,
} from '../hooks/useDogs'
import { currentShareUrl } from '../shareDog'
import { shareToLine } from '../shareLine'
import { searchDogs } from '../searchDogs'
import { localizedBreed } from '../breedLabel'
import { isAdmin } from '../admin'
import { interp } from '../LangContext'
import styles from './DogDetail.module.css'

const REPORT_REASONS = ['photo', 'wrongInfo', 'duplicate', 'other']

function friendlinessLabel(level, t) {
  if (level === 'friendly') return t.friendlinessFriendly
  if (level === 'neutral') return t.friendlinessNeutral
  if (level === 'cautious') return t.friendlinessCautious
  return null
}

const TAG_CLASS = { green: 'tagGreen', amber: 'tagAmber', red: 'tagRed' }

function FriendlinessTag({ level, t }) {
  const label = friendlinessLabel(level, t)
  if (!label) return null
  return <span className={styles[TAG_CLASS[friendlinessColor(level)]]}>{label}</span>
}

function fmtDate(ts, lang) {
  const ms = ts?.toMillis ? ts.toMillis() : null
  if (!ms) return ''
  return new Date(ms).toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function DogDetail({ dog, dogs = [], user, t, lang, onClose, onReportSighting }) {
  const { sightings, loading } = useSightings(dog?.id)
  const temperament = summarizeFriendliness(sightings)
  // A count of unique reporters, not just the latest one, is a stronger
  // trust signal for a community-sourced ID — one anonymous sighting is
  // easy to dismiss, several independent people agreeing is not.
  const uniqueReporters = new Set(sightings.map((s) => s.reportedBy)).size
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(dog?.name || '')
  const [saving, setSaving] = useState(false)
  // Set, not a single id — deleting two sightings back-to-back (before the
  // first call's `finally` clears state) must not let the second clobber
  // the first's in-flight loading indicator.
  const [deletingIds, setDeletingIds] = useState(() => new Set())
  // Sighting currently showing its "delete this? yes/cancel" inline prompt —
  // a native window.confirm() triggers Chrome's own "suppress dialogs"
  // checkbox after repeated use, which can silently disable all future
  // confirm/alert calls on the page if a tester checks it without noticing.
  const [confirmingId, setConfirmingId] = useState(null)
  const [errorId, setErrorId] = useState(null)
  // Same shape as the delete-sighting state above, kept separate so the two
  // confirm flows on the same sighting never fight over one "which id is
  // this?" variable.
  const [detachingId, setDetachingId] = useState(null)
  const [detachBusyId, setDetachBusyId] = useState(null)
  const [detachErrorId, setDetachErrorId] = useState(null)
  const [shareMsg, setShareMsg] = useState(null)
  const [merging, setMerging] = useState(false)
  const [mergeQuery, setMergeQuery] = useState('')
  const [mergeTarget, setMergeTarget] = useState(null)
  const [mergeBusy, setMergeBusy] = useState(false)
  const [mergeError, setMergeError] = useState(null)
  const [reporting, setReporting] = useState(false)
  const [reportReason, setReportReason] = useState(null)
  const [reportNote, setReportNote] = useState('')
  const [reportBusy, setReportBusy] = useState(false)
  const [reportMsg, setReportMsg] = useState(null)
  const [dismissingFlagId, setDismissingFlagId] = useState(null)
  const [deletingDog, setDeletingDog] = useState(false)
  const [deleteDogBusy, setDeleteDogBusy] = useState(false)
  const [deleteDogError, setDeleteDogError] = useState(null)

  const admin = isAdmin(user)
  const { flags } = useFlags(dog?.id, admin)

  if (!dog) return null

  async function handleShare() {
    // The real app URL — App.jsx already mirrors the open dog into
    // ?dog=<id>, and the worker rewrites this exact URL's og:* tags in
    // place for crawlers (see shareDog.js).
    const url = currentShareUrl()
    const name = dog.name || t.dogUnnamed
    const text = interp(t.dogShareText, { name })
    if (navigator.share) {
      try {
        await navigator.share({ title: name, text, url })
        return
      } catch (e) {
        if (e.name === 'AbortError') return // user dismissed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg(t.dogLinkCopied)
    } catch {
      setShareMsg(url) // clipboard also failed — show it so they can copy manually
    }
    setTimeout(() => setShareMsg(null), 2500)
  }

  function handleShareLine() {
    const url = currentShareUrl()
    const name = dog.name || t.dogUnnamed
    const text = interp(t.dogShareText, { name }) + '\n' + url
    shareToLine(text)
  }

  async function saveName() {
    setSaving(true)
    try {
      await renameDog(dog.id, nameDraft)
      setEditing(false)
    } catch (err) {
      console.error('[majon] rename failed:', err)
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete(sighting) {
    setConfirmingId(null)
    setErrorId(null)
    setDeletingIds((prev) => new Set(prev).add(sighting.id))
    try {
      const result = await deleteSighting(dog.id, sighting.id)
      if (result.dogDeleted) onClose()
    } catch (err) {
      console.error('[majon] delete sighting failed:', err)
      setErrorId(sighting.id)
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(sighting.id)
        return next
      })
    }
  }

  function armDelete(sightingId) {
    setConfirmingId(sightingId)
    setErrorId(null)
  }

  function armDetach(sightingId) {
    setDetachingId(sightingId)
    setDetachErrorId(null)
  }

  async function confirmDetach(sighting) {
    setDetachingId(null)
    setDetachErrorId(null)
    setDetachBusyId(sighting.id)
    try {
      const result = await detachSighting(dog.id, sighting.id)
      if (result.dogDeleted) onClose()
    } catch (err) {
      console.error('[majon] detach sighting failed:', err)
      setDetachErrorId(sighting.id)
    } finally {
      setDetachBusyId(null)
    }
  }

  function cancelMerge() {
    setMerging(false)
    setMergeQuery('')
    setMergeTarget(null)
    setMergeError(null)
  }

  async function confirmMerge() {
    setMergeBusy(true)
    setMergeError(null)
    try {
      await mergeDogs(dog.id, mergeTarget.id)
      onClose()
    } catch (err) {
      console.error('[majon] merge failed:', err)
      setMergeError(t.dogMergeFailed)
      setMergeBusy(false)
    }
  }

  const mergeCandidates = searchDogs(dogs, mergeQuery, { excludeId: dog.id, lang })

  async function submitReport() {
    setReportBusy(true)
    try {
      await flagDog(dog.id, { user, reason: reportReason, note: reportNote })
      setReportMsg(t.dogReportSuccess)
      setReporting(false)
      setReportReason(null)
      setReportNote('')
    } catch (err) {
      console.error('[majon] flag dog failed:', err)
      setReportMsg(t.dogReportFailed)
    } finally {
      setReportBusy(false)
    }
  }

  async function handleDismissFlag(flagId) {
    setDismissingFlagId(flagId)
    try {
      await dismissFlag(dog.id, flagId)
    } catch (err) {
      console.error('[majon] dismiss flag failed:', err)
    } finally {
      setDismissingFlagId(null)
    }
  }

  async function handleDeleteDog() {
    setDeleteDogBusy(true)
    setDeleteDogError(null)
    try {
      await deleteDogEntirely(dog.id)
      onClose()
    } catch (err) {
      console.error('[majon] delete dog failed:', err)
      setDeleteDogError(t.dogFlagDeleteFailed)
      setDeleteDogBusy(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }} role="dialog" aria-modal="true">
      <div className={styles.sheet}>
        <div className={styles.header}>
          {editing ? (
            <div className={styles.editRow}>
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={40}
                autoFocus
              />
              <button type="button" className={styles.smallBtn} onClick={saveName} disabled={saving}>{t.dogSave}</button>
              <button type="button" className={styles.smallBtnGhost} onClick={() => { setEditing(false); setNameDraft(dog.name || '') }}>{t.dogCancel}</button>
            </div>
          ) : (
            <div className={styles.titleRow}>
              <h2 className={styles.title}>{dog.name || t.dogUnnamed}</h2>
              {user && (
                <button type="button" className={styles.editBtn} onClick={() => setEditing(true)} aria-label={t.dogRename} title={t.dogRename}>✎</button>
              )}
            </div>
          )}
          {!editing && (
            <button type="button" className={styles.editBtn} onClick={handleShare} aria-label={t.dogShare} title={t.dogShare}>↗</button>
          )}
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t.dogClose}>×</button>
        </div>

        {shareMsg && <p className={styles.meta}>{shareMsg}</p>}

        {admin && flags.length > 0 && (
          <div className={styles.flagsPanel}>
            <div className={styles.flagsPanelTitle}>{interp(t.dogFlagsTitle, { count: flags.length })}</div>
            <ul className={styles.flagsList}>
              {flags.map((f) => (
                <li key={f.id} className={styles.flagItem}>
                  <div className={styles.flagReason}>{t[`dogReportReason${f.reason.charAt(0).toUpperCase()}${f.reason.slice(1)}`] || f.reason}</div>
                  <div className={styles.flagMeta}>
                    {interp(t.dogReportedBy, { name: f.reportedByName || t.dogAnonymousReporter })} · {fmtDate(f.reportedAt, lang)}
                  </div>
                  {f.note && <div className={styles.flagNote}>{f.note}</div>}
                  <button
                    type="button"
                    className={styles.smallBtnGhost}
                    onClick={() => handleDismissFlag(f.id)}
                    disabled={dismissingFlagId === f.id}
                  >
                    {dismissingFlagId === f.id ? '…' : t.dogFlagDismiss}
                  </button>
                </li>
              ))}
            </ul>
            {!deletingDog ? (
              <button type="button" className={styles.confirmYesBtn} onClick={() => setDeletingDog(true)}>
                {t.dogFlagDeleteDog}
              </button>
            ) : (
              <div className={styles.confirmRow}>
                <span className={styles.confirmText}>{t.dogFlagDeleteConfirm}</span>
                <button type="button" className={styles.confirmYesBtn} onClick={handleDeleteDog} disabled={deleteDogBusy}>
                  {deleteDogBusy ? '…' : t.dogFlagDeleteDog}
                </button>
                <button type="button" className={styles.confirmCancelBtn} onClick={() => setDeletingDog(false)}>
                  {t.dogCancel}
                </button>
              </div>
            )}
            {deleteDogError && <div className={styles.deleteError}>{deleteDogError}</div>}
          </div>
        )}

        {dog.latestPhotoUrl && <img src={dog.latestPhotoUrl} alt="" className={styles.heroPhoto} />}

        {(dog.latestTags?.hasCollar || dog.latestTags?.breedGuess) && (
          <div className={styles.infoGroup}>
            <div className={styles.infoGroupLabel}>{t.dogInfoAI}</div>
            {dog.latestTags?.hasCollar && (
              <p className={styles.collarWarning}>{t.dogPossibleOwner}</p>
            )}
            {dog.latestTags?.breedGuess && (
              <p className={styles.meta}>{t.dogBreed}: {localizedBreed(dog.latestTags.breedGuess, lang)}</p>
            )}
          </div>
        )}

        <div className={styles.infoGroup}>
          <div className={styles.infoGroupLabel}>{t.dogInfoCommunity}</div>
          {uniqueReporters > 1 && (
            <p className={styles.meta}>{interp(t.dogMultipleReporters, { count: uniqueReporters })}</p>
          )}
          {dog.lastSeenAt && (
            <p className={styles.meta}>{t.dogLastSeen}: {fmtDate(dog.lastSeenAt, lang)}</p>
          )}
          <p className={styles.meta}>
            {t.dogTemperament}:{' '}
            {temperament.label ? (
              <>
                <FriendlinessTag level={temperament.label} t={t} />{' '}
                {interp(t.dogTemperamentCount, { count: temperament.counts[temperament.label], total: temperament.total })}
              </>
            ) : t.dogTemperamentNone}
          </p>
        </div>

        <button
          type="button"
          className={styles.lineShareBtn}
          onClick={handleShareLine}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}>
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
          {t.dogShareLine}
        </button>

        <button type="button" className={styles.reportBtn} onClick={() => onReportSighting(dog)}>
          {t.dogReportSighting}
        </button>

        {user && (
          <div className={styles.mergeSection}>
            {!reporting ? (
              <button
                type="button"
                className={styles.mergeToggleBtn}
                onClick={() => { setReporting(true); setReportMsg(null) }}
                title={t.dogReportHint}
              >
                🚩 {t.dogReport}
              </button>
            ) : (
              <div className={styles.mergeBox}>
                <p className={styles.mergeHint}>{t.dogReportHint}</p>
                <p className={styles.mergeHint}>{t.dogReportReasonLabel}</p>
                <div className={styles.reportReasonRow}>
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      className={`${styles.reportReasonBtn} ${reportReason === reason ? styles.reportReasonBtnActive : ''}`}
                      onClick={() => setReportReason(reason)}
                    >
                      {t[`dogReportReason${reason.charAt(0).toUpperCase()}${reason.slice(1)}`]}
                    </button>
                  ))}
                </div>
                <textarea
                  className={styles.mergeSearchInput}
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder={t.dogReportNotePlaceholder}
                  maxLength={280}
                  rows={2}
                />
                <div className={styles.confirmRow}>
                  <button
                    type="button"
                    className={styles.confirmYesBtn}
                    onClick={submitReport}
                    disabled={!reportReason || reportBusy}
                  >
                    {reportBusy ? '…' : t.dogReportSubmit}
                  </button>
                  <button type="button" className={styles.confirmCancelBtn} onClick={() => { setReporting(false); setReportReason(null); setReportNote('') }}>
                    {t.dogCancel}
                  </button>
                </div>
              </div>
            )}
            {reportMsg && <p className={styles.meta}>{reportMsg}</p>}
          </div>
        )}

        {user && (
          <div className={styles.mergeSection}>
            {!merging ? (
              <button
                type="button"
                className={styles.mergeToggleBtn}
                onClick={() => setMerging(true)}
                title={t.dogMergeHint}
              >
                🔀 {t.dogMergeTitle}
              </button>
            ) : (
              <div className={styles.mergeBox}>
                <p className={styles.mergeHint}>{t.dogMergeHint}</p>
                {!mergeTarget ? (
                  <>
                    <input
                      type="text"
                      className={styles.mergeSearchInput}
                      placeholder={t.dogMergeSearchPlaceholder}
                      value={mergeQuery}
                      onChange={(e) => setMergeQuery(e.target.value)}
                      autoFocus
                    />
                    {mergeQuery.trim() && (
                      <ul className={styles.mergeResults}>
                        {mergeCandidates.length === 0 && (
                          <li className={styles.mergeEmpty}>{t.dogMergeNoResults}</li>
                        )}
                        {mergeCandidates.map((candidate) => (
                          <li key={candidate.id}>
                            <button
                              type="button"
                              className={styles.mergeResultBtn}
                              onClick={() => setMergeTarget(candidate)}
                            >
                              {candidate.latestPhotoUrl && (
                                <img src={candidate.latestPhotoUrl} alt="" className={styles.mergeResultThumb} />
                              )}
                              <span>{candidate.name || t.dogUnnamed}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button type="button" className={styles.smallBtnGhost} onClick={cancelMerge}>
                      {t.dogCancel}
                    </button>
                  </>
                ) : (
                  <div className={styles.confirmRow}>
                    <span className={styles.confirmText}>
                      {interp(t.dogMergeConfirmQuestion, { name: mergeTarget.name || t.dogUnnamed })}
                    </span>
                    <button type="button" className={styles.confirmYesBtn} onClick={confirmMerge} disabled={mergeBusy}>
                      {mergeBusy ? '…' : t.dogMergeConfirmButton}
                    </button>
                    <button type="button" className={styles.confirmCancelBtn} onClick={() => setMergeTarget(null)}>
                      {t.dogCancel}
                    </button>
                  </div>
                )}
                {mergeError && <div className={styles.deleteError}>{mergeError}</div>}
              </div>
            )}
          </div>
        )}

        <h3 className={styles.sectionTitle}>{t.dogSightings} ({sightings.length})</h3>
        {loading && <p className={styles.meta}>…</p>}
        <ul className={styles.timeline}>
          {sightings.map((s) => (
            <li key={s.id} className={styles.timelineItem}>
              <div className={styles.timelineRow}>
                {s.photoUrl && <img src={s.photoUrl} alt="" className={styles.timelineThumb} />}
                <div className={styles.timelineInfo}>
                  <div className={styles.timelineDate}>{fmtDate(s.reportedAt, lang)}</div>
                  <div className={styles.timelineReporter}>
                    {interp(t.dogReportedBy, { name: s.reportedByName || t.dogAnonymousReporter })}
                    {s.friendliness && <> · <FriendlinessTag level={s.friendliness} t={t} /></>}
                  </div>
                  {s.note && <div className={styles.timelineNote}>{s.note}</div>}
                </div>
                {(confirmingId === s.id || detachingId === s.id) ? null : (
                  <div className={styles.timelineActions}>
                    {(user?.uid === s.reportedBy || admin) && (
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => armDetach(s.id)}
                        disabled={detachBusyId === s.id}
                        aria-label={t.dogDetachSighting}
                        title={t.dogDetachHint}
                      >
                        {detachBusyId === s.id ? '…' : '✂️'}
                      </button>
                    )}
                    {user?.uid === s.reportedBy && (
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => armDelete(s.id)}
                        disabled={deletingIds.has(s.id)}
                        aria-label={t.dogDeleteSighting}
                        title={t.dogDeleteSighting}
                      >
                        {deletingIds.has(s.id) ? '…' : '🗑'}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {confirmingId === s.id && (
                <div className={styles.confirmRow}>
                  <span className={styles.confirmText}>{t.dogDeleteConfirm}</span>
                  <button type="button" className={styles.confirmYesBtn} onClick={() => confirmDelete(s)}>
                    {t.dogDeleteSighting}
                  </button>
                  <button type="button" className={styles.confirmCancelBtn} onClick={() => setConfirmingId(null)}>
                    {t.dogCancel}
                  </button>
                </div>
              )}
              {errorId === s.id && <div className={styles.deleteError}>{t.dogDeleteFailed}</div>}
              {detachingId === s.id && (
                <div className={styles.confirmRow}>
                  <span className={styles.confirmText}>{t.dogDetachConfirm}</span>
                  <button type="button" className={styles.confirmYesBtn} onClick={() => confirmDetach(s)}>
                    {t.dogDetachSighting}
                  </button>
                  <button type="button" className={styles.confirmCancelBtn} onClick={() => setDetachingId(null)}>
                    {t.dogCancel}
                  </button>
                </div>
              )}
              {detachErrorId === s.id && <div className={styles.deleteError}>{t.dogDetachFailed}</div>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
