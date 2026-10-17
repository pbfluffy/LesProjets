// Browser side of the build stamp from shared/viteBuildInfo.js. Shows a small
// "v1.0042"-style line under each app so it's easy to tell whether a phone is
// running the latest deploy (every app shows the same version for the same
// deploy). Plain DOM, not React, so it still shows when the app has crashed.

/* global __APP_BUILD__ */
export const BUILD = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : { version: 'dev' }

export function buildLabel() {
  return `v${BUILD.version}`
}

export function mountVersionLabel() {
  if (typeof document === 'undefined' || document.getElementById('app-build-label')) return
  const el = document.createElement('div')
  el.id = 'app-build-label'
  el.textContent = buildLabel()
  el.title = 'App version'
  Object.assign(el.style, {
    textAlign: 'center',
    font: '11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
    opacity: '0.45',
    padding: '12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)',
    userSelect: 'text',
  })
  const root = document.getElementById('root')
  ;(root?.parentNode || document.body).insertBefore(el, root ? root.nextSibling : null)
  console.info(`[build] ${buildLabel()}`)

  // Apps with a fixed bottom tab bar (e.g. Pumgoda) would cover the label at
  // the end of the page, so leave room for whatever is fixed along the bottom
  // edge. Re-measured once the app has rendered and on resize.
  const clearBottomBar = () => {
    let overlap = 0
    for (const n of document.elementsFromPoint(window.innerWidth / 2, window.innerHeight - 2)) {
      if (n === el || n === document.body || n === document.documentElement) continue
      const pos = getComputedStyle(n).position
      if (pos !== 'fixed' && pos !== 'sticky') continue
      const top = n.getBoundingClientRect().top
      if (top > window.innerHeight / 2) overlap = Math.max(overlap, window.innerHeight - top)
    }
    el.style.paddingBottom = `calc(env(safe-area-inset-bottom, 0px) + ${12 + Math.ceil(overlap)}px)`
  }
  setTimeout(clearBottomBar, 1500)
  window.addEventListener('resize', clearBottomBar)
}
