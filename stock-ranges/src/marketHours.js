// Whether the US market (NYSE/NASDAQ — every ticker this app tracks) is
// open right now, and when it opens/closes next. Computed purely from the
// current time against the standard 9:30am-4:00pm ET regular session, with
// the actual NYSE holiday calendar (including the two 1pm early closes) —
// no network call, no yearly-maintained date list. Everything is derived
// algorithmically so it stays correct across years on its own.

const NY_TZ = 'America/New_York'
const OPEN_MINUTES = 9 * 60 + 30
const REGULAR_CLOSE_MINUTES = 16 * 60
const EARLY_CLOSE_MINUTES = 13 * 60

// Reads a moment's wall-clock date/time as it reads in New York, via the
// browser's own tz database — handles EST/EDT automatically, no offset
// table to maintain.
function nyParts(date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: NY_TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short',
  })
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]))
  const WEEKDAY_NUM = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const hour = p.hour === '24' ? 0 : Number(p.hour) // some locales print midnight as "24"
  return {
    year: Number(p.year), month: Number(p.month), day: Number(p.day),
    weekday: WEEKDAY_NUM[p.weekday],
    minutesSinceMidnight: hour * 60 + Number(p.minute),
  }
}

// Converts a New York wall-clock date+time back to a real UTC instant.
// There's no direct API for this, so it guesses (treating the wall time as
// if it were already UTC), checks what that guess actually reads as in NY,
// and corrects by the difference — converges in one pass since the DST
// offset doesn't change within the few hours a guess could be off by.
function nyWallTimeToUtc(year, month, day, hour, minute) {
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute))
  for (let i = 0; i < 2; i++) {
    const p = nyParts(guess)
    const wantMinutes = hour * 60 + minute
    const gotMinutes = p.minutesSinceMidnight
    const dayDiff = Math.round((Date.UTC(p.year, p.month - 1, p.day) - Date.UTC(year, month - 1, day)) / 86400000)
    guess = new Date(guess.getTime() - (gotMinutes - wantMinutes + dayDiff * 1440) * 60000)
  }
  return guess
}

function utcWeekday(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

function addDays(year, month, day, delta) {
  const d = new Date(Date.UTC(year, month - 1, day + delta))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

// nth (1-4) weekday (0=Sun..6=Sat) of a given month.
function nthWeekdayOfMonth(year, month, weekday, n) {
  const firstWeekday = utcWeekday(year, month, 1)
  const offset = (weekday - firstWeekday + 7) % 7
  return 1 + offset + (n - 1) * 7
}

function lastWeekdayOfMonth(year, month, weekday) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const lastWeekday = utcWeekday(year, month, daysInMonth)
  return daysInMonth - ((lastWeekday - weekday + 7) % 7)
}

// Gauss's algorithm for the Gregorian Easter Sunday — needed for Good
// Friday, the one NYSE holiday with no fixed or nth-weekday rule.
function easterSunday(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return { month, day }
}

// A fixed-date holiday observed on the nearest weekday: shifted to Friday
// if it falls on Saturday, to Monday if it falls on Sunday.
function observedFixedDate(year, month, day) {
  const weekday = utcWeekday(year, month, day)
  if (weekday === 6) return { month, day: day - 1 }
  if (weekday === 0) return { month, day: day + 1 }
  return { month, day }
}

function nyseHolidays(year) {
  const easter = easterSunday(year)
  const goodFriday = addDays(year, easter.month, easter.day, -2)
  const holidays = [
    // New Year's Day: Sunday shifts forward to Jan 2, still in this
    // year. Saturday shifts backward to Dec 31 of the PREVIOUS year —
    // observedFixedDate can't express that (it only shifts within the
    // month/year it's given), so that case is skipped here and handled
    // below instead, appended to the previous year's own list.
    ...(utcWeekday(year, 1, 1) === 6 ? [] : [observedFixedDate(year, 1, 1)]),
    { month: 1, day: nthWeekdayOfMonth(year, 1, 1, 3) }, // MLK Day
    { month: 2, day: nthWeekdayOfMonth(year, 2, 1, 3) }, // Presidents Day
    { month: goodFriday.month, day: goodFriday.day },
    { month: 5, day: lastWeekdayOfMonth(year, 5, 1) }, // Memorial Day
    observedFixedDate(year, 6, 19), // Juneteenth
    observedFixedDate(year, 7, 4), // Independence Day
    { month: 9, day: nthWeekdayOfMonth(year, 9, 1, 1) }, // Labor Day
    { month: 11, day: nthWeekdayOfMonth(year, 11, 4, 4) }, // Thanksgiving
    observedFixedDate(year, 12, 25), // Christmas
  ]
  // If NEXT year's New Year's Day falls on a Saturday, NYSE observes it
  // this Dec 31 instead — a closure that falls within this calendar year.
  if (utcWeekday(year + 1, 1, 1) === 6) holidays.push({ month: 12, day: 31 })
  return holidays
}

// The two NYSE half-days: the Friday after Thanksgiving, and Christmas Eve
// when it falls on a weekday (skipped if Dec 24 lands on the weekend, since
// there's no trading that day to shorten).
function nyseEarlyCloseDays(year) {
  const days = [{ month: 11, day: nthWeekdayOfMonth(year, 11, 4, 4) + 1 }]
  const dec24Weekday = utcWeekday(year, 12, 24)
  if (dec24Weekday !== 0 && dec24Weekday !== 6) days.push({ month: 12, day: 24 })
  return days
}

function isTradingDay(year, month, day) {
  const weekday = utcWeekday(year, month, day)
  if (weekday === 0 || weekday === 6) return false
  return !nyseHolidays(year).some((h) => h.month === month && h.day === day)
}

function isEarlyCloseDay(year, month, day) {
  return nyseEarlyCloseDays(year).some((h) => h.month === month && h.day === day)
}

// { open: boolean, closesAt: Date|null, nextOpen: Date|null }
export function getMarketStatus(now = new Date()) {
  const ny = nyParts(now)

  if (isTradingDay(ny.year, ny.month, ny.day)) {
    const closeMinutes = isEarlyCloseDay(ny.year, ny.month, ny.day) ? EARLY_CLOSE_MINUTES : REGULAR_CLOSE_MINUTES
    if (ny.minutesSinceMidnight >= OPEN_MINUTES && ny.minutesSinceMidnight < closeMinutes) {
      const closesAt = nyWallTimeToUtc(ny.year, ny.month, ny.day, Math.floor(closeMinutes / 60), closeMinutes % 60)
      return { open: true, closesAt, nextOpen: null }
    }
    if (ny.minutesSinceMidnight < OPEN_MINUTES) {
      return { open: false, closesAt: null, nextOpen: nyWallTimeToUtc(ny.year, ny.month, ny.day, 9, 30) }
    }
  }

  let { year, month, day } = addDays(ny.year, ny.month, ny.day, 1)
  while (!isTradingDay(year, month, day)) {
    ({ year, month, day } = addDays(year, month, day, 1))
  }
  return { open: false, closesAt: null, nextOpen: nyWallTimeToUtc(year, month, day, 9, 30) }
}
