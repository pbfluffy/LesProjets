import { useEffect, useMemo, useState } from 'react'
import { auth, onAuthStateChanged, signOut } from './firebase.js'
import { useCards } from './useCards.js'
import { useCatalog } from './useCatalog.js'
import { usePromos } from './usePromos.js'
import { resolveCards } from './perks.js'
import LoginGate from './components/LoginGate.jsx'
import CheckerView from './components/CheckerView.jsx'
import CardsView from './components/CardsView.jsx'

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = auth still resolving
  const [tab, setTab] = useState('check')
  const { cards, status, saving, persist } = useCards(user || null)
  const { catalog } = useCatalog(user || null)
  // Promotions are large, so only load them once the user has a catalog-linked card.
  const promoData = usePromos(user || null, cards.some((c) => c.catalogRef))
  // Cards with their automatically collected privileges and promotions merged in.
  const resolved = useMemo(() => resolveCards(cards, catalog, promoData), [cards, catalog, promoData])

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  if (user === undefined) return <main className="gate"><p className="muted">Loading…</p></main>
  if (!user) return <LoginGate />

  return (
    <div className="app">
      <header className="top">
        <h1>💳 Card Perks</h1>
        <div className="row">
          {saving === 'saving' && <span className="muted">Saving…</span>}
          {saving === 'error' && <span className="error" role="alert">Couldn’t save</span>}
          <button className="link" onClick={() => signOut(auth)} title={user.email || ''}>Sign out</button>
        </div>
      </header>
      <nav className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'check'} className={tab === 'check' ? 'on' : ''} onClick={() => setTab('check')}>Check privileges</button>
        <button role="tab" aria-selected={tab === 'cards'} className={tab === 'cards' ? 'on' : ''} onClick={() => setTab('cards')}>My cards ({cards.length})</button>
      </nav>
      <main>
        {status === 'loading' && <p className="muted">Loading your cards…</p>}
        {status === 'error' && <p className="error" role="alert">Couldn’t load your cards. Check your connection and reload.</p>}
        {status === 'ready' && (tab === 'check'
          ? <CheckerView cards={resolved} onGoCards={() => setTab('cards')} />
          : <CardsView cards={cards} persist={persist} catalog={catalog} promoData={promoData} />)}
      </main>
    </div>
  )
}
