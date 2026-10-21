// Links to the app and to one post, and sharing a post into LINE.
// A post link is the app URL with ?p=<post id>; App.jsx opens that post.
export const APP_URL = 'https://pumbafluffycorgi.com' + import.meta.env.BASE_URL

export function postUrl(id) {
  return APP_URL + '?p=' + encodeURIComponent(id)
}

export function readPostParam() {
  return new URLSearchParams(window.location.search).get('p')
}

export function clearPostParam() {
  window.history.replaceState(null, '', window.location.pathname)
}

// line.me/R/share opens LINE's "send to…" picker (a chat, group or Timeline)
// with the text filled in; on a computer it offers to open LINE.
export function shareToLine(text) {
  window.open('https://line.me/R/share?text=' + encodeURIComponent(text), '_blank', 'noopener')
}
