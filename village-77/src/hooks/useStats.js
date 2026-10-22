import { useEffect, useState } from 'react'
import { db, doc, setDoc, getDoc, increment } from '../firebase'

// How often a post gets looked at: villageStats/{postId}_{YYYYMMDD} counts
// opens of the full page and taps on Call / LINE / IG, one doc per post per
// (UTC) day. Anyone can add 1; only the post's owner and admins can read
// them (firestore.rules). The owner's own visits aren't counted.
const STATS = 'villageStats'
export const STAT_FIELDS = ['open', 'call', 'line', 'ig']

const dayNum = (d) => d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()

export function track(postId, field, user, ownerUid) {
  if (!STAT_FIELDS.includes(field) || (user && user.uid === ownerUid)) return
  // a page open counts once per post per browser session
  if (field === 'open') {
    const key = 'village_seen_' + postId
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch { /* private mode: count it anyway */ }
  }
  const day = dayNum(new Date())
  setDoc(doc(db, STATS, `${postId}_${day}`), { postId, day, [field]: increment(1) }, { merge: true })
    .catch((e) => console.warn('[village] stat failed:', e?.code))
}

// Totals for the last 7 days (owner / admin only), or null while loading.
export function useWeekStats(postId, enabled) {
  const [totals, setTotals] = useState(null)
  useEffect(() => {
    if (!enabled) return
    let live = true
    const now = Date.now()
    const ids = Array.from({ length: 7 }, (_, i) => `${postId}_${dayNum(new Date(now - i * 86400000))}`)
    Promise.all(ids.map((id) => getDoc(doc(db, STATS, id)).catch(() => null))).then((snaps) => {
      if (!live) return
      const sum = Object.fromEntries(STAT_FIELDS.map((f) => [f, 0]))
      for (const s of snaps) if (s?.exists()) for (const f of STAT_FIELDS) sum[f] += s.data()[f] || 0
      setTotals(sum)
    })
    return () => { live = false }
  }, [postId, enabled])
  return totals
}
