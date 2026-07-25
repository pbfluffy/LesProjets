import { useMemo, useState } from 'react'
import { firestore, doc, collection, setDoc, serverTimestamp } from '../firebase'
import { STRINGS, interp } from '../i18n/strings'
import { PHOTO_WORKER_URL } from '../config'

// Same policy keys/shape as admindepum.html's place editor (blankPlace().policy),
// so a reviewed suggestion can prefill those checkboxes directly.
const POLICY_KEYS = [
  'indoor_allowed', 'no_size_limit', 'water_bowl', 'no_fee', 'pet_menu',
  'off_leash_zone', 'pet_bed_toys', 'pet_pool_play_grooming', 'overnight',
  'stroller_required', 'staff_welcoming',
]

// Loose normalize for the "already listed?" nudge — not meant to be exact,
// just enough to catch someone re-submitting a place that's already in the
// catalog under a near-identical name.
const normalizeName = (str) =>
  (str || '').toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim()

function findPossibleDuplicate(name, places) {
  const query = normalizeName(name)
  if (!query || query.length < 3 || !Array.isArray(places)) return null
  for (const p of places) {
    const en = normalizeName(p.name?.en)
    const th = normalizeName(p.name?.th)
    for (const candidate of [en, th]) {
      if (!candidate) continue
      if (candidate === query || candidate.includes(query) || query.includes(candidate)) {
        return p.name?.en || p.name?.th || p.id
      }
    }
  }
  return null
}

// In-app replacement for the old external Google Form link. Writes a
// lightweight pending suggestion to placeSuggestions/<autoId> — admins (or
// Pumgoda-only admins) review it in admindepum.html and either turn it into
// a real places/ doc (which deletes the suggestion) or reject it (deletes
// the suggestion directly). See firestore.rules for the write gate: anyone
// (signed in or not) may create one, only admin/pumgodaAdmin may read or
// delete. If the caller happens to be signed in, submittedBy is attributed
// to their account; otherwise it's just whatever name they optionally type.
export default function SuggestPlaceSheet({ lang = 'en', user, places = [], onSignIn, signingIn, onClose }) {
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
  const [photoUrl, setPhotoUrl] = useState(null)
  const [photoStatus, setPhotoStatus] = useState('idle') // idle | uploading | done | error
  const [status, setStatus] = useState('idle') // idle | submitting | success | error

  const canSubmit = name.trim().length > 0 && status !== 'submitting'
  const togglePolicy = (key) => setPolicy((p) => ({ ...p, [key]: !p[key] }))
  const duplicateMatch = useMemo(() => findPossibleDuplicate(name, places), [name, places])

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    setPhotoStatus('uploading')
    try {
      const token = await user.getIdToken()
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${PHOTO_WORKER_URL}/suggest`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      if (!res.ok) throw new Error('upload failed: ' + res.status)
      const data = await res.json()
      setPhotoUrl(data.url)
      setPhotoStatus('done')
    } catch (err) {
      console.warn('[pumgoda] suggestion photo upload failed:', err)
      setPhotoStatus('error')
    }
  }

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
        ...(photoUrl ? { photos: [photoUrl] } : {}),
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
            {duplicateMatch && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--accent)' }} role="status">
                {interp(t.duplicateWarning, { name: duplicateMatch })}
              </p>
            )}
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

            <label style={labelStyle}>{t.photoLabel}</label>
            {user ? (
              <div style={{ marginTop: 6 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  disabled={photoStatus === 'uploading'}
                  style={{ fontSize: 13 }}
                />
                {photoStatus === 'uploading' && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>{t.photoUploading}</p>
                )}
                {photoStatus === 'done' && photoUrl && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src={photoUrl} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>{t.photoUploaded}</p>
                  </div>
                )}
                {photoStatus === 'error' && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--accent)' }}>{t.photoUploadError}</p>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>{t.photoSignInHint}</p>
                <button
                  type="button"
                  onClick={onSignIn}
                  disabled={signingIn}
                  style={{
                    padding: '6px 12px', border: '0.5px solid var(--border)', borderRadius: 8,
                    background: 'transparent', color: 'inherit', fontSize: 12, cursor: 'pointer', font: 'inherit',
                  }}
                >
                  {s.account.continueWithGoogle}
                </button>
              </div>
            )}

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
