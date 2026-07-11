const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'best-ratio', label: 'Best ratio' },
  { id: 'under-100', label: 'Under ฿100' },
  { id: 'high-protein', label: '20g+ protein' },
  { id: 'thai-made', label: 'Thai brands' },
  { id: 'plant-based', label: 'Plant-based' },
]

export default function FilterBar({ active, onChange }) {
  return (
    <div className="filters">
      {FILTERS.map((f) => (
        <div
          key={f.id}
          className={`filter ${active === f.id ? 'active' : ''}`}
          onClick={() => onChange(f.id)}
        >
          {f.label}
        </div>
      ))}
    </div>
  )
}
