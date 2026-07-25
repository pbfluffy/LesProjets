import { useEffect, useMemo, useRef, useState } from 'react'

import Header from './components/Header'
import Hero from './components/Hero'
import FilterBar from './components/FilterBar'
import MapFilterBar from './components/MapFilterBar'
import PlaceCard from './components/PlaceCard'
import PlaceDetail from './components/PlaceDetail'
import BottomNav from './components/BottomNav'
import EmptyState from './components/EmptyState'
import MapView from './components/MapView'
import TripBuilder from './components/TripBuilder'

import { useTheme, useLang } from './hooks/useThemeLang'
import { useFilters, applyFilters } from './hooks/useFilters'
import { useLocalStorage } from './hooks/useLocalStorage'
import { VotesProvider } from './hooks/VotesContext'
import { useVotesFs as useVotes } from './hooks/useVotesFs'
import { useCloudSync } from './hooks/useCloudSync'
import { useTripsCloudSync } from './hooks/useTripsCloudSync'
import { useTrips } from './hooks/useTrips'
import SharedTripView from './components/SharedTripView'
import JoinCollabView from './components/JoinCollabView'
import SuggestPlaceSheet from './components/SuggestPlaceSheet'
import { readSharedTrip, clearSharedTripParam, readCollabTripId, clearCollabTripParam } from './shareTrip'
import { readPlaceId, setPlaceParam, clearPlaceParam, currentShareUrl } from './sharePlace'
import { auth, firestore, doc, setDoc, GoogleAuthProvider, signInWithPopup, signOut } from './firebase'

import { fetchPlaces } from './data/fetchPlaces'
import { computeTier, TIERS, FAVORITE_TIER } from './data/computeTier'
import { STRINGS, interp } from './i18n/strings'
import { LS_KEYS } from './config'

import './styles/theme.css'

// Haversine distance in km between two [lat, lng] arrays
function haversineKm(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return Infinity
  const R = 6371
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const sa = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa))
}

// #34 — ConflictModal. Shown when useCloudSync detects that both local and
// cloud have entries that disagree. Two-step: pick a side, then if picking
// local (which overwrites cloud) confirm via a warn step. Adapted from
// bill-splitter/App.jsx; simplified — Pumgoda's savedIds are just an array of
// IDs with no per-entry timestamps, so we only show counts, not "newer".
function ConflictModal({ s, localCount, cloudCount, onUseLocal, onUseCloud, bodyText, countLine }) {
  const [confirmingLocal, setConfirmingLocal] = useState(false)
  const interp = (str, vars) => str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''))
  const _body = bodyText || s.syncConflict.body
  const _line = countLine || s.syncConflict.placesLine
  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20, zIndex: 200,
  }
  const modalStyle = {
    background: 'var(--surface)', color: 'var(--text)',
    borderRadius: 12, padding: 20, maxWidth: 480, width: '100%',
    boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
  }
  const titleStyle = { margin: '0 0 6px', fontSize: 18, fontWeight: 700 }
  const bodyStyle = { margin: '0 0 16px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }
  if (confirmingLocal) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <h2 style={titleStyle}>{s.syncConflict.warnTitle}</h2>
          <p style={bodyStyle}>{s.syncConflict.warnBody}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setConfirmingLocal(false)}
              style={{ padding: '8px 14px', border: '0.5px solid var(--border)', background: 'transparent', color: 'inherit', borderRadius: 6, cursor: 'pointer', font: 'inherit' }}
            >
              {s.syncConflict.warnCancel}
            </button>
            <button
              onClick={onUseLocal}
              style={{ padding: '8px 14px', border: 'none', background: 'var(--red, #c62828)', color: 'white', borderRadius: 6, cursor: 'pointer', font: 'inherit', fontWeight: 600 }}
            >
              {s.syncConflict.warnConfirm}
            </button>
          </div>
        </div>
      </div>
    )
  }
  const cardStyle = {
    flex: 1, textAlign: 'left', padding: 14,
    border: '0.5px solid var(--border)',
    background: 'var(--surface-alt)', color: 'inherit',
    borderRadius: 10, cursor: 'pointer', font: 'inherit',
  }
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={titleStyle}>{s.syncConflict.title}</h2>
        <p style={bodyStyle}>{_body}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setConfirmingLocal(true)} style={cardStyle}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{s.syncConflict.localLabel}</div>
            <div style={{ fontSize: 13 }}>{interp(_line, { n: localCount })}</div>
          </button>
          <button onClick={onUseCloud} style={cardStyle}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{s.syncConflict.cloudLabel}</div>
            <div style={{ fontSize: 13 }}>{interp(_line, { n: cloudCount })}</div>
          </button>
        </div>
      </div>
    </div>
  )
}

// #97 — merge the two independent sync streams (places + trips) for the header dot.
function mergeSync(a, b) {
  if (a === 'error' || b === 'error') return 'error'
  if (a === 'syncing' || b === 'syncing' || a === 'awaiting-decision' || b === 'awaiting-decision') return 'syncing'
  if (a === 'synced' || b === 'synced') return 'synced'
  return 'idle'
}

export default function App() {
  const [theme, setTheme] = useTheme()
  const [lang, setLang] = useLang()
  const s = STRINGS[lang]

  const [places, setPlaces] = useState([])
  const [loadState, setLoadState] = useState('loading') // 'loading' | 'ok' | 'fallback' | 'stale'
  const [activeTab, setActiveTab] = useState('list')
  const [selected, setSelected] = useState(null) // a venue object
  const [savedIds, setSavedIds] = useLocalStorage(LS_KEYS.SAVED, [])

  // Bug fix — Share button always linked to the generic app URL, even when a
  // place detail was open, because nothing ever wrote the open place into the
  // URL. Mirrors the ?trip=/?ctrip= pattern above: resolve ?place=<id> once
  // places have loaded, then keep the URL in sync with `selected` afterward
  // so the Share button (and the address bar) always reflect what's open.
  const initialPlaceId = useRef(readPlaceId())
  const deepLinkHandled = useRef(false)
  useEffect(() => {
    if (deepLinkHandled.current || !places.length) return
    deepLinkHandled.current = true
    const id = initialPlaceId.current
    if (id) {
      const p = places.find((x) => x.id === id)
      if (p) setSelected(p)
    }
  }, [places])
  useEffect(() => {
    // Don't touch the URL until the initial deep link (if any) has resolved —
    // otherwise we'd wipe ?place= before it gets a chance to open.
    if (!deepLinkHandled.current && initialPlaceId.current) return
    if (selected) setPlaceParam(selected.id)
    else clearPlaceParam()
  }, [selected])

  // Cloud sync for savedIds (#32 + #34). Auth state propagates from BS/Nutritions/landing
  // via shared IndexedDB on pumbafluffycorgi.com. The styled ConflictModal below
  // (rendered at the end of the component) handles first-sign-in conflicts.
  const { user, syncStatus, pendingServerEntries, confirmCloudWins, confirmLocalWins } = useCloudSync({
    entries: savedIds,
    replaceEntries: setSavedIds,
  })

  // #97 Phase 1 — trips → Firestore (mirrors the savedIds sync above).
  const { trips, replaceTrips, importTrip } = useTrips()
  const {
    syncStatus: tripsSyncStatus,
    pendingServerTrips,
    confirmCloudWins: confirmTripsCloudWins,
    confirmLocalWins: confirmTripsLocalWins,
  } = useTripsCloudSync({ trips, replaceTrips })

  // #97 Phase 2 — a trip shared via ?trip= opens a read-only view + clone.
  const [sharedTrip, setSharedTrip] = useState(() => readSharedTrip())
  const handleCloneSharedTrip = () => {
    if (sharedTrip) importTrip(sharedTrip)
    clearSharedTripParam()
    setSharedTrip(null)
    setActiveTab('trips')
  }
  const handleDismissSharedTrip = () => {
    clearSharedTripParam()
    setSharedTrip(null)
  }

  // #97 Phase 3 — opened via ?ctrip=<id>: live collaborative-join view.
  const [collabTripId, setCollabTripId] = useState(() => readCollabTripId())
  const handleJoinedCollab = ({ id, name, placeIds }) => {
    // Reuse an existing local pointer to this shared doc; else mirror it in.
    const existing = trips.find((t) => t.remoteId === id)
    if (!existing) importTrip({ name, placeIds, shared: true, remoteId: id })
    clearCollabTripParam()
    setCollabTripId(null)
    setActiveTab('trips')
  }
  const handleDismissCollab = () => {
    clearCollabTripParam()
    setCollabTripId(null)
  }

  // Feature #73 — remote error tracking (caps at 5 per session, writes silently)
  useEffect(() => {
    if (!user) return
    let errCount = 0
    const logError = (message, stack) => {
      if (errCount >= 5) return
      errCount++
      const entryId = Date.now() + '_' + Math.random().toString(36).slice(2, 8)
      setDoc(doc(firestore, 'errorLog', user.uid, 'entries', entryId), {
        message: String(message || 'Unknown').slice(0, 5000),
        stack: stack ? String(stack).slice(0, 10000) : '',
        app: 'pumgoda',
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

  // #34 — account button popover state. Click-outside closes the popover.
  const [accountPopoverOpen, setAccountPopoverOpen] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const popoverWrapRef = useRef(null)
  useEffect(() => {
    if (!accountPopoverOpen) return
    const handler = (e) => {
      if (popoverWrapRef.current && !popoverWrapRef.current.contains(e.target)) {
        setAccountPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [accountPopoverOpen])
  const handleSignIn = async () => {
    if (signingIn) return
    setSigningIn(true)
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      setAccountPopoverOpen(false)
    } catch (e) {
      console.warn('[pumgoda] sign-in failed:', e)
    } finally {
      setSigningIn(false)
    }
  }
  const handleSignOut = async () => {
    try {
      await signOut(auth)
      setAccountPopoverOpen(false)
    } catch (e) {
      console.warn('[pumgoda] sign-out failed:', e)
    }
  }

  const { filters, setRegion, toggleType, togglePolicy, setSort, setMinPaws, setQuery, toggleOpenNow, clearFilters } = useFilters()
  const voteState = useVotes()
  const [userCoords, setUserCoords] = useState(null)
  const [filtersCollapsed, setFiltersCollapsed] = useLocalStorage('pumgoda_filters_collapsed_v1', false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [showSuggestSheet, setShowSuggestSheet] = useState(false)
  const activeFilterCount = (filters.region !== 'all' ? 1 : 0) + filters.types.length + filters.policies.length + (filters.minPaws ? 1 : 0) + (filters.query && filters.query.trim() ? 1 : 0) + (filters.openNow ? 1 : 0)
  const [locationError, setLocationError] = useState(null)

  const requestUserLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError('unsupported')
      return
    }
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords([pos.coords.latitude, pos.coords.longitude]),
      (err) => setLocationError(err && err.code === 1 ? 'denied' : 'error'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  // Header actions: share the app URL and force-refresh the Sheet cache
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [toast, setToast] = useState(null)

  const onShare = async () => {
    // `selected` (if open) is already reflected in the URL as ?place=<id> by
    // the effect above, so this naturally deep-links to the exact place.
    const url = selected ? currentShareUrl() : window.location.href.split('?')[0].split('#')[0]
    const placeName = selected ? (selected.name?.[lang] || selected.name?.en || selected.name?.th || selected.id) : null
    const title = selected ? placeName : s.header.shareTitle
    const text = selected ? interp(s.header.sharePlaceText, { name: placeName }) : s.header.shareText
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch (e) {
        if (e.name === 'AbortError') return // user dismissed share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setToast(s.header.linkCopied)
      setTimeout(() => setToast(null), 2200)
    } catch {
      // Clipboard API also failed — show URL in toast for manual copy
      setToast(url)
      setTimeout(() => setToast(null), 5000)
    }
  }

  const onRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      const { places: fresh, source } = await fetchPlaces({ force: true })
      setPlaces(fresh)
      setLoadState(source === 'fallback' ? 'fallback' : source === 'stale-cache' ? 'stale' : 'ok')
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
      setLoadState(source === 'fallback' ? 'fallback' : source === 'stale-cache' ? 'stale' : 'ok')
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Self-heal a stale photo cache: if a place photo 404s (e.g. the catalog
  // changed in admin while this client still holds a warm cache), evict the
  // cache and force one fresh Firestore read. Runs at most once per mount.
  useEffect(() => {
    let healed = false
    const onImgError = (e) => {
      const t = e.target
      if (healed || !t || t.tagName !== 'IMG') return
      if (!/r2\.dev\//.test(t.currentSrc || t.src || '')) return
      healed = true
      try { localStorage.removeItem(LS_KEYS.PLACES) } catch {}
      fetchPlaces({ force: true })
        .then(({ places, source }) => {
          setPlaces(places)
          setLoadState(source === 'fallback' ? 'fallback' : source === 'stale-cache' ? 'stale' : 'ok')
        })
        .catch((err) => console.warn('[photo self-heal] refetch failed:', err))
    }
    // Image load errors don't bubble; capture phase catches them at window.
    window.addEventListener('error', onImgError, true)
    return () => window.removeEventListener('error', onImgError, true)
  }, [])

  // Filter + sort
  const visiblePlaces = useMemo(() => {
    let arr =
      activeTab === 'saved' ? places.filter((p) => savedIds.includes(p.id)) : places
    arr = applyFilters(arr, filters)
    // Sort based on filters.sort
    if (filters.sort === 'name') {
      arr.sort((a, b) => (a.name?.[lang] || a.name?.en || '').localeCompare(b.name?.[lang] || b.name?.en || ''))
    } else if (filters.sort === 'nearby' && userCoords) {
      arr.sort((a, b) => haversineKm(userCoords, a.coords) - haversineKm(userCoords, b.coords))
    } else if (filters.sort === 'welcomed') {
      const scoreOf = (p) => {
        const t = voteState.tallies[p.id]
        if (!t) return 0
        return (t.up || 0) + (t.paw || 0) - (t.warn || 0)
      }
      arr.sort((a, b) => scoreOf(b) - scoreOf(a) || computeTier(b).paws - computeTier(a).paws)
    } else {
      arr.sort((a, b) => computeTier(b).paws - computeTier(a).paws)
    }
    return arr
  }, [places, filters, savedIds, activeTab, lang, userCoords, voteState.tallies])

  const toggleSave = (id) =>
    setSavedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const onToggleLang = () => setLang(lang === 'th' ? 'en' : 'th')
  const onToggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <VotesProvider value={voteState}>
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
        onSuggestClick={() => setShowSuggestSheet(true)}
        suggestLabel={s.header.suggest}
        user={user}
        syncStatus={mergeSync(syncStatus, tripsSyncStatus)}
        popoverOpen={accountPopoverOpen}
        onTogglePopover={() => setAccountPopoverOpen((o) => !o)}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        signingIn={signingIn}
        popoverWrapRef={popoverWrapRef}
        accountLabels={s.account}
      />

      <div className="shell">
        {activeTab === 'list' && (
          <Hero tagline={s.tagline} subtitle={s.subtitle} dogBadge={s.dogBadge} photoLabels={s.heroPhoto} />
        )}

        {(activeTab === 'list' || activeTab === 'saved') && (
          <>
            {(activeTab === 'list' || savedIds.length > 0) && (
              <FilterBar
                lang={lang}
                filters={filters}
                setRegion={setRegion}
                toggleType={toggleType}
                togglePolicy={togglePolicy}
                setMinPaws={setMinPaws}
                toggleOpenNow={toggleOpenNow}
                setQuery={setQuery}
                clearFilters={clearFilters}
                collapsed={filtersCollapsed && visiblePlaces.length > 1}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, margin: '4px 0 12px' }}>
              <p className="section-label" style={{ margin: 0, flex: '1 1 0' }}>
                {loadState === 'loading'
                  ? s.states.loading
                  : `${visiblePlaces.length} ${activeTab === 'saved' ? '♥' : '🐾'}`}
                {loadState === 'fallback' ? ` · ${s.states.networkError}` : ''}
                {loadState === 'stale' ? ` · ${s.states.staleCache}` : ''}
                {loadState !== 'loading' && activeTab !== 'saved' && (
                  <button
                    type="button"
                    onClick={() => setHelpOpen(true)}
                    aria-label={lang === 'th' ? 'อุ้งเท้าคืออะไร' : 'How paws work'}
                    style={{ background: 'none', border: 'none', padding: '0 0 0 6px', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, lineHeight: 1, verticalAlign: 'middle' }}
                  >ⓘ</button>
                )}
              </p>

              {visiblePlaces.length > 1 && loadState !== 'loading' && (
                <>
                  <button
                    type="button"
                    className="ph-filter-toggle"
                    onClick={() => setFiltersCollapsed(!filtersCollapsed)}
                    aria-expanded={!filtersCollapsed}
                  >
                    {filtersCollapsed ? '▾' : '▴'} {lang === 'th' ? 'ตัวกรอง' : 'Filters'}{filtersCollapsed && activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 0', justifyContent: 'flex-end' }}>
                {filters.sort === 'nearby' && locationError && (
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--accent)' }}>
                    {locationError === 'denied'
                      ? (lang === 'th' ? 'ปฏิเสธตำแหน่ง' : 'Location denied')
                      : locationError === 'unsupported'
                        ? (lang === 'th' ? 'ไม่รองรับ' : 'Not supported')
                        : (lang === 'th' ? 'ไม่พบตำแหน่ง' : "Couldn't get location")}
                  </span>
                )}
                <select
                value={filters.sort}
                onChange={(e) => {
                  const newSort = e.target.value
                  setSort(newSort)
                  if (newSort === 'nearby' && !userCoords) requestUserLocation()
                }}
                aria-label={lang === 'th' ? 'จัดเรียง' : 'Sort'}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-pill)',
                  border: '0.5px solid var(--border)',
                  background: 'var(--surface-alt)',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                <option value="paws">{lang === 'th' ? 'อุ้งเท้ามากสุด' : 'Most paws'}</option>
                <option value="welcomed">{lang === 'th' ? 'ต้อนรับดีที่สุด' : 'Most welcomed'}</option>
                <option value="name">{lang === 'th' ? 'เรียงตามตัวอักษร' : 'A–Z'}</option>
                <option value="nearby">{lang === 'th' ? 'ใกล้ฉันที่สุด' : 'Nearest to me'}</option>
              </select>
                  </div>
                </>
              )}
            </div>

            <div className="ph-list">
              {visiblePlaces.length === 0 && loadState !== 'loading' && (
                <EmptyState
                  title={activeTab === 'saved' ? s.states.emptySaved : s.states.empty}
                />
              )}
              {visiblePlaces.map((venue) => (
                <PlaceCard
                  key={venue.id || venue.name?.en || venue.name?.th}
                  venue={venue}
                  lang={lang}
                  onOpen={setSelected}
                  distanceKm={
                    filters.sort === 'nearby' && userCoords && Array.isArray(venue.coords)
                      ? haversineKm(userCoords, venue.coords)
                      : null
                  }
                />
              ))}
            </div>
          </>
        )}

        {activeTab === 'map' && (
          <div className="ph-map-wrap">
            <MapView
              places={visiblePlaces}
              onPlaceClick={setSelected}
              theme={theme}
              lang={lang}
            />
            <MapFilterBar
              lang={lang}
              filters={filters}
              setRegion={setRegion}
              toggleType={toggleType}
              togglePolicy={togglePolicy}
              setMinPaws={setMinPaws}
              clearFilters={clearFilters}
            />
          </div>
        )}

        {activeTab === 'trips' && (
          <TripBuilder places={places} lang={lang} onOpenPlace={setSelected} />
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
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--text)',
            color: 'var(--surface)',
            padding: '8px 16px',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 100,
            pointerEvents: 'none',
            maxWidth: '90vw',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {toast}
        </div>
      )}

      {/* Paw tier help modal */}
      {helpOpen && (
        <div
          onClick={() => setHelpOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200, padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--bg)', borderRadius: 16, padding: '20px 16px 24px', maxWidth: 480, width: '100%' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
                {lang === 'th' ? 'ระบบอุ้งเท้า' : 'How the paws work'}
              </h2>
              <button
                onClick={() => setHelpOpen(false)}
                aria-label={lang === 'th' ? 'ปิด' : 'Close'}
                style={{ border: 'none', background: 'none', fontSize: 20, lineHeight: 1, cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              {lang === 'th'
                ? 'ยิ่งอุ้งเท้ามาก ยิ่งพาน้องเข้าได้สะดวก — ตั้งแต่ต้องใช้รถเข็น ไปจนถึงร้านที่มีเมนูสัตว์เลี้ยง'
                : 'More paws means an easier visit — from stroller-only up to a venue with its own pet menu.'}
            </p>
            {TIERS.map((t) => (
              <div key={t.key} style={{ display: 'flex', gap: 10, padding: '9px 0', borderTop: '0.5px solid var(--border)' }}>
                <span aria-hidden="true" style={{ fontSize: 14, letterSpacing: -1, whiteSpace: 'nowrap', flexShrink: 0, width: 70 }}>
                  {'🐾'.repeat(t.paws)}
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 500 }}>
                    {lang === 'th' ? t.th : t.en}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', lineHeight: 1.45, marginTop: 2 }}>
                    {lang === 'th' ? t.thDesc : t.enDesc}
                  </span>
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, padding: '9px 0', borderTop: '0.5px solid var(--border)' }}>
              <span aria-hidden="true" style={{ fontSize: 15, color: 'var(--heart)', flexShrink: 0, width: 70 }}>
                ♥
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 500 }}>
                  {lang === 'th' ? FAVORITE_TIER.th : FAVORITE_TIER.en}
                </span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', lineHeight: 1.45, marginTop: 2 }}>
                  {lang === 'th' ? FAVORITE_TIER.thDesc : FAVORITE_TIER.enDesc}
                </span>
              </span>
            </div>
            <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              {lang === 'th'
                ? 'หัวใจคือร้านที่พุมบ้าเลือกเอง แยกต่างหากจากจำนวนอุ้งเท้า'
                : "The heart marks Pumba's own picks — separate from the paw count."}
            </p>
          </div>
        </div>
      )}

      {/* #34 — first-sign-in conflict prompt. Only rendered when both sides
          have non-empty differing entries; useCloudSync handles all other
          cases (empty/empty, one-side-empty, identical) automatically. */}
      {pendingServerEntries && (
        <ConflictModal
          s={s}
          localCount={savedIds.length}
          cloudCount={pendingServerEntries.length}
          onUseLocal={confirmLocalWins}
          onUseCloud={confirmCloudWins}
        />
      )}

      {/* #97 Phase 1 — trips first-sign-in conflict (parallel to places). */}
      {pendingServerTrips && (
        <ConflictModal
          s={s}
          localCount={trips.length}
          cloudCount={pendingServerTrips.length}
          onUseLocal={confirmTripsLocalWins}
          onUseCloud={confirmTripsCloudWins}
          bodyText={s.syncConflict.tripsBody}
          countLine={s.syncConflict.tripsLine}
        />
      )}
    {/* #97 Phase 2 — read-only view of a shared trip (?trip=) + clone. */}
    {sharedTrip && (
      <SharedTripView
        shared={sharedTrip}
        places={places}
        lang={lang}
        onClone={handleCloneSharedTrip}
        onClose={handleDismissSharedTrip}
      />
    )}

    {/* #97 Phase 3 — live collaborative join (?ctrip=). ?trip= takes priority. */}
    {collabTripId && !sharedTrip && (
      <JoinCollabView
        tripId={collabTripId}
        places={places}
        lang={lang}
        onJoined={handleJoinedCollab}
        onClose={handleDismissCollab}
      />
    )}

    {showSuggestSheet && (
      <SuggestPlaceSheet
        lang={lang}
        user={user}
        onSignIn={handleSignIn}
        signingIn={signingIn}
        onClose={() => setShowSuggestSheet(false)}
      />
    )}

    </VotesProvider>
  )
}
