import { useEffect, useState } from 'react'
import { LangProvider, useLang } from './LangContext.jsx'
import { getThbRates } from './fx.js'
import TickerCard from './components/TickerCard.jsx'
import TickerSearch from './components/TickerSearch.jsx'
import styles from './App.module.css'

const WATCHLIST_KEY = 'stockranges_watchlist'
const RANGE_KEY = 'stockranges_range'
const CURRENCY_KEY = 'stockranges_currency'
const THEME_KEY = 'theme'
// Allows '=' (futures/forex, e.g. gold's "GC=F") and '^' (indices, e.g.
// "^GSPC") — autocomplete can surface both.
const SYMBOL_RE = /^[A-Za-z0-9.\-=^]{1,10}$/
const RANGES = ['3mo', '6mo', '1y', '2y', '5y']
const RANGE_LABEL_KEY = { '3mo': 'range3mo', '6mo': 'range6mo', '1y': 'range1y', '2y': 'range2y', '5y': 'range5y' }

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
  }

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
      </div>

      {watchlist.length === 0 ? (
        <div className={styles.empty}>{s.emptyWatchlist}</div>
      ) : (
        <div className={styles.list}>
          {watchlist.map((symbol) => (
            <TickerCard key={symbol} symbol={symbol} range={range} currency={currency} rates={rates} onRemove={removeTicker} />
          ))}
        </div>
      )}

      <div className={styles.disclaimer}>
        <strong>{s.disclaimerTitle}</strong>
        {s.disclaimer}
      </div>

      <div className={styles.footer}>🐾 pumbafluffycorgi.com</div>
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
