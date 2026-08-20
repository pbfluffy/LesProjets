import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLang } from '../LangContext.jsx'
import { fetchQuote } from '../stockApi.js'
import { convert } from '../fx.js'
import { formatPrice, maskPrice } from '../format.js'
import { computeHoldingPL, projectedDividendIncome, estimateNextDividend, groupSymbolsByInstrumentType, sortHoldingSymbols } from '../wallet.js'
import { generateSummaryImage } from '../shareImage.js'
import { loadPortfolioHistory, recordPortfolioSnapshot } from '../portfolioHistory.js'
import { usePortfolioHistorySync } from '../hooks/usePortfolioHistorySync.js'
import Icon from './Icon.jsx'
import AddHoldingForm from './AddHoldingForm.jsx'
import SearchBox from './SearchBox.jsx'
import HoldingCard from './HoldingCard.jsx'
import ImportPdfModal from './ImportPdfModal.jsx'
import AllocationChart from './AllocationChart.jsx'
import PortfolioHistoryChart from './PortfolioHistoryChart.jsx'
import DividendCalendar from './DividendCalendar.jsx'
import styles from './WalletView.module.css'

const DIVIDEND_CALENDAR_PAST_DAYS = 45

const GROUP_LABEL_KEY = { EQUITY: 'groupCommonStock', ETF: 'groupETF', OTHER: 'groupOther' }
const MASK_KEY = 'stockranges_mask_amounts'
const SORT_KEY = 'stockranges_wallet_sort'
const SORT_LABEL_KEY = { value: 'sortValue', pl: 'sortPL', alpha: 'sortAlpha', yield: 'sortYield' }

// A holdings list independent from the watchlist — you can watch a stock
// without owning it. Fetches a 2-year daily range per held symbol: enough
// history for Yahoo to report actual dividend events (used to project
// monthly/quarterly income), while `current` still gives the live price
// needed for P/L regardless of range.
export default function WalletView({
  holdings, currency, rates,
  onAddHolding, onRemoveHolding, actionsPortalNode, user, watchlist, refreshKey,
  highlightSymbol, onWatchedClick, tags, onAddTag, onRemoveTag, activeTagFilters,
  knownFor, onAddBrand, onRemoveBrand,
}) {
  const { s } = useLang()
  const [quotes, setQuotes] = useState({})
  const [formOpen, setFormOpen] = useState(false)
  const [editingSymbol, setEditingSymbol] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [masked, setMasked] = useState(() => localStorage.getItem(MASK_KEY) === '1')
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState('')
  const [sortBy, setSortBy] = useState(() => localStorage.getItem(SORT_KEY) || 'value')
  const [search, setSearch] = useState('')
  const [history, setHistory] = useState(() => loadPortfolioHistory())
  const { pushSnapshot } = usePortfolioHistorySync(user, setHistory)

  const symbols = useMemo(() => Object.keys(holdings), [holdings])
  const watchedSet = useMemo(() => new Set(watchlist || []), [watchlist])

  useEffect(() => {
    localStorage.setItem(MASK_KEY, masked ? '1' : '0')
  }, [masked])

  useEffect(() => {
    localStorage.setItem(SORT_KEY, sortBy)
  }, [sortBy])

  // Re-fetches everything (ignoring the "already have it" cache below)
  // when refreshKey changes rather than just when a symbol is added —
  // tracked via a ref since including `quotes` itself in the deps would
  // re-run this on every fetch completion.
  const prevRefreshKey = useRef(refreshKey)
  useEffect(() => {
    const isRefresh = prevRefreshKey.current !== refreshKey
    prevRefreshKey.current = refreshKey
    symbols.forEach((symbol) => {
      if (!isRefresh && quotes[symbol]) return
      fetchQuote(symbol, '2y', { bypassCache: isRefresh })
        .then((data) => setQuotes((prev) => ({
          ...prev,
          [symbol]: {
            current: data.current, currency: data.currency, dividends: data.dividends || [],
            name: data.name || null, instrumentType: data.instrumentType || null, error: null,
          },
        })))
        .catch((err) => setQuotes((prev) => ({
          ...prev,
          [symbol]: { current: null, currency: null, dividends: [], name: null, instrumentType: null, error: err.code || 'SERVICE' },
        })))
    })
  }, [symbols, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const summary = useMemo(() => {
    let costBasis = 0
    let marketValue = 0
    let perMonth = 0
    let perQuarter = 0
    symbols.forEach((symbol) => {
      const holding = holdings[symbol]
      const quote = quotes[symbol]
      const convertedAvgCost = convert(holding.avgCost, holding.costCurrency, currency, rates)
      const convertedCurrent = quote?.current != null ? convert(quote.current, quote.currency, currency, rates) : null
      if (convertedAvgCost !== null && convertedCurrent !== null) {
        const pl = computeHoldingPL({ qty: holding.qty, avgCost: convertedAvgCost, currentPrice: convertedCurrent })
        costBasis += pl.costBasis
        marketValue += pl.marketValue
      }
      const projected = quote ? projectedDividendIncome(quote.dividends, holding.qty) : null
      if (projected && quote.currency) {
        perMonth += convert(projected.perMonth, quote.currency, currency, rates) ?? 0
        perQuarter += convert(projected.perQuarter, quote.currency, currency, rates) ?? 0
      }
    })
    return { costBasis, marketValue, unrealizedPL: marketValue - costBasis, perMonth, perQuarter }
  }, [symbols, holdings, quotes, currency, rates])

  // Records today's market-value snapshot once every holding's quote has
  // resolved — records the same day's entry again on a later visit
  // (overwriting, not duplicating) rather than needing a scheduled job.
  const allQuotesResolved = symbols.length > 0 && symbols.every((symbol) => quotes[symbol])
  useEffect(() => {
    if (!allQuotesResolved) return
    const entry = recordPortfolioSnapshot({ marketValue: summary.marketValue, costBasis: summary.costBasis, currency })
    setHistory(loadPortfolioHistory())
    pushSnapshot(entry)
  }, [allQuotesResolved, summary.marketValue, summary.costBasis, currency]) // eslint-disable-line react-hooks/exhaustive-deps

  function startEdit(symbol) {
    setEditingSymbol(symbol)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingSymbol(null)
  }

  function handleSave(symbol, data) {
    onAddHolding(symbol, data)
    closeForm()
  }

  // Per-symbol metrics the sort control can rank by — value/P&L come from
  // the same P/L calc as the card itself, yield is trailing-12mo actual
  // dividends over market value (not the projected run-rate, since a
  // realized yield is what "sort by yield" implies).
  const metrics = useMemo(() => {
    const result = {}
    symbols.forEach((symbol) => {
      const holding = holdings[symbol]
      const quote = quotes[symbol]
      const convertedAvgCost = convert(holding.avgCost, holding.costCurrency, currency, rates)
      const convertedCurrent = quote?.current != null ? convert(quote.current, quote.currency, currency, rates) : null
      const pl = (convertedAvgCost !== null && convertedCurrent !== null)
        ? computeHoldingPL({ qty: holding.qty, avgCost: convertedAvgCost, currentPrice: convertedCurrent })
        : null
      const projected = quote ? projectedDividendIncome(quote.dividends, holding.qty) : null
      const convertedAnnualDividend = (projected && quote.currency)
        ? convert(projected.trailingTwelveMonth, quote.currency, currency, rates)
        : null
      result[symbol] = {
        value: pl ? pl.marketValue : null,
        plPercent: pl ? pl.plPercent : null,
        yieldPercent: (pl && pl.marketValue > 0 && convertedAnnualDividend != null)
          ? (convertedAnnualDividend / pl.marketValue) * 100
          : null,
      }
    })
    return result
  }, [symbols, holdings, quotes, currency, rates])

  const sortedSymbols = useMemo(() => sortHoldingSymbols(symbols, sortBy, metrics), [symbols, sortBy, metrics])

  // Tag filtering only narrows which cards render — summary/allocation
  // stats below stay computed over every holding, same as the Watchlist's
  // buy/hold/sell counts ignoring its own tag filter.
  const tagFilteredSymbols = useMemo(() => {
    if (!activeTagFilters || activeTagFilters.size === 0) return sortedSymbols
    return sortedSymbols.filter((symbol) => (tags[symbol] || []).some((t) => activeTagFilters.has(t)))
  }, [sortedSymbols, tags, activeTagFilters])

  // Matches the company name too (unlike the Watchlist's search, which is
  // symbol-only — the name isn't lifted to that component's state).
  const searchFilteredSymbols = useMemo(() => {
    const query = search.trim().toUpperCase()
    if (!query) return tagFilteredSymbols
    return tagFilteredSymbols.filter((symbol) => {
      if (symbol.includes(query)) return true
      const name = quotes[symbol]?.name
      return name ? name.toUpperCase().includes(query) : false
    })
  }, [tagFilteredSymbols, search, quotes])

  const groupedSymbols = useMemo(() => groupSymbolsByInstrumentType(searchFilteredSymbols, quotes), [searchFilteredSymbols, quotes])

  // Per-holding market value for the allocation pie — only symbols whose
  // quote has resolved contribute a slice; the rest just aren't drawn yet
  // rather than showing a wrong/zero-value wedge.
  const allocationItems = useMemo(() => {
    return symbols
      .map((symbol) => {
        const quote = quotes[symbol]
        const convertedCurrent = quote?.current != null ? convert(quote.current, quote.currency, currency, rates) : null
        if (convertedCurrent === null) return null
        return { symbol, value: holdings[symbol].qty * convertedCurrent }
      })
      .filter(Boolean)
      .sort((a, b) => b.value - a.value)
  }, [symbols, holdings, quotes, currency, rates])

  // Recent past ex-dividend dates (actual, from Yahoo — its historical
  // endpoint is keyed by ex-date, not pay date) plus one upcoming estimate
  // per holding (guessed from cadence — see estimateNextDividend), merged
  // into a single chronological list across the whole portfolio.
  const dividendCalendarEntries = useMemo(() => {
    const nowSec = Date.now() / 1000
    const pastCutoff = nowSec - DIVIDEND_CALENDAR_PAST_DAYS * 86400
    const entries = []
    symbols.forEach((symbol) => {
      const quote = quotes[symbol]
      if (!quote || !quote.dividends) return
      const qty = holdings[symbol].qty
      quote.dividends.forEach((d) => {
        if (d.date < pastCutoff || d.date > nowSec) return
        const amount = convert(d.amount * qty, quote.currency, currency, rates)
        if (amount !== null) entries.push({ symbol, date: d.date, amount, kind: 'past' })
      })
      const next = estimateNextDividend(quote.dividends, qty)
      if (next) {
        const amount = convert(next.amount, quote.currency, currency, rates)
        if (amount !== null) entries.push({ symbol, date: next.date, amount, kind: 'estimated' })
      }
    })
    return entries.sort((a, b) => a.date - b.date)
  }, [symbols, holdings, quotes, currency, rates])

  async function handleShare() {
    if (sharing) return
    setSharing(true)
    setShareError('')
    try {
      const blob = await generateSummaryImage({ s, summary, allocationItems, currency, masked, appName: s.appName })
      const file = new File([blob], 'portfolio-summary.png', { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: s.appName })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'portfolio-summary.png'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error(err)
        setShareError(s.shareError)
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <div>
      {symbols.length > 0 && actionsPortalNode && createPortal(
        <div className={styles.toggleGroup}>
          <button
            type="button"
            className={styles.maskToggle}
            onClick={() => setMasked((v) => !v)}
            aria-pressed={masked}
            title={masked ? s.maskShow : s.maskHide}
            aria-label={masked ? s.maskShow : s.maskHide}
          >
            <Icon name={masked ? 'eyeOff' : 'eye'} size={17} />
          </button>
          <button
            type="button"
            className={styles.maskToggle}
            onClick={handleShare}
            disabled={sharing}
            title={s.shareBtn}
            aria-label={s.shareBtn}
          >
            <Icon name="share" size={16} />
          </button>
        </div>,
        actionsPortalNode
      )}

      {shareError && <div className={styles.shareError}>{shareError}</div>}

      {symbols.length > 0 && (
        <div className={styles.summaryStrip}>
          <div className={styles.summaryStat}>
            <span>{s.summaryCostBasis}</span>
            <strong>{masked ? maskPrice(currency) : formatPrice(summary.costBasis, currency)}</strong>
          </div>
          <div className={styles.summaryStat}>
            <span>{s.summaryMarketValue}</span>
            <strong>{masked ? maskPrice(currency) : formatPrice(summary.marketValue, currency)}</strong>
          </div>
          <div className={styles.summaryStat} data-direction={summary.unrealizedPL >= 0 ? 'up' : 'down'}>
            <span>{s.summaryUnrealizedPL}</span>
            <strong>{masked ? maskPrice(currency) : `${summary.unrealizedPL >= 0 ? '+' : ''}${formatPrice(summary.unrealizedPL, currency)}`}</strong>
          </div>
          <div className={styles.summaryStat} data-direction="up">
            <span>{s.estPerMonth}</span>
            <strong>{masked ? maskPrice(currency) : formatPrice(summary.perMonth, currency)}</strong>
          </div>
          <div className={styles.summaryStat} data-direction="up">
            <span>{s.estPerQuarter}</span>
            <strong>{masked ? maskPrice(currency) : formatPrice(summary.perQuarter, currency)}</strong>
          </div>
        </div>
      )}

      {symbols.length > 0 && (
        <PortfolioHistoryChart history={history} currency={currency} rates={rates} masked={masked} />
      )}

      {allocationItems.length > 0 && (
        <AllocationChart items={allocationItems} total={summary.marketValue} currency={currency} masked={masked} />
      )}

      <DividendCalendar entries={dividendCalendarEntries} currency={currency} masked={masked} />

      {symbols.length === 0 && !formOpen && <div className={styles.empty}>{s.walletEmpty}</div>}
      {symbols.length > 0 && searchFilteredSymbols.length === 0 && (
        <div className={styles.empty}>{search.trim() ? s.noSearchMatches : s.noTagMatches}</div>
      )}

      {formOpen ? (
        <AddHoldingForm
          holdings={holdings}
          editingSymbol={editingSymbol}
          editingHolding={editingSymbol ? holdings[editingSymbol] : null}
          onSave={handleSave}
          onCancel={closeForm}
        />
      ) : (
        <div className={styles.addRow}>
          <button className={styles.addBtn} onClick={() => setFormOpen(true)}>{s.addHoldingBtn}</button>
          <button className={styles.importBtn} onClick={() => setImportOpen(true)}>{s.importFromPdfBtn}</button>
        </div>
      )}

      {importOpen && (
        <ImportPdfModal onImport={onAddHolding} onClose={() => setImportOpen(false)} />
      )}

      {symbols.length > 0 && (
        <div className={styles.sortRow}>
          <SearchBox value={search} onChange={setSearch} />
          <label htmlFor="wallet-sort">{s.sortByLabel}</label>
          <select id="wallet-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {Object.entries(SORT_LABEL_KEY).map(([key, labelKey]) => (
              <option key={key} value={key}>{s[labelKey]}</option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.list}>
        {groupedSymbols.map((group) => (
          <div key={group.key} className={styles.group}>
            <div className={styles.groupHeader}>{s[GROUP_LABEL_KEY[group.key]]}</div>
            <div className={styles.groupCards}>
              {group.symbols.map((symbol) => (
                <HoldingCard
                  key={symbol}
                  symbol={symbol}
                  holding={holdings[symbol]}
                  name={quotes[symbol]?.name ?? null}
                  currentPrice={quotes[symbol]?.current ?? null}
                  currentCurrency={quotes[symbol]?.currency ?? null}
                  instrumentType={quotes[symbol]?.instrumentType ?? null}
                  dividendEvents={quotes[symbol]?.dividends ?? []}
                  loading={!quotes[symbol]}
                  quoteError={quotes[symbol]?.error ?? null}
                  displayCurrency={currency}
                  rates={rates}
                  masked={masked}
                  watched={watchedSet.has(symbol)}
                  onWatchedClick={onWatchedClick ? () => onWatchedClick(symbol) : undefined}
                  highlighted={symbol === highlightSymbol}
                  tags={tags[symbol] || []}
                  onAddTag={(tag) => onAddTag(symbol, tag)}
                  onRemoveTag={(tag) => onRemoveTag(symbol, tag)}
                  customBrands={knownFor[symbol] || []}
                  onAddBrand={(brand) => onAddBrand(symbol, brand)}
                  onRemoveBrand={(brand) => onRemoveBrand(symbol, brand)}
                  onEdit={startEdit}
                  onRemove={onRemoveHolding}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
