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
import Tour, { TOUR_KEY } from './components/Tour'
import NewsBoard from './components/NewsBoard'
import NewsForm from './components/NewsForm'
import { readPostParam, clearPostParam } from './share'
import { SHOW_NEWS } from './config'
import { isStale } from './freshness'
import styles from './App.module.css'

const SHOPS = 'villageShops'
const PROVIDERS = 'villageProviders'
const NEWS = 'villageNews'

export default function App() {
  const [theme, setTheme] = useTheme()
  const [lang, setLang] = useLang()
  const auth = useAuth()
  const { user, isAdmin, isOwner } = auth
  const ratings = useRatings(user)
  const [tab, setTab] = useState('home') // 'home' | 'market' | 'services' | 'admin'
  // { kind: 'shop' | 'provider', post: existing post or null } while the form is open
  const [editing, setEditing] = useState(null)
  const [editingNews, setEditingNews] = useState(null) // { post } while the news form is open
  const [askSignIn, setAskSignIn] = useState(false)
  // First visit: the guided tour (not on links that do something else first).
  const [showTour, setShowTour] = useState(() => {
    const q = new URLSearchParams(window.location.search)
    if (['admin', 'poster', 'code', 'error', 'p', 'liff.state'].some((k) => q.has(k))) return false
    try { return !localStorage.getItem(TOUR_KEY) } catch { return false }
  })
  // Admin sign-in has no button in the app: open the page with ?admin.
  const [adminEntry, setAdminEntry] = useState(() => new URLSearchParams(window.location.search).has('admin'))

  const shops = usePosts(SHOPS)
  const providers = usePosts(PROVIDERS)
  const news = usePosts(SHOW_NEWS ? NEWS : null)
  const t = STRINGS[lang] || STRINGS.th
  // Posts untouched for 60 days are hidden, except from their owner (freshness.js).
  const visible = (posts) => posts.filter((p) => !isStale(p) || p.ownerUid === user?.uid)
  const liveShops = visible(shops.posts)
  const liveProviders = visible(providers.posts)
  const liveNews = visible(news.posts)

  useEffect(() => { window.scrollTo(0, 0) }, [tab])
  useEffect(() => { if (tab === 'admin' && !isAdmin) setTab('home') }, [tab, isAdmin])
  useEffect(() => {
    if (!adminEntry || !isAdmin) return
    setTab('admin')
    closeAdminEntry()
  }, [adminEntry, isAdmin])

  // A shared post link (?p=<id>, see share.js): once posts have loaded, open
  // the right tab, scroll to that card and flash it.
  const [focusId, setFocusId] = useState(readPostParam)
  useEffect(() => {
    if (!focusId || shops.loading || providers.loading || news.loading) return
    const target = liveShops.some((p) => p.id === focusId) ? 'market'
      : liveProviders.some((p) => p.id === focusId) ? 'services'
      : SHOW_NEWS && liveNews.some((p) => p.id === focusId) ? 'news' : null
    setFocusId(null)
    clearPostParam()
    if (!target) return // deleted since it was shared
    setTab(target)
    setTimeout(() => {
      const el = document.getElementById('post-' + focusId)
      if (!el) return
      el.scrollIntoView({ block: 'center' })
      el.classList.add('post-focus')
      setTimeout(() => el.classList.remove('post-focus'), 2500)
    }, 150) // after the tab's own scroll-to-top
  }, [focusId, shops.loading, providers.loading, news.loading, liveShops, liveProviders, liveNews])

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
  const editNews = (post) => requireSignIn() && setEditingNews({ post })

  function handleSignOut() {
    if (window.confirm(t.signOutConfirm)) auth.signOut()
  }

  return (
    <LangContext.Provider value={{ t, lang }}>
      <AuthContext.Provider value={{ user, isAdmin, isOwner, requireSignIn }}>
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <div className={styles.brand}>
              <div>
                <h1 className={styles.title}>🏘️ {t.appName}</h1>
                <p className={styles.tagline}>{t.tagline}</p>
              </div>
            </div>
            <div className={styles.headerControls}>
              <button
                type="button"
                className={styles.langBtn}
                data-tour="lang"
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
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => setShowTour(true)}
                aria-label={t.tourHelp}
                title={t.tourHelp}
              >
                ?
              </button>
              {user ? (
                <button type="button" className={styles.avatarBtn} onClick={handleSignOut} title={user.displayName || t.signOut}>
                  {user.photoURL
                    ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
                    : (user.displayName || '?').slice(0, 1)}
                </button>
              ) : (
                <button type="button" data-tour="signin" className={styles.lineBtn} onClick={() => setAskSignIn(true)} disabled={auth.finishing}>
                  {auth.finishing ? '…' : t.signIn}
                </button>
              )}
            </div>
          </div>

          <nav className={styles.tabs}>
            {[
              ['home', '🏠 ' + t.navHome],
              ...(SHOW_NEWS ? [['news', '📢 ' + t.navNews]] : []),
              ['market', '🛒 ' + t.navMarket],
              ['services', '🔧 ' + t.navServices],
              ...(isAdmin ? [['admin', '🛡️ ' + t.navAdmin]] : []),
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                data-tour={'tab-' + key}
                className={`${styles.tabBtn} ${tab === key ? styles.tabBtnActive : ''}`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        {auth.finishing && (
          <div className={`${styles.banner} ${styles.bannerInfo}`} role="status">
            <span>{t.signingIn}</span>
          </div>
        )}
        {auth.loginError && (
          <div className={styles.banner} role="alert">
            <span>{t.signInFailed} <small>({auth.loginError})</small></span>
            <button type="button" onClick={auth.clearLoginError} aria-label={t.close}>×</button>
          </div>
        )}

        <main className={styles.main}>
          {tab === 'home' && (
            <Home
              shops={liveShops}
              providers={liveProviders}
              news={liveNews}
              ratings={ratings}
              onGo={setTab}
              onEditShop={editShop}
              onEditProvider={editProvider}
              onEditNews={editNews}
            />
          )}
          {tab === 'market' && (
            <Board
              kind="shop"
              collectionName={SHOPS}
              posts={liveShops}
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
              posts={liveProviders}
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
          {tab === 'news' && SHOW_NEWS && (
            <NewsBoard posts={liveNews} loading={news.loading} onAdd={() => editNews(null)} onEdit={editNews} />
          )}
          {tab === 'admin' && isAdmin && (
            <AdminPanel shops={shops.posts} providers={providers.posts} ratings={ratings} isOwner={isOwner} />
          )}
        </main>

        {editingNews && user && (
          <NewsForm post={editingNews.post} user={user} onClose={() => setEditingNews(null)} />
        )}

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

        {showTour && <Tour onTab={setTab} onClose={() => setShowTour(false)} />}

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
