import { useState, useEffect, useRef } from 'react'
import { HistoryIcon, HomeIcon, MoonIcon, SunIcon } from './components/icons'
import { auth, db, doc, setDoc, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from './firebase.js'
import BillSplitter from './components/BillSplitter'
import Tour, { TOUR_KEY } from './components/Tour'
import SushiroCalculator from './components/SushiroCalculator'
import TripsTab from './components/TripsTab'

// #128 — Trip mode. Flip to true when UI is ready to ship.
// LIFF — init once on mount; silent no-op in browser
const _liffInit = initLiff()

// Handle Google redirect result (for Line in-app browser sign-in)
getRedirectResult(auth).catch((e) => {
  console.warn('[acct] redirect result error:', e)
})
const TRIPS_ENABLED = true
import BillHistory from './components/BillHistory'
import { LangProvider, useLang } from './LangContext'
import { readShareFromHash, clearShareHash, getShortLinkId, resolveShortLink } from './share'
import { useBillHistory } from './hooks/useBillHistory'
import { readDrafts, writeDrafts, isEmptyDraft } from './drafts'
import { useCloudSync } from './hooks/useCloudSync'
import { useSavedPayees } from './hooks/useSavedPayees'
import styles from './App.module.css'
import { initLiff, isInLine } from './liff.js'

// Read share data once at module load (before any component renders)
const initialShare = readShareFromHash()
const initialShortId = getShortLinkId()

function ConflictModal({ t, lang, localEntries, cloudEntries, onUseLocal, onUseCloud }) {
  const [confirmingLocal, setConfirmingLocal] = useState(false)
  const localCount = localEntries.length
  const cloudCount = cloudEntries.length
  const localLast = localEntries[0]?.savedAt || 0
  const cloudLast = cloudEntries[0]?.savedAt || 0
  const localNewer = localLast > cloudLast
  const cloudNewer = cloudLast > localLast
  const fmtWhen = (ts) => {
    if (!ts) return null
    return new Date(ts).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }
  const interp = (str, vars) => str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
  const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 200 }
  const modalStyle = { background: 'var(--color-surface, white)', color: 'var(--color-text, #222)', borderRadius: 12, padding: 20, maxWidth: 480, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }
  const titleStyle = { margin: '0 0 6px', fontSize: 18, fontWeight: 700 }
  const bodyStyle = { margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-muted, #666)', lineHeight: 1.5 }
  if (confirmingLocal) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <h2 style={titleStyle}>{t.syncConflictWarnTitle}</h2>
          <p style={bodyStyle}>{t.syncConflictWarnBody}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setConfirmingLocal(false)} style={{ padding: '8px 14px', border: '1px solid var(--color-border, #ddd)', background: 'transparent', color: 'inherit', borderRadius: 6, cursor: 'pointer', font: 'inherit' }}>{t.syncConflictCancel}</button>
            <button onClick={onUseLocal} style={{ padding: '8px 14px', border: 'none', background: 'var(--red, #c62828)', color: 'white', borderRadius: 6, cursor: 'pointer', font: 'inherit', fontWeight: 600 }}>{t.syncConflictYesOverwrite}</button>
          </div>
        </div>
      </div>
    )
  }
  const cardStyle = (newer) => ({ flex: 1, textAlign: 'left', padding: 14, border: '2px solid', borderColor: newer ? 'var(--color-accent)' : 'var(--color-border, #ddd)', background: 'var(--color-surface-alt, #f8f8f8)', color: 'inherit', borderRadius: 10, cursor: 'pointer', font: 'inherit' })
  const cardHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }
  const newerBadgeStyle = { fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--color-accent)', color: 'var(--color-accent-text)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }
  const tsStyle = (newer) => ({ fontSize: 11, color: newer ? 'var(--color-accent)' : 'var(--color-text-muted, #666)', fontWeight: newer ? 600 : 400 })
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={titleStyle}>{t.syncConflictTitle}</h2>
        <p style={bodyStyle}>{t.syncConflictBody}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setConfirmingLocal(true)} style={cardStyle(localNewer)}>
            <div style={cardHeaderStyle}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{t.syncConflictLocalLabel}</span>
              {localNewer && <span style={newerBadgeStyle}>{t.syncConflictNewer}</span>}
            </div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>{interp(t.syncConflictBillsLine, { n: localCount })}</div>
            <div style={tsStyle(localNewer)}>{localLast ? interp(t.syncConflictLastSaved, { when: fmtWhen(localLast) }) : t.syncConflictNeverSaved}</div>
          </button>
          <button onClick={onUseCloud} style={cardStyle(cloudNewer)}>
            <div style={cardHeaderStyle}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{t.syncConflictCloudLabel}</span>
              {cloudNewer && <span style={newerBadgeStyle}>{t.syncConflictNewer}</span>}
            </div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>{interp(t.syncConflictBillsLine, { n: cloudCount })}</div>
            <div style={tsStyle(cloudNewer)}>{cloudLast ? interp(t.syncConflictLastSaved, { when: fmtWhen(cloudLast) }) : t.syncConflictNeverSaved}</div>
          </button>
        </div>
      </div>
    </div>
  )
}

function AppInner() {
  const [shared, setShared] = useState(initialShare)
  const [shortLinkStatus, setShortLinkStatus] = useState(initialShortId ? 'loading' : null)
  useEffect(() => {
    if (!initialShortId) return
    resolveShortLink(initialShortId).then(result => {
      if (!result) {
        setShortLinkStatus('error')
      } else if (result.expired) {
        setShortLinkStatus('expired')
      } else {
        setShortLinkStatus(null)
        setShared(result.ok)
        setActiveTab(result.ok.t)
        setLoadEpoch(e => e + 1)
      }
    })
  }, [])
  const [activeTab, setActiveTab] = useState(() => {
    if (initialShare?.t) return initialShare.t
    const tabParam = new URLSearchParams(window.location.search).get('tab')
    if (tabParam === 'sushi' || tabParam === 'split' || (TRIPS_ENABLED && tabParam === 'trips')) return tabParam
    return 'split'
  })
  // Guided tour for new users (replaces the old "How to split a bill" card;
  // anyone who dismissed that card already knows the app). Not on shared links.
  const [showTour, setShowTour] = useState(() => {
    if (initialShare || initialShortId) return false
    try {
      return !localStorage.getItem(TOUR_KEY) && localStorage.getItem('billSplitter_guideDismissed') !== '1'
    } catch { return false }
  })
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const { lang, toggle: toggleLang, t } = useLang()

  // Bill history
  const history = useBillHistory()
  const cloudSync = useCloudSync({
    entries: history.entries,
    replaceEntries: history.replaceEntries,
  })
  // Conflict resolution: if cloud has different bills than local, prompt user.
  const user = cloudSync.user

  // Feature #96 — saved payees (per-user, dedicated doc)
  const savedPayees = useSavedPayees(user)

  // Feature #73 — remote error tracking (caps at 5 per session, writes silently)
  useEffect(() => {
    if (!user) return
    const ERR_KEY = 'bs_errCount_' + (user.uid || 'anon')
    const getErrCount = () => { try { return parseInt(sessionStorage.getItem(ERR_KEY) || '0', 10) || 0 } catch { return 0 } }
    const bumpErrCount = () => { try { sessionStorage.setItem(ERR_KEY, String(getErrCount() + 1)) } catch {} }
    const logError = (message, stack) => {
      if (getErrCount() >= 5) return
      bumpErrCount()
      const entryId = Date.now() + '_' + Math.random().toString(36).slice(2, 8)
      setDoc(doc(db, 'errorLog', user.uid, 'entries', entryId), {
        message: String(message || 'Unknown').slice(0, 5000),
        stack: stack ? String(stack).slice(0, 10000) : '',
        app: 'bill-splitter',
        ts: Date.now(),
        url: location.href.slice(0, 1000),
        userAgent: navigator.userAgent.slice(0, 500),
      }).catch(() => {})
    }
    const onError = (e) => logError(e.message || (e.error && e.error.message), e.error && e.error.stack)
    const onRejection = (e) => logError(
      'Unhandled rejection: ' + ((e.reason && e.reason.message) || e.reason || 'unknown'),
      e.reason && e.reason.stack
    )
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [user])
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const popoverWrapRef = useRef(null)
  useEffect(() => {
    if (!popoverOpen) return
    const handler = (e) => {
      if (popoverWrapRef.current && !popoverWrapRef.current.contains(e.target)) setPopoverOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popoverOpen])
  const handleSignIn = async () => {
    if (signingIn) return
    if (isInLine()) {
      // Google blocks OAuth in Line's in-app browser — open in external browser
      // liff.openWindow with external:true forces Safari/Chrome instead of Line in-app browser
      window.liff.openWindow({ url: window.location.href, external: true })
      return
    }
    setSigningIn(true)
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      setPopoverOpen(false)
    } catch (e) {
      console.warn('[acct] sign-in failed:', e)
    } finally {
      setSigningIn(false)
    }
  }
  const handleSignOut = async () => {
    try {
      await signOut(auth)
      setPopoverOpen(false)
    } catch (e) {
      console.warn('[acct] sign-out failed:', e)
    }
  }
  const [historyOpen, setHistoryOpen] = useState(false)
  // Each tab's in-progress bill lives in `drafts` (mirrored to localStorage), and
  // is what BillSplitter/SushiroCalculator start from when they mount — so a bill
  // survives switching tabs or refreshing, and a loaded history entry is just a
  // draft that remembers which entry it edits. Bumping `loadEpoch` (used as the
  // react key) remounts the store so a new initial state takes effect.
  const draftsRef = useRef(null)
  if (draftsRef.current === null) draftsRef.current = readDrafts()
  const persistTimer = useRef(null)
  const persistDrafts = () => {
    clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => writeDrafts(draftsRef.current), 300)
  }
  useEffect(() => {
    const flush = () => { clearTimeout(persistTimer.current); writeDrafts(draftsRef.current) }
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHide)
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', onHide) }
  }, [])
  const [loadEpoch, setLoadEpoch] = useState(0)
  const [loadedEntryId, setLoadedEntryId] = useState(() =>
    initialShare || initialShortId ? null : (draftsRef.current[activeTab]?.entryId ?? null))

  const handleDraftChange = (tab, snapshot) => {
    const d = draftsRef.current
    if (isEmptyDraft(tab, snapshot)) {
      if (d[tab]) { delete d[tab]; persistDrafts() }
      return
    }
    d[tab] = { state: snapshot, entryId: d[tab]?.entryId ?? null, savedAt: Date.now() }
    persistDrafts()
  }

  // Switch tab, picking up whichever saved entry that tab's draft is editing.
  const goTab = (id) => {
    if (id === activeTab) return
    setActiveTab(id)
    setLoadedEntryId(draftsRef.current[id]?.entryId ?? null)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const exitShared = () => {
    setShared(null)
    clearShareHash()
  }

  // Once a bill is saved (or loaded) it stays the "current" entry, so saving
  // again updates it in place instead of piling up copies. Falls back to a
  // fresh save if that entry has since been deleted from history.
  const handleSaveBill = (tab, snapshot) => {
    const editing = loadedEntryId && history.entries.some(e => e.id === loadedEntryId && e.tab === tab)
    const result = editing
      ? { ...history.update(loadedEntryId, tab, snapshot), updated: true }
      : { ...history.save(tab, snapshot), updated: false }
    // Only remember the entry if it was really stored (a full storage write fails).
    if (result.ok !== false) {
      const d = draftsRef.current
      d[tab] = { state: snapshot, entryId: result.id, savedAt: Date.now() }
      persistDrafts()
      setLoadedEntryId(result.id)
    }
    return result
  }

  const editingEntry = !shared && loadedEntryId
    ? history.entries.find(e => e.id === loadedEntryId && e.tab === activeTab)
    : null

  // Start from a blank Split bill: drop its draft so the next save is a new entry.
  const handleNewBill = () => {
    delete draftsRef.current.split
    persistDrafts()
    setLoadedEntryId(null)
    setLoadEpoch(e => e + 1)
  }

  // Keep the Sushiro people/settings but stop editing the saved entry (Reset all).
  const detachTab = (tab) => {
    const d = draftsRef.current[tab]
    if (d) { d.entryId = null; persistDrafts() }
    setLoadedEntryId(null)
  }

  const handleLoadEntry = (entry) => {
    setShared(null)
    clearShareHash()
    setActiveTab(entry.tab)
    draftsRef.current[entry.tab] = { state: entry.state, entryId: entry.id, savedAt: Date.now() }
    persistDrafts()
    setLoadEpoch(e => e + 1)
    setLoadedEntryId(entry.id)
    setHistoryOpen(false)
  }

  const TABS = [
    { id: 'split', label: t.tabSplit },
    ...(TRIPS_ENABLED ? [{ id: 'trips', label: t.tabTrips ?? 'Trips' }] : []),
    { id: 'sushi', label: t.tabSushi },
  ]

  const sharedBillName = shared?.s?.billName?.trim()

  // Decide what `initial` to pass to each tab's store
  const splitInitial = shared && shared.t === 'split' ? shared.s : (draftsRef.current.split?.state ?? null)
  const sushiInitial = shared && shared.t === 'sushi' ? shared.s : (draftsRef.current.sushi?.state ?? null)

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.logo}>{t.appName}</span>
          <div className={styles.headerControls}>
            {/* History */}
            <button
              className={styles.iconBtn}
              onClick={() => setHistoryOpen(true)}
              data-tour="history"
              title={t.historyTitle}
              aria-label={t.historyTitle}
            >
              <HistoryIcon />
            </button>
            {/* Home */}
            <button
              className={styles.iconBtn}
              onClick={() => { window.location.href = '../' }}
              title={t.backToHome}
              aria-label="Home"
            >
              <HomeIcon />
            </button>
            {/* Phase E — group divider: nav actions | preferences + account */}
            <span className={styles.headerDivider} aria-hidden="true" />
            {/* Guided tour (components/Tour.jsx) */}
            <button
              className={styles.iconBtn}
              onClick={() => { setActiveTab('split'); setShowTour(true) }}
              title={t.tourHelp}
              aria-label={t.tourHelp}
            >
              ?
            </button>
            {/* Language toggle */}
            <button
              className={styles.iconBtn}
              onClick={toggleLang}
              title={t.langSwitch}
            >
              {lang === 'th' ? 'EN' : 'TH'}
            </button>
            {/* Dark/Light toggle */}
            <button
              className={styles.iconBtn}
              onClick={() => setDark(d => !d)}
              title={dark ? t.switchToLight : t.switchToDark}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            {/* Account */}
            <div style={{ position: 'relative' }} ref={popoverWrapRef}>
              {/* Feature #66 — sync status dot (top corner of avatar button) */}
              {cloudSync && cloudSync.user && cloudSync.syncStatus && cloudSync.syncStatus !== 'idle' && (
                <span
                  aria-hidden="true"
                  title={'Sync: ' + cloudSync.syncStatus}
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background:
                      cloudSync.syncStatus === 'syncing' ? '#f5c542' :
                      cloudSync.syncStatus === 'synced' ? '#2e7d32' :
                      cloudSync.syncStatus === 'error' ? '#d32f2f' :
                      '#888',
                    border: '2px solid var(--bg, #fff)',
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                />
              )}
              <button
                className={styles.iconBtn}
                onClick={() => setPopoverOpen(o => !o)}
                title={user ? user.email : t.acctSignIn}
                aria-label={t.acctSignIn}
                style={user && user.photoURL ? { padding: 0, overflow: 'hidden', borderRadius: '50%', aspectRatio: '1 / 1' } : user ? { boxShadow: 'inset 0 0 0 2px var(--green, #2e7d32)' } : undefined}
              >
                {user && user.photoURL ? (
                  <img src={user.photoURL} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                ) : '👤'}
              </button>
              {popoverOpen && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: 'var(--color-surface, white)', color: 'var(--color-text, inherit)', border: '1px solid var(--color-border, #ddd)', borderRadius: 8, padding: 12, minWidth: 220, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 100, textAlign: 'left' }}>
                  {user ? (
                    <>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, wordBreak: 'break-all' }}>{user.displayName || 'User'}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted, #666)', marginBottom: 10, wordBreak: 'break-all' }}>{user.email}</div>
                      <button onClick={handleSignOut} style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border, #ddd)', background: 'transparent', color: 'inherit', borderRadius: 6, cursor: 'pointer', font: 'inherit' }}>{t.acctSignOut}</button>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>{t.acctSignIn}</div>
                      {isInLine() ? (
                        <>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted, #666)', marginBottom: 8, lineHeight: 1.5 }}>
                            {lang === 'th' ? 'กรุณาเปิดในเบราว์เซอร์เพื่อเข้าสู่ระบบ' : 'Please open in a browser to sign in'}
                          </div>
                          <button onClick={handleSignIn} style={{ width: '100%', padding: '8px 12px', border: 'none', background: '#06C755', color: 'white', borderRadius: 6, cursor: 'pointer', font: 'inherit', fontWeight: 600 }}>
                            {lang === 'th' ? 'เปิดในเบราว์เซอร์ ↗' : 'Open in Browser ↗'}
                          </button>
                        </>
                      ) : (
                        <button onClick={handleSignIn} disabled={signingIn} style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'var(--color-accent)', color: 'var(--color-accent-text)', borderRadius: 6, cursor: signingIn ? 'default' : 'pointer', font: 'inherit', fontWeight: 600 }}>{signingIn ? t.acctSigningIn : t.acctContinueWithGoogle}</button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

            {(shortLinkStatus === 'expired' || shortLinkStatus === 'error') && (
        <div className={styles.sharedBanner}>
          <span className={styles.sharedBannerText}>
            {shortLinkStatus === 'expired' ? t.shareLinkExpired : t.shareError}
          </span>
          <button className={styles.sharedBannerBtn} onClick={() => { setShortLinkStatus(null); clearShareHash() }}>
            {t.startYourOwn}
          </button>
        </div>
      )}
      {shared && (
        <div className={styles.sharedBanner}>
          <span className={styles.sharedBannerText}>
            {sharedBillName || t.viewingShared}
          </span>
          <button className={styles.sharedBannerBtn} onClick={exitShared}>{t.startYourOwn}</button>
        </div>
      )}

      {!shared && (
        <div className={styles.tabBar} data-tour="tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => goTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {editingEntry && (
        <div className={styles.editingBar}>
          {t.editingSaved} <strong>{editingEntry.billName || (editingEntry.tab === 'sushi' ? t.tabSushi : t.untitledBill)}</strong>
        </div>
      )}

      <main className={styles.content}>
        {activeTab === 'split' && (
          <BillSplitter
            key={`split-${loadEpoch}`}
            sharedState={splitInitial}
            readOnly={!!shared}
            onSaveBill={handleSaveBill}
            onNewBill={handleNewBill}
            onDraftChange={handleDraftChange}
            savedPayees={savedPayees.payees}
            onSavePayee={savedPayees.addPayee}
            onRemovePayee={savedPayees.removePayee}
            payeesEnabled={!!user}
            onShowTour={() => setShowTour(true)}
          />
        )}
        {activeTab === 'sushi' && (
          <SushiroCalculator
            key={`sushi-${loadEpoch}`}
            sharedState={sushiInitial}
            readOnly={!!shared}
            onSaveBill={handleSaveBill}
            onDetach={() => detachTab('sushi')}
            onDraftChange={handleDraftChange}
            savedPayees={savedPayees.payees}
            onSavePayee={savedPayees.addPayee}
            onRemovePayee={savedPayees.removePayee}
            payeesEnabled={!!user}
          />
        )}
        {TRIPS_ENABLED && activeTab === 'trips' && (
          <TripsTab
            entries={history.entries}
            onLoadBill={(entry) => { handleLoadEntry(entry); setActiveTab(entry.tab) }}
            onNewBillForTrip={() => goTab('split')}
            // Trips only saves brand-new bills (receipt scans), so bypass
            // handleSaveBill, which updates the loaded bill. Switching tabs
            // already clears loadedEntryId; this keeps scans safe even if a
            // future path reaches Trips without going through the tab bar.
            onSaveBill={history.save}
            user={user}
            sharedTrip={shared?.t === 'trips' ? shared.s : null}
            onExitShared={() => { setShared(null); clearShareHash() }}
            savedPayees={savedPayees.payees}
          />
        )}
      </main>

      {showTour && !shared && <Tour onTab={goTab} onClose={() => setShowTour(false)} />}
      {historyOpen && (
        <BillHistory
          entries={history.entries}
          onLoad={handleLoadEntry}
          onRemove={history.remove}
          onClear={history.clear}
          onClose={() => setHistoryOpen(false)}
        />
      )}
      {cloudSync.syncStatus === 'awaiting-decision' && cloudSync.pendingServerEntries && (
        <ConflictModal
          t={t}
          lang={lang}
          localEntries={history.entries}
          cloudEntries={cloudSync.pendingServerEntries}
          onUseLocal={cloudSync.confirmLocalWins}
          onUseCloud={cloudSync.confirmCloudWins}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  )
}
