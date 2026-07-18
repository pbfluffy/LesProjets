// Direct LINE share intent — given how dominant LINE is for this app's
// actual audience, a one-tap "share to LINE" is more reliable than relying
// on the generic Web Share API/clipboard fallback for the common case.
//
// Top-level navigation, not window.open: pumgoda's liff.js documents a
// known iOS Safari bug where window.open leaves a stray "about:blank" tab
// when the hand-off to the LINE app doesn't complete inside the popup.
// Navigating the current tab avoids that; on mobile with LINE installed
// this hands off to the app via universal link, and the page stays in
// browser history (Back returns to it).
//
// No LIFF integration here (pumgoda's shareToLine uses LIFF's
// shareTargetPicker when running inside LINE's own in-app browser, for a
// slightly smoother in-app picker) — that needs a LIFF channel registered
// in the LINE Developers Console, a manual one-time external setup step
// this app doesn't have yet. This fallback-only version still works
// correctly everywhere, just without that extra polish.
export function shareToLine(text) {
  window.location.href = `https://line.me/R/share?text=${encodeURIComponent(text)}`
}
