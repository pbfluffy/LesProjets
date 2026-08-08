import { useEffect, useRef, useState } from 'react'
import {
  auth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut,
} from './firebase'
import { useTheme, useLang } from './hooks/useThemeLang'
import { useDogs } from './hooks/useDogs'
import { useInstallPrompt } from './hooks/useInstallPrompt'
import { readDogId, setDogParam, clearDogParam } from './shareDog'
import { STRINGS } from './LangContext'
import MapView from './components/MapView'
import ReportFlow from './components/ReportFlow'
import DogDetail from './components/DogDetail'
import styles from './App.module.css'

const provider = new GoogleAuthProvider()

const ONBOARDING_KEY = 'majon_onboarding_dismissed'

export default function App() {
  const [theme, setTheme] = useTheme()
  const [lang, setLang] = useLang()
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('map') // 'map' | 'report'
  const [selectedDog, setSelectedDog] = useState(null)
  const [presetDog, setPresetDog] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return !localStorage.getItem(ONBOARDING_KEY)
    } catch {
      return false
    }
  })

  const { dogs, loading } = useDogs()
  const { showAndroidPrompt, showIosHint, promptInstall, dismiss: dismissInstall } = useInstallPrompt()
  const t = STRINGS[lang] || STRINGS.en

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  function dismissOnboarding() {
    setShowOnboarding(false)
    try {
      localStorage.setItem(ONBOARDING_KEY, '1')
    } catch {
      // ignore (private browsing etc.)
    }
  }

  // Deep-linking: ?dog=<id> reopens that exact dog once the dogs list has
  // loaded, and the address bar stays in sync afterward so the Share button
  // (and a plain copy-paste of the URL) always points at what's open.
  // Mirrors pumgoda's ?place=<id> pattern.
  const initialDogId = useRef(readDogId())
  const deepLinkHandled = useRef(false)
  useEffect(() => {
    if (deepLinkHandled.current || !dogs.length) return
    if (initialDogId.current) {
      const match = dogs.find((d) => d.id === initialDogId.current)
      if (match) setSelectedDog(match)
    }
    deepLinkHandled.current = true
  }, [dogs])

  useEffect(() => {
    // Don't touch the URL until the initial deep link (if any) has resolved
    // — otherwise this would wipe ?dog= before it gets a chance to open.
    if (!deepLinkHandled.current && initialDogId.current) return
    if (selectedDog) setDogParam(selectedDog.id)
    else clearDogParam()
  }, [selectedDog])

  async function handleSignIn() {
    try {
      await signInWithPopup(auth, provider)
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        console.error('[majon] sign-in failed:', e)
      }
    }
  }

  function handleReportSighting(dog) {
    setPresetDog(dog)
    setSelectedDog(null)
    setTab('report')
  }

  function handleReportDone() {
    setPresetDog(null)
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <span className={styles.logo}>{t.appName}</span>
        <div className={styles.headerControls}>
          <a href="../" className={styles.ctrlBtn} title={t.backToHome} aria-label="Home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <path d="M9 22V12h6v10" />
            </svg>
          </a>
          <button className={styles.ctrlBtn} onClick={() => setLang(lang === 'th' ? 'en' : 'th')}>
            {lang === 'th' ? 'EN' : 'TH'}
          </button>
          <button className={styles.ctrlBtn} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '🌞' : '🌙'}
          </button>
          {user ? (
            <button className={styles.ctrlBtn} onClick={() => signOut(auth)} title={t.signOut}>
              {user.photoURL
                ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className={styles.avatar} />
                : '👤'}
            </button>
          ) : (
            <button className={styles.ctrlBtn} onClick={handleSignIn}>{t.signIn}</button>
          )}
        </div>
      </header>

      <nav className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tabBtn} ${tab === 'map' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('map')}
        >
          {t.navMap}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${tab === 'report' ? styles.tabBtnActive : ''}`}
          onClick={() => { setPresetDog(null); setTab('report') }}
        >
          {t.navReport}
        </button>
      </nav>

      <main className={styles.main}>
        {tab === 'map' && showOnboarding && (
          <div className={styles.onboarding}>
            <div className={styles.onboardingTitle}>{t.onboardingTitle}</div>
            <div className={styles.onboardingBody}>{t.onboardingBody}</div>
            <button type="button" className={styles.onboardingDismiss} onClick={dismissOnboarding}>
              {t.onboardingDismiss}
            </button>
          </div>
        )}
        {!showOnboarding && (showAndroidPrompt || showIosHint) && (
          <div className={styles.installBar}>
            <span className={styles.installText}>
              {showAndroidPrompt ? t.installTitle : t.installIosHint}
            </span>
            {showAndroidPrompt && (
              <button type="button" className={styles.installBtn} onClick={promptInstall}>
                {t.installButton}
              </button>
            )}
            <button type="button" className={styles.installDismiss} onClick={dismissInstall} aria-label={t.dogClose}>×</button>
          </div>
        )}
        {tab === 'map' && (
          <MapView
            dogs={dogs}
            loading={loading}
            onDogClick={setSelectedDog}
            theme={theme}
            lang={lang}
            t={t}
          />
        )}
        {tab === 'report' && (
          <ReportFlow
            user={user}
            dogs={dogs}
            t={t}
            lang={lang}
            onSignIn={handleSignIn}
            onDone={handleReportDone}
            presetDog={presetDog}
          />
        )}
      </main>

      {selectedDog && (
        <DogDetail
          dog={selectedDog}
          dogs={dogs}
          user={user}
          t={t}
          lang={lang}
          onClose={() => setSelectedDog(null)}
          onReportSighting={handleReportSighting}
        />
      )}
    </div>
  )
}
