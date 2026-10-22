// A short message at the bottom of the screen that fades after a few
// seconds — no component needed, so any handler can call it.
let current = null

export function toast(text, ms = 3500) {
  current?.remove()
  const el = document.createElement('div')
  el.className = 'village-toast'
  el.setAttribute('role', 'status')
  el.textContent = text
  document.body.appendChild(el)
  current = el
  setTimeout(() => {
    el.classList.add('village-toast-out')
    setTimeout(() => { el.remove(); if (current === el) current = null }, 300)
  }, ms)
}

// Phones (and tablets) can dial a tel: link; a computer can't, and just asks
// which app to open. Touch-first screens without a mouse count as phones.
export const canCall = () => window.matchMedia?.('(hover: none) and (pointer: coarse)').matches ?? true
