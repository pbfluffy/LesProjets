import { useEffect, useMemo, useState } from 'react'

import Header from './components/Header'
import Hero from './components/Hero'
import FilterBar from './components/FilterBar'
import PlaceCard from './components/PlaceCard'
import PlaceDetail from './components/PlaceDetail'
import BottomNav from './components/BottomNav'
import EmptyState from './components/EmptyState'

import { useTheme, useLang } from './hooks/useThemeLang'
import { useFilters, applyFilters } from './hooks/useFilters'
import { useLocalStorage } from './hooks/useLocalStorage'

import { fetchPlaces } from './data/fetchPlaces'
import { computeTier } from './data/computeTier'
import { STRINGS } from './i18n/strings'
import { LS_KEYS } from './config'

import './styles/theme.css'

export default function App() {
  const [theme, setTheme] = useTheme()
  const [lang, setLang] = useLang()
  const s = STRINGS[lang]

  const [places, setPlaces] = useState([])
  const [loadState, setLoadState] = useState('loading') // 'loading' | 'ok' | 'fallback'
  const [activeTab, setActiveTab] = useState('list')
  const [selected, setSelected] = useState(null) // a venue object
  const [savedIds, setSavedIds] = useLocalStorage(LS_KEYS.SAVED, [])

  const { filters, setRegion, toggleType, togglePolicy } = useFilters()

  // Header actions: share the app URL and force-refresh the Sheet cache
  const [isRefreshing, setIsRefreshing] = useState(false)

  const onShare = async () => {
    const url = window.location.href.split('?')[0].split('#')[0]
    if (navigator.share) {
      try {
        await navigator.share({ title: s.header.shareTitle, text: s.header.shareText, url })
        return
      } catch (e) {
        if (e.name === 'AbortError') return // user dismissed share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      alert(s.header.share + ': ' + url)
    } catch {
      window.prompt(s.header.share, url)
    }
  }

  const onRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      const { places: fresh, source } = await fetchPlaces({ force: true })
      setPlaces(fresh)
      setLoadState(source === 'fallback' ? 'fallback' : 'ok')
    } catch (err) {
      console.warn('[onRefresh] could not refresh places:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Load places on mount
  useEffect(() => {
    let cancelled = false
    fetchPlaces().then(({ places, source }) => {
      if (cancelled) return
      setPlaces(places)
      setLoadState(source === 'fallback' ? 'fallback' : 'ok')
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Filter + sort
  const visiblePlaces = useMemo(() => {
    let arr =
      activeTab === 'saved' ? places.filter((p) => savedIds.includes(p.id)) : places
    arr = applyFilters(arr, filters)
    // Default sort: highest paws first
    arr.sort((a, b) => computeTier(b).paws - computeTier(a).paws)
    return arr
  }, [places, filters, savedIds, activeTab])

  const toggleSave = (id) =>
    setSavedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const onToggleLang = () => setLang(lang === 'th' ? 'en' : 'th')
  const onToggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <>
      <Header
        brand={s.brand}
        lang={lang}
        theme={theme}
        onToggleLang={onToggleLang}
        onToggleTheme={onToggleTheme}
        onShare={onShare}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        shareLabel={s.header.share}
        refreshLabel={s.header.refresh}
      />

      <div className="shell">
        <Hero tagline={s.tagline} subtitle={s.subtitle} dogBadge={s.dogBadge} photoLabels={s.heroPhoto} />

        {(activeTab === 'list' || activeTab === 'saved') && (
          <>
            <FilterBar
              lang={lang}
              filters={filters}
              setRegion={setRegion}
              toggleType={toggleType}
              togglePolicy={togglePolicy}
            />

            <p className="section-label">
              {loadState === 'loading'
                ? s.states.loading
                : `${visiblePlaces.length} ${activeTab === 'saved' ? '♥' : '🐾'}`}
              {loadState === 'fallback' ? ` · ${s.states.networkError}` : ''}
            </p>

            <div className="ph-list">
              {visiblePlaces.length === 0 && loadState !== 'loading' && (
                <EmptyState
                  title={activeTab === 'saved' ? s.states.emptySaved : s.states.empty}
                />
              )}
              {visiblePlaces.map((venue) => (
                <PlaceCard
                  key={venue.id}
                  venue={venue}
                  lang={lang}
                  onOpen={setSelected}
                />
              ))}
            </div>
          </>
        )}

        {(activeTab === 'map' || activeTab === 'trips') && (
          <EmptyState
            icon={activeTab === 'map' ? '🗺️' : '🧳'}
            title={s.states.comingSoon}
          />
        )}

        <footer className="ph-footer">
          <span className="ph-footer-paw">🐾</span>
          <span>{s.footer}</span>
        </footer>
      </div>

      {selected && (
        <PlaceDetail
          venue={selected}
          lang={lang}
          onClose={() => setSelected(null)}
          onToggleSave={toggleSave}
          isSaved={savedIds.includes(selected.id)}
        />
      )}

      <BottomNav active={activeTab} onChange={setActiveTab} lang={lang} />
    </>
  )
}
