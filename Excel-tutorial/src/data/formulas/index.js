import sum from './sum.js'
import ifFormula from './if.js'
import vlookup from './vlookup.js'
import sumif from './sumif.js'
import countif from './countif.js'
import iferror from './iferror.js'

// Order matches the design's skill tree progression
export const FORMULAS = [sum, ifFormula, vlookup, sumif, countif, iferror]

export const FORMULAS_BY_ID = Object.fromEntries(FORMULAS.map(f => [f.id, f]))

export function getFormula(id) {
  return FORMULAS_BY_ID[id] || null
}
