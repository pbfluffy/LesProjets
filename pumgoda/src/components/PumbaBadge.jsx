import './PumbaBadge.css'

export default function PumbaBadge({ venue, lang = 'en' }) {
  if (!venue.pumba?.verified) return null
  const label = lang === 'th' ? 'พุมบ้าเคยมา' : 'Pumba was here'
  return (
    <span className="ph-pumba-badge" title={venue.pumba.visitDate || ''}>
      🐾 <span className="ph-pumba-text">{label}</span>
    </span>
  )
}
