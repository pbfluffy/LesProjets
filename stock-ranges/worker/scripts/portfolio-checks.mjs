// Wallet notifications + daily portfolio value, run by check-alerts.mjs on
// the same GitHub Actions schedule. Reads `portfolio:{uid}` from KV (the
// app mirrors each signed-in user's holdings + wallet notification settings
// there via the Worker's /alerts `setPortfolio` route) and, per user:
//   #4 cost alerts — a holding moving below the user's average cost, or to
//      +20% or more on it (per-holding toggles; fires on the transition only,
//      like the buy/sell zone alerts — state kept in `coststate:{uid}:{sym}`)
//   #5 ex-dividend reminders — 0–3 days before the next *estimated*
//      ex-dividend date (estimateNextDividend's cadence guess), once per date
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
            await kvPut(key, { ts: Date.now() })
            const amount = convert(next.amount, q.currency, cur, rates)
            const title = copy.exdiv(name, days)
            const body = copy.exdivBody(fmtDate(next.date, lang), formatPrice(amount ?? next.amount, amount !== null ? cur : q.currency))
            notes.push({ payload: { title, body, tag: `exdiv-${sym}`, symbol: sym }, item: { kind: 'exdiv', symbol: sym, title, body } })
          }
        }
      }
    }

    const holdingCount = Object.keys(p.holdings).length

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
