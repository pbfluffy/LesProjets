import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES, PROMO_GROUPS, PROMO_GROUP_CHIPS } from '../categories.js'
import { DEFAULT_FILTERS, filterPerks, groupRows, promoGroupCounts, perkHeadline, isExpired, cardLabel } from '../perks.js'

function Seg({ value, onChange, options }) {
  return (
    <div className="seg" role="group">
      {options.map(([v, label]) => (
        <button key={v} className={value === v ? 'on' : ''} aria-pressed={value === v} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  )
}

const PAGE = 40 // results shown at a time; promotions can number in the hundreds
const VIEW_KEY = 'card-perks-view'

function loadView() {
  try { return localStorage.getItem(VIEW_KEY) === 'compact' ? 'compact' : 'cards' } catch { return 'cards' }
}

// One privilege: a headline (the key number as a badge, the title, points pill)
// and a collapsed "details" part holding the bank's conditions and source.
function Result({ card, perk, multiCard }) {
  const head = perkHeadline(perk)
  const expired = isExpired(perk)
  const hasDetails = !!(perk.minSpend || perk.validUntil || perk.conditions || (perk.auto && perk.sourceUrl))
  const meta = [multiCard ? cardLabel(card) : null, perk.promo ? PROMO_GROUPS[perk.group] || 'Promotion' : null,
    perk.validUntil ? `${expired ? 'expired' : 'until'} ${perk.validUntil}` : null].filter(Boolean)
  const top = (
    <>
      <span className="sum-main">
        {head && <span className="headline">{head}</span>}
        <strong className="sum-title">{perk.title}</strong>
        <span className={'pill ' + (perk.requiresPoints ? 'pts' : 'free')}>
          {perk.requiresPoints ? `${perk.pointsCost ? perk.pointsCost.toLocaleString() + ' ' : ''}points` : 'No points needed'}
        </span>
      </span>
      <span className="sum-meta">
        {meta.join(' · ')}
        {perk.promo
          ? <span className="badge" title="A time-limited restaurant promotion collected from the bank’s website">Promotion</span>
          : perk.auto && <span className="badge" title="Collected automatically from the bank’s website">Auto</span>}
      </span>
    </>
  )
  return (
    <li className={'result' + (expired ? ' expired' : '')}>
      {hasDetails ? (
        <details>
          <summary>{top}<span className="chev" aria-hidden="true" /></summary>
          <div className="details">
            <ul className="conds">
              {perk.minSpend ? <li>Minimum spend: {perk.minSpend.toLocaleString()}</li> : null}
              {perk.validUntil ? <li>{expired ? 'Expired' : 'Valid until'} {perk.validUntil}</li> : null}
              {perk.conditions ? <li>{perk.conditions}</li> : null}
            </ul>
            {perk.auto && perk.sourceUrl && (
              <div className="fine">
                {cardLabel(card)} · From the bank’s website{perk.checkedAt ? `, checked ${new Date(perk.checkedAt).toLocaleDateString()}` : ''} ·{' '}
                <a href={perk.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a> — confirm with the bank.
              </div>
            )}
          </div>
        </details>
      ) : <div className="no-details">{top}</div>}
    </li>
  )
}

export default function CheckerView({ cards, onGoCards }) {
  const [f, setF] = useState(DEFAULT_FILTERS)
  const [limit, setLimit] = useState(PAGE)
  const [view, setView] = useState(loadView)
  const [showFilters, setShowFilters] = useState(false) // only matters on narrow screens
  useEffect(() => setLimit(PAGE), [f]) // a new filter starts again from the top
  const changeView = (v) => {
    setView(v)
    try { localStorage.setItem(VIEW_KEY, v) } catch { /* the choice just isn't remembered */ }
  }
  const rows = useMemo(() => filterPerks(cards, f), [cards, f])
  const allGroups = useMemo(() => groupRows(rows, CATEGORIES, PROMO_GROUPS), [rows])
  // Show the first `limit` rows overall; a heading's count is its full size.
  let budget = limit
  const groups = allGroups.map((g) => { const shown = g.rows.slice(0, Math.max(budget, 0)); budget -= shown.length; return { ...g, shown } }).filter((g) => g.shown.length)
  // Per-type counts under every other filter, so a chip says how many it would show.
  const groupCounts = useMemo(() => promoGroupCounts(filterPerks(cards, { ...f, groups: [] })), [cards, f])
  const totalPerks = cards.reduce((n, c) => n + (c.perks?.length || 0), 0)
  const hasPromos = cards.some((c) => c.perks?.some((p) => p.promo))
  const dirty = JSON.stringify(f) !== JSON.stringify(DEFAULT_FILTERS)
  // How many filters besides the search box are on, for the "Filters (n)" button.
  const active = f.categories.length + f.groups.length + [f.points !== 'any', f.spend !== 'any', f.kind !== 'any', f.cardId !== 'all', !f.hideExpired].filter(Boolean).length
  const toggleCat = (id) => setF({ ...f, categories: f.categories.includes(id) ? f.categories.filter((c) => c !== id) : [...f.categories, id] })
  const toggleGroup = (id) => setF({ ...f, groups: f.groups.includes(id) ? f.groups.filter((g) => g !== id) : [...f.groups, id] })

  if (!cards.length) return <p className="empty">Add a card in “My cards” first, then come back to check its privileges.</p>

  // Cards exist but none has a privilege: say that, instead of "no match".
  if (!totalPerks) {
    return (
      <div className="empty">
        <p>Your cards don’t have any privileges yet.</p>
        <p className="muted">Privileges are filled in automatically for supported cards (currently KTC and Krungsri). For other cards, add them yourself.</p>
        {onGoCards && <button className="btn primary" onClick={onGoCards}>Go to My cards</button>}
      </div>
    )
  }

  return (
    <section className={view === 'compact' ? 'compact' : ''}>
      <div className="panel filters">
        <div className="search-row">
          <input type="search" placeholder="Search privileges…" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value })} aria-label="Search privileges" />
          <button className="btn filters-toggle" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>
            Filters{active ? ` (${active})` : ''}
          </button>
        </div>
        <div className={'filters-body' + (showFilters ? ' open' : '')}>
          <div className="chips" role="group" aria-label="Category">
            {CATEGORIES.map((c) => (
              <button key={c.id} className={'chip' + (f.categories.includes(c.id) ? ' on' : '')} aria-pressed={f.categories.includes(c.id)} onClick={() => toggleCat(c.id)}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          {hasPromos && f.kind !== 'privilege' && (
            <div className="venue">
              <span className="lbl">Where to eat</span>
              <div className="chips" role="group" aria-label="Restaurant type">
                {PROMO_GROUP_CHIPS.filter((g) => groupCounts[g.id] || f.groups.includes(g.id)).map((g) => (
                  <button key={g.id} className={'chip' + (f.groups.includes(g.id) ? ' on' : '')} aria-pressed={f.groups.includes(g.id)} onClick={() => toggleGroup(g.id)}>
                    {g.icon} {g.label} <span className="count">{groupCounts[g.id] || 0}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="filter-row">
            <span className="lbl">Points</span>
            <Seg value={f.points} onChange={(points) => setF({ ...f, points })} options={[['any', 'Any'], ['free', 'No points needed'], ['points', 'Points required']]} />
          </div>
          <div className="filter-row">
            <span className="lbl">Spend</span>
            <Seg value={f.spend} onChange={(spend) => setF({ ...f, spend })} options={[['any', 'Any'], ['none', 'No minimum spend']]} />
          </div>
          {hasPromos && (
            <div className="filter-row">
              <span className="lbl">Show</span>
              <Seg value={f.kind} onChange={(kind) => setF({ ...f, kind })} options={[['any', 'All'], ['privilege', 'Card privileges'], ['promo', 'Restaurant promotions']]} />
            </div>
          )}
          <div className="filter-row">
            <span className="lbl">Card</span>
            <select value={f.cardId} onChange={(e) => setF({ ...f, cardId: e.target.value })} aria-label="Card">
              <option value="all">All cards</option>
              {cards.map((c) => <option key={c.id} value={c.id}>{cardLabel(c)}</option>)}
            </select>
            <label className="check"><input type="checkbox" checked={f.hideExpired} onChange={(e) => setF({ ...f, hideExpired: e.target.checked })} /> Hide expired</label>
          </div>
        </div>
        {dirty && <button className="link" onClick={() => setF(DEFAULT_FILTERS)}>Reset filters</button>}
      </div>

      <div className="count-row">
        <p className="muted" aria-live="polite">{rows.length} of {totalPerks} privileges</p>
        <Seg value={view} onChange={changeView} options={[['cards', 'Detailed'], ['compact', 'Compact']]} />
      </div>
      {!rows.length && <p className="empty">No privileges match these filters.</p>}
      {groups.map((g) => (
        <div className="group" key={g.key}>
          <h3 className="group-head">{g.icon} {g.label} <span className="count">{g.rows.length}</span></h3>
          <ul className="results">
            {g.shown.map(({ card, perk }) => <Result key={card.id + perk.id} card={card} perk={perk} multiCard={cards.length > 1} />)}
          </ul>
        </div>
      ))}
      {rows.length > limit && (
        <div className="empty">
          <button className="btn" onClick={() => setLimit(limit + PAGE)}>Show {Math.min(PAGE, rows.length - limit)} more ({rows.length - limit} left)</button>
        </div>
      )}
    </section>
  )
}
