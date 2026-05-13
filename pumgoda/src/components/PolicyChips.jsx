import { STRINGS, interp } from '../i18n/strings'

const POLICY_KEYS = ['indoor_allowed', 'no_size_limit', 'pet_menu', 'off_leash_zone', 'overnight']

export default function PolicyChips({ venue, lang = 'en', max = 4 }) {
  const s = STRINGS[lang]
  const chips = []

  // Surface the most signal-bearing positive policies first
  for (const key of POLICY_KEYS) {
    if (chips.length >= max) break
    if (venue.policy?.[key]) {
      chips.push({ key, label: s.policy[key] })
    }
  }

  // Specific constraints / facts that are useful even if "negative"
  if (chips.length < max && venue.policy?.size_limit_kg) {
    chips.push({
      key: 'size_limit',
      label: interp(s.card.petsLimit, { kg: venue.policy.size_limit_kg }),
    })
  }
  if (chips.length < max && venue.policy?.fee_baht) {
    chips.push({
      key: 'fee',
      label: interp(s.card.fee, { baht: venue.policy.fee_baht }),
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="ph-chips">
      {chips.map((c) => (
        <span key={c.key} className="pill">
          {c.label}
        </span>
      ))}
    </div>
  )
}
