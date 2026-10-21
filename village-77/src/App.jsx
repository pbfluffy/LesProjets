import { useEffect, useState } from 'react'
import { useTheme, useLang } from './hooks/useThemeLang'
import { usePosts } from './hooks/usePosts'
import { useAuth, AuthContext, lineConfigured } from './hooks/useAuth'
import { useRatings } from './hooks/useRatings'
import { LangContext, STRINGS, MARKET_CATEGORIES, TRADES } from './LangContext'
import Home from './components/Home'
import Board from './components/Board'
import PostForm from './components/PostForm'
import AdminPanel from './components/AdminPanel'
import SignInSheet from './components/SignInSheet'
import AdminEntrySheet from './components/AdminEntrySheet'
import styles from './App.module.css'

const SHOPS = 'villageShops'
const PROVIDERS = 'villageProviders'

export default function App() {
  const [theme, setTheme] = useTheme()
  const [lang, setLang] = useLang()
  const auth = useAuth()
  const { user, isAdmin } = auth
  const ratings = useRatings(user)
  const [tab, setTab] = useState('home') // 'home' | 'market' | 'services' | 'admin'
  // { kind: 'shop' | 'provider', post: existing post or null } while the form is open
  const [editing, setEditing] = useState(null)
  const [askSignIn, setAskSignIn] = useState(false)
  // Admin sign-in has no button in the app: open the page with ?admin.
  const [adminEntry, setAdminEntry] = useState(() => new URLSearchParams(window.location.search).has('admin'))

  const shops = usePosts(SHOPS)
  const providers = usePosts(PROVIDERS)
  const t = STRINGS[lang] || STRINGS.th

  useEffect(() => { window.scrollTo(0, 0) }, [tab])
  useEffect(() => { if (tab === 'admin' && !isAdmin) setTab('home') }, [tab, isAdmin])
  useEffect(() => {
    if (!adminEntry || !isAdmin) return
    setTab('admin')
    closeAdminEntry()
  }, [adminEntry, isAdmin])

  function closeAdminEntry() {
    setAdminEntry(false)
    window.history.replaceState(null, '', window.location.pathname)
  }

  // Posting and rating need an account; browsing doesn't.
  function requireSignIn() {
    if (user) return true
    setAskSignIn(true)
    return false
  }

  const openForm = (kind, post) => requireSignIn() && setEditing({ kind, post })
  const editShop = (post) => openForm('shop', post)
  const editProvider = (post) => openForm('provider', post)

  function handleSignOut() {
    if (window.confirm(t.signOutConfirm)) auth.signOut()
  }

  return (
    <LangContext.Provider value={{ t, lang }}>
      <AuthContext.Provider value={{ user, isAdmin, requireSignIn }}>
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
              {user ? (
                <button type="button" className={styles.avatarBtn} onClick={handleSignOut} title={user.displayName || t.signOut}>
                  {user.photoURL
                    ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
                    : (user.displayName || '?').slice(0, 1)}
                </button>
              ) : (
                <button type="button" className={styles.lineBtn} onClick={() => setAskSignIn(true)} disabled={auth.finishing}>
                  {auth.finishing ? '…' : t.signIn}
                </button>
              )}
            </div>
          </div>

          <nav className={styles.tabs}>
            {[
              ['home', '🏠 ' + t.navHome],
              ['market', '🛒 ' + t.navMarket],
              ['services', '🔧 ' + t.navServices],
              ...(isAdmin ? [['admin', '🛡️ ' + t.navAdmin]] : []),
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

        {auth.loginError && (
          <div className={styles.banner} role="alert">
            <span>{t.signInFailed}</span>
            <button type="button" onClick={auth.clearLoginError} aria-label={t.close}>×</button>
          </div>
        )}

        <main className={styles.main}>
          {tab === 'home' && (
            <Home
              shops={shops.posts}
              providers={providers.posts}
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
              ratings={ratings}
              tags={MARKET_CATEGORIES}
              tagField="categories"
              tagPrefix="cat_"
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
              ratings={ratings}
              tags={TRADES}
              tagField="trades"
              tagPrefix="trade_"
              emptyText={t.emptyServices}
              addLabel={t.addProvider}
              onAdd={() => editProvider(null)}
              onEdit={editProvider}
            />
          )}
          {tab === 'admin' && isAdmin && (
            <AdminPanel shops={shops.posts} providers={providers.posts} ratings={ratings} />
          )}
        </main>

        {editing && user && (
          <PostForm
            kind={editing.kind}
            collectionName={editing.kind === 'shop' ? SHOPS : PROVIDERS}
            post={editing.post}
            user={user}
            onClose={() => setEditing(null)}
          />
        )}

        {adminEntry && !isAdmin && (
          <AdminEntrySheet
            user={user}
            onGoogle={auth.adminSignIn}
            onSignOut={auth.signOut}
            onClose={closeAdminEntry}
          />
        )}

        {askSignIn && !user && (
          <SignInSheet
            ready={lineConfigured}
            onLine={auth.startLineLogin}
            onClose={() => setAskSignIn(false)}
          />
        )}
      </AuthContext.Provider>
    </LangContext.Provider>
  )
}
