// hours — structured opening-hours model for Pumgoda (#108).
//
// A place may carry an optional structured `openingHours` object:
//   { tz?, always?: true, weekly?: [{open,close}], perDay?: { mon:[{open,close}], ... } }
// where times are 24h "HH:MM" and an interval with close <= open spans midnight.
//
// normalizeHours() collapses either that object OR the legacy free-text `hours`
// string into a canonical weekly schedule. This means "open now" works on
// existing free-text data today and improves as structured objects are backfilled
// — no data migration required (#104 consumes isOpenNow / formatHours).

import { STRINGS } from '../i18n/strings'

const DEFAULT_TZ = 'Asia/Bangkok'
const DAY_KEYS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }

const emptyWeek = () => [[], [], [], [], [], [], []]
const hm = (s) => {
  const [h, m] = String(s).split(':').map(Number)
  return h * 60 + m
}

// Validate/clean a single {open, close} interval into "HH:MM" strings.
function cleanInterval(iv) {
  if (!iv || typeof iv !== 'object') return null
  const o = parseTimeToken(iv.open)
  const c = parseTimeToken(iv.close)
  return o && c ? { open: o, close: c } : null
}

// Parse a single time token: "7 AM", "8:30 PM", "18:00", "6pm" → "HH:MM" (24h).
function parseTimeToken(tok) {
  if (tok == null) return null
  const m = String(tok).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (!m) return null
  let h = Number(m[1])
  const min = m[2] ? Number(m[2]) : 0
  const ap = m[3] ? m[3].toLowerCase() : null
  if (ap === 'pm' && h < 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

// Best-effort parse of the legacy free-text `hours` string.
function parseLegacyHours(raw) {
  if (!raw || typeof raw !== 'string') return null
  // Collapse narrow/non-breaking spaces the dataset uses before AM/PM.
  const s = raw.replace(/[\u202f\u00a0\u2009]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!s) return null
  if (/24\s*\/?\s*7|24\s*h(ou)?rs?|open\s*24|ตลอด\s*24|24\s*ชม/i.test(s)) return { always: true }
  const parts = s.split(/\s*(?:–|—|-|to|ถึง)\s*/i)
  if (parts.length === 2) {
    const o = parseTimeToken(parts[0])
    const c = parseTimeToken(parts[1])
    if (o && c) return { weekly: [{ open: o, close: c }] }
  }
  return null
}

// Canonicalize a place's hours into { tz, always, week:[d0..d6 of intervals] } or null.
export function normalizeHours(place) {
  const oh = place && place.openingHours
  if (oh && typeof oh === 'object') {
    const tz = oh.tz || DEFAULT_TZ
    if (oh.always) return { tz, always: true, week: emptyWeek() }
    if (Array.isArray(oh.weekly)) {
      const ivs = oh.weekly.map(cleanInterval).filter(Boolean)
      const week = emptyWeek()
      for (let d = 0; d < 7; d++) week[d] = ivs.slice()
      return { tz, always: false, week }
    }
    if (oh.perDay && typeof oh.perDay === 'object') {
      const week = emptyWeek()
      for (const k in oh.perDay) {
        const d = DAY_KEYS[k.toLowerCase()]
        if (d == null) continue
        week[d] = Array.isArray(oh.perDay[k]) ? oh.perDay[k].map(cleanInterval).filter(Boolean) : []
      }
      return { tz, always: false, week }
    }
  }
  const parsed = parseLegacyHours(place && place.hours)
  if (!parsed) return null
  if (parsed.always) return { tz: DEFAULT_TZ, always: true, week: emptyWeek() }
  const week = emptyWeek()
  for (let d = 0; d < 7; d++) week[d] = parsed.weekly.slice()
  return { tz: DEFAULT_TZ, always: false, week }
}

// Current weekday (0=Sun) and minutes-since-midnight in Asia/Bangkok.
function bkkNow(now) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DEFAULT_TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const get = (t) => parts.find((p) => p.type === t)?.value
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const h = Number(get('hour')) % 24
  const min = Number(get('minute'))
  return { day: map[get('weekday')] ?? 0, min: h * 60 + min }
}

// true / false / null (unknown). Handles overnight intervals (close <= open).
export function isOpenNow(place, now = new Date()) {
  const norm = normalizeHours(place)
  if (!norm) return null
  if (norm.always) return true
  const { day, min } = bkkNow(now)
  for (const iv of norm.week[day] || []) {
    const o = hm(iv.open)
    const c = hm(iv.close)
    if (c > o) { if (min >= o && min < c) return true } // same-day interval
    else if (min >= o) return true                       // evening side of overnight
  }
  // after-midnight tail of yesterday's overnight interval
  for (const iv of norm.week[(day + 6) % 7] || []) {
    const o = hm(iv.open)
    const c = hm(iv.close)
    if (c <= o && min < c) return true
  }
  return false
}

// 24h "HH:MM" → "7:00 AM" for display (matches the dataset's existing 12h style).
function fmt12(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const ap = h < 12 ? 'AM' : 'PM'
  let hh = h % 12
  if (hh === 0) hh = 12
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`
}

// Render a canonical schedule to one localized line, or null. Falls back to the
// caller's raw text when this returns null.
export function formatHours(norm, lang) {
  if (!norm) return null
  const H = (STRINGS[lang] || STRINGS.en).hours
  if (norm.always) return H.open24
  const ivStr = (ivs) => (ivs.length ? ivs.map((iv) => `${fmt12(iv.open)}–${fmt12(iv.close)}`).join(', ') : H.closed)
  const key = (d) => norm.week[d].map((iv) => `${iv.open}-${iv.close}`).join('|')
  const allSame = [0, 1, 2, 3, 4, 5, 6].every((d) => key(d) === key(0))
  if (allSame) {
    if (!norm.week[0].length) return H.closed
    return `${ivStr(norm.week[0])} · ${H.daily}`
  }
  // Per-day: group consecutive identical days (Mon→Sun display order).
  const order = [1, 2, 3, 4, 5, 6, 0]
  const segs = []
  let i = 0
  while (i < order.length) {
    let j = i
    while (j + 1 < order.length && key(order[j + 1]) === key(order[i])) j++
    const label = i === j ? H.days[order[i]] : `${H.days[order[i]]}–${H.days[order[j]]}`
    segs.push(`${label} ${ivStr(norm.week[order[i]])}`)
    i = j + 1
  }
  return segs.join(' · ')
}
