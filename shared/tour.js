// Guided tour shared by every app (and the plain-HTML home page): dims the
// page, spotlights one real element at a time — found by its data-tour
// attribute — and explains it. Plain DOM, no React, so the home page can use
// it too; the React apps just call startTour() from a button or an effect.
//
//   startTour({
//     steps: [{ key, target?, before?, alt? }, …],
//     text: (key) => ({ title, body }),
//     labels: { next, back, skip, start, title },
//     doneKey,        // localStorage key set when the tour is finished or skipped
//     accent,         // the app's brand colour (spotlight outline, buttons)
//     onFinish,       // e.g. switch back to the first tab
//   })
//
// A step:
//   key     names its text: text(key)
//   target  data-tour value of the element to spotlight; none = centred card
//   before  run first (e.g. switch tab); may return a promise
//   alt     { key, target } used instead when `target` isn't on screen
//           (e.g. "account" when the sign-in button is gone)
// A step whose element (and alt) isn't on screen is skipped.
//
// Grew out of Bill Splitter's and village-77's tours (identical components
// before this file); village-77's larger-text mode zooms the page, which the
// rect conversion below allows for.

const PAD = 6 // spotlight margin around the element
const FIND_TRIES = 15 // × 50 ms: tab content may still be rendering
const STYLE_ID = 'pf-tour-style'

export function tourDone(doneKey) {
  try { return localStorage.getItem(doneKey) === '1' } catch { return true }
}

function markDone(doneKey) {
  try { localStorage.setItem(doneKey, '1') } catch { /* private mode */ }
}

// village-77's larger-text mode sets `zoom` on <html>: element rects come in
// screen pixels but the overlay is drawn inside the zoomed page.
const pageZoom = () => parseFloat(document.documentElement.style.zoom) || 1
function cssRect(el) {
  const r = el.getBoundingClientRect()
  const z = pageZoom()
  return { top: r.top / z, left: r.left / z, width: r.width / z, height: r.height / z, bottom: r.bottom / z }
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
.pf-tour { position: fixed; inset: 0; z-index: 2147483000; font-family: inherit; }
.pf-tour-dim { position: absolute; inset: 0; background: rgba(0,0,0,.6); }
.pf-tour-spot { position: fixed; border-radius: 12px; box-shadow: 0 0 0 9999px rgba(0,0,0,.6);
  outline: 3px solid var(--pf-tour-accent); pointer-events: none;
  transition: top .25s, left .25s, width .25s, height .25s; }
.pf-tour-card { position: fixed; left: 16px; right: 16px; max-width: 380px; margin: 0 auto;
  background: var(--pf-tour-bg); color: var(--pf-tour-fg); border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,.3); padding: 16px 18px 14px; box-sizing: border-box;
  animation: pf-tour-pop .2s ease-out; }
.pf-tour-card[data-centre] { top: 50%; transform: translateY(-50%); }
@keyframes pf-tour-pop { from { opacity: 0 } to { opacity: 1 } }
.pf-tour-count { margin: 0; font-size: 12px; opacity: .6; font-variant-numeric: tabular-nums; }
.pf-tour-title { margin: 2px 0 6px; font-size: 18px; font-weight: 600; line-height: 1.3; }
.pf-tour-body { margin: 0; font-size: 14px; line-height: 1.55; opacity: .85; }
.pf-tour-dots { display: flex; gap: 5px; margin: 12px 0 10px; }
.pf-tour-dots span { width: 6px; height: 6px; border-radius: 3px; background: currentColor; opacity: .25; }
.pf-tour-dots span[data-on] { width: 16px; background: var(--pf-tour-accent); opacity: 1; }
.pf-tour-buttons { display: flex; align-items: center; gap: 8px; }
.pf-tour-buttons .pf-tour-spacer { flex: 1; }
.pf-tour-card button { font: inherit; cursor: pointer; }
.pf-tour-skip { border: none; background: none; color: inherit; opacity: .7; font-size: 13px; padding: 10px 4px; }
.pf-tour-back, .pf-tour-next { border-radius: 999px; padding: 9px 16px; font-size: 14px; font-weight: 500; min-height: 40px; }
.pf-tour-back { background: transparent; color: inherit; border: 1px solid currentColor; opacity: .8; }
.pf-tour-next { background: var(--pf-tour-accent); color: #fff; border: none; }
@media (prefers-reduced-motion: reduce) { .pf-tour-spot { transition: none } .pf-tour-card { animation: none } }
`
  document.head.appendChild(style)
}

// The card uses the page's own colours, so it fits light and dark themes in
// every app without knowing each app's colour tokens.
function pageColours() {
  const body = getComputedStyle(document.body)
  let bg = body.backgroundColor
  if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') bg = getComputedStyle(document.documentElement).backgroundColor
  if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') bg = '#ffffff'
  return { bg, fg: body.color || '#1a1a1a' }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// Returns { close, destroy }: close() counts as finished (doneKey set,
// onFinish called); destroy() just removes it (a React effect's cleanup).
export function startTour({ steps, text, labels, doneKey, accent = '#c45c1a', onFinish }) {
  injectStyle()
  const { bg, fg } = pageColours()
  const root = document.createElement('div')
  root.className = 'pf-tour'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', labels.title || '')
  root.style.setProperty('--pf-tour-accent', accent)
  root.style.setProperty('--pf-tour-bg', bg)
  root.style.setProperty('--pf-tour-fg', fg)
  document.body.appendChild(root)

  let i = 0
  let seen = [] // steps actually shown, for Back (skipped ones aren't)
  let el = null // the spotlit element
  let run = 0 // guards against an older step's async work finishing late
  let closed = false

  const teardown = () => {
    closed = true
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('resize', reframe)
    window.removeEventListener('scroll', reframe, true)
    root.remove()
  }
  const finish = () => {
    if (closed) return
    teardown()
    markDone(doneKey)
    onFinish?.()
  }

  function render(step, rect) {
    root.textContent = ''
    if (rect) {
      const spot = document.createElement('div')
      spot.className = 'pf-tour-spot'
      Object.assign(spot.style, {
        top: rect.top - PAD + 'px', left: rect.left - PAD + 'px',
        width: rect.width + PAD * 2 + 'px', height: rect.height + PAD * 2 + 'px',
      })
      root.appendChild(spot)
    } else {
      const dim = document.createElement('div')
      dim.className = 'pf-tour-dim'
      root.appendChild(dim)
    }

    const { title, body } = text(step.key) || {}
    const card = document.createElement('div')
    card.className = 'pf-tour-card'
    if (!rect) card.setAttribute('data-centre', '')
    const last = i === steps.length - 1
    card.innerHTML = `
      <p class="pf-tour-count"></p>
      <h2 class="pf-tour-title"></h2>
      <p class="pf-tour-body"></p>
      <div class="pf-tour-dots" aria-hidden="true">${steps.map((_, n) => `<span${n === i ? ' data-on' : ''}></span>`).join('')}</div>
      <div class="pf-tour-buttons">
        ${last ? '' : '<button type="button" class="pf-tour-skip"></button>'}
        <span class="pf-tour-spacer"></span>
        ${seen.length ? '<button type="button" class="pf-tour-back"></button>' : ''}
        <button type="button" class="pf-tour-next"></button>
      </div>`
    card.querySelector('.pf-tour-count').textContent = `${i + 1} / ${steps.length}`
    card.querySelector('.pf-tour-title').textContent = title || ''
    card.querySelector('.pf-tour-body').textContent = body || ''
    const skip = card.querySelector('.pf-tour-skip')
    if (skip) { skip.textContent = labels.skip; skip.onclick = finish }
    const back = card.querySelector('.pf-tour-back')
    if (back) { back.textContent = labels.back; back.onclick = goBack }
    const next = card.querySelector('.pf-tour-next')
    next.textContent = last ? labels.start : labels.next
    next.onclick = goNext
    root.appendChild(card)
    if (rect) placeCard(card, rect)
    next.focus({ preventScroll: true })
  }

  // Below the spotlight, or above it; when neither fits (an element taller
  // than the screen), pinned to the bottom of the screen over it.
  function placeCard(card, rect) {
    const vh = window.innerHeight / pageZoom()
    const h = card.getBoundingClientRect().height / pageZoom()
    const below = rect.bottom + PAD + 12
    const aboveBottom = rect.top - PAD - 12 // card's bottom edge when above
    card.style.top = ''
    card.style.bottom = ''
    if (below + h <= vh - 8) card.style.top = below + 'px'
    else if (aboveBottom - h >= 8) card.style.bottom = vh - aboveBottom + 'px'
    else card.style.bottom = '16px'
  }

  async function show() {
    const mine = ++run
    const base = steps[i]
    el = null
    root.textContent = '' // nothing shown while looking, so text never flashes before its element
    if (base.before) await base.before()
    if (mine !== run || closed) return
    if (!base.target) { render(base, null); return }
    for (let tries = 0; tries < FIND_TRIES; tries++) {
      let step = base
      let found = document.querySelector(`[data-tour="${base.target}"]`)
      if (!visible(found) && base.alt) {
        step = { ...base, ...base.alt }
        found = document.querySelector(`[data-tour="${base.alt.target}"]`)
      }
      if (visible(found)) {
        // Only scroll when it's off screen, and only up / down: centring a
        // header button sideways shifted the whole page on phones.
        const r = found.getBoundingClientRect()
        if (r.top < 0 || r.bottom > window.innerHeight) found.scrollIntoView({ block: 'center', inline: 'nearest' })
        el = found
        render(step, cssRect(found))
        return
      }
      await wait(50)
      if (mine !== run || closed) return
    }
    // Not on screen: skip it.
    if (i < steps.length - 1) { i++; show() } else finish()
  }

  function visible(node) {
    if (!node) return false
    const r = node.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }

  function goNext() {
    if (i === steps.length - 1) return finish()
    seen = [...seen, i]
    i++
    show()
  }
  function goBack() {
    if (!seen.length) return
    i = seen[seen.length - 1]
    seen = seen.slice(0, -1)
    show()
  }

  // Keep the spotlight on the element when the page resizes or scrolls.
  function reframe() {
    if (!el || closed) return
    const spot = root.querySelector('.pf-tour-spot')
    if (!spot) return
    const rect = cssRect(el)
    Object.assign(spot.style, {
      top: rect.top - PAD + 'px', left: rect.left - PAD + 'px',
      width: rect.width + PAD * 2 + 'px', height: rect.height + PAD * 2 + 'px',
    })
  }

  function onKey(e) {
    if (e.key === 'Escape') finish()
    else if (e.key === 'ArrowRight') goNext()
    else if (e.key === 'ArrowLeft') goBack()
  }
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', reframe)
  window.addEventListener('scroll', reframe, true)

  show()
  return { close: finish, destroy: () => { if (!closed) teardown() } }
}
