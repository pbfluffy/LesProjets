// Wallet notifications + daily portfolio value, run by check-alerts.mjs on
// the same GitHub Actions schedule. Reads `portfolio:{uid}` from KV (the
// app mirrors each signed-in user's holdings + wallet notification settings
// there via the Worker's /alerts `setPortfolio` route) and, per user:
//   #4 cost alerts — a holding moving below the user's average cost, or to
//      +20% or more on it (per-holding toggles; fires on the transition only,
//      like the buy/sell zone alerts — state kept in `coststate:{uid}:{sym}`)
//   #5 ex-dividend reminders — 0–3 days before the next *estimated*
//      ex-dividend date (estimateNextDividend's cadence guess), once per date
//   #8 earnings reminders — a US-listed holding reporting today or on the next
//      trading day (US Eastern) per Nasdaq's public calendar, once per report date;
//      best-effort, see earnings.mjs
//   #6 weekly summary — on Mondays (Asia/Bangkok): value, change since last
//      week's summary, biggest mover
//   #7 daily value — `pfhistory:{uid}` { 'YYYY-MM-DD': {...} } for the app's
//      portfolio chart, so it fills in on days the app isn't opened
// Notifications go to the push subscriptions in the user's `alerts:{uid}`
// entry (none = nothing sent, the daily value is still recorded) and into
// their notification history.
import { estimateNextDividend } from '../../src/wallet.js'
import { convert } from '../../src/fx.js'
import { formatPrice } from '../../src/format.js'
import { isMarketOpenFor } from '../../src/marketHours.js'
import { fetchEarningsDay, matchEarnings, usEasternDates, usEasternMinutes, reportAlreadyOut } from './earnings.mjs'

const GAIN_THRESHOLD = 20 // % on cost for the "gain" cost alert
const HYSTERESIS = 1 // % points the price must clear a line by before it can alert again
const EXDIV_DAYS_AHEAD = 3
const HISTORY_MAX_DAYS = 400
const SNAPSHOT_MIN_GAP_MS = 6 * 3600e3 // rewrite today's value at most every 6h (KV write budget)

const COPY = {
  en: {
    below: (name) => `${name} fell below your cost`,
    belowBody: (price, cost, pct) => `${price} · cost ${cost} · ${pct}% · tap to view`,
    gain: (name) => `${name} is up ${GAIN_THRESHOLD}%+ on your cost`,
    gainBody: (price, cost, pct) => `${price} · +${pct}% on cost ${cost} · tap to view`,
    exdiv: (name, days) => (days === 0 ? `${name} goes ex-dividend today (estimate)` : `${name} goes ex-dividend in ${days} day${days === 1 ? '' : 's'} (estimate)`),
    exdivBody: (date, amount) => `Around ${date} · dividend ≈ ${amount} for your shares · own them before the ex-date to qualify`,
    weekly: (value) => `Weekly portfolio: ${value}`,
    weeklyChange: (abs, pct) => `${abs} (${pct}%) since last week`,
    weeklyMover: (sym, pct) => `biggest move: ${sym} ${pct}%`,
    earnings: (name, when, date) => (when === 'today' ? `${name} reports earnings today` : when === 'tomorrow' ? `${name} reports earnings tomorrow` : `${name} reports earnings on ${date}`),
    earningsBody: (date, time, eps) => [
      `${date} (US date)`,
      time === 'pre' ? 'before the market opens' : time === 'after' ? 'after the market closes' : null,
      eps ? `EPS forecast ${eps}` : null,
    ].filter(Boolean).join(' · '),
  },
  th: {
    below: (name) => `${name} ราคาต่ำกว่าทุนแล้ว`,
    belowBody: (price, cost, pct) => `${price} · ทุน ${cost} · ${pct}% · แตะเพื่อดู`,
    gain: (name) => `${name} กำไรเกิน ${GAIN_THRESHOLD}% จากทุนแล้ว`,
    gainBody: (price, cost, pct) => `${price} · +${pct}% จากทุน ${cost} · แตะเพื่อดู`,
    exdiv: (name, days) => (days === 0 ? `${name} ขึ้น XD วันนี้ (ประมาณการ)` : `${name} จะขึ้น XD ในอีก ${days} วัน (ประมาณการ)`),
    exdivBody: (date, amount) => `ราว ${date} · ปันผลประมาณ ${amount} ตามจำนวนที่ถือ · ต้องถือก่อนวัน XD จึงจะได้ปันผล`,
    weekly: (value) => `สรุปพอร์ตรายสัปดาห์: ${value}`,
    weeklyChange: (abs, pct) => `${abs} (${pct}%) จากสัปดาห์ก่อน`,
    weeklyMover: (sym, pct) => `เคลื่อนไหวมากสุด: ${sym} ${pct}%`,
    earnings: (name, when, date) => (when === 'today' ? `${name} ประกาศงบวันนี้` : when === 'tomorrow' ? `${name} ประกาศงบพรุ่งนี้` : `${name} ประกาศงบวันที่ ${date}`),
    earningsBody: (date, time, eps) => [
      `${date} (วันที่ตามเวลาสหรัฐฯ)`,
      time === 'pre' ? 'ก่อนตลาดเปิด' : time === 'after' ? 'หลังตลาดปิด' : null,
      eps ? `คาดการณ์ EPS ${eps}` : null,
    ].filter(Boolean).join(' · '),
  },
}

const signed = (n, digits = 2) => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`

// Thai local date parts (the app's users are in Thailand; the app's own
// history keys use the device's local date, which is the same thing).
function bangkokNow() {
  const d = new Date(Date.now() + 7 * 3600e3)
  return {
    date: d.toISOString().slice(0, 10),
    weekday: d.getUTCDay(), // 1 = Monday
  }
}

function fmtDate(sec, lang) {
  return new Date(sec * 1000).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' })
}

// % change over the last ~week of daily closes (5 trading days back).
function weekChangePct(prices) {
  if (!Array.isArray(prices) || prices.length < 6) return null
  const now = prices[prices.length - 1]
  const then = prices[prices.length - 6]
  return then > 0 ? (now / then - 1) * 100 : null
}

const EARNINGS_CACHE_KEY = 'earningscal'
// An `earn:` dedupe key only matters while its report date is today or the next
// trading day (at most ~4 days out over a weekend/holiday), so it can expire.
const EARNINGS_DEDUPE_TTL_S = 7 * 86400
// An `exdiv:` key only matters for the 0-3 days (EXDIV_DAYS_AHEAD) before its
// estimated ex-date; the date is part of the key, so a moved estimate is a new
// key anyway. Generous margin over that window.
const EXDIV_DEDUPE_TTL_S = 14 * 86400
const EARNINGS_CACHE_MS = 6 * 3600e3 // the calendar gains rows over time, but hourly refetches are wasteful

// Today's and the next weekday's US calendar rows, cached in one KV entry
// ({ 'YYYY-MM-DD': { ts, rows } }, only those two dates kept) so the hourly
// runs share one fetch per ~6h. Never throws: a failed day falls back to its
// stale cache, else null, and the reason is logged for the run summary.
async function loadEarningsCalendar({ kvGet, kvPut }) {
  const { today, tomorrow, next } = usEasternDates()
  const cache = (await kvGet(EARNINGS_CACHE_KEY)) || {}
  const kept = {} // what the cache will hold afterwards
  const days = {}
  const errors = []
  for (const date of [today, next]) {
    const hit = cache[date]
    if (hit && Array.isArray(hit.rows) && Date.now() - hit.ts < EARNINGS_CACHE_MS) {
      kept[date] = hit
      days[date] = hit.rows
      continue
    }
    try {
      const rows = await fetchEarningsDay(date)
      kept[date] = { ts: Date.now(), rows }
      days[date] = rows
    } catch (err) {
      errors.push(`${date}: ${err.message}`)
      if (hit && Array.isArray(hit.rows)) { kept[date] = hit; days[date] = hit.rows } else days[date] = null
    }
  }
  if (JSON.stringify(Object.keys(kept)) !== JSON.stringify(Object.keys(cache)) || Object.keys(kept).some((d) => kept[d] !== cache[d])) {
    await kvPut(EARNINGS_CACHE_KEY, kept).catch((err) => errors.push(`cache write: ${err.message}`))
  }
  console.log(`Earnings calendar: ${today} ${days[today] ? `${days[today].length} rows` : 'unavailable'}, ${next} ${days[next] ? `${days[next].length} rows` : 'unavailable'}${errors.length ? ` (${errors.join('; ')})` : ''}`)
  return { today, tomorrow, next, days }
}

export async function runPortfolioChecks({ kvListKeys, kvGet, kvPut, sendPush, pruneSubscription, addHistory, getQuote, inBatches, rates, marketOpen }) {
  const keys = await kvListKeys('portfolio:')
  if (!keys.length) {
    console.log('No portfolios.')
    return
  }
  const portfolios = []
  for (const key of keys) {
    const p = await kvGet(key)
    if (p && typeof p.holdings === 'object') portfolios.push({ uid: key.slice('portfolio:'.length), p })
  }

  // One 2y daily fetch per distinct symbol (current price, dividends, closes).
  const symbols = [...new Set(portfolios.flatMap(({ p }) => Object.keys(p.holdings)))]
  const quotes = {}
  await inBatches(symbols, 6, async (sym) => { quotes[sym] = await getQuote(sym, '2y').catch(() => null) })

  // Only fetched when someone opted in; a failure just means no earnings
  // reminders this run.
  let earningsCal = null
  if (portfolios.some(({ p }) => p.prefs?.earnings)) {
    earningsCal = await loadEarningsCalendar({ kvGet, kvPut }).catch((err) => {
      console.log(`Earnings calendar skipped: ${err.message}`)
      return null
    })
  }

  const { date: today, weekday } = bangkokNow()
  const nowSec = Date.now() / 1000
  let sent = 0

  for (const { uid, p } of portfolios) {
    const lang = p.lang === 'th' ? 'th' : 'en'
    const copy = COPY[lang]
    const cur = p.currency === 'THB' ? 'THB' : 'USD'
    const notes = [] // { payload, item }
    let marketValue = 0
    let costBasis = 0
    let complete = true
    let mover = null // { sym, pct }

    for (const [sym, h] of Object.entries(p.holdings)) {
      const q = quotes[sym]
      const price = q ? convert(q.current, q.currency, cur, rates) : null
      const cost = convert(h.avgCost, h.costCurrency, cur, rates)
      if (price === null || cost === null) { complete = false; continue }
      marketValue += price * h.qty
      costBasis += cost * h.qty
      const name = q.name && q.name !== sym ? q.name : sym
      const isCrypto = q.instrumentType === 'CRYPTOCURRENCY'

      const wk = weekChangePct(q.prices)
      if (wk !== null && (!mover || Math.abs(wk) > Math.abs(mover.pct))) mover = { sym, pct: wk }

      // #4 cost alerts (stocks only while their own market is open, like
      // zone alerts). A state is left only once the price is HYSTERESIS
      // points clear of the line, so a price sitting right at cost doesn't
      // alert on every small move across it.
      if ((h.costAlerts?.below || h.costAlerts?.gain) && (isMarketOpenFor(sym, marketOpen) || isCrypto) && cost > 0) {
        const pct = (price / cost - 1) * 100
        const key = `coststate:${uid}:${sym}`
        const prev = await kvGet(key)
        let state = pct < 0 ? 'below' : pct >= GAIN_THRESHOLD ? 'gain' : 'normal'
        if (prev?.state === 'below' && pct < HYSTERESIS) state = 'below'
        if (prev?.state === 'gain' && pct > GAIN_THRESHOLD - HYSTERESIS) state = 'gain'
        if (prev?.state !== state) {
          await kvPut(key, { state, ts: Date.now() })
          // First sight of this holding only seeds the state (no alert).
          if (prev && state !== 'normal' && h.costAlerts[state]) {
            const title = state === 'below' ? copy.below(name) : copy.gain(name)
            const body = state === 'below'
              ? copy.belowBody(formatPrice(price, cur), formatPrice(cost, cur), pct.toFixed(1))
              : copy.gainBody(formatPrice(price, cur), formatPrice(cost, cur), pct.toFixed(1))
            notes.push({ payload: { title, body, tag: `cost-${sym}`, symbol: sym }, item: { kind: state, symbol: sym, title, body } })
          }
        }
      }

      // #5 ex-dividend reminder
      if (p.prefs?.exDividend && !isCrypto && q.dividends?.length) {
        const next = estimateNextDividend(q.dividends, h.qty)
        const days = next ? Math.floor((next.date - nowSec) / 86400) : null
        if (days !== null && days >= 0 && days <= EXDIV_DAYS_AHEAD) {
          const key = `exdiv:${uid}:${sym}:${new Date(next.date * 1000).toISOString().slice(0, 10)}`
          if (!(await kvGet(key))) {
            await kvPut(key, { ts: Date.now() }, { expirationTtl: EXDIV_DEDUPE_TTL_S })
            const amount = convert(next.amount, q.currency, cur, rates)
            const title = copy.exdiv(name, days)
            const body = copy.exdivBody(fmtDate(next.date, lang), formatPrice(amount ?? next.amount, amount !== null ? cur : q.currency))
            notes.push({ payload: { title, body, tag: `exdiv-${sym}`, symbol: sym }, item: { kind: 'exdiv', symbol: sym, title, body } })
          }
        }
      }
    }

    const holdingCount = Object.keys(p.holdings).length

    // #8 earnings reminders — independent of price availability, so it sits
    // outside the per-holding loop above. One notification per report date
    // (the dedupe key carries the date), sent the first run it falls within
    // today/next trading day. A report that is already out today is skipped:
    // announcing it as upcoming would be wrong (e.g. the setting was turned on
    // mid-afternoon for a pre-market reporter).
    if (p.prefs?.earnings && earningsCal) {
      const etMinutes = usEasternMinutes()
      for (const date of [earningsCal.today, earningsCal.next]) {
        const when = date === earningsCal.today ? 'today' : date === earningsCal.tomorrow ? 'tomorrow' : 'later'
        const rows = earningsCal.days[date]
        if (!rows) continue
        for (const { symbol, row } of matchEarnings(Object.keys(p.holdings), rows)) {
          if (when === 'today' && reportAlreadyOut(row, etMinutes)) continue
          const key = `earn:${uid}:${symbol}:${date}`
          if (await kvGet(key)) continue
          await kvPut(key, { ts: Date.now() }, { expirationTtl: EARNINGS_DEDUPE_TTL_S })
          const q = quotes[symbol]
          const name = q?.name && q.name !== symbol ? q.name : symbol
          const dateLabel = fmtDate(Date.parse(`${date}T12:00:00Z`) / 1000, lang)
          const title = copy.earnings(name, when, dateLabel)
          const body = copy.earningsBody(dateLabel, row.time, row.eps)
          notes.push({ payload: { title, body, tag: `earnings-${symbol}`, symbol }, item: { kind: 'earnings', symbol, title, body } })
        }
      }
    }

    // #7 daily portfolio value for the app's chart
    if (complete && holdingCount) {
      const key = `pfhistory:${uid}`
      const hist = (await kvGet(key)) || {}
      const existing = hist[today]
      if (!existing || existing.currency !== cur || Date.now() - (existing.updatedAt || 0) > SNAPSHOT_MIN_GAP_MS) {
        hist[today] = { marketValue, costBasis, currency: cur, updatedAt: Date.now(), source: 'scheduled' }
        const dates = Object.keys(hist).sort()
        for (const d of dates.slice(0, Math.max(0, dates.length - HISTORY_MAX_DAYS))) delete hist[d]
        await kvPut(key, hist)
      }
    }

    // #6 weekly summary (Monday, Thai time)
    if (p.prefs?.weekly && weekday === 1 && complete && holdingCount) {
      const key = `weekly:${uid}`
      const last = await kvGet(key)
      if (last?.date !== today) {
        await kvPut(key, { date: today, marketValue, currency: cur })
        const parts = []
        if (last && last.currency === cur && last.marketValue > 0) {
          const diff = marketValue - last.marketValue
          parts.push(copy.weeklyChange(`${diff >= 0 ? '+' : ''}${formatPrice(diff, cur)}`, signed((diff / last.marketValue) * 100)))
        }
        if (mover) parts.push(copy.weeklyMover(mover.sym, signed(mover.pct, 1)))
        const title = copy.weekly(formatPrice(marketValue, cur))
        const body = parts.join(' · ')
        notes.push({ payload: { title, body, tag: 'weekly' }, item: { kind: 'weekly', title, body } })
      }
    }

    if (!notes.length) continue
    const alertsEntry = await kvGet(`alerts:${uid}`)
    const subscriptions = alertsEntry?.subscriptions || []
    const items = []
    for (const { payload, item } of notes) {
      let delivered = 0
      for (const sub of subscriptions) {
        const result = await sendPush(sub, payload)
        if (result === 'ok') delivered++
        if (result === 'gone') await pruneSubscription(uid, sub.endpoint)
      }
      sent++
      items.push({ ts: Date.now(), ...item, delivered, devices: subscriptions.length })
    }
    await addHistory(uid, items)
  }
  console.log(`${sent} portfolio notification(s) sent across ${portfolios.length} portfolio(s).`)
}
