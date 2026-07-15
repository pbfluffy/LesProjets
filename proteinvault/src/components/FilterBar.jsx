const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'promo', label: 'On promo' },
  { id: 'best-ratio', label: 'Best ratio' },
  { id: 'under-100', label: 'Under ฿100' },
  { id: 'high-protein', label: '20g+ protein' },
  { id: 'thai-made', label: 'Thai brands' },
  { id: 'plant-based', label: 'Plant-based' },
]

export default function FilterBar({ active, onChange }) {
  // Tapping the already-active filter again clears it back to "All" —
  // otherwise there was no way to turn a filter off on mobile without
  // scrolling to find and tap "All" specifically.
  function handleClick(id) {
    if (id === 'all') return onChange('all')
    onChange(active === id ? 'all' : id)
  }

  return (
    <div className="filters" role="group" aria-label="Filter bars">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          className={`filter ${active === f.id ? 'active' : ''}`}
          onClick={() => handleClick(f.id)}
          aria-pressed={active === f.id}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
