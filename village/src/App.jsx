import { useEffect, useState } from 'react'
import { useTheme, useLang } from './hooks/useThemeLang'
import { usePosts } from './hooks/usePosts'
import { useMyPosts } from './hooks/useMyPosts'
import { LangContext, STRINGS, MARKET_CATEGORIES, TRADES } from './LangContext'
import Home from './components/Home'
import Board from './components/Board'
import PostForm from './components/PostForm'
import styles from './App.module.css'

const LISTINGS = 'villageListings'
const PROVIDERS = 'villageProviders'

export default function App() {
  const [theme, setTheme] = useTheme()
  const [lang, setLang] = useLang()
  const my = useMyPosts()
  const [tab, setTab] = useState('home') // 'home' | 'market' | 'services'
  // { kind: 'listing' | 'provider', post: existing post or null } while the form is open
  const [editing, setEditing] = useState(null)

  const listings = usePosts(LISTINGS)
  const providers = usePosts(PROVIDERS)
  const t = STRINGS[lang] || STRINGS.th

  useEffect(() => { window.scrollTo(0, 0) }, [tab])

  const openForm = (kind, post) => setEditing({ kind, post })
  const editListing = (post) => openForm('listing', post)
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
            listings={listings.posts}
            providers={providers.posts}
            my={my}
            onGo={setTab}
            onEditListing={editListing}
            onEditProvider={editProvider}
          />
        )}
        {tab === 'market' && (
          <Board
            kind="listing"
            collectionName={LISTINGS}
            posts={listings.posts}
            loading={listings.loading}
            my={my}
            categories={MARKET_CATEGORIES}
            categoryField="category"
            categoryPrefix="cat_"
            emptyText={t.emptyMarket}
            addLabel={t.addListing}
            onAdd={() => editListing(null)}
            onEdit={editListing}
          />
        )}
        {tab === 'services' && (
          <Board
            kind="provider"
            collectionName={PROVIDERS}
            posts={providers.posts}
            loading={providers.loading}
            my={my}
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
          collectionName={editing.kind === 'listing' ? LISTINGS : PROVIDERS}
          post={editing.post}
          onCreated={my.addMine}
          onClose={() => setEditing(null)}
        />
      )}
    </LangContext.Provider>
  )
}
