import { useEffect, useState } from 'react'
import { useTheme, useLang } from './hooks/useThemeLang'
import { usePosts } from './hooks/usePosts'
import { useMyPosts } from './hooks/useMyPosts'
import { useRatings } from './hooks/useRatings'
import { LangContext, STRINGS, MARKET_CATEGORIES, TRADES } from './LangContext'
import Home from './components/Home'
import Board from './components/Board'
import PostForm from './components/PostForm'
import styles from './App.module.css'

const SHOPS = 'villageShops'
const PROVIDERS = 'villageProviders'

export default function App() {
  const [theme, setTheme] = useTheme()
  const [lang, setLang] = useLang()
  const my = useMyPosts()
  const ratings = useRatings()
  const [tab, setTab] = useState('home') // 'home' | 'market' | 'services'
  // { kind: 'shop' | 'provider', post: existing post or null } while the form is open
  const [editing, setEditing] = useState(null)

  const shops = usePosts(SHOPS)
  const providers = usePosts(PROVIDERS)
  const t = STRINGS[lang] || STRINGS.th

  useEffect(() => { window.scrollTo(0, 0) }, [tab])

  const openForm = (kind, post) => setEditing({ kind, post })
  const editShop = (post) => openForm('shop', post)
  const editProvider = (post) => openForm('provider', post)

  return (
    <LangContext.Provider value={{ t, lang }}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div className={styles.brand}>
            <a href="/" className={styles.back} title={t.backToHome} aria-label={t.backToHome}>←</a>
            <div>
              <h1 className={styles.title}>🏘️ {t.appName}</h1>
              <p className={styles.tagline}>{t.tagline}</p>
            </div>
          </div>
          <div className={styles.headerControls}>
            <button
              type="button"
              className={styles.langBtn}
              onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
              aria-label="Switch language"
            >
              <span className={lang === 'en' ? styles.langOn : ''}>EN</span>
              <span className={styles.langSep}>/</span>
              <span className={lang === 'th' ? styles.langOn : ''}>TH</span>
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        <nav className={styles.tabs}>
          {[
            ['home', '🏠 ' + t.navHome],
            ['market', '🛒 ' + t.navMarket],
            ['services', '🔧 ' + t.navServices],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`${styles.tabBtn} ${tab === key ? styles.tabBtnActive : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className={styles.main}>
        {tab === 'home' && (
          <Home
            shops={shops.posts}
            providers={providers.posts}
            my={my}
            ratings={ratings}
            onGo={setTab}
            onEditShop={editShop}
            onEditProvider={editProvider}
          />
        )}
        {tab === 'market' && (
          <Board
            kind="shop"
            collectionName={SHOPS}
            posts={shops.posts}
            loading={shops.loading}
            my={my}
            ratings={ratings}
            categories={MARKET_CATEGORIES}
            categoryField="category"
            categoryPrefix="cat_"
            emptyText={t.emptyMarket}
            addLabel={t.addShop}
            onAdd={() => editShop(null)}
            onEdit={editShop}
          />
        )}
        {tab === 'services' && (
          <Board
            kind="provider"
            collectionName={PROVIDERS}
            posts={providers.posts}
            loading={providers.loading}
            my={my}
            ratings={ratings}
            categories={TRADES}
            categoryField="trade"
            categoryPrefix="trade_"
            emptyText={t.emptyServices}
            addLabel={t.addProvider}
            onAdd={() => editProvider(null)}
            onEdit={editProvider}
          />
        )}
      </main>

      {editing && (
        <PostForm
          kind={editing.kind}
          collectionName={editing.kind === 'shop' ? SHOPS : PROVIDERS}
          post={editing.post}
          onCreated={my.addMine}
          onClose={() => setEditing(null)}
        />
      )}
    </LangContext.Provider>
  )
}
