import { useMemo, useState } from 'react'
import { CATEGORIES, categoryById } from '../categories.js'
import { DEFAULT_FILTERS, filterPerks, isExpired, cardLabel } from '../perks.js'

function Seg({ value, onChange, options }) {
  return (
    <div className="seg" role="group">
      {options.map(([v, label]) => (
        <button key={v} className={value === v ? 'on' : ''} aria-pressed={value === v} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  )
}

export default function CheckerView({ cards, onGoCards }) {
  const [f, setF] = useState(DEFAULT_FILTERS)
  const rows = useMemo(() => filterPerks(cards, f), [cards, f])
  const totalPerks = cards.reduce((n, c) => n + (c.perks?.length || 0), 0)
  const dirty = JSON.stringify(f) !== JSON.stringify(DEFAULT_FILTERS)
  const toggleCat = (id) => setF({ ...f, categories: f.categories.includes(id) ? f.categories.filter((c) => c !== id) : [...f.categories, id] })

  if (!cards.length) return <p className="empty">Add a card in “My cards” first, then come back to check its privileges.</p>

  // Cards exist but none has a privilege: say that, instead of "no match".
  if (!totalPerks) {
    return (
      <div className="empty">
        <p>Your cards don’t have any privileges yet.</p>
        <p className="muted">Privileges are filled in automatically for supported cards (currently KTC). For other cards, add them yourself.</p>
        {onGoCards && <button className="btn primary" onClick={onGoCards}>Go to My cards</button>}
      </div>
    )
  }

  return (
    <section>
      <div className="panel filters">
        <input type="search" placeholder="Search privileges…" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value })} aria-label="Search privileges" />
        <div className="chips" role="group" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button key={c.id} className={'chip' + (f.categories.includes(c.id) ? ' on' : '')} aria-pressed={f.categories.includes(c.id)} onClick={() => toggleCat(c.id)}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <span className="lbl">Points</span>
          <Seg value={f.points} onChange={(points) => setF({ ...f, points })} options={[['any', 'Any'], ['free', 'No points needed'], ['points', 'Points required']]} />
        </div>
        <div className="filter-row">
          <span className="lbl">Spend</span>
          <Seg value={f.spend} onChange={(spend) => setF({ ...f, spend })} options={[['any', 'Any'], ['none', 'No minimum spend']]} />
        </div>
        <div className="filter-row">
          <span className="lbl">Card</span>
          <select value={f.cardId} onChange={(e) => setF({ ...f, cardId: e.target.value })} aria-label="Card">
            <option value="all">All cards</option>
            {cards.map((c) => <option key={c.id} value={c.id}>{cardLabel(c)}</option>)}
          </select>
          <label className="check"><input type="checkbox" checked={f.hideExpired} onChange={(e) => setF({ ...f, hideExpired: e.target.checked })} /> Hide expired</label>
        </div>
        {dirty && <button className="link" onClick={() => setF(DEFAULT_FILTERS)}>Reset filters</button>}
      </div>

      <p className="muted" aria-live="polite">{rows.length} of {totalPerks} privileges</p>
      {!rows.length && <p className="empty">No privileges match these filters.</p>}
      <ul className="results">
        {rows.map(({ card, perk }) => {
          const cat = categoryById(perk.category)
          return (
            <li className={'panel result' + (isExpired(perk) ? ' expired' : '')} key={card.id + perk.id}>
              <div className="result-top">
                <strong>{cat.icon} {perk.title}</strong>
                <span className={'pill ' + (perk.requiresPoints ? 'pts' : 'free')}>
                  {perk.requiresPoints ? `${perk.pointsCost ? perk.pointsCost.toLocaleString() + ' ' : ''}points` : 'No points needed'}
                </span>
              </div>
              <div className="muted">
                {cardLabel(card)} · {cat.label}
                {perk.auto && <span className="badge" title="Collected automatically from the bank’s website">Auto</span>}
              </div>
              {(perk.minSpend || perk.validUntil || perk.conditions) && (
                <ul className="conds">
                  {perk.minSpend ? <li>Minimum spend: {perk.minSpend.toLocaleString()}</li> : null}
                  {perk.validUntil ? <li>{isExpired(perk) ? 'Expired' : 'Valid until'} {perk.validUntil}</li> : null}
                  {perk.conditions ? <li>{perk.conditions}</li> : null}
                </ul>
              )}
              {perk.auto && perk.sourceUrl && (
                <div className="fine">
                  From the bank’s website{perk.checkedAt ? `, checked ${new Date(perk.checkedAt).toLocaleDateString()}` : ''} ·{' '}
                  <a href={perk.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a> — confirm with the bank.
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
