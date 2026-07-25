import { useState } from 'react'
import { firestore, doc, collection, setDoc, serverTimestamp } from '../firebase'
import { STRINGS } from '../i18n/strings'

// Same policy keys/shape as admindepum.html's place editor (blankPlace().policy),
// so a reviewed suggestion can prefill those checkboxes directly.
const POLICY_KEYS = [
  'indoor_allowed', 'no_size_limit', 'water_bowl', 'no_fee', 'pet_menu',
  'off_leash_zone', 'pet_bed_toys', 'pet_pool_play_grooming', 'overnight',
  'stroller_required', 'staff_welcoming',
]

// In-app replacement for the old external Google Form link. Writes a
// lightweight pending suggestion to placeSuggestions/<autoId> — admins (or
// Pumgoda-only admins) review it in admindepum.html and either turn it into
// a real places/ doc (which deletes the suggestion) or reject it (deletes
// the suggestion directly). See firestore.rules for the write gate: anyone
// (signed in or not) may create one, only admin/pumgodaAdmin may read or
// delete. If the caller happens to be signed in, submittedBy is attributed
// to their account; otherwise it's just whatever name they optionally type.
export default function SuggestPlaceSheet({ lang = 'en', user, onClose }) {
  const s = STRINGS[lang] || STRINGS.en
  const t = s.suggestForm
  const [name, setName] = useState('')
  const [mapsUrl, setMapsUrl] = useState('')
  const [note, setNote] = useState('')
  const [yourName, setYourName] = useState('')
  const [policy, setPolicy] = useState({})
  const [sizeLimitKg, setSizeLimitKg] = useState('')
  const [feeBaht, setFeeBaht] = useState('')
  const [priceTier, setPriceTier] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | success | error

  const canSubmit = name.trim().length > 0 && status !== 'submitting'
  const togglePolicy = (key) => setPolicy((p) => ({ ...p, [key]: !p[key] }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setStatus('submitting')
    try {
      const ref = doc(collection(firestore, 'placeSuggestions'))
      const submittedBy = user
        ? { uid: user.uid, name: user.displayName || null, email: user.email || null }
        : { uid: null, name: yourName.trim() || null, email: null }
      const policyOut = {}
      for (const key of POLICY_KEYS) policyOut[key] = Boolean(policy[key])
      const sizeLimitNum = sizeLimitKg.trim() === '' ? null : Number(sizeLimitKg)
      if (sizeLimitNum != null && !Number.isNaN(sizeLimitNum)) policyOut.size_limit_kg = sizeLimitNum
      const feeNum = feeBaht.trim() === '' ? null : Number(feeBaht)
      if (feeNum != null && !Number.isNaN(feeNum)) policyOut.fee_baht = feeNum
      await setDoc(ref, {
        name: name.trim(),
        googleMapsUrl: mapsUrl.trim() || null,
        note: note.trim() || null,
        policy: policyOut,
        priceTier: priceTier || null,
        submittedBy,
        submittedAt: serverTimestamp(),
      })
      setStatus('success')
    } catch (err) {
      console.warn('[pumgoda] suggestion submit failed:', err)
      setStatus('error')
    }
  }

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 200, padding: 16,
  }
  const sheetStyle = {
    background: 'var(--bg)', borderRadius: 16, padding: '20px 16px 24px',
    maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto',
  }
  const fieldStyle = {
    display: 'block', width: '100%', padding: '10px 12px', marginTop: 6,
    border: '0.5px solid var(--border)', borderRadius: 8,
    background: 'var(--surface)', color: 'inherit', font: 'inherit', fontSize: 14,
    boxSizing: 'border-box',
  }
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, marginTop: 14 }
  const checkboxRowStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '6px 0' }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{t.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            style={{ border: 'none', background: 'none', fontSize: 20, lineHeight: 1, cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
          >
            ✕
          </button>
        </div>
        <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--muted)' }}>{t.subtitle}</p>

        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{t.success}</p>
            <button
              type="button"
              onClick={onClose}
              style={{
                marginTop: 10, padding: '10px 18px',
                border: '0.5px solid var(--border)', borderRadius: 10,
                background: 'transparent', color: 'inherit', fontSize: 14, cursor: 'pointer', font: 'inherit',
              }}
            >
              {t.close}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={labelStyle}>
              {t.nameLabel}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePlaceholder}
                maxLength={200}
                style={fieldStyle}
                required
              />
            </label>
            <label style={labelStyle}>
              {t.mapsLinkLabel}
              <input
                type="url"
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
                placeholder={t.mapsLinkPlaceholder}
                maxLength={500}
                style={fieldStyle}
              />
            </label>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted)' }}>{t.mapsLinkHelp}</p>
            <label style={labelStyle}>
              {t.noteLabel}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.notePlaceholder}
                maxLength={2000}
                rows={3}
                style={{ ...fieldStyle, resize: 'vertical' }}
              />
            </label>
            {!user && (
              <label style={labelStyle}>
                {t.yourNameLabel}
                <input
                  type="text"
                  value={yourName}
                  onChange={(e) => setYourName(e.target.value)}
                  placeholder={t.yourNamePlaceholder}
                  maxLength={200}
                  style={fieldStyle}
                />
              </label>
            )}

            <details style={{ marginTop: 16 }}>
              <summary style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t.moreDetailsToggle}</summary>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px', marginTop: 8 }}>
                {POLICY_KEYS.map((key) => (
                  <label key={key} style={checkboxRowStyle}>
                    <input
                      type="checkbox"
                      checked={Boolean(policy[key])}
                      onChange={() => togglePolicy(key)}
                    />
                    {s.policy[key] || key}
                  </label>
                ))}
              </div>
              <label style={labelStyle}>
                {t.sizeLimitLabel}
                <input
                  type="number"
                  value={sizeLimitKg}
                  onChange={(e) => setSizeLimitKg(e.target.value)}
                  style={fieldStyle}
                />
              </label>
              <label style={labelStyle}>
                {t.feeLabel}
                <input
                  type="number"
                  value={feeBaht}
                  onChange={(e) => setFeeBaht(e.target.value)}
                  style={fieldStyle}
                />
              </label>
              <label style={labelStyle}>
                {t.priceTierLabel}
                <select value={priceTier} onChange={(e) => setPriceTier(e.target.value)} style={fieldStyle}>
                  <option value="">—</option>
                  <option value="$">$</option>
                  <option value="$$">$$</option>
                  <option value="$$$">$$$</option>
                </select>
              </label>
            </details>

            {status === 'error' && (
              <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--accent)' }} role="status">
                {t.errorGeneric}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                width: '100%', marginTop: 16, padding: '12px 16px', border: 'none',
                borderRadius: 10, background: 'var(--accent)', color: '#fff',
                fontSize: 15, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'default',
                opacity: canSubmit ? 1 : 0.6, font: 'inherit',
              }}
            >
              {status === 'submitting' ? t.submitting : t.submit}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
