import { useEffect, useMemo, useState } from 'react'
import { LangProvider, useLang } from './LangContext.jsx'
import { getThbRates } from './fx.js'
import { useCloudSync } from './hooks/useCloudSync.js'
import { useInstallPrompt } from './hooks/useInstallPrompt.js'
import TickerCard from './components/TickerCard.jsx'
import TickerSearch from './components/TickerSearch.jsx'
import SearchBox from './components/SearchBox.jsx'
import AccountButton from './components/AccountButton.jsx'
import ConflictModal from './components/ConflictModal.jsx'
import Icon from './components/Icon.jsx'
import { TAG_DATALIST_ID } from './components/TagChips.jsx'
import TagManagerModal from './components/TagManagerModal.jsx'
import UndoToast from './components/UndoToast.jsx'
import WalletView from './components/WalletView.jsx'
import WalletLocked from './components/WalletLocked.jsx'
import { MAX_CUSTOM_BRANDS } from './components/KnownFor.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import MarketStatus from './components/MarketStatus.jsx'
import { generateWatchlistImage } from './shareImage.js'
import { tagHue } from './tagColor.js'
import { BRANDS } from './data/brands.js'
import { getMarketStatus } from './marketHours.js'
import styles from './App.module.css'

const WATCHLIST_KEY = 'stockranges_watchlist'
const RANGE_KEY = 'stockranges_range'
const CURRENCY_KEY = 'stockranges_currency'
const CHART_TYPE_KEY = 'stockranges_charttype'
const TAGS_KEY = 'stockranges_tags'
const KNOWN_FOR_KEY = 'stockranges_knownfor'
const ACTIVE_TAG_FILTERS_KEY = 'stockranges_active_tag_filters'
const HOLDINGS_KEY = 'stockranges_holdings'
const TAB_KEY = 'stockranges_tab'
const WATCHLIST_SORT_KEY = 'stockranges_watchlist_sort'
const THEME_KEY = 'theme'
const RANGES = ['1d', '7d', '3mo', '6mo', '1y', '2y', '5y']
const RANGE_LABEL_KEY = { '1d': 'range1d', '7d': 'range7d', '3mo': 'range3mo', '6mo': 'range6mo', '1y': 'range1y', '2y': 'range2y', '5y': 'range5y' }
const RELATIVE_TIME_TICK_MS = 30 * 1000
const UNDO_TIMEOUT_MS = 6000

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

function loadKnownFor() {
  try {
    const raw = localStorage.getItem(KNOWN_FOR_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

// Shared add/remove for the two symbol-keyed lists (tags, custom known-for
// brands) that otherwise drift into separately-maintained copies of the
// same shape. `guard`, when given, inspects the array-so-far and returning
// false skips the add — checked inside the updater (not by the caller)
// so it's evaluated against the true latest state, not a stale snapshot.
function addToSymbolList(setState, symbol, value, guard) {
  setState((prev) => {
    const current = prev[symbol] || []
    if (guard && !guard(current)) return prev
    return { ...prev, [symbol]: [...current, value] }
  })
}

function removeFromSymbolList(setState, symbol, value) {
  setState((prev) => {
    const current = prev[symbol]
    if (!current) return prev
    return { ...prev, [symbol]: current.filter((v) => v !== value) }
  })
}

function loadHoldings() {
  try {
    const raw = localStorage.getItem(HOLDINGS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
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
  const { showAndroidPrompt, showIosHint, promptInstall, dismiss: dismissInstall } = useInstallPrompt()
  const [sharingWatchlist, setSharingWatchlist] = useState(false)
  const [watchlistShareError, setWatchlistShareError] = useState('')
  const [watchlist, setWatchlist] = useState(loadWatchlist)
  const [range, setRange] = useState(() => localStorage.getItem(RANGE_KEY) || '1y')
  const [currency, setCurrency] = useState(() => localStorage.getItem(CURRENCY_KEY) || 'USD')
  const [chartType, setChartType] = useState(() => localStorage.getItem(CHART_TYPE_KEY) || 'line')
  const [tags, setTags] = useState(loadTags)
  const [customKnownFor, setCustomKnownFor] = useState(loadKnownFor)
  const [activeTagFilters, setActiveTagFilters] = useState(loadActiveTagFilters)
  const [holdings, setHoldings] = useState(loadHoldings)
  const [tab, setTab] = useState(() => (localStorage.getItem(TAB_KEY) === 'wallet' ? 'wallet' : 'watchlist'))
  const [tabActionsEl, setTabActionsEl] = useState(null)
  const [watchlistSort, setWatchlistSort] = useState(() => localStorage.getItem(WATCHLIST_SORT_KEY) || 'signal')
  const [watchlistSearch, setWatchlistSearch] = useState('')
  const [activeSignalFilter, setActiveSignalFilter] = useState(null)
  const [rates, setRates] = useState(null)
  const [warning, setWarning] = useState('')
  const [signals, setSignals] = useState({})
  const [now, setNow] = useState(() => Date.now())
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [highlightSymbol, setHighlightSymbol] = useState(null)
  const [undoInfo, setUndoInfo] = useState(null)
  const [tagManagerOpen, setTagManagerOpen] = useState(false)

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
    localStorage.setItem(WATCHLIST_SORT_KEY, watchlistSort)
  }, [watchlistSort])

  useEffect(() => {
    localStorage.setItem(TAGS_KEY, JSON.stringify(tags))
  }, [tags])

  useEffect(() => {
    localStorage.setItem(KNOWN_FOR_KEY, JSON.stringify(customKnownFor))
  }, [customKnownFor])

  useEffect(() => {
    localStorage.setItem(ACTIVE_TAG_FILTERS_KEY, JSON.stringify([...activeTagFilters]))
  }, [activeTagFilters])

  useEffect(() => {
    localStorage.setItem(HOLDINGS_KEY, JSON.stringify(holdings))
  }, [holdings])

  useEffect(() => {
    localStorage.setItem(TAB_KEY, tab)
  }, [tab])

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
    watchlist, range, currency, tags, holdings, knownFor: customKnownFor,
    applyRemote: (remote) => {
      if (Array.isArray(remote?.watchlist)) setWatchlist(remote.watchlist)
      if (typeof remote?.range === 'string') setRange(remote.range)
      if (typeof remote?.currency === 'string') setCurrency(remote.currency)
      if (remote?.tags && typeof remote.tags === 'object' && !Array.isArray(remote.tags)) setTags(remote.tags)
      if (remote?.holdings && typeof remote.holdings === 'object' && !Array.isArray(remote.holdings)) setHoldings(remote.holdings)
      if (remote?.knownFor && typeof remote.knownFor === 'object' && !Array.isArray(remote.knownFor)) setCustomKnownFor(remote.knownFor)
    },
  })

  function addSymbol(symbol) {
    setWarning('')
    if (!symbol) return
    if (watchlist.includes(symbol)) {
      setWarning(s.duplicateTicker)
      return
    }
    setWatchlist((list) => [...list, symbol])
  }

  // Tags are a property of the symbol, not of watchlist/holdings
  // membership (they're shared between both lists) — removing a ticker
  // here no longer wipes its tags, since the same symbol might still be
  // held in the Wallet (or vice versa in removeHolding below).
  function removeTicker(symbol) {
    const index = watchlist.indexOf(symbol)
    setWatchlist((list) => list.filter((t) => t !== symbol))
    setSignals((prev) => {
      if (!(symbol in prev)) return prev
      const next = { ...prev }
      delete next[symbol]
      return next
    })
    showUndo('ticker', symbol, { index })
  }

  function handleStatus(symbol, info) {
    setSignals((prev) => ({ ...prev, [symbol]: info }))
  }

  // Cross-linking: a Watchlist card's "owned" badge or a Wallet card's
  // "watching" badge jumps to the other tab and scrolls/highlights the
  // matching card there — see the scroll+highlight effect below.
  function jumpToSymbol(symbol, targetTab) {
    setTab(targetTab)
    setHighlightSymbol(symbol)
  }

  useEffect(() => {
    if (!highlightSymbol) return
    const id = tab === 'wallet' ? `holding-${highlightSymbol}` : `ticker-${highlightSymbol}`
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const timer = setTimeout(() => setHighlightSymbol(null), 1800)
    return () => clearTimeout(timer)
  }, [tab, highlightSymbol])

  function handleRefresh() {
    setRefreshKey((k) => k + 1)
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1500)
  }

  async function handleShareWatchlist() {
    if (sharingWatchlist) return
    setSharingWatchlist(true)
    setWatchlistShareError('')
    try {
      const entries = filteredWatchlist
        .map((symbol) => ({ symbol, ...signals[symbol] }))
        .filter((e) => e.signal)
      const blob = await generateWatchlistImage({ s, entries, summaryCounts, appName: s.appName })
      const file = new File([blob], 'watchlist.png', { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: s.appName })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'watchlist.png'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error(err)
        setWatchlistShareError(s.shareError)
      }
    } finally {
      setSharingWatchlist(false)
    }
  }

  useEffect(() => {
    if (!undoInfo) return
    const timer = setTimeout(() => setUndoInfo(null), UNDO_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [undoInfo])

  function addTag(symbol, tag) {
    addToSymbolList(setTags, symbol, tag)
  }

  function removeTag(symbol, tag) {
    removeFromSymbolList(setTags, symbol, tag)
  }

  // Cap and duplicate checks live here (not just in the input's own
  // client-side check) because they run inside the setState updater,
  // which always sees the true latest state — the same symbol can be
  // showing simultaneously in the watchlist and the wallet, each with its
  // own add-brand input and its own possibly-stale snapshot of what's
  // already there, so only a check made against `prev` at commit time is
  // race-proof against two of those inputs being used back to back.
  function addCustomBrand(symbol, brand) {
    addToSymbolList(setCustomKnownFor, symbol, brand, (current) => {
      if (current.length >= MAX_CUSTOM_BRANDS) return false
      const lower = brand.toLowerCase()
      const curatedNames = (BRANDS[symbol] || []).map((b) => b.name.toLowerCase())
      return !curatedNames.includes(lower) && !current.some((b) => b.toLowerCase() === lower)
    })
  }

  function removeCustomBrand(symbol, brand) {
    removeFromSymbolList(setCustomKnownFor, symbol, brand)
  }

  // Renames a tag on every symbol that has it — a typo'd tag otherwise has
  // to be fixed one ticker at a time. Merges into an existing tag of the
  // new name if one already exists rather than creating a duplicate.
  function renameTag(oldTag, newTag) {
    const trimmed = newTag.trim()
    if (!trimmed || trimmed === oldTag) return
    setTags((prev) => {
      const next = {}
      Object.entries(prev).forEach(([symbol, list]) => {
        if (!list.includes(oldTag)) { next[symbol] = list; return }
        next[symbol] = [...new Set(list.map((t) => (t === oldTag ? trimmed : t)))]
      })
      return next
    })
    setActiveTagFilters((prev) => {
      if (!prev.has(oldTag)) return prev
      const next = new Set(prev)
      next.delete(oldTag)
      next.add(trimmed)
      return next
    })
  }

  function deleteTagEverywhere(tag) {
    const affectedSymbols = Object.entries(tags).filter(([, list]) => list.includes(tag)).map(([symbol]) => symbol)
    setTags((prev) => {
      const next = {}
      Object.entries(prev).forEach(([symbol, list]) => { next[symbol] = list.filter((t) => t !== tag) })
      return next
    })
    setActiveTagFilters((prev) => {
      if (!prev.has(tag)) return prev
      const next = new Set(prev)
      next.delete(tag)
      return next
    })
    showUndo('tag', tag, { symbols: affectedSymbols })
  }

  function addOrUpdateHolding(symbol, data) {
    setHoldings((prev) => ({ ...prev, [symbol]: data }))
  }

  function removeHolding(symbol) {
    const data = holdings[symbol]
    setHoldings((prev) => {
      if (!(symbol in prev)) return prev
      const next = { ...prev }
      delete next[symbol]
      return next
    })
    showUndo('holding', symbol, { data })
  }

  // A single undo slot — removing a second item while one is still
  // pending replaces it, same as most snackbar UIs (only the latest
  // action is undoable).
  function showUndo(type, symbol, data) {
    setUndoInfo({ type, symbol, data })
  }

  function handleUndo() {
    if (!undoInfo) return
    if (undoInfo.type === 'ticker') {
      setWatchlist((list) => {
        if (list.includes(undoInfo.symbol)) return list
        const next = [...list]
        next.splice(Math.min(undoInfo.data.index, next.length), 0, undoInfo.symbol)
        return next
      })
    } else if (undoInfo.type === 'tag') {
      const tag = undoInfo.symbol
      setTags((prev) => {
        const next = { ...prev }
        undoInfo.data.symbols.forEach((symbol) => {
          const current = next[symbol] || []
          if (!current.includes(tag)) next[symbol] = [...current, tag]
        })
        return next
      })
    } else {
      setHoldings((prev) => ({ ...prev, [undoInfo.symbol]: undoInfo.data.data }))
    }
    setUndoInfo(null)
  }

  function toggleTagFilter(tag) {
    setActiveTagFilters((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  // Default sort is buy-zone (band 1-3) first so the dashboard is scannable
  // at a glance — opportunities surface without reading every card.
  // Tickers still loading/errored sort to the end of whichever metric is
  // active rather than jumping around.
  const sortedWatchlist = useMemo(() => {
    return [...watchlist].sort((a, b) => {
      if (watchlistSort === 'alpha') return a.localeCompare(b)
      if (watchlistSort === 'change') {
        const changeA = signals[a]?.changePercent
        const changeB = signals[b]?.changePercent
        if (changeA == null && changeB == null) return 0
        if (changeA == null) return 1
        if (changeB == null) return -1
        return changeB - changeA
      }
      const bandA = signals[a]?.band ?? Infinity
      const bandB = signals[b]?.band ?? Infinity
      if (bandA !== bandB) return bandA - bandB
      return watchlist.indexOf(a) - watchlist.indexOf(b)
    })
  }, [watchlist, signals, watchlistSort])

  // All distinct tags in use, for the filter row — sorted so the row order
  // doesn't jump around as tags are added/removed elsewhere.
  const allTags = useMemo(() => {
    const set = new Set()
    Object.values(tags).forEach((list) => (list || []).forEach((t) => set.add(t)))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [tags])

  // How many symbols each tag is on — shown in the Tag Manager so a
  // rename/delete decision isn't made blind.
  const tagCounts = useMemo(() => {
    const counts = {}
    Object.values(tags).forEach((list) => (list || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1 }))
    return counts
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
  // filtering is easy to add later if it turns out to be wanted). The
  // signal filter (clicking a summary chip) is single-select, unlike tags —
  // a ticker only ever has one signal at a time, so "buy OR hold" isn't a
  // meaningful combination the way "tech OR dividend" tags are. The search
  // box narrows further by symbol substring, on top of both.
  const filteredWatchlist = useMemo(() => {
    let list = sortedWatchlist
    if (activeTagFilters.size > 0) {
      list = list.filter((symbol) => (tags[symbol] || []).some((t) => activeTagFilters.has(t)))
    }
    if (activeSignalFilter) {
      list = list.filter((symbol) => signals[symbol]?.signal === activeSignalFilter)
    }
    const query = watchlistSearch.trim().toUpperCase()
    if (query) list = list.filter((symbol) => symbol.includes(query))
    return list
  }, [sortedWatchlist, tags, activeTagFilters, activeSignalFilter, signals, watchlistSearch])

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

  // Computed once per minute and shared by the header's MarketStatus
  // display and every card's "last close" labeling, instead of each
  // recomputing its own copy of the same date arithmetic.
  const marketStatus = useMemo(() => getMarketStatus(new Date(now)), [Math.floor(now / 60000)]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.mark} aria-hidden="true"><Icon name="bars" size={18} strokeWidth={2.25} /></div>
          <div>
            <div className={styles.title}>{s.appName}</div>
            <div className={styles.tagline}>{s.tagline}</div>
            <MarketStatus status={marketStatus} now={now} />
          </div>
        </div>
        <div className={styles.headerBtns}>
          <div className={styles.toolGroup}>
            <a href="../" className={styles.ctrlBtn} title={s.backToHome} aria-label="Home">
              <Icon name="home" size={17} />
            </a>
            <button
              className={styles.ctrlBtn}
              onClick={() => setCurrency((c) => (c === 'USD' ? 'THB' : 'USD'))}
              title={s.currencyToggle}
            >
              {currency}
            </button>
            <button className={styles.ctrlBtn} onClick={toggleLang} title={s.langToggle} aria-label={s.langToggle}>{lang === 'th' ? 'EN' : 'TH'}</button>
            <button className={styles.ctrlBtn} onClick={toggleTheme} title={dark ? s.themeToggleLight : s.themeToggleDark} aria-label={dark ? s.themeToggleLight : s.themeToggleDark}>
              <Icon name={dark ? 'sun' : 'moon'} size={16} />
            </button>
            <button className={styles.ctrlBtn} onClick={handleRefresh} disabled={refreshing} data-loading={refreshing} title={s.refreshBtn} aria-label={s.refreshBtn}>
              <Icon name="refresh" size={15} />
            </button>
          </div>
          <AccountButton user={cloudSync.user} syncStatus={cloudSync.syncStatus} />
        </div>
      </div>

      {(showAndroidPrompt || showIosHint) && (
        <div className={styles.installBar}>
          <span className={styles.installText}>{showAndroidPrompt ? s.installTitle : s.installIosHint}</span>
          {showAndroidPrompt && (
            <button type="button" className={styles.installBtn} onClick={promptInstall}>{s.installButton}</button>
          )}
          <button type="button" className={styles.installDismiss} onClick={dismissInstall} aria-label={s.installDismissLabel}>×</button>
        </div>
      )}

      <div className={styles.tabBar}>
        <div className={styles.tabRow}>
          <button className={styles.tabBtn} data-active={tab === 'watchlist'} onClick={() => setTab('watchlist')}>{s.navWatchlist}</button>
          <button className={styles.tabBtn} data-active={tab === 'wallet'} onClick={() => setTab('wallet')}>{s.navWallet}</button>
        </div>
        <div className={styles.tabActions} ref={setTabActionsEl}>
          {tab === 'watchlist' && filteredWatchlist.length > 0 && (
            <button
              type="button"
              className={styles.tabActionBtn}
              onClick={handleShareWatchlist}
              disabled={sharingWatchlist}
              title={s.shareWatchlistBtn}
              aria-label={s.shareWatchlistBtn}
            >
              <Icon name="share" size={16} />
            </button>
          )}
        </div>
      </div>

      {allTags.length > 0 && (
        <div className={styles.tagFilterRow}>
          <span className={styles.tagFilterLabel}>{s.filterByTag}</span>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={styles.tagFilterChip}
              data-active={activeTagFilters.has(tag)}
              style={{ '--tag-hue': tagHue(tag) }}
              onClick={() => toggleTagFilter(tag)}
              aria-pressed={activeTagFilters.has(tag)}
            >
              {tag}
            </button>
          ))}
          <button
            type="button"
            className={styles.manageTagsBtn}
            onClick={() => setTagManagerOpen(true)}
            aria-label={s.manageTagsTitle}
            title={s.manageTagsTitle}
          >
            <Icon name="edit" size={11} />
          </button>
        </div>
      )}

      <datalist id={TAG_DATALIST_ID}>
        {allTags.map((tag) => <option key={tag} value={tag} />)}
      </datalist>

      {tagManagerOpen && (
        <TagManagerModal
          tags={allTags}
          counts={tagCounts}
          onRename={renameTag}
          onDelete={deleteTagEverywhere}
          onClose={() => setTagManagerOpen(false)}
        />
      )}

      {undoInfo && <UndoToast type={undoInfo.type} label={undoInfo.symbol} onUndo={handleUndo} />}

      {tab === 'wallet' ? (
        cloudSync.user ? (
          <WalletView
            holdings={holdings}
            currency={currency}
            rates={rates}
            onAddHolding={addOrUpdateHolding}
            onRemoveHolding={removeHolding}
            actionsPortalNode={tabActionsEl}
            user={cloudSync.user}
            watchlist={watchlist}
            refreshKey={refreshKey}
            highlightSymbol={highlightSymbol}
            onWatchedClick={(symbol) => jumpToSymbol(symbol, 'watchlist')}
            tags={tags}
            onAddTag={addTag}
            onRemoveTag={removeTag}
            activeTagFilters={activeTagFilters}
            knownFor={customKnownFor}
            onAddBrand={addCustomBrand}
            onRemoveBrand={removeCustomBrand}
            marketOpen={marketStatus.open}
          />
        ) : (
          <WalletLocked />
        )
      ) : (
      <>
      {summaryTotal > 0 && (
        <div className={styles.summaryRow}>
          {['buy', 'hold', 'sell'].map((zone) => summaryCounts[zone] > 0 && (
            <button
              key={zone}
              type="button"
              className={styles.summaryChip}
              data-zone={zone}
              data-active={activeSignalFilter === zone}
              onClick={() => setActiveSignalFilter((f) => (f === zone ? null : zone))}
              aria-pressed={activeSignalFilter === zone}
            >
              {summaryCounts[zone]} {s[`signal${zone[0].toUpperCase()}${zone.slice(1)}`]}
            </button>
          ))}
        </div>
      )}

      <div className={styles.controls}>
        <TickerSearch onAdd={addSymbol} />
      </div>

      {warning && <div className={styles.warning}>{warning}</div>}
      {watchlistShareError && <div className={styles.warning}>{watchlistShareError}</div>}

      <div className={styles.lookbackRow}>
        <SearchBox value={watchlistSearch} onChange={setWatchlistSearch} />
        <label htmlFor="lookback">{s.lookbackLabel}</label>
        <select id="lookback" value={range} onChange={(e) => setRange(e.target.value)}>
          {RANGES.map((r) => (
            <option key={r} value={r}>{s[RANGE_LABEL_KEY[r]]}</option>
          ))}
        </select>
        <label htmlFor="watchlist-sort">{s.sortByLabel}</label>
        <select id="watchlist-sort" value={watchlistSort} onChange={(e) => setWatchlistSort(e.target.value)}>
          <option value="signal">{s.sortSignal}</option>
          <option value="change">{s.sortChange}</option>
          <option value="alpha">{s.sortAlpha}</option>
        </select>
        <button
          className={styles.chartTypeBtn}
          onClick={() => setChartType((t) => (t === 'line' ? 'candle' : 'line'))}
          title={chartType === 'line' ? s.chartTypeSwitchToCandle : s.chartTypeSwitchToLine}
          aria-label={chartType === 'line' ? s.chartTypeSwitchToCandle : s.chartTypeSwitchToLine}
        >
          <Icon name={chartType === 'line' ? 'trendingUp' : 'candlestick'} size={15} />
        </button>
        {lastUpdated && (
          <span className={styles.updated}>
            <span className={styles.updatedDot} aria-hidden="true" />
            {formatRelativeTime(lastUpdated, now, s)}
          </span>
        )}
      </div>

      {watchlist.length === 0 ? (
        <div className={styles.empty}>{s.emptyWatchlist}</div>
      ) : filteredWatchlist.length === 0 ? (
        <div className={styles.empty}>{watchlistSearch.trim() ? s.noSearchMatches : s.noFilterMatches}</div>
      ) : (
        <div className={styles.list}>
          {filteredWatchlist.map((symbol) => (
            <ErrorBoundary key={symbol} compact label={symbol}>
            <TickerCard
              symbol={symbol}
              range={range}
              currency={currency}
              rates={rates}
              chartType={chartType}
              tags={tags[symbol] || []}
              onAddTag={(tag) => addTag(symbol, tag)}
              onRemoveTag={(tag) => removeTag(symbol, tag)}
              customBrands={customKnownFor[symbol] || []}
              onAddBrand={(brand) => addCustomBrand(symbol, brand)}
              onRemoveBrand={(brand) => removeCustomBrand(symbol, brand)}
              onRemove={removeTicker}
              onStatus={handleStatus}
              refreshKey={refreshKey}
              ownedQty={holdings[symbol]?.qty ?? null}
              onOwnedClick={() => jumpToSymbol(symbol, 'wallet')}
              highlighted={symbol === highlightSymbol}
              marketOpen={marketStatus.open}
            />
            </ErrorBoundary>
          ))}
        </div>
      )}
      </>
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
