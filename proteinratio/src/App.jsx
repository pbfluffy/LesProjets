import { useMemo, useState } from 'react'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import FilterBar from './components/FilterBar.jsx'
import ProductGrid from './components/ProductGrid.jsx'
import { useProducts } from './data/useProducts.js'
import { useTheme } from './hooks.js'
import { ratio } from './data/products.js'

export default function App() {
  const { items, usingFallback } = useProducts()
  const [filter, setFilter] = useState('all')
  const [cart, setCart] = useState([])
  const [theme, setTheme] = useTheme()

  const brandCount = useMemo(() => new Set(items.map((p) => p.brand)).size, [items])
  const bestRatio = useMemo(
    () => (items.length ? Math.min(...items.map((p) => Number(ratio(p)))).toFixed(2) : '0.00'),
    [items],
  )

  function handleAdd(product) {
    setCart((prev) => [...prev, product])
  }

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div className="shell">
      <Header cartCount={cart.length} theme={theme} onToggleTheme={toggleTheme} />
      <Hero brandCount={brandCount} skuCount={items.length} bestRatio={bestRatio} />

      {usingFallback && (
        <div className="notice">
          Showing placeholder catalog — connect Firestore (src/firebase.js) and seed the
          `products` collection to go live.
        </div>
      )}

      <FilterBar active={filter} onChange={setFilter} />
      <ProductGrid items={items} filter={filter} onAdd={handleAdd} />

      <footer>
        <div>proteinratio — dev build</div>
        <div>not linked from pumbafluffycorgi.com yet</div>
      </footer>
    </div>
  )
}
