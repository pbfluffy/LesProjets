import { useMemo, useState } from 'react'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import FilterBar from './components/FilterBar.jsx'
import ListingTable from './components/ListingTable.jsx'
import { useListings } from './data/useListings.js'
import { useTheme } from './hooks.js'
import { ratio } from './data/listings.js'

export default function App() {
  const { items: products, usingFallback } = useListings()
  const [filter, setFilter] = useState('all')
  const [theme, setTheme] = useTheme()

  const brandCount = products.length
  const flavorCount = useMemo(
    () => products.reduce((sum, p) => sum + p.flavors.length, 0),
    [products],
  )
  const shopCount = useMemo(() => {
    const ids = new Set()
    products.forEach((p) => p.flavors.forEach((f) => f.shopIds.forEach((id) => ids.add(id))))
    return ids.size
  }, [products])
  const bestRatio = useMemo(() => {
    let best = Infinity
    products.forEach((p) => {
      p.flavors.forEach((f) => {
        const r = Number(ratio(f.priceThb, f.proteinG))
        if (r < best) best = r
      })
    })
    return products.length ? best.toFixed(2) : '0.00'
  }, [products])

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div className="shell">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <Hero
        brandCount={brandCount}
        shopCount={shopCount}
        skuCount={flavorCount}
        bestRatio={bestRatio}
      />

      {usingFallback && (
        <div className="notice">
          Showing placeholder listings — connect Firestore (src/firebase.js) and seed the
          `products` + `shops` collections to go live.
        </div>
      )}

      <FilterBar active={filter} onChange={setFilter} />
      <ListingTable products={products} filter={filter} />

      <footer>
        <div>ProteinVault — dev build · directory only, we don't sell anything</div>
        <div>not linked from pumbafluffycorgi.com yet</div>
      </footer>
    </div>
  )
}
