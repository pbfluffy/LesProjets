import { useEffect, useState } from 'react'
import {
  auth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut,
} from './firebase'
import { useTheme, useLang } from './hooks/useThemeLang'
import { useDogs } from './hooks/useDogs'
import { STRINGS } from './LangContext'
import MapView from './components/MapView'
import ReportFlow from './components/ReportFlow'
import DogDetail from './components/DogDetail'
import styles from './App.module.css'

const provider = new GoogleAuthProvider()

export default function App() {
  const [theme, setTheme] = useTheme()
  const [lang, setLang] = useLang()
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('map') // 'map' | 'report'
  const [selectedDog, setSelectedDog] = useState(null)
  const [presetDog, setPresetDog] = useState(null)

  const { dogs } = useDogs()
  const t = STRINGS[lang] || STRINGS.en

  useEffect(() => onAuthStateChanged(auth, setUser), [])

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
        {tab === 'map' && (
          <MapView
            dogs={dogs}
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
