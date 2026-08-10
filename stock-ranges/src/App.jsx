import { useEffect, useMemo, useState } from 'react'
import { LangProvider, useLang } from './LangContext.jsx'
import { getThbRates } from './fx.js'
import { useCloudSync } from './hooks/useCloudSync.js'
import TickerCard from './components/TickerCard.jsx'
import TickerSearch from './components/TickerSearch.jsx'
import AccountButton from './components/AccountButton.jsx'
import ConflictModal from './components/ConflictModal.jsx'
import styles from './App.module.css'

const WATCHLIST_KEY = 'stockranges_watchlist'
const RANGE_KEY = 'stockranges_range'
const CURRENCY_KEY = 'stockranges_currency'
const THEME_KEY = 'theme'
// Allows '=' (futures/forex, e.g. gold's "GC=F") and '^' (indices, e.g.
// "^GSPC") — autocomplete can surface both.
const SYMBOL_RE = /^[A-Za-z0-9.\-=^]{1,10}$/
const RANGES = ['1d', '7d', '3mo', '6mo', '1y', '2y', '5y']
const RANGE_LABEL_KEY = { '1d': 'range1d', '7d': 'range7d', '3mo': 'range3mo', '6mo': 'range6mo', '1y': 'range1y', '2y': 'range2y', '5y': 'range5y' }
const RELATIVE_TIME_TICK_MS = 30 * 1000

function formatRelativeTime(ts, now, s) {
  if (!ts) return null
  const minutes = Math.floor((now - ts) / 60000)
  if (minutes < 1) return s.updatedJustNow
  return `${s.updatedPrefix} ${minutes}${s.updatedMinSuffix}`
}

function loadWatchlist() {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed : ['AAPL', 'MSFT']
  } catch {
    return ['AAPL', 'MSFT']
  }
}

function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY)
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
  }, [dark])
  return [dark, () => setDark((d) => !d)]
}

function Dashboard() {
  const { s, lang, toggle: toggleLang } = useLang()
  const [dark, toggleTheme] = useTheme()
  const [watchlist, setWatchlist] = useState(loadWatchlist)
  const [range, setRange] = useState(() => localStorage.getItem(RANGE_KEY) || '1y')
  const [currency, setCurrency] = useState(() => localStorage.getItem(CURRENCY_KEY) || 'USD')
  const [rates, setRates] = useState(null)
  const [warning, setWarning] = useState('')
  const [signals, setSignals] = useState({})
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist))
  }, [watchlist])

  useEffect(() => {
    localStorage.setItem(RANGE_KEY, range)
  }, [range])

  useEffect(() => {
    localStorage.setItem(CURRENCY_KEY, currency)
  }, [currency])

  useEffect(() => {
    let cancelled = false
    getThbRates().then((r) => { if (!cancelled) setRates(r) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), RELATIVE_TIME_TICK_MS)
    return () => clearInterval(id)
  }, [])

  const cloudSync = useCloudSync({
    watchlist, range, currency,
    applyRemote: (remote) => {
      if (Array.isArray(remote?.watchlist)) setWatchlist(remote.watchlist)
      if (typeof remote?.range === 'string') setRange(remote.range)
      if (typeof remote?.currency === 'string') setCurrency(remote.currency)
    },
  })

  function addSymbol(symbol) {
    setWarning('')
    if (!symbol) return
    if (!SYMBOL_RE.test(symbol)) {
      setWarning(s.errorPrefix + 'invalid ticker')
      return
    }
    if (watchlist.includes(symbol)) {
      setWarning(s.duplicateTicker)
      return
    }
    setWatchlist((list) => [...list, symbol])
  }

  function removeTicker(symbol) {
    setWatchlist((list) => list.filter((t) => t !== symbol))
    setSignals((prev) => {
      if (!(symbol in prev)) return prev
      const next = { ...prev }
      delete next[symbol]
      return next
    })
  }

  function handleStatus(symbol, info) {
    setSignals((prev) => ({ ...prev, [symbol]: info }))
  }

  // Buy-zone (band 1-3) first so the dashboard is scannable at a glance —
  // opportunities surface without reading every card. Tickers still loading
  // or errored (band === null) sort to the end rather than jumping around.
  const sortedWatchlist = useMemo(() => {
    return [...watchlist].sort((a, b) => {
      const bandA = signals[a]?.band ?? Infinity
      const bandB = signals[b]?.band ?? Infinity
      if (bandA !== bandB) return bandA - bandB
      return watchlist.indexOf(a) - watchlist.indexOf(b)
    })
  }, [watchlist, signals])

  const lastUpdated = useMemo(() => {
    const timestamps = Object.values(signals).map((v) => v?.ts).filter(Boolean)
    return timestamps.length ? Math.max(...timestamps) : null
  }, [signals])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>{s.appName}</div>
          <div className={styles.tagline}>{s.tagline}</div>
        </div>
        <div className={styles.headerBtns}>
          <button
            className={styles.ctrlBtn}
            onClick={() => setCurrency((c) => (c === 'USD' ? 'THB' : 'USD'))}
            title={s.currencyToggle}
          >
            {currency}
          </button>
          <button className={styles.ctrlBtn} onClick={toggleLang}>{lang === 'th' ? 'EN' : 'TH'}</button>
          <button className={styles.ctrlBtn} onClick={toggleTheme}>{dark ? '🌞' : '🌙'}</button>
          <AccountButton user={cloudSync.user} syncStatus={cloudSync.syncStatus} />
        </div>
      </div>

      <div className={styles.controls}>
        <TickerSearch onAdd={addSymbol} />
      </div>

      {warning && <div className={styles.warning}>{warning}</div>}

      <div className={styles.lookbackRow}>
        <label htmlFor="lookback">{s.lookbackLabel}</label>
        <select id="lookback" value={range} onChange={(e) => setRange(e.target.value)}>
          {RANGES.map((r) => (
            <option key={r} value={r}>{s[RANGE_LABEL_KEY[r]]}</option>
          ))}
        </select>
        {lastUpdated && <span className={styles.updated}>{formatRelativeTime(lastUpdated, now, s)}</span>}
      </div>

      {watchlist.length === 0 ? (
        <div className={styles.empty}>{s.emptyWatchlist}</div>
      ) : (
        <div className={styles.list}>
          {sortedWatchlist.map((symbol) => (
            <TickerCard key={symbol} symbol={symbol} range={range} currency={currency} rates={rates} onRemove={removeTicker} onStatus={handleStatus} />
          ))}
        </div>
      )}

      <div className={styles.disclaimer}>
        <strong>{s.disclaimerTitle}</strong>
        {s.disclaimer}
      </div>

      <div className={styles.footer}>🐾 pumbafluffycorgi.com</div>

      {cloudSync.syncStatus === 'awaiting-decision' && cloudSync.pendingServer && (
        <ConflictModal
          localData={{ watchlist, range, currency }}
          cloudData={cloudSync.pendingServer}
          onUseLocal={cloudSync.confirmLocalWins}
          onUseCloud={cloudSync.confirmCloudWins}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <LangProvider>
      <Dashboard />
    </LangProvider>
  )
}
