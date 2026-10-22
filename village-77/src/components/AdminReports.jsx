import { useMemo } from 'react'
import { useLangContext, interp } from '../LangContext'
import { db, doc, deleteDoc } from '../firebase'
import { deletePost, deletePrivateAddress } from '../hooks/usePosts'
import { OWNER_UID } from '../config'
import { useAuthContext } from '../hooks/useAuth'
import { logAdmin } from '../adminLog'
import { removePostStats } from '../hooks/useStats'
import styles from './ui.module.css'

// Admin tab → รายงาน: posts villagers flagged with "Report this post".
// Dismiss a report, or delete the post (its other reports go with it).
export default function AdminReports({ reports, shops, providers, ratings, onOpenPost, bans = {}, onBan }) {
  const { t, lang } = useLangContext()
  const { user } = useAuthContext()
  const posts = useMemo(() => new Map([...shops, ...providers].map((p) => [p.id, p])), [shops, providers])
  const sorted = useMemo(
    () => reports.slice().sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)),
    [reports],
  )

  const when = (ts) => ts?.toDate?.().toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }) || ''

  const dismiss = (r) => deleteDoc(doc(db, 'villageReports', r.id)).then(() => logAdmin(user, 'dismissReport', { detail: (posts.get(r.postId)?.name || '') + ' · ' + r.reason, postId: r.postId }), (e) => {
    console.error('[village] dismiss report failed:', e?.code)
    alert(t.saveFailed)
  })

  // Review reports (r.ratingId): the reported review, if it still exists.
  const reviews = useMemo(() => new Map(ratings.postRatings().map((x) => [x.id, x])), [ratings])

  async function deleteReportedReview(r, review) {
    if (!window.confirm(interp(t.reviewDeleteConfirm, { name: review.name || t.adminNoName }))) return
    try {
      await ratings.remove(review.id)
      logAdmin(user, 'deleteRating', {
        detail: (review.name || '') + ' · ' + review.stars + '★ · “' + (review.comment || '') + '” (' + t.adminReports + ')',
        postId: r.postId, targetUid: review.raterUid,
      })
      await Promise.all(reports.filter((x) => x.ratingId === review.id).map((x) => deleteDoc(doc(db, 'villageReports', x.id))))
    } catch (e) {
      console.error('[village] delete reported review failed:', e?.code)
      alert(t.saveFailed)
    }
  }

  async function deleteReported(r) {
    const post = posts.get(r.postId)
    if (!window.confirm(t.deleteConfirm)) return
    try {
      if (post) {
        await removePostStats(post)
        await deletePost(r.collection, r.postId)
        logAdmin(user, 'deletePost', { detail: post.name + ' (' + t.adminReports + ')', postId: r.postId, targetUid: post.ownerUid })
        deletePrivateAddress(r.postId).catch(() => {})
        ratings.removeAll(r.postId).catch(() => {})
      }
      await Promise.all(reports.filter((x) => x.postId === r.postId).map((x) => deleteDoc(doc(db, 'villageReports', x.id))))
    } catch (e) {
      console.error('[village] delete reported post failed:', e?.code)
      alert(t.saveFailed)
    }
  }

  if (!sorted.length) return <p className={styles.empty}>{t.reportsNone}</p>

  return (
    <ul className={styles.adminList}>
      {sorted.map((r) => {
        const post = posts.get(r.postId)
        const review = r.ratingId ? reviews.get(r.ratingId) : null
        return (
          <li key={r.id} className={styles.adminRow}>
            <div className={styles.adminMain}>
              <span className={styles.reportReasonTag}>🚩 {t['report_' + r.reason]}</span>
              {post
                ? <button type="button" className={`${styles.linkBtn} ${styles.reportPostLink}`} onClick={() => onOpenPost(r.postId)}>
                    {r.collection === 'villageShops' ? '🛒' : '🔧'} {post.name}
                  </button>
                : <span className={styles.meta}>{t.reportPostGone}</span>}
              {r.ratingId && (review
                ? <span className={styles.reportedReview}>{t.reportedReview} {'★'.repeat(review.stars)} “{review.comment || '—'}” — {review.name || t.adminNoName}</span>
                : <span className={styles.meta}>{t.reportReviewGone}</span>)}
              {r.note && <span className={styles.desc}>“{r.note}”</span>}
              <span className={styles.meta}>👤 {r.reporterName || t.adminNoName} · {when(r.createdAt)}</span>
            </div>
            <div className={styles.adminActions}>
              <button type="button" className={styles.linkBtn} onClick={() => dismiss(r)}>{t.reportDismiss}</button>
              {r.ratingId ? (
                <>
                  {review && (
                    <button type="button" className={`${styles.linkBtn} ${styles.dangerLink}`} onClick={() => deleteReportedReview(r, review)}>{t.reportDeleteReview}</button>
                  )}
                  {review && onBan && review.raterUid !== OWNER_UID && !bans[review.raterUid] && (
                    <button type="button" className={`${styles.linkBtn} ${styles.dangerLink}`} onClick={() => onBan({ uid: review.raterUid, name: review.name })}>⛔ {t.reportBanReviewer}</button>
                  )}
                </>
              ) : (
                <>
                  {post && (
                    <button type="button" className={`${styles.linkBtn} ${styles.dangerLink}`} onClick={() => deleteReported(r)}>{t.delete}</button>
                  )}
                  {post && onBan && post.ownerUid !== OWNER_UID && !bans[post.ownerUid] && (
                    <button type="button" className={`${styles.linkBtn} ${styles.dangerLink}`} onClick={() => onBan({ uid: post.ownerUid, name: post.name })}>⛔ {t.banUser}</button>
                  )}
                </>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
