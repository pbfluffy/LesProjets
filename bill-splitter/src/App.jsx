import { useState, useEffect, useRef } from 'react'
import { HistoryIcon, HomeIcon, MoonIcon, SunIcon } from './components/icons'
import { auth, db, doc, setDoc, GoogleAuthProvider, signInWithPopup, signOut } from './firebase.js'
import BillSplitter from './components/BillSplitter'
import SushiroCalculator from './components/SushiroCalculator'
import BillHistory from './components/BillHistory'
import { LangProvider, useLang } from './LangContext'
import { readShareFromHash, clearShareHash, getShortLinkId, resolveShortLink } from './share'
import { useBillHistory } from './hooks/useBillHistory'
import { useCloudSync } from './hooks/useCloudSync'
import { useSavedPayees } from './hooks/useSavedPayees'
import styles from './App.module.css'

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
  const cardStyle = (newer) => ({ flex: 1, textAlign: 'left', padding: 14, border: '2px solid', borderColor: newer ? 'var(--accent, #ff6b35)' : 'var(--color-border, #ddd)', background: 'var(--color-surface-alt, #f8f8f8)', color: 'inherit', borderRadius: 10, cursor: 'pointer', font: 'inherit' })
  const cardHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }
  const newerBadgeStyle = { fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--accent, #ff6b35)', color: 'white', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }
  const tsStyle = (newer) => ({ fontSize: 11, color: newer ? 'var(--accent, #ff6b35)' : 'var(--color-text-muted, #666)', fontWeight: newer ? 600 : 400 })
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
    if (tabParam === 'sushi' || tabParam === 'split') return tabParam
    return 'split'
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
    let errCount = 0
    const logError = (message, stack) => {
      if (errCount >= 5) return
      errCount++
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
  // Loaded entries are passed in as initial state to BillSplitter/SushiroCalculator.
  // Bumping `loadEpoch` (used as react key) remounts the store so initial takes effect.
  const [loaded, setLoaded] = useState(null)
  const [loadEpoch, setLoadEpoch] = useState(0)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const exitShared = () => {
    setShared(null)
    clearShareHash()
  }

  const handleSaveBill = (tab, snapshot) => {
    history.save(tab, snapshot)
  }

  const handleLoadEntry = (entry) => {
    setShared(null)
    clearShareHash()
    setActiveTab(entry.tab)
    setLoaded({ tab: entry.tab, state: entry.state })
    setLoadEpoch(e => e + 1)
    setHistoryOpen(false)
  }

  const TABS = [
    { id: 'split', label: t.tabSplit },
    { id: 'sushi', label: t.tabSushi },
  ]

  const sharedBillName = shared?.s?.billName?.trim()

  // Decide what `initial` to pass to each tab's store
  const splitInitial = shared && shared.t === 'split' ? shared.s
                     : (loaded && loaded.tab === 'split' ? loaded.state : null)
  const sushiInitial = shared && shared.t === 'sushi' ? shared.s
                     : (loaded && loaded.tab === 'sushi' ? loaded.state : null)

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
                      <button onClick={handleSignIn} disabled={signingIn} style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'var(--accent, #ff6b35)', color: 'white', borderRadius: 6, cursor: signingIn ? 'default' : 'pointer', font: 'inherit', fontWeight: 600 }}>{signingIn ? t.acctSigningIn : t.acctContinueWithGoogle}</button>
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
            ⚠️ {shortLinkStatus === 'expired' ? t.shareLinkExpired : t.shareError}
          </span>
          <button className={styles.sharedBannerBtn} onClick={() => { setShortLinkStatus(null); clearShareHash() }}>
            {t.startYourOwn}
          </button>
        </div>
      )}
      {shared && (
        <div className={styles.sharedBanner}>
          <span className={styles.sharedBannerText}>
            {sharedBillName
              ? `\u{1F374} ${sharedBillName}`
              : `\u{1F441}\u{FE0F} ${t.viewingShared}`}
          </span>
          <button className={styles.sharedBannerBtn} onClick={exitShared}>{t.startYourOwn}</button>
        </div>
      )}

      {!shared && (
        <div className={styles.tabBar}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <main className={styles.content}>
        {activeTab === 'split' && (
          <BillSplitter
            key={`split-${loadEpoch}`}
            sharedState={splitInitial}
            readOnly={!!shared}
            onSaveBill={handleSaveBill}
            savedPayees={savedPayees.payees}
            onSavePayee={savedPayees.addPayee}
            onRemovePayee={savedPayees.removePayee}
            payeesEnabled={!!user}
          />
        )}
        {activeTab === 'sushi' && (
          <SushiroCalculator
            key={`sushi-${loadEpoch}`}
            sharedState={sushiInitial}
            readOnly={!!shared}
            onSaveBill={handleSaveBill}
          />
        )}
      </main>

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
