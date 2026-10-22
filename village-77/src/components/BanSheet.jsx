import { useState } from 'react'
import { useLangContext, interp } from '../LangContext'
import { useAuthContext } from '../hooks/useAuth'
import { banUser } from '../hooks/useBans'
import { logAdmin } from '../adminLog'
import styles from './ui.module.css'

// Admin: ban an account, optionally removing everything they posted and
// every rating they wrote. Unbanning (admin tab → ระงับแล้ว) lifts the ban
// but doesn't bring removed posts back.
export default function BanSheet({ uid, name, shops, providers, ratings, onClose }) {
  const { t } = useLangContext()
  const { user } = useAuthContext()
  const [reason, setReason] = useState('')
  const [removeContent, setRemoveContent] = useState(false)
  const [saving, setSaving] = useState(false)
  const postCount = shops.concat(providers).filter((p) => p.ownerUid === uid).length

  async function save(e) {
    e.preventDefault()
    if (removeContent && !window.confirm(interp(t.banRemoveConfirm, { n: postCount }))) return
    setSaving(true)
    try {
      await banUser({ uid, name, reason, admin: user, removeContent, shops, providers, ratings })
      logAdmin(user, removeContent ? 'banRemove' : 'ban', { detail: (name || '') + (reason.trim() ? ' · ' + reason.trim() : ''), targetUid: uid })
      onClose()
    } catch (err) {
      console.error('[village] ban failed:', err?.code)
      alert(err?.code === 'permission-denied' ? t.banNotAllowed : t.saveFailed)
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form className={styles.sheet} onSubmit={save}>
        <h2 className={styles.sheetTitle}>⛔ {t.banTitle}</h2>
        <p className={styles.hint}>{name || t.adminNoName}</p>
        <p className={styles.hint}>{t.banExplain}</p>
        <label className={styles.field}>
          <span>{t.banReason}</span>
          <textarea rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.banReasonPh} />
        </label>
        <label className={styles.checkRow}>
          <input type="checkbox" checked={removeContent} onChange={(e) => setRemoveContent(e.target.checked)} />
          <span>{interp(t.banRemoveContent, { n: postCount })}</span>
        </label>
        <div className={styles.sheetActions}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={saving}>{t.cancel}</button>
          <button type="submit" className={`${styles.primaryBtn} ${styles.dangerBtn}`} disabled={saving}>
            {saving ? t.saving : t.banConfirm}
          </button>
        </div>
      </form>
    </div>
  )
}
