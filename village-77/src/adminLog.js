import { db, collection, addDoc, serverTimestamp } from './firebase'

// Admin activity log (villageAdminLog): one entry per admin action, so the
// owner can see who did what and when (admin tab → บันทึก, owner only).
// action: one of the ADMIN_ACTIONS keys (label: t['log_' + action]);
// detail: short human text, e.g. the post or person's name.
// Logging never blocks the action itself — a failed write is just warned.
export const ADMIN_ACTIONS = [
  'verify', 'unverify', 'deletePost', 'editAddress', 'dismissReport',
  'ban', 'banRemove', 'unban', 'deleteRating', 'grantAdmin', 'revokeAdmin', 'editCategories',
]

export function logAdmin(user, action, { detail = '', postId = null, targetUid = null } = {}) {
  if (!user) return
  addDoc(collection(db, 'villageAdminLog'), {
    action,
    detail: String(detail).slice(0, 300),
    postId,
    targetUid,
    by: user.uid,
    byName: (user.displayName || '').slice(0, 200),
    at: serverTimestamp(),
  }).catch((e) => console.warn('[village] admin log failed:', e?.code))
}
