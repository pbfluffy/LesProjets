import './EmptyState.css'

export default function EmptyState({ icon = '🐾', title, subtitle }) {
  return (
    <div className="ph-empty">
      <div className="ph-empty-icon" aria-hidden="true">{icon}</div>
      <p className="ph-empty-title">{title}</p>
      {subtitle && <p className="ph-empty-sub">{subtitle}</p>}
    </div>
  )
}
