import { useState } from 'react'
import { CATEGORIES } from '../categories.js'
import { cleanPerk } from '../perks.js'

export default function PerkForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState({
    title: '', category: 'dining', requiresPoints: false, conditions: '',
    ...initial,
    pointsCost: initial?.pointsCost ?? '',
    minSpend: initial?.minSpend ?? '',
    validUntil: initial?.validUntil ?? '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  function submit(e) {
    e.preventDefault()
    const perk = cleanPerk(f)
    if (perk) onSave(perk)
  }

  return (
    <form className="perk-form" onSubmit={submit}>
      <label>Privilege
        <input value={f.title} onChange={set('title')} maxLength={120} placeholder="e.g. Airport lounge access" required autoFocus />
      </label>
      <label>Category
        <select value={f.category} onChange={set('category')}>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
      </label>
      <label className="check">
        <input type="checkbox" checked={!!f.requiresPoints} onChange={set('requiresPoints')} />
        Requires points to use
      </label>
      {f.requiresPoints && (
        <label>Points needed
          <input type="number" min="1" inputMode="numeric" value={f.pointsCost} onChange={set('pointsCost')} placeholder="e.g. 5000" />
        </label>
      )}
      <label>Minimum spend (optional)
        <input type="number" min="1" inputMode="numeric" value={f.minSpend} onChange={set('minSpend')} placeholder="e.g. 500" />
      </label>
      <label>Valid until (optional)
        <input type="date" value={f.validUntil} onChange={set('validUntil')} />
      </label>
      <label>Conditions / notes
        <textarea rows={2} maxLength={300} value={f.conditions} onChange={set('conditions')} placeholder="e.g. 4 visits per year" />
      </label>
      <div className="row">
        <button type="submit" className="btn primary">Save</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
