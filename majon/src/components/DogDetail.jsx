import { useState } from 'react'
import { useSightings, renameDog } from '../hooks/useDogs'
import { interp } from '../LangContext'
import styles from './DogDetail.module.css'

function fmtDate(ts, lang) {
  const ms = ts?.toMillis ? ts.toMillis() : null
  if (!ms) return ''
  return new Date(ms).toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function DogDetail({ dog, user, t, lang, onClose, onReportSighting }) {
  const { sightings, loading } = useSightings(dog?.id)
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(dog?.name || '')
  const [saving, setSaving] = useState(false)

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
              <h2 className={styles.title}>🐾 {dog.name || t.dogUnnamed}</h2>
              {user && (
                <button type="button" className={styles.editBtn} onClick={() => setEditing(true)} aria-label={t.dogRename} title={t.dogRename}>✎</button>
              )}
            </div>
          )}
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t.dogClose}>×</button>
        </div>

        {dog.latestPhotoUrl && <img src={dog.latestPhotoUrl} alt="" className={styles.heroPhoto} />}

        {dog.lastSeenAt && (
          <p className={styles.meta}>{t.dogLastSeen}: {fmtDate(dog.lastSeenAt, lang)}</p>
        )}

        <button type="button" className={styles.reportBtn} onClick={() => onReportSighting(dog)}>
          {t.dogReportSighting}
        </button>

        <h3 className={styles.sectionTitle}>{t.dogSightings} ({sightings.length})</h3>
        {loading && <p className={styles.meta}>…</p>}
        <ul className={styles.timeline}>
          {sightings.map((s) => (
            <li key={s.id} className={styles.timelineItem}>
              {s.photoUrl && <img src={s.photoUrl} alt="" className={styles.timelineThumb} />}
              <div className={styles.timelineInfo}>
                <div className={styles.timelineDate}>{fmtDate(s.reportedAt, lang)}</div>
                <div className={styles.timelineReporter}>{interp(t.dogReportedBy, { name: s.reportedByName || '?' })}</div>
                {s.note && <div className={styles.timelineNote}>{s.note}</div>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
