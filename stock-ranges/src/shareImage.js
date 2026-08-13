import { tagHue } from './tagColor.js'
import { formatPrice, maskPrice } from './format.js'

const WIDTH = 720
const PAD = 36
const SCALE = 2
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

function money(masked, value, currency) {
  return masked ? maskPrice(currency) : formatPrice(value, currency)
}

// Draws a fixed-style (always dark) portfolio summary card to an off-screen
// canvas and resolves a PNG blob — independent of the app's own light/dark
// theme so a shared image always reads well regardless of who opens it.
// Respects the caller's mask state so a masked wallet never leaks amounts
// through the shared image either.
export function generateSummaryImage({ s, summary, allocationItems, currency, masked, appName }) {
  const rows = allocationItems.slice(0, 8)
  const overflowCount = allocationItems.length - rows.length

  const headerH = 84
  const statsH = 96
  const barH = 20
  const legendRowH = 26
  const legendH = rows.length * legendRowH + (overflowCount > 0 ? 22 : 0)
  const footerH = 36
  const height = headerH + statsH + barH + 28 + legendH + footerH

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH * SCALE
  canvas.height = height * SCALE
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  ctx.fillStyle = '#12141a'
  ctx.fillRect(0, 0, WIDTH, height)

  ctx.fillStyle = '#f2f3f5'
  ctx.font = `700 24px ${SANS}`
  ctx.fillText(appName, PAD, 44)

  ctx.fillStyle = '#8a90a0'
  ctx.font = `400 13px ${SANS}`
  const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  ctx.fillText(dateStr, PAD, 64)

  ctx.strokeStyle = '#262a33'
  ctx.beginPath()
  ctx.moveTo(PAD, headerH)
  ctx.lineTo(WIDTH - PAD, headerH)
  ctx.stroke()

  const stats = [
    [s.summaryCostBasis, money(masked, summary.costBasis, currency), null],
    [s.summaryMarketValue, money(masked, summary.marketValue, currency), null],
    [s.summaryUnrealizedPL, masked ? maskPrice(currency) : `${summary.unrealizedPL >= 0 ? '+' : ''}${formatPrice(summary.unrealizedPL, currency)}`, summary.unrealizedPL >= 0 ? '#4ade80' : '#f87171'],
    [s.estPerMonth, money(masked, summary.perMonth, currency), null],
    [s.estPerQuarter, money(masked, summary.perQuarter, currency), null],
  ]
  const colW = (WIDTH - PAD * 2) / stats.length
  const statsY = headerH + 34
  stats.forEach(([label, value, color], i) => {
    const x = PAD + i * colW
    ctx.fillStyle = '#8a90a0'
    ctx.font = `600 11px ${SANS}`
    ctx.fillText(label.toUpperCase(), x, statsY)
    ctx.fillStyle = color || '#f2f3f5'
    ctx.font = `700 15px ${MONO}`
    ctx.fillText(value, x, statsY + 22)
  })

  const barY = headerH + statsH
  const barX = PAD
  const barW = WIDTH - PAD * 2
  if (summary.marketValue > 0 && rows.length) {
    let cursor = barX
    rows.forEach((item) => {
      const w = (item.value / summary.marketValue) * barW
      ctx.fillStyle = `hsl(${tagHue(item.symbol)} 60% 55%)`
      ctx.fillRect(cursor, barY, Math.max(w, 0), barH)
      cursor += w
    })
  }

  let legendY = barY + barH + 30
  rows.forEach((item) => {
    const pct = summary.marketValue > 0 ? (item.value / summary.marketValue) * 100 : 0
    ctx.fillStyle = `hsl(${tagHue(item.symbol)} 60% 55%)`
    ctx.beginPath()
    ctx.arc(PAD + 5, legendY - 4, 5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#f2f3f5'
    ctx.font = `700 13px ${MONO}`
    ctx.fillText(item.symbol, PAD + 18, legendY)

    ctx.fillStyle = '#8a90a0'
    ctx.font = `400 12px ${MONO}`
    ctx.fillText(`${pct.toFixed(1)}%`, PAD + 100, legendY)

    ctx.fillStyle = '#c4c8d1'
    ctx.font = `400 12px ${MONO}`
    const valueText = masked ? maskPrice(currency) : formatPrice(item.value, currency)
    const vw = ctx.measureText(valueText).width
    ctx.fillText(valueText, WIDTH - PAD - vw, legendY)

    legendY += legendRowH
  })
  if (overflowCount > 0) {
    ctx.fillStyle = '#8a90a0'
    ctx.font = `400 12px ${SANS}`
    ctx.fillText(`+${overflowCount} more`, PAD + 18, legendY)
  }

  ctx.fillStyle = '#5b606c'
  ctx.font = `400 11px ${SANS}`
  ctx.fillText('pumbafluffycorgi.com/stock-ranges', PAD, height - 14)

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}
