import { useState } from 'react'
import { useLangContext } from '../LangContext'
import { db, collection, addDoc, serverTimestamp } from '../firebase'
import styles from './ui.module.css'

export const REPORT_REASONS = ['wrong', 'notResident', 'scam', 'inappropriate', 'other']
export const REVIEW_REPORT_REASONS = ['fakeReview', 'rude', 'other']

// "Report this post" — or, with `review`, one of its reviews — a reason and
// an optional note, saved to villageReports for the admins (admin tab → รายงาน).
export default function ReportSheet({ post, collectionName, user, review = null, onClose }) {
  const { t } = useLangContext()
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [state, setState] = useState('') // '' | 'sending' | 'sent'

  async function send(e) {
    e.preventDefault()
    if (!reason) return
    setState('sending')
    try {
      await addDoc(collection(db, 'villageReports'), {
        postId: post.id,
        collection: collectionName,
        reason,
        note: note.trim().slice(0, 300),
        reporterUid: user.uid,
        reporterName: (user.displayName || '').slice(0, 80),
        createdAt: serverTimestamp(),
        ...(review ? { ratingId: review.id } : {}),
      })
      setState('sent')
    } catch (err) {
      console.error('[village] report failed:', err?.code)
      alert(t.saveFailed)
      setState('')
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className={styles.sheet} onSubmit={send}>
        <h2 className={styles.sheetTitle}>🚩 {review ? t.reportReviewTitle : t.reportTitle}</h2>
        {state === 'sent' ? (
          <>
            <p className={styles.hint}>{t.reportThanks}</p>
            <div className={styles.sheetActions}>
              <button type="button" className={styles.primaryBtn} onClick={onClose}>{t.close}</button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.hint}>{post.name}{review && <> · “{review.comment}” — {review.name || t.adminNoName}</>}</p>
            <div className={styles.reportReasons}>
              {(review ? REVIEW_REPORT_REASONS : REPORT_REASONS).map((r) => (
                <label key={r} className={styles.reportReason}>
                  <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />
                  {t['report_' + r]}
                </label>
              ))}
            </div>
            <label className={styles.field}>
              <span>{t.reportNote}</span>
              <textarea rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <div className={styles.sheetActions}>
              <button type="button" className={styles.secondaryBtn} onClick={onClose}>{t.cancel}</button>
              <button type="submit" className={styles.primaryBtn} disabled={!reason || state === 'sending'}>
                {state === 'sending' ? t.saving : t.reportSend}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
