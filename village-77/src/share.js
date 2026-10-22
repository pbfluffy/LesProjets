import { LIFF_URL } from './liff'

// Links to the app and to one post, and sharing a post into LINE.
// A post link is the app URL with ?p=<post id>; App.jsx opens that post.
export const APP_URL = 'https://pumbafluffycorgi.com' + import.meta.env.BASE_URL
// Links people share or scan (post links, the poster QR) go through LIFF
// once it's set up, so they open inside the LINE app — where sign-in is a
// tap instead of LINE's web login page. LIFF forwards ?p= as liff.state.
export const SHARE_URL = LIFF_URL || APP_URL

// Shared post links: pumbafluffycorgi.com/village-77/s/<id>. That path is
// routed to the village-77 Worker (worker/wrangler.toml), which gives LINE a
// preview (photo, name, description) and then forwards to SHARE_URL?p=<id>.
export function postUrl(id) {
  return APP_URL + 's/' + encodeURIComponent(id)
}

export function readPostParam() {
  const q = new URLSearchParams(window.location.search)
  if (q.get('p')) return q.get('p')
  // Arrived through liff.line.me/<id>?p=… : LIFF passes "?p=…" in liff.state.
  const state = q.get('liff.state')
  return state ? new URLSearchParams(state.replace(/^[^?]*\?/, '')).get('p') : null
}

export function clearPostParam() {
  window.history.replaceState(null, '', window.location.pathname)
}

// line.me/R/share opens LINE's "send to…" picker (a chat, group or Timeline)
// with the text filled in; on a computer it offers to open LINE.
export function shareToLine(text) {
  window.open('https://line.me/R/share?text=' + encodeURIComponent(text), '_blank', 'noopener')
}

// Instagram: accept "@shop", "shop" or a pasted profile link; store the
// bare handle ("shop"), link to instagram.com/<handle>.
export function igHandle(value) {
  return (value || '').trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .split(/[/?#\s]/)[0]
    .slice(0, 60)
}
export const igUrl = (handle) => 'https://www.instagram.com/' + encodeURIComponent(handle) + '/'
