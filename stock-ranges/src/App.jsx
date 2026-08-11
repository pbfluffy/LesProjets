import { useEffect, useMemo, useState } from 'react'
import { LangProvider, useLang } from './LangContext.jsx'
import { getThbRates } from './fx.js'
import { useCloudSync } from './hooks/useCloudSync.js'
import TickerCard from './components/TickerCard.jsx'
import TickerSearch from './components/TickerSearch.jsx'
import AccountButton from './components/AccountButton.jsx'
import ConflictModal from './components/ConflictModal.jsx'
import { TAG_DATALIST_ID } from './components/TagChips.jsx'
import { tagHue } from './tagColor.js'
import styles from './App.module.css'

const WATCHLIST_KEY = 'stockranges_watchlist'
const RANGE_KEY = 'stockranges_range'
const CURRENCY_KEY = 'stockranges_currency'
const CHART_TYPE_KEY = 'stockranges_charttype'
const TAGS_KEY = 'stockranges_tags'
const ACTIVE_TAG_FILTERS_KEY = 'stockranges_active_tag_filters'
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

function loadTags() {
  try {
    const raw = localStorage.getItem(TAGS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

// Which tag filters are toggled on — a display preference, so (like
// theme/language) it stays local-only rather than syncing across devices.
function loadActiveTagFilters() {
  try {
    const raw = localStorage.getItem(ACTIVE_TAG_FILTERS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? new Set(parsed) : new Set()
  } catch {
    return new Set()
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
  const [chartType, setChartType] = useState(() => localStorage.getItem(CHART_TYPE_KEY) || 'line')
  const [tags, setTags] = useState(loadTags)
  const [activeTagFilters, setActiveTagFilters] = useState(loadActiveTagFilters)
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
    localStorage.setItem(CHART_TYPE_KEY, chartType)
  }, [chartType])

  useEffect(() => {
    localStorage.setItem(TAGS_KEY, JSON.stringify(tags))
  }, [tags])

  useEffect(() => {
    localStorage.setItem(ACTIVE_TAG_FILTERS_KEY, JSON.stringify([...activeTagFilters]))
  }, [activeTagFilters])

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
    watchlist, range, currency, tags,
    applyRemote: (remote) => {
      if (Array.isArray(remote?.watchlist)) setWatchlist(remote.watchlist)
      if (typeof remote?.range === 'string') setRange(remote.range)
      if (typeof remote?.currency === 'string') setCurrency(remote.currency)
      if (remote?.tags && typeof remote.tags === 'object' && !Array.isArray(remote.tags)) setTags(remote.tags)
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
    setTags((prev) => {
      if (!(symbol in prev)) return prev
      const next = { ...prev }
      delete next[symbol]
      return next
    })
  }

  function handleStatus(symbol, info) {
    setSignals((prev) => ({ ...prev, [symbol]: info }))
  }

  function addTag(symbol, tag) {
    setTags((prev) => ({ ...prev, [symbol]: [...(prev[symbol] || []), tag] }))
  }

  function removeTag(symbol, tag) {
    setTags((prev) => {
      const current = prev[symbol]
      if (!current) return prev
      const next = current.filter((t) => t !== tag)
      return { ...prev, [symbol]: next }
    })
  }

  function toggleTagFilter(tag) {
    setActiveTagFilters((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
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

  // All distinct tags in use, for the filter row — sorted so the row order
  // doesn't jump around as tags are added/removed elsewhere.
  const allTags = useMemo(() => {
    const set = new Set()
    Object.values(tags).forEach((list) => (list || []).forEach((t) => set.add(t)))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [tags])

  // Drop any active filter for a tag that no longer exists on anything
  // (e.g. it was removed from the only ticker that had it) instead of
  // silently filtering the list down to nothing.
  useEffect(() => {
    setActiveTagFilters((prev) => {
      const next = new Set([...prev].filter((t) => allTags.includes(t)))
      return next.size === prev.size ? prev : next
    })
  }, [allTags])

  // No active filters shows everything; otherwise a ticker shows if it has
  // at least one of the active tags (OR, not AND — narrower "must have all"
  // filtering is easy to add later if it turns out to be wanted).
  const filteredWatchlist = useMemo(() => {
    if (activeTagFilters.size === 0) return sortedWatchlist
    return sortedWatchlist.filter((symbol) => (tags[symbol] || []).some((t) => activeTagFilters.has(t)))
  }, [sortedWatchlist, tags, activeTagFilters])

  const lastUpdated = useMemo(() => {
    const timestamps = Object.values(signals).map((v) => v?.ts).filter(Boolean)
    return timestamps.length ? Math.max(...timestamps) : null
  }, [signals])

  // At-a-glance counts across the whole watchlist — the gist without
  // reading every card. Only counts tickers that have actually loaded;
  // still-loading/errored ones (signal === null) just aren't counted yet.
  const summaryCounts = useMemo(() => {
    const counts = { buy: 0, hold: 0, sell: 0 }
    Object.values(signals).forEach((v) => {
      if (v?.signal && counts[v.signal] !== undefined) counts[v.signal]++
    })
    return counts
  }, [signals])
  const summaryTotal = summaryCounts.buy + summaryCounts.hold + summaryCounts.sell

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>{s.appName}</div>
          <div className={styles.tagline}>{s.tagline}</div>
        </div>
        <div className={styles.headerBtns}>
          <div className={styles.toolGroup}>
            <a href="../" className={styles.ctrlBtn} title={s.backToHome} aria-label="Home">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <path d="M9 22V12h6v10" />
              </svg>
            </a>
            <button
              className={styles.ctrlBtn}
              onClick={() => setCurrency((c) => (c === 'USD' ? 'THB' : 'USD'))}
              title={s.currencyToggle}
            >
              {currency}
            </button>
            <button className={styles.ctrlBtn} onClick={toggleLang} title={s.langToggle} aria-label={s.langToggle}>{lang === 'th' ? 'EN' : 'TH'}</button>
            <button className={styles.ctrlBtn} onClick={toggleTheme} title={dark ? s.themeToggleLight : s.themeToggleDark} aria-label={dark ? s.themeToggleLight : s.themeToggleDark}>{dark ? '🌞' : '🌙'}</button>
          </div>
          <AccountButton user={cloudSync.user} syncStatus={cloudSync.syncStatus} />
        </div>
      </div>

      {summaryTotal > 0 && (
        <div className={styles.summaryRow}>
          {summaryCounts.buy > 0 && <span className={styles.summaryChip} data-zone="buy">{summaryCounts.buy} {s.signalBuy}</span>}
          {summaryCounts.hold > 0 && <span className={styles.summaryChip} data-zone="hold">{summaryCounts.hold} {s.signalHold}</span>}
          {summaryCounts.sell > 0 && <span className={styles.summaryChip} data-zone="sell">{summaryCounts.sell} {s.signalSell}</span>}
        </div>
      )}

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
        <button
          className={styles.chartTypeBtn}
          onClick={() => setChartType((t) => (t === 'line' ? 'candle' : 'line'))}
          title={chartType === 'line' ? s.chartTypeSwitchToCandle : s.chartTypeSwitchToLine}
        >
          {chartType === 'line' ? '📈' : '🕯️'}
        </button>
        {lastUpdated && (
          <span className={styles.updated}>
            <span className={styles.updatedDot} aria-hidden="true" />
            {formatRelativeTime(lastUpdated, now, s)}
          </span>
        )}
      </div>

      {allTags.length > 0 && (
        <div className={styles.tagFilterRow}>
          <span className={styles.tagFilterLabel}>{s.filterByTag}</span>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={styles.tagFilterChip}
              data-active={activeTagFilters.has(tag)}
              style={{ '--tag-hue': tagHue(tag) }}
              onClick={() => toggleTagFilter(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <datalist id={TAG_DATALIST_ID}>
        {allTags.map((tag) => <option key={tag} value={tag} />)}
      </datalist>

      {watchlist.length === 0 ? (
        <div className={styles.empty}>{s.emptyWatchlist}</div>
      ) : filteredWatchlist.length === 0 ? (
        <div className={styles.empty}>{s.noTagMatches}</div>
      ) : (
        <div className={styles.list}>
          {filteredWatchlist.map((symbol) => (
            <TickerCard
              key={symbol}
              symbol={symbol}
              range={range}
              currency={currency}
              rates={rates}
              chartType={chartType}
              tags={tags[symbol] || []}
              onAddTag={(tag) => addTag(symbol, tag)}
              onRemoveTag={(tag) => removeTag(symbol, tag)}
              onRemove={removeTicker}
              onStatus={handleStatus}
            />
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
