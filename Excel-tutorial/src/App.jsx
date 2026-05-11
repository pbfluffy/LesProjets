import { useState, useEffect } from 'react'
import { LangProvider, useLang } from './contexts/LangContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import HomeScreen from './screens/HomeScreen'
import MissionScreen from './screens/MissionScreen'
import styles from './App.module.css'

// Read formula id from URL hash on first load (e.g. #vlookup)
function readHash() {
  if (typeof window === 'undefined') return null
  const id = (window.location.hash || '').replace(/^#/, '').trim()
  return id || null
}

function AppInner() {
  const [activeFormula, setActiveFormula] = useState(() => readHash())
  const { lang, toggle: toggleLang, t } = useLang()
  const { theme, toggle: toggleTheme } = useTheme()

  // Sync URL hash with active formula
  useEffect(() => {
    if (typeof window === 'undefined') return
    const desired = activeFormula ? `#${activeFormula}` : ''
    if (window.location.hash !== desired) {
      // Use replaceState so back-button still works for chapter→home
      if (desired) {
        window.history.pushState(null, '', desired)
      } else {
        window.history.pushState(null, '', window.location.pathname + window.location.search)
      }
    }
  }, [activeFormula])

  // React to back/forward
  useEffect(() => {
    const onPop = () => setActiveFormula(readHash())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button
            className={styles.logoBtn}
            onClick={() => setActiveFormula(null)}
            title={t.home}
          >
            <span className={styles.logoMark}>☕</span>
            <span className={styles.logoText}>{t.appName}</span>
          </button>
          <div className={styles.controls}>
            <button
              className={styles.iconBtn}
              onClick={() => { window.location.href = '../' }}
              title={lang === 'th' ? 'กลับสู่หน้าแรก' : 'Back to home'}
              aria-label="Home"
            >
              🏠
            </button>
            <button
              className={styles.iconBtn}
              onClick={toggleLang}
              title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
              aria-label="Toggle language"
            >
              {lang === 'th' ? 'EN' : 'TH'}
            </button>
            <button
              className={styles.iconBtn}
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
        </div>
      </header>

      <main className={styles.content}>
        {activeFormula ? (
          <MissionScreen
            formulaId={activeFormula}
            onBack={() => setActiveFormula(null)}
          />
        ) : (
          <HomeScreen onSelect={setActiveFormula} />
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AppInner />
      </LangProvider>
    </ThemeProvider>
  )
}
