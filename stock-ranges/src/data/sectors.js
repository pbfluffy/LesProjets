// Curated ticker -> business-line/sector, for the wallet's "group by
// sector" allocation view — GICS-style sectors, the same categorization
// scheme most brokerages use. Best-effort and not exhaustive, same
// convention as brands.js: a symbol with no entry here falls back to
// OTHER rather than a guess. Funds (ETFs/mutual funds) are deliberately
// NOT listed — they hold many companies across sectors, so WalletView
// buckets them into a dedicated FUND group using the live quote's
// instrumentType instead of a single curated sector.
// Values are PascalCase (not the more conventional SCREAMING_SNAKE_CASE
// for an enum) so `s['sector' + item.key]` in AllocationChart.jsx lands
// directly on a LangContext key following this app's own camelCase string
// convention (sectorTechnology, sectorCommunicationServices, ...) with no
// separate enum->string-key translation table needed.
export const SECTOR = {
  TECHNOLOGY: 'Technology',
  COMMUNICATION_SERVICES: 'CommunicationServices',
  CONSUMER_DISCRETIONARY: 'ConsumerDiscretionary',
  CONSUMER_STAPLES: 'ConsumerStaples',
  HEALTHCARE: 'Healthcare',
  FINANCIAL_SERVICES: 'FinancialServices',
  INDUSTRIALS: 'Industrials',
  ENERGY: 'Energy',
  UTILITIES: 'Utilities',
  REAL_ESTATE: 'RealEstate',
  MATERIALS: 'Materials',
  FUND: 'Fund',
  OTHER: 'Other',
}

const {
  TECHNOLOGY, COMMUNICATION_SERVICES, CONSUMER_DISCRETIONARY, CONSUMER_STAPLES,
  HEALTHCARE, FINANCIAL_SERVICES, INDUSTRIALS, REAL_ESTATE,
} = SECTOR

export const SECTORS = {
  // Restaurants — Consumer Discretionary
  QSR: CONSUMER_DISCRETIONARY, MCD: CONSUMER_DISCRETIONARY, SBUX: CONSUMER_DISCRETIONARY,
  YUM: CONSUMER_DISCRETIONARY, CMG: CONSUMER_DISCRETIONARY, DPZ: CONSUMER_DISCRETIONARY,
  WEN: CONSUMER_DISCRETIONARY, DRI: CONSUMER_DISCRETIONARY, CAKE: CONSUMER_DISCRETIONARY,
  DIN: CONSUMER_DISCRETIONARY, SHAK: CONSUMER_DISCRETIONARY,

  // Beverages — Consumer Staples
  KO: CONSUMER_STAPLES, PEP: CONSUMER_STAPLES, KDP: CONSUMER_STAPLES, MNST: CONSUMER_STAPLES,
  STZ: CONSUMER_STAPLES, BUD: CONSUMER_STAPLES, TAP: CONSUMER_STAPLES, DEO: CONSUMER_STAPLES,

  // Household/personal care — Consumer Staples
  PG: CONSUMER_STAPLES, KMB: CONSUMER_STAPLES, CL: CONSUMER_STAPLES, UL: CONSUMER_STAPLES,
  CLX: CONSUMER_STAPLES, CHD: CONSUMER_STAPLES, EL: CONSUMER_STAPLES,

  // Packaged food — Consumer Staples
  MDLZ: CONSUMER_STAPLES, HSY: CONSUMER_STAPLES, GIS: CONSUMER_STAPLES, K: CONSUMER_STAPLES,
  KHC: CONSUMER_STAPLES, CAG: CONSUMER_STAPLES, CPB: CONSUMER_STAPLES,

  // Apparel/footwear/luxury — Consumer Discretionary
  NKE: CONSUMER_DISCRETIONARY, LULU: CONSUMER_DISCRETIONARY, VFC: CONSUMER_DISCRETIONARY,
  CROX: CONSUMER_DISCRETIONARY, DECK: CONSUMER_DISCRETIONARY, UAA: CONSUMER_DISCRETIONARY,
  RL: CONSUMER_DISCRETIONARY, TPR: CONSUMER_DISCRETIONARY, LVMUY: CONSUMER_DISCRETIONARY,
  YETI: CONSUMER_DISCRETIONARY,

  // Retail — GICS reclassified the big-box grocers (Walmart, Costco) into
  // Consumer Staples in 2023; the rest stay Consumer Discretionary.
  WMT: CONSUMER_STAPLES, COST: CONSUMER_STAPLES,
  TGT: CONSUMER_DISCRETIONARY, HD: CONSUMER_DISCRETIONARY, LOW: CONSUMER_DISCRETIONARY,
  TJX: CONSUMER_DISCRETIONARY, ROST: CONSUMER_DISCRETIONARY, BBY: CONSUMER_DISCRETIONARY,
  ULTA: CONSUMER_DISCRETIONARY, AMZN: CONSUMER_DISCRETIONARY,

  // Tech
  AAPL: TECHNOLOGY, MSFT: TECHNOLOGY, NVDA: TECHNOLOGY, AMD: TECHNOLOGY, INTC: TECHNOLOGY,
  ADBE: TECHNOLOGY, SONY: TECHNOLOGY,

  // Communication services (ad-supported / media / telecom-adjacent platforms)
  GOOGL: COMMUNICATION_SERVICES, GOOG: COMMUNICATION_SERVICES, META: COMMUNICATION_SERVICES,
  NFLX: COMMUNICATION_SERVICES, DIS: COMMUNICATION_SERVICES, SPOT: COMMUNICATION_SERVICES,

  // Healthcare / pharma / tobacco (tobacco is Consumer Staples by GICS convention)
  JNJ: HEALTHCARE, PM: CONSUMER_STAPLES, MO: CONSUMER_STAPLES,

  // Automotive — Consumer Discretionary
  F: CONSUMER_DISCRETIONARY, GM: CONSUMER_DISCRETIONARY, TSLA: CONSUMER_DISCRETIONARY,
  TM: CONSUMER_DISCRETIONARY, HMC: CONSUMER_DISCRETIONARY, STLA: CONSUMER_DISCRETIONARY,

  // Conglomerate / financials
  'BRK-B': FINANCIAL_SERVICES, 'BRK.B': FINANCIAL_SERVICES,
  'BRK-A': FINANCIAL_SERVICES, 'BRK.A': FINANCIAL_SERVICES,
  MAIN: FINANCIAL_SERVICES, // Main Street Capital — business development company

  // Real estate (net-lease REIT)
  O: REAL_ESTATE,

  // Aerospace/defense
  SPCX: INDUSTRIALS, // SpaceX — launch vehicles, satellites

  // Pet products — Consumer Discretionary
  DOGZ: CONSUMER_DISCRETIONARY,

  // Battery/thermal-management hardware
  KULR: TECHNOLOGY,
}

export function sectorFor(symbol) {
  return SECTORS[symbol] || null
}
