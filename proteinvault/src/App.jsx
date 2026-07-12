import { useMemo, useState } from 'react'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import FilterBar from './components/FilterBar.jsx'
import ListingTable from './components/ListingTable.jsx'
import { useListings } from './data/useListings.js'
import { useTheme } from './hooks.js'
import { ratio } from './data/listings.js'
import { shops } from './data/shops.js'

export default function App() {
  const { items, usingFallback } = useListings()
  const [filter, setFilter] = useState('all')
  const [theme, setTheme] = useTheme()

  const brandCount = useMemo(() => new Set(items.map((p) => p.brand)).size, [items])
  const shopCount = useMemo(() => new Set(items.map((p) => p.shopId)).size, [items])
  const bestRatio = useMemo(
    () => (items.length ? Math.min(...items.map((p) => Number(ratio(p)))).toFixed(2) : '0.00'),
    [items],
  )

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div className="shell">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <Hero
        brandCount={brandCount}
        shopCount={shopCount}
        skuCount={items.length}
        bestRatio={bestRatio}
      />

      {usingFallback && (
        <div className="notice">
          Showing placeholder listings — connect Firestore (src/firebase.js) and seed the
          `listings` + `shops` collections to go live.
        </div>
      )}

      <FilterBar active={filter} onChange={setFilter} />
      <ListingTable items={items} filter={filter} />

      <footer>
        <div>ProteinVault — dev build · directory only, we don't sell anything</div>
        <div>not linked from pumbafluffycorgi.com yet</div>
      </footer>
    </div>
  )
}
