// Posts nobody has touched for STALE_DAYS are hidden from the boards so the
// app doesn't fill up with closed shops. The owner still sees theirs, with a
// "still open" button that just bumps updatedAt (any edit or sold toggle
// does too). Admins see everything in the admin tab.
export const STALE_DAYS = 60
const DAY = 24 * 60 * 60 * 1000

export function lastActive(post) {
  const ts = post.updatedAt || post.createdAt
  return ts?.toMillis ? ts.toMillis() : Date.now() // pending server time = just now
}

export const isStale = (post) => Date.now() - lastActive(post) > STALE_DAYS * DAY

// "today" / "3 days ago" / a date, for the card footer.
export function updatedLabel(post, t, lang) {
  const days = Math.floor((Date.now() - lastActive(post)) / DAY)
  if (days < 1) return t.updatedToday
  if (days < 30) return t.updatedDaysAgo.replace('{n}', days)
  return t.updatedOn.replace('{date}', new Date(lastActive(post)).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  }))
}
