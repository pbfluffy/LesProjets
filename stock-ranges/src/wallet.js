// Pure calculation helpers for the Wallet tab — holdings profit/loss and
// DCA-style installment schedules. No React, no I/O, same style as
// deciles.js.

// Unrealized P/L for one holding, all inputs already in the same currency
// (callers convert with fx.js's convert() first — this file knows nothing
// about currency).
export function computeHoldingPL({ qty, avgCost, currentPrice }) {
  if (typeof qty !== 'number' || typeof avgCost !== 'number' || typeof currentPrice !== 'number') {
    return null
  }
  const costBasis = qty * avgCost
  const marketValue = qty * currentPrice
  const pl = marketValue - costBasis
  const plPercent = costBasis !== 0 ? (pl / costBasis) * 100 : null
  return { costBasis, marketValue, pl, plPercent }
}

const CADENCE_MONTHS = { monthly: 1, quarterly: 3 }

// Splits totalAmount into `periods` equal installments spaced by cadence,
// starting from startDate ('YYYY-MM-DD'). Schedule dates/amounts are always
// derived fresh from these inputs rather than stored — `completed` (how
// many installments have been marked done, in order) is the only mutable
// progress field.
export function computeInstallmentSchedule({ totalAmount, periods, cadence, startDate, completed = 0 }) {
  if (typeof totalAmount !== 'number' || !Number.isFinite(totalAmount)) return []
  if (!Number.isInteger(periods) || periods <= 0) return []
  const stepMonths = CADENCE_MONTHS[cadence] || 1
  const amount = totalAmount / periods
  const base = new Date(startDate)
  if (Number.isNaN(base.getTime())) return []

  return Array.from({ length: periods }, (_, index) => {
    const due = new Date(base)
    due.setMonth(due.getMonth() + index * stepMonths)
    return {
      index,
      dueDate: due.toISOString().slice(0, 10),
      amount,
      done: index < completed,
    }
  })
}
