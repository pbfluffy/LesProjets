// The one place a Split Bill is turned into per-person amounts. The live
// calculator (useBillStore), saved-bill totals (BillHistory) and Trips
// settle-up (useTripsStore) all call this, so a saved bill can never show a
// different total from the bill itself (discounts used to be applied in only
// one of the three).

const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100

// Bills saved before multi-discount support only have a single
// billDiscount / billDiscountWho; treat that as a one-item list.
export function normalizeDiscounts(s) {
  if (Array.isArray(s?.billDiscounts)) return s.billDiscounts
  const legacyAmt = parseFloat(s?.billDiscount)
  return legacyAmt > 0 ? [{ amount: s.billDiscount, who: s.billDiscountWho ?? null }] : []
}

/**
 * @param s  a Split Bill state / saved snapshot:
 *   { members, foods, billDiscounts, vatEnabled, serviceChargeEnabled,
 *     serviceChargeRate, roundTotalEnabled, billOwner }
 */
export function calcSplit(s) {
  const members = Array.isArray(s?.members) ? s.members : []
  const foods = Array.isArray(s?.foods) ? s.foods : []
  const discounts = normalizeDiscounts(s)

  const shares = Object.fromEntries(members.map(m => [m, 0]))
  let subtotal = 0
  let rawSubtotal = 0
  foods.forEach(f => {
    const price = parseFloat(f.price) || 0
    if (!price) return
    rawSubtotal += price
    const who = Array.isArray(f.who) ? f.who : []
    if (!who.length) return
    const split = price / who.length
    who.forEach(m => { if (shares[m] !== undefined) shares[m] += split })
    subtotal += price
  })

  // Bill-level pre-tax discounts — each one is split equally among the members
  // it applies to, then combined per member. `who` null = everyone; an array
  // is exactly those members (an empty array applies to nobody, matching the
  // "Applies to" chips, which show nobody selected).
  const discountByMember = Object.fromEntries(members.map(m => [m, 0]))
  let discAmt = 0
  discounts.forEach(d => {
    const amt = Math.max(0, parseFloat(d.amount) || 0)
    if (!amt) return
    const who = d.who == null ? members : d.who.filter(m => members.includes(m))
    if (who.length === 0) return
    const per = amt / who.length
    who.forEach(m => { discountByMember[m] += per })
    discAmt += amt
  })
  const preTaxShares = Object.fromEntries(members.map(m => [
    m, Math.max(0, shares[m] - discountByMember[m])
  ]))
  const effectiveSubtotal = Math.max(0, subtotal - discAmt)
  const scRate = Math.max(0, Math.min(100, parseFloat(s?.serviceChargeRate) || 0))
  const scFraction = s?.serviceChargeEnabled ? scRate / 100 : 0
  let multiplier = 1 + scFraction
  if (s?.vatEnabled) multiplier *= 1.07
  const rawTotals = Object.fromEntries(Object.entries(preTaxShares).map(([m, v]) => [m, v * multiplier]))
  const rawGrand = effectiveSubtotal * multiplier

  // #88 — reconcile per-person amounts so the column always sums exactly to the
  // grand total (fixes BUG-19). When roundTotalEnabled, the grand total snaps to
  // the nearest whole baht. Either way the selected bill owner absorbs the rounding
  // delta. Guard: if the owner's natural share is too small to absorb a
  // round-down, clamp owner to >=0 and let the total settle at what is actually
  // owed rather than display a negative amount.
  let grandTotal = s?.roundTotalEnabled ? Math.round(rawGrand) : round2(rawGrand)
  const owner = members.includes(s?.billOwner) ? s.billOwner : members[0]
  const totals = {}
  if (members.length > 0) {
    let othersSum = 0
    members.forEach(m => {
      if (m === owner) return
      const r = round2(rawTotals[m])
      totals[m] = r
      othersSum += r
    })
    let ownerAmt = round2(grandTotal - othersSum)
    if (ownerAmt < 0) { ownerAmt = 0; grandTotal = round2(othersSum) }
    totals[owner] = ownerAmt
  }
  return {
    shares, preTaxShares, totals, subtotal, rawSubtotal,
    billDiscount: discAmt, billDiscounts: discounts,
    serviceCharge: effectiveSubtotal * scFraction,
    serviceChargeRate: scRate,
    vat: s?.vatEnabled ? effectiveSubtotal * (1 + scFraction) * 0.07 : 0,
    grandTotal, multiplier,
  }
}
