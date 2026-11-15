import { useMemo, useState } from 'react'
import { NETWORKS, categoryById } from '../categories.js'
import { OTHER, bankById, bankOptions } from '../banks.js'
import { TEMPLATES } from '../templates.js'
import { newId, cardLabel, cardFullName, autoPerksFor } from '../perks.js'
import PerkForm from './PerkForm.jsx'

const MAX_CARDS = 30
const MAX_PERKS = 60

const guessNetwork = (name) => (/visa/i.test(name) ? 'Visa' : /mastercard/i.test(name) ? 'Mastercard' : /jcb/i.test(name) ? 'JCB' : /unionpay/i.test(name) ? 'UnionPay' : '')

// Step 1 pick the bank, step 2 pick one of its cards (or type your own),
// then optional nickname / network / example privileges. Cards from the
// scanned catalog get their privileges filled in automatically.
function AddCard({ banks, onAdd, onCancel }) {
  const [bankId, setBankId] = useState('')
  const [bankText, setBankText] = useState('')
  const [cardChoice, setCardChoice] = useState('')
  const [cardText, setCardText] = useState('')
  const [nickname, setNickname] = useState('')
  const [network, setNetwork] = useState('')
  const [tpl, setTpl] = useState('')

  const bank = bankById(bankId, banks)
  const knownCards = bank?.cards || []
  // The card list only helps when the bank has known cards; otherwise (other
  // bank, or a bank we have no cards for) go straight to typing the name.
  const showCardSelect = !!bank && knownCards.length > 0
  const typeCard = !!bankId && (!showCardSelect || cardChoice === OTHER)
  const chosen = typeCard ? null : knownCards.find((c) => c.key === cardChoice)
  const fromCatalog = !!chosen?.catalogCardId

  const bankName = bankId === OTHER ? bankText.trim() : bank?.name || ''
  const cardName = (typeCard ? cardText : chosen?.name || '').trim()
  const valid = !!bankName && !!cardName

  function pickBank(id) {
    setBankId(id)
    setCardChoice('')
    setCardText('')
    setNetwork(bankById(id, banks)?.network || '')
  }
  function pickCard(key) {
    setCardChoice(key)
    const c = knownCards.find((x) => x.key === key)
    if (c?.catalogCardId) setNetwork(guessNetwork(c.name) || bank?.network || '')
  }
  function submit(e) {
    e.preventDefault()
    if (!valid) return
    const t = fromCatalog ? null : TEMPLATES.find((x) => x.key === tpl)
    const perks = (t?.perks || []).map((p) => ({ id: newId(), validUntil: null, ...p }))
    onAdd({
      id: newId(),
      bank: bankName.slice(0, 60),
      name: cardName.slice(0, 80),
      nickname: nickname.trim().slice(0, 40),
      network,
      perks,
      ...(fromCatalog ? { catalogRef: { bank: bankId, card: chosen.catalogCardId } } : {}),
    })
  }

  return (
    <form className="panel perk-form" onSubmit={submit}>
      <h3>Add a card</h3>

      <label>Bank
        <select value={bankId} onChange={(e) => pickBank(e.target.value)} required autoFocus>
          <option value="" disabled>Select a bank…</option>
          {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          <option value={OTHER}>Other bank…</option>
        </select>
      </label>
      {bankId === OTHER && (
        <label>Bank name
          <input value={bankText} onChange={(e) => setBankText(e.target.value)} maxLength={60} placeholder="e.g. Government Savings Bank" required />
        </label>
      )}

      {bankId && showCardSelect && (
        <label>Card
          <select value={cardChoice} onChange={(e) => pickCard(e.target.value)} required>
            <option value="" disabled>Select a card…</option>
            {knownCards.map((c) => <option key={c.key} value={c.key}>{c.label || c.name}</option>)}
            <option value={OTHER}>Other card…</option>
          </select>
        </label>
      )}
      {typeCard && (
        <label>Card name
          <input value={cardText} onChange={(e) => setCardText(e.target.value)} maxLength={80} placeholder="e.g. Platinum Cashback" required />
        </label>
      )}

      {bankId && (
        <>
          <label>Nickname (optional)
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40} placeholder="e.g. Travel card" />
          </label>
          <label>Network (optional)
            <select value={network} onChange={(e) => setNetwork(e.target.value)}>
              <option value="">Not sure / skip</option>
              {NETWORKS.map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
          {fromCatalog ? (
            <p className="notice">✓ Privileges for this card are collected automatically from {bank.name}’s website and kept up to date. You can still add your own.</p>
          ) : (
            <label>Example privileges (optional)
              <select value={tpl} onChange={(e) => setTpl(e.target.value)}>
                <option value="">None — I’ll add my own</option>
                {TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
              </select>
            </label>
          )}
          <p className="fine">
            {!fromCatalog && 'Privileges can’t be collected automatically for this card yet — you add them yourself. '}
            The bank and card lists are a shortcut — pick “Other” if yours isn’t listed. Do not enter the card number, expiry or CVV — they are never stored.
          </p>
        </>
      )}

      <div className="row">
        <button className="btn primary" type="submit" disabled={!valid}>Add card</button>
        <button className="btn" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function PerkLine({ perk, onEdit, onDelete }) {
  const cat = categoryById(perk.category)
  return (
    <li className="perk-line">
      <span>{cat.icon} <strong>{perk.title}</strong>
        <span className={'pill ' + (perk.requiresPoints ? 'pts' : 'free')}>
          {perk.requiresPoints ? `${perk.pointsCost ? perk.pointsCost.toLocaleString() + ' ' : ''}points` : 'No points'}
        </span>
      </span>
      <span className="row">
        <button className="link" onClick={onEdit}>Edit</button>
        <button className="link danger" onClick={onDelete}>Delete</button>
      </span>
    </li>
  )
}

// Read-only privileges the scanner collected, with where and when they came from.
function AutoPerks({ perks }) {
  if (!perks.length) return null
  const first = perks[0]
  const when = first.checkedAt ? new Date(first.checkedAt).toLocaleDateString() : null
  return (
    <div className="auto-perks">
      <div className="muted">
        {perks.length} privileges collected automatically{when ? ` · checked ${when}` : ''}
        {first.sourceUrl && <> · <a href={first.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a></>}
      </div>
      <ul className="auto-list">
        {perks.map((p) => <li key={p.id}>{categoryById(p.category).icon} {p.title}</li>)}
      </ul>
      <p className="fine">Collected from the bank’s public website by software — confirm details with the bank before relying on them.</p>
    </div>
  )
}

// Cards saved before the catalog existed (or entered by hand) can be linked to
// a catalog card afterwards, which switches on automatic privileges.
function LinkCatalog({ card, catalog, onLink }) {
  if (card.catalogRef) return null
  const entry = Object.entries(catalog).find(([, doc]) => doc.bank?.name === card.bank)
  if (!entry || !entry[1].cards?.length) return null
  const [bankId, doc] = entry
  return (
    <label className="link-catalog">
      Collect privileges automatically — which {doc.bank.name} card is this?
      <select value="" onChange={(e) => {
        const c = doc.cards.find((x) => x.id === e.target.value)
        if (c) onLink({ catalogRef: { bank: bankId, card: c.id }, name: c.name, network: guessNetwork(c.name) || card.network || '' })
      }}>
        <option value="" disabled>Select a card…</option>
        {doc.cards.map((c) => <option key={c.id} value={c.id}>{c.discontinued ? `${c.name} (no longer issued)` : c.name}</option>)}
      </select>
    </label>
  )
}

export default function CardsView({ cards, persist, catalog = {} }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null) // { cardId, perk|null }
  const banks = useMemo(() => bankOptions(catalog), [catalog])

  const update = (id, fn) => persist(cards.map((c) => (c.id === id ? fn(c) : c)))

  function savePerk(card, perk) {
    const exists = card.perks.some((p) => p.id === perk.id)
    update(card.id, (c) => ({ ...c, perks: exists ? c.perks.map((p) => (p.id === perk.id ? perk : p)) : [...c.perks, perk] }))
    setEditing(null)
  }
  function deleteCard(card) {
    if (window.confirm(`Remove "${cardLabel(card)}" and its privileges?`)) persist(cards.filter((c) => c.id !== card.id))
  }

  return (
    <section>
      <div className="section-head">
        <h2>My cards</h2>
        {!adding && cards.length < MAX_CARDS && <button className="btn primary" onClick={() => setAdding(true)}>+ Add card</button>}
      </div>
      {adding && <AddCard banks={banks} onCancel={() => setAdding(false)} onAdd={(c) => { persist([...cards, c]); setAdding(false) }} />}
      {!cards.length && !adding && <p className="empty">No cards yet. Add one to start checking privileges.</p>}
      {cards.map((card) => (
        <article className="panel" key={card.id}>
          <div className="section-head">
            <div>
              <h3>{cardLabel(card)}</h3>
              <div className="muted">{[card.nickname ? cardFullName(card) : '', card.network].filter(Boolean).join(' · ')}</div>
            </div>
            <button className="link danger" onClick={() => deleteCard(card)}>Remove card</button>
          </div>
          <LinkCatalog card={card} catalog={catalog} onLink={(patch) => update(card.id, (c) => ({ ...c, ...patch }))} />
          <AutoPerks perks={autoPerksFor(card, catalog)} />
          {card.catalogRef && !autoPerksFor(card, catalog).length && (
            <p className="muted">Automatic privileges for this card aren’t available right now — they’ll appear when the catalog loads.</p>
          )}
          <ul className="perk-list">
            {card.perks.map((p) => (
              editing?.cardId === card.id && editing.perk?.id === p.id
                ? <li key={p.id}><PerkForm initial={p} onSave={(x) => savePerk(card, x)} onCancel={() => setEditing(null)} /></li>
                : <PerkLine key={p.id} perk={p} onEdit={() => setEditing({ cardId: card.id, perk: p })}
                    onDelete={() => update(card.id, (c) => ({ ...c, perks: c.perks.filter((x) => x.id !== p.id) }))} />
            ))}
          </ul>
          {editing?.cardId === card.id && !editing.perk
            ? <PerkForm onSave={(x) => savePerk(card, x)} onCancel={() => setEditing(null)} />
            : card.perks.length < MAX_PERKS && <button className="btn" onClick={() => setEditing({ cardId: card.id, perk: null })}>+ Add privilege</button>}
        </article>
      ))}
    </section>
  )
}
