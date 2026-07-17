import { useState } from 'react'
import { useSightings, renameDog, summarizeFriendliness, deleteSighting, friendlinessColor } from '../hooks/useDogs'
import { interp } from '../LangContext'
import styles from './DogDetail.module.css'

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

export default function DogDetail({ dog, user, t, lang, onClose, onReportSighting }) {
  const { sightings, loading } = useSightings(dog?.id)
  const temperament = summarizeFriendliness(sightings)
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

  if (!dog) return null

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
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t.dogClose}>×</button>
        </div>

        {dog.latestPhotoUrl && <img src={dog.latestPhotoUrl} alt="" className={styles.heroPhoto} />}

        {dog.latestTags?.hasCollar && (
          <p className={styles.collarWarning}>{t.dogPossibleOwner}</p>
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

        <button type="button" className={styles.reportBtn} onClick={() => onReportSighting(dog)}>
          {t.dogReportSighting}
        </button>

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
                {user?.uid === s.reportedBy && confirmingId !== s.id && (
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
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
