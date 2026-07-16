import { useState } from 'react'
import InputPanel from './components/InputPanel.jsx'
import TripView from './components/TripView.jsx'
import { generateItinerary } from './api.js'

export default function App() {
  const [trip, setTrip] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate({ text, files }) {
    setBusy(true)
    setError('')
    try {
      const result = await generateItinerary({ text, files })
      setTrip(result)
    } catch (err) {
      setError(err.message || 'Something went wrong — try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Trip Planner
        </div>
      </header>

      <main>
        {!trip ? (
          <>
            <div className="intro">
              <p className="eyebrow">Paste anything</p>
              <h1>Throw in your trip notes. Get a real itinerary back.</h1>
              <p className="lede">
                Pasted text, flight confirmation PDFs, screenshots of a booking — drop in whatever you've
                already got. Anything genuinely unclear gets flagged, not invented.
              </p>
            </div>
            <InputPanel onGenerate={handleGenerate} busy={busy} error={error} />
          </>
        ) : (
          <TripView trip={trip} onReset={() => setTrip(null)} />
        )}
      </main>
    </div>
  )
}
