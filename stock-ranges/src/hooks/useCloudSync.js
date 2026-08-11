import {
  auth, db,
  onAuthStateChanged, doc, setDoc, serverTimestamp, onSnapshot,
} from '../firebase.js'
import { useCloudSyncCore } from '../../../shared/useCloudSyncCore.js'

// Thin wrapper over the shared cloud-sync core (same one bill-splitter,
// nutritions-thailand, and pumgoda use) — see shared/useCloudSyncCore.js
// for the actual sync/conflict logic. Stock Ranges data lives in
// /userStockRanges/<uid>: watchlist + lookback range + display currency +
// per-ticker tags + wallet holdings/investment plans/dividends.
// Theme/language/tag-filter-selection stay local-only, same as every
// sibling app.
const COLL = 'userStockRanges'
const DEFAULT_WATCHLIST = ['AAPL', 'MSFT']
const DEFAULT_RANGE = '1y'
const DEFAULT_CURRENCY = 'USD'
const DEFAULT_TAGS = {}
const DEFAULT_HOLDINGS = {}
const DEFAULT_PLANS = []
const DEFAULT_DIVIDENDS = []

// Deep, deterministic stringification — sorts keys recursively so identical
// data with different field order produces the same fingerprint.
function canonical(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(canonical)
  const sorted = {}
  Object.keys(obj).sort().forEach((k) => { sorted[k] = canonical(obj[k]) })
  return sorted
}

function fingerprint(data) {
  return JSON.stringify(canonical(data || {}))
}

// Firestore docs also carry `lastModified` (a serverTimestamp), which local
// state never has — fingerprinting the raw doc against local state meant
// they could never match even when watchlist/range/currency were identical,
// so every sign-in re-triggered the conflict prompt. Stripping to just the
// three synced fields keeps both sides of every comparison apples-to-apples.
function stripDoc(d) {
  if (!d) return null
  return {
    watchlist: d.watchlist, range: d.range, currency: d.currency, tags: d.tags || {},
    holdings: d.holdings || {}, investmentPlans: d.investmentPlans || [], dividends: d.dividends || [],
  }
}

// True only if the local state differs from the untouched default — a
// fresh browser's seed watchlist shouldn't trigger a conflict prompt
// against real cloud data on first sign-in.
function hasData(local) {
  return fingerprint(local) !== fingerprint({
    watchlist: DEFAULT_WATCHLIST, range: DEFAULT_RANGE, currency: DEFAULT_CURRENCY, tags: DEFAULT_TAGS,
    holdings: DEFAULT_HOLDINGS, investmentPlans: DEFAULT_PLANS, dividends: DEFAULT_DIVIDENDS,
  })
}

export function useCloudSync({ watchlist, range, currency, tags, holdings, investmentPlans, dividends, applyRemote }) {
  const localData = { watchlist, range, currency, tags, holdings, investmentPlans, dividends }
  const r = useCloudSyncCore({
    auth, db, onAuthStateChanged, doc, setDoc, serverTimestamp, onSnapshot,
    collection: COLL,
    logPrefix: '[stockRangesSync]',
    localData,
    applyRemote,
    hasData,
    serialize: (d) => ({
      watchlist: d.watchlist, range: d.range, currency: d.currency, tags: d.tags || {},
      holdings: d.holdings || {}, investmentPlans: d.investmentPlans || [], dividends: d.dividends || [],
    }),
    readRemote: (snap) => (snap.exists() ? stripDoc(snap.data()) : null),
    // Keeps the full doc (incl. lastModified) for the conflict modal's
    // "last saved" display — only readRemote/applyPending need stripping
    // since those two feed the fingerprint comparison.
    stashPending: (snap) => snap.data(),
    applyPending: (p) => { const stripped = stripDoc(p); applyRemote(stripped); return stripped },
    conflictFp: fingerprint,
    echoFp: fingerprint,
    syncingOnChange: false,
  })
  return {
    user: r.user,
    syncStatus: r.syncStatus,
    lastSyncedAt: r.lastSyncedAt,
    pendingServer: r.pendingServer,
    confirmCloudWins: r.confirmCloudWins,
    confirmLocalWins: r.confirmLocalWins,
  }
}
