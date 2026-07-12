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
    <div className="filters" role="group" aria-label="Filter bars">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          className={`filter ${active === f.id ? 'active' : ''}`}
          onClick={() => onChange(f.id)}
          aria-pressed={active === f.id}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
