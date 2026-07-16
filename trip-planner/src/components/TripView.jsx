import { useMemo, useState } from 'react'
import ShareTrip from './ShareTrip.jsx'

function lerp(a, b, t) {
  const ah = a.match(/\w\w/g).map((x) => parseInt(x, 16))
  const bh = b.match(/\w\w/g).map((x) => parseInt(x, 16))
  const c = ah.map((v, i) => Math.round(v + (bh[i] - v) * t))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}
function nodeColor(t) {
  return t < 0.5 ? lerp('5B6F45', 'B08430', t / 0.5) : lerp('B08430', 'C15A3D', (t - 0.5) / 0.5)
}

const CATEGORY_COLORS = ['var(--warm)', 'var(--gold)', 'var(--positive)', 'var(--accent)', 'var(--ink-soft)']

function categoryColor(category, categories) {
  const idx = categories.indexOf(category)
  return CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
}

export default function TripView({ trip, onReset }) {
  const days = trip.days || []
  const food = trip.food || []
  const notes = trip.notes || []
  const openQuestions = trip.openQuestions || []

  const foodCategories = useMemo(() => {
    const seen = []
    food.forEach((f) => {
      if (!seen.includes(f.category)) seen.push(f.category)
    })
    return seen
  }, [food])
  const [foodFilter, setFoodFilter] = useState('All')
  const visibleFood = foodFilter === 'All' ? food : food.filter((f) => f.category === foodFilter)

  return (
    <div className="trip-view">
      <div className="trip-view-toolbar">
        <button type="button" className="btn-ghost back-btn" onClick={onReset}>
          ← Start a new trip
        </button>
        <ShareTrip trip={trip} />
      </div>

      <div className="hero">
        <div className="leaf-field" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`drift d${i + 1}`} />
          ))}
        </div>
        <div className="hero-inner">
          {trip.eyebrow && <p className="eyebrow">{trip.eyebrow}</p>}
          <h1>{trip.title}</h1>
          {trip.subtitle && <p className="sub">{trip.subtitle}</p>}
          {trip.stats?.length > 0 && (
            <div className="stat-strip">
              {trip.stats.map((s, i) => (
                <div key={i}>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value">{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {days.length > 0 && (
        <section className="block">
          <p className="kicker">Day by day</p>
          <h2>The full route</h2>
          <div className="timeline">
            {days.map((d, i) => {
              const t = days.length > 1 ? i / (days.length - 1) : 0
              const color = nodeColor(t)
              return (
                <div className="day-card" key={i}>
                  <span className="leaf-node" style={{ background: color }} />
                  <div className="top-row">
                    {d.date && <span className="date-badge">{d.date}</span>}
                    {d.time && <span className="time-pill">{d.time}</span>}
                    {d.flag && <span className="flag">{d.flag}</span>}
                  </div>
                  <h3>{d.title}</h3>
                  {d.description && <p>{d.description}</p>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {food.length > 0 && (
        <section className="block">
          <p className="kicker">Where to eat & shop</p>
          <h2>Food & local guide</h2>
          <div className="chips">
            <button
              type="button"
              className="chip"
              aria-pressed={foodFilter === 'All'}
              onClick={() => setFoodFilter('All')}
            >
              All
            </button>
            {foodCategories.map((c) => (
              <button
                key={c}
                type="button"
                className="chip"
                style={{ '--chip-color': categoryColor(c, foodCategories) }}
                aria-pressed={foodFilter === c}
                onClick={() => setFoodFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="food-grid">
            {visibleFood.map((f, i) => (
              <div className="food-item" key={i} style={{ borderLeftColor: categoryColor(f.category, foodCategories) }}>
                <span className="cat" style={{ color: categoryColor(f.category, foodCategories) }}>
                  {f.category}
                </span>
                <div className="name">{f.name}</div>
                {f.note && <div className="note">{f.note}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {notes.length > 0 && (
        <section className="block">
          <p className="kicker">Before you go</p>
          <h2>Notes from your paste</h2>
          <div className="pack-grid">
            {notes.map((n, i) => (
              <div className="pack-card" key={i}>
                <h3>
                  <span className="pack-dot" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                  {n.category}
                </h3>
                <ul>
                  {n.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {openQuestions.length > 0 && (
        <section className="block">
          <p className="kicker">Flagged, not guessed</p>
          <h2>Still open</h2>
          <div className="open-questions">
            {openQuestions.map((q, i) => (
              <div className="open-question" key={i}>
                {q}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
