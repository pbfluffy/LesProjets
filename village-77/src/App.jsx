import { useEffect, useState } from 'react'
import { useTheme, useLang } from './hooks/useThemeLang'
import { usePosts } from './hooks/usePosts'
import { useAuth, AuthContext, lineConfigured } from './hooks/useAuth'
import { useRatings } from './hooks/useRatings'
import { LangContext, STRINGS } from './LangContext'
import { useCategories, useCategoryHelpers, CategoriesContext } from './hooks/useCategories'
import { useFavorites, FavoritesContext } from './hooks/useFavorites'
import Home from './components/Home'
import Icon from './components/Icon'
import Board from './components/Board'
import PostForm from './components/PostForm'
import AdminPanel from './components/AdminPanel'
import SignInSheet from './components/SignInSheet'
import AdminEntrySheet from './components/AdminEntrySheet'
import PostPage from './components/PostPage'
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
const SEEN_KEY = 'village_reviews_seen' // { postId: ms } for My shops' "new reviews"

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
  // Marketplace categories / handyman types — admin-editable (useCategories).
  const cats = useCategoryHelpers(useCategories(), lang)
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

  // The open post page (PostPage): a shop with its items, or a handyman with
  // their reviews. It's pushed into the address bar as ?p=<id>, so the
  // phone's back button closes it and the link can be shared.
  const [openPostId, setOpenPostId] = useState(null)
  // My shops (home page): the signed-in person's own posts — including ones
  // hidden for age — with a count of ratings since they last opened each.
  const [reviewsSeen, setReviewsSeen] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || {} } catch { return {} }
  })
  const myPosts = user
    ? [...shops.posts.map((p) => ({ ...p, kind: 'shop' })), ...providers.posts.map((p) => ({ ...p, kind: 'provider' }))]
      .filter((p) => p.ownerUid === user.uid)
    : []
  const newReviews = (id) => ratings.newSince(id, reviewsSeen[id] || 0)
  const favorites = useFavorites(user)
  // ♥ saved posts, newest-saved first, for the home page.
  const savedPosts = favorites.ids.map((id) => {
    const shop = liveShops.find((p) => p.id === id)
    if (shop) return { ...shop, kind: 'shop' }
    const pro = liveProviders.find((p) => p.id === id)
    return pro && { ...pro, kind: 'provider' }
  }).filter(Boolean)

  function openPost(id) {
    if (myPosts.some((p) => p.id === id)) {
      const next = { ...reviewsSeen, [id]: Date.now() }
      setReviewsSeen(next)
      try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)) } catch { /* storage blocked */ }
    }
    setOpenPostId(id)
    window.history.pushState({ post: id }, '', '?p=' + encodeURIComponent(id))
  }
  function closePost() {
    if (window.history.state?.post) window.history.back() // popstate below clears it
    else {
      setOpenPostId(null)
      clearPostParam()
    }
  }
  useEffect(() => {
    const onPop = () => setOpenPostId(window.history.state?.post || null)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  // Admins can also open posts that are hidden for being 60+ days old.
  const findPost = (live, all) => openPostId && (live.find((p) => p.id === openPostId) || (isAdmin && all.find((p) => p.id === openPostId)))
  const shownShop = findPost(liveShops, shops.posts)
  const shownPost = shownShop || findPost(liveProviders, providers.posts)
  // Deleted (or hidden) while open: close the page.
  useEffect(() => {
    if (openPostId && !shops.loading && !providers.loading && !shownPost) closePost()
  }, [openPostId, shops.loading, providers.loading, shownPost])

  // A shared post link (?p=<id>, see share.js): once posts have loaded, open
  // that post's page on top of its tab.
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
    // Shops and handymen open their own page; news (when on) is scrolled to.
    if (target !== 'news') return openPost(focusId)
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
    if (user && auth.ban) {
      alert(t.bannedNotice) // firestore.rules refuse their writes anyway
      return false
    }
    if (user) return true
    setAskSignIn(true)
    return false
  }

  // addItem: open the shop form on a new, empty item (from "+ Add item").
  const openForm = (kind, post, { addItem = false } = {}) => requireSignIn() && setEditing({ kind, post, addItem })
  const editShop = (post, opts) => openForm('shop', post, opts)
  const editProvider = (post) => openForm('provider', post)
  const editNews = (post) => requireSignIn() && setEditingNews({ post })

  function handleSignOut() {
    if (window.confirm(t.signOutConfirm)) auth.signOut()
  }

  return (
    <LangContext.Provider value={{ t, lang }}>
      <AuthContext.Provider value={{ user, isAdmin, isOwner, requireSignIn }}>
      <CategoriesContext.Provider value={cats}>
      <FavoritesContext.Provider value={favorites}>
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <div className={styles.brand}>
              <div>
                <h1 className={styles.title}>
                  <span className={styles.logo} aria-hidden="true"><Icon name="home" size={16} strokeWidth={2.4} /></span>
                  <span className={styles.titleText}>{t.appName}</span>
                </h1>
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
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
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
                <button type="button" data-tour="account" className={styles.avatarBtn} onClick={handleSignOut} title={user.displayName || t.signOut}>
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
              ['home', 'home', t.navHome],
              ...(SHOW_NEWS ? [['news', 'megaphone', t.navNews]] : []),
              ['market', 'bag', t.navMarket],
              ['services', 'wrench', t.navServices],
              ...(isAdmin ? [['admin', 'shield', t.navAdmin]] : []),
            ].map(([key, icon, label]) => (
              <button
                key={key}
                type="button"
                data-tour={'tab-' + key}
                className={`${styles.tabBtn} ${tab === key ? styles.tabBtnActive : ''}`}
                onClick={() => setTab(key)}
              >
                <Icon name={icon} size={16} />
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
        {auth.handedOff && (
          <div className={`${styles.banner} ${styles.bannerInfo}`} role="status">
            <span>{t.handedOff}</span>
          </div>
        )}
        {auth.waitingHandoff && !user && (
          <div className={`${styles.banner} ${styles.bannerInfo}`} role="status">
            <span>{t.waitingHandoff}</span>
            <button type="button" onClick={auth.cancelHandoff} aria-label={t.cancel}>×</button>
          </div>
        )}
        {auth.loginError && (
          <div className={styles.banner} role="alert">
            <span>{t.signInFailed} <small>({auth.loginError})</small></span>
            <button type="button" onClick={auth.clearLoginError} aria-label={t.close}>×</button>
          </div>
        )}
        {auth.ban && (
          <div className={styles.banner} role="alert">
            <span className={styles.bannerText}><Icon name="ban" size={16} />{t.bannedNotice}{auth.ban.reason && <> <small>({auth.ban.reason})</small></>}</span>
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
              onOpenPost={openPost}
              onEditProvider={editProvider}
              onEditNews={editNews}
              myPosts={myPosts}
              savedPosts={savedPosts}
              newReviews={newReviews}
            />
          )}
          {tab === 'market' && (
            <Board
              kind="shop"
              collectionName={SHOPS}
              posts={liveShops}
              loading={shops.loading}
              ratings={ratings}
              tagField="categories"
              emptyText={t.emptyMarket}
              addLabel={t.addShop}
              onAdd={() => editShop(null)}
              onEdit={editShop}
              onOpenPost={openPost}
            />
          )}
          {tab === 'services' && (
            <Board
              kind="provider"
              collectionName={PROVIDERS}
              posts={liveProviders}
              loading={providers.loading}
              ratings={ratings}
              tagField="trades"
              emptyText={t.emptyServices}
              addLabel={t.addProvider}
              onAdd={() => editProvider(null)}
              onEdit={editProvider}
              onOpenPost={openPost}
            />
          )}
          {tab === 'news' && SHOW_NEWS && (
            <NewsBoard posts={liveNews} loading={news.loading} onAdd={() => editNews(null)} onEdit={editNews} />
          )}
          {tab === 'admin' && isAdmin && (
            <AdminPanel shops={shops.posts} providers={providers.posts} ratings={ratings} isOwner={isOwner} onOpenPost={openPost} />
          )}
        </main>

        {shownPost && (
          <PostPage
            kind={shownShop ? 'shop' : 'provider'}
            post={shownPost}
            ratings={ratings}
            onEdit={shownShop ? editShop : editProvider}
            onClose={closePost}
          />
        )}

        {editingNews && user && (
          <NewsForm post={editingNews.post} user={user} onClose={() => setEditingNews(null)} />
        )}

        {editing && user && (
          <PostForm
            kind={editing.kind}
            collectionName={editing.kind === 'shop' ? SHOPS : PROVIDERS}
            post={editing.post}
            startWithNewItem={editing.addItem}
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
      </FavoritesContext.Provider>
      </CategoriesContext.Provider>
      </AuthContext.Provider>
    </LangContext.Provider>
  )
}
