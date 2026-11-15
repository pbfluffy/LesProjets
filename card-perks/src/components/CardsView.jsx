import { useState } from 'react'
import { NETWORKS, categoryById } from '../categories.js'
import { BANKS, OTHER, bankById } from '../banks.js'
import { TEMPLATES } from '../templates.js'
import { newId, cardLabel, cardFullName } from '../perks.js'
import PerkForm from './PerkForm.jsx'

const MAX_CARDS = 30
const MAX_PERKS = 60

// Step 1 pick the bank, step 2 pick one of its cards (or type your own),
// then optional nickname / network / example privileges.
function AddCard({ onAdd, onCancel }) {
  const [bankId, setBankId] = useState('')
  const [bankText, setBankText] = useState('')
  const [cardChoice, setCardChoice] = useState('')
  const [cardText, setCardText] = useState('')
  const [nickname, setNickname] = useState('')
  const [network, setNetwork] = useState('')
  const [tpl, setTpl] = useState('')

  const bank = bankById(bankId)
  const knownCards = bank?.cards || []
  // The card list only helps when the bank has known cards; otherwise (other
  // bank, or a bank we have no cards for) go straight to typing the name.
  const showCardSelect = !!bank && knownCards.length > 0
  const typeCard = !!bankId && (!showCardSelect || cardChoice === OTHER)

  const bankName = bankId === OTHER ? bankText.trim() : bank?.name || ''
  const cardName = (typeCard ? cardText : cardChoice).trim()
  const valid = !!bankName && !!cardName

  function pickBank(id) {
    setBankId(id)
    setCardChoice('')
    setCardText('')
    const b = bankById(id)
    if (b?.network) setNetwork(b.network)
  }
  function submit(e) {
    e.preventDefault()
    if (!valid) return
    const t = TEMPLATES.find((x) => x.key === tpl)
    const perks = (t?.perks || []).map((p) => ({ id: newId(), validUntil: null, ...p }))
    onAdd({
      id: newId(),
      bank: bankName.slice(0, 60),
      name: cardName.slice(0, 80),
      nickname: nickname.trim().slice(0, 40),
      network,
      perks,
    })
  }

  return (
    <form className="panel perk-form" onSubmit={submit}>
      <h3>Add a card</h3>

      <label>Bank
        <select value={bankId} onChange={(e) => pickBank(e.target.value)} required autoFocus>
          <option value="" disabled>Select a bank…</option>
          {BANKS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
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
          <select value={cardChoice} onChange={(e) => setCardChoice(e.target.value)} required>
            <option value="" disabled>Select a card…</option>
            {knownCards.map((c) => <option key={c} value={c}>{c}</option>)}
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
          <label>Example privileges (optional)
            <select value={tpl} onChange={(e) => setTpl(e.target.value)}>
              <option value="">None — I’ll add my own</option>
              {TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
            </select>
          </label>
          <p className="fine">The bank and card lists are a shortcut, not official data — pick “Other” if yours isn’t listed. Examples are placeholders to edit; check your card’s terms for real privileges. Do not enter the card number, expiry or CVV — they are never stored.</p>
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

export default function CardsView({ cards, persist }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null) // { cardId, perk|null }

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
      {adding && <AddCard onCancel={() => setAdding(false)} onAdd={(c) => { persist([...cards, c]); setAdding(false) }} />}
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
