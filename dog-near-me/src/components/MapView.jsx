import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster'
import { searchDogs } from '../searchDogs'
import { localizedBreed } from '../breedLabel'
import styles from './MapView.module.css'

// Tile providers (CARTO — free for non-commercial, no API key). Same tiles
// as pumgoda's MapView.
const TILES = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
}

// Default view if no dogs have coords yet (centered on Bangkok)
const BANGKOK = { lat: 13.7563, lng: 100.5018 }
const DEFAULT_ZOOM = 12
const SINGLE_DOG_ZOOM = 15
const USER_LOCATION_ZOOM = 14

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  )
}

function timeAgo(ms, lang) {
  if (!ms) return ''
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return lang === 'th' ? 'เมื่อสักครู่' : 'just now'
  if (mins < 60) return lang === 'th' ? `${mins} นาทีที่แล้ว` : `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return lang === 'th' ? `${hours} ชม.ที่แล้ว` : `${hours}h ago`
  const days = Math.floor(hours / 24)
  return lang === 'th' ? `${days} วันที่แล้ว` : `${days}d ago`
}

// Simple geometric paw mark for dogs with no photo yet — a drawn icon reads
// less like a stock emoji dropped into the UI.
const PAW_SVG = `
  <svg class="${styles.markerIcon}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <ellipse cx="12" cy="16" rx="5.5" ry="4.5" />
    <ellipse cx="5.2" cy="8.5" rx="2.1" ry="2.6" transform="rotate(-18 5.2 8.5)" />
    <ellipse cx="10.2" cy="5.3" rx="2.1" ry="2.7" transform="rotate(-6 10.2 5.3)" />
    <ellipse cx="15.6" cy="5.4" rx="2.1" ry="2.7" transform="rotate(8 15.6 5.4)" />
    <ellipse cx="19.6" cy="8.8" rx="2.1" ry="2.6" transform="rotate(20 19.6 8.8)" />
  </svg>
`

function buildMarkerHtml(dog) {
  const photo = dog.latestPhotoUrl
  return `
    <div class="${styles.markerWrap}">
      <div class="${styles.markerBadge}">
        ${photo
          ? `<img class="${styles.markerImg}" src="${escapeHtml(photo)}" alt="" />`
          : PAW_SVG}
      </div>
    </div>
  `
}

function buildIcon(dog) {
  return L.divIcon({
    html: buildMarkerHtml(dog),
    className: styles.markerLeaflet,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

function buildPopupHtml(dog, lang, t) {
  const name = dog.name || t.dogUnnamed
  const lastSeenMs = dog.lastSeenAt?.toMillis ? dog.lastSeenAt.toMillis() : null
  return `
    <div class="${styles.popupCard}">
      ${dog.latestPhotoUrl ? `<img class="${styles.popupPhoto}" src="${escapeHtml(dog.latestPhotoUrl)}" alt="" />` : ''}
      <div class="${styles.popupTitle}">${escapeHtml(name)}</div>
      ${lastSeenMs ? `<div class="${styles.popupMeta}">${escapeHtml(t.dogLastSeen)}: ${escapeHtml(timeAgo(lastSeenMs, lang))}</div>` : ''}
      <button class="${styles.popupBtn}" data-action="details" type="button">${escapeHtml(t.dogClose === 'Close' ? 'See details' : 'ดูรายละเอียด')}</button>
    </div>
  `
}

function buildUserIcon() {
  return L.divIcon({
    html: `<div class="${styles.userDot}"><div class="${styles.userDotInner}"></div></div>`,
    className: styles.userIconLeaflet,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function buildClusterIcon(cluster) {
  const count = cluster.getChildCount()
  let size = 36
  if (count >= 10) size = 42
  if (count >= 50) size = 50
  return L.divIcon({
    html: `<div class="${styles.cluster}" style="width:${size}px;height:${size}px;line-height:${size - 4}px;">${count}</div>`,
    className: styles.clusterLeaflet,
    iconSize: [size, size],
  })
}

export default function MapView({ dogs = [], loading = false, onDogClick, theme = 'light', lang = 'en', t }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const tileLayerRef = useRef(null)
  const markersLayerRef = useRef(null)
  const userMarkerRef = useRef(null)
  const onDogClickRef = useRef(onDogClick)
  const watchIdRef = useRef(null)
  const hasFirstFixRef = useRef(false)
  const dogsRef = useRef(dogs)
  const [locateState, setLocateState] = useState('idle') // idle | locating | tracking
  const [locateError, setLocateError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    onDogClickRef.current = onDogClick
  }, [onDogClick])

  useEffect(() => {
    dogsRef.current = dogs
  }, [dogs])

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    const map = L.map(containerRef.current, {
      center: [BANGKOK.lat, BANGKOK.lng],
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    })
    mapRef.current = map
    // Leaflet's default zoom control sits top-left, the same corner as the
    // search box below — and its z-index wins, so it was rendering on top
    // and clipping the search input's left edge. Bottom-right stacks
    // cleanly above the existing attribution control instead.
    map.zoomControl.setPosition('bottomright')

    const cfg = TILES[theme] || TILES.light
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    markersLayerRef.current = L.markerClusterGroup({
      iconCreateFunction: buildClusterIcon,
      showCoverageOnHover: false,
      maxClusterRadius: 40,
      disableClusteringAtZoom: 15,
      chunkedLoading: true,
      spiderfyDistanceMultiplier: 1.2,
    }).addTo(map)

    map.on('popupopen', (e) => {
      const node = e.popup.getElement()
      if (!node) return
      const detailsBtn = node.querySelector('[data-action="details"]')
      if (detailsBtn) {
        detailsBtn.onclick = () => {
          const dog = e.popup._sourceDog
          if (dog && onDogClickRef.current) onDogClickRef.current(dog)
          map.closePopup()
        }
      }
    })

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      map.remove()
      mapRef.current = null
      tileLayerRef.current = null
      markersLayerRef.current = null
      userMarkerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // One-shot silent auto-locate on first load, so the map opens centered on
  // the user instead of always defaulting to Bangkok. Only recenters if no
  // dogs are loaded yet to fit bounds to — once real dog markers exist, the
  // dogs-fit-bounds effect below is a better default view and shouldn't be
  // fought with a recenter.
  useEffect(() => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapRef.current
        if (!map) return
        const hasDogs = dogsRef.current.some(
          (d) => typeof d.lastLat === 'number' && typeof d.lastLng === 'number'
        )
        if (hasDogs) return
        map.setView([pos.coords.latitude, pos.coords.longitude], DEFAULT_ZOOM, { animate: false })
      },
      () => {}, // silent — this is a nicety, not a required permission
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    )
  }, [])

  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return
    const cfg = TILES[theme] || TILES.light
    mapRef.current.removeLayer(tileLayerRef.current)
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapRef.current)
  }, [theme])

  useEffect(() => {
    const map = mapRef.current
    const layer = markersLayerRef.current
    if (!map || !layer) return

    layer.clearLayers()

    const valid = dogs.filter(
      (d) => typeof d.lastLat === 'number' && typeof d.lastLng === 'number'
    )

    if (valid.length === 0) return

    const markers = valid.map((dog) => {
      const marker = L.marker([dog.lastLat, dog.lastLng], {
        icon: buildIcon(dog),
        title: dog.name || t.dogUnnamed,
        keyboard: true,
        riseOnHover: true,
      })
      const popup = L.popup({
        closeButton: true,
        autoClose: true,
        className: styles.leafletPopup,
        maxWidth: 220,
        minWidth: 180,
      }).setContent(buildPopupHtml(dog, lang, t))
      popup._sourceDog = dog
      marker.bindPopup(popup)
      marker.addTo(layer)
      return marker
    })

    // The map's container is sized by flexbox/dvh CSS that can still be
    // settling on first paint, so Leaflet's cached internal size can be
    // stale the first time this runs — fitBounds/setView silently compute
    // against that stale size and never actually move the view. Forcing a
    // resize check first keeps that cache honest.
    map.invalidateSize()

    if (valid.length === 1) {
      map.setView([valid[0].lastLat, valid[0].lastLng], SINGLE_DOG_ZOOM, { animate: false })
    } else {
      const group = L.featureGroup(markers)
      map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 14, animate: false })
    }
  }, [dogs, lang, t])

  const stopTracking = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    hasFirstFixRef.current = false
    if (userMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(userMarkerRef.current)
    }
    userMarkerRef.current = null
    setLocateState('idle')
  }, [])

  const handleLocate = useCallback(() => {
    if (locateState !== 'idle') {
      stopTracking()
      return
    }
    if (!('geolocation' in navigator)) {
      setLocateError('unsupported')
      return
    }
    if (!mapRef.current) return

    setLocateState('locating')
    setLocateError(null)
    hasFirstFixRef.current = false

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const map = mapRef.current
        if (!map) return
        const { latitude, longitude } = pos.coords
        const latlng = [latitude, longitude]

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(latlng)
        } else {
          userMarkerRef.current = L.marker(latlng, {
            icon: buildUserIcon(),
            keyboard: false,
            interactive: false,
            zIndexOffset: 1000,
          }).addTo(map)
        }

        if (!hasFirstFixRef.current) {
          hasFirstFixRef.current = true
          map.flyTo(latlng, USER_LOCATION_ZOOM, { duration: 1.2 })
          setLocateState('tracking')
        }
      },
      (err) => {
        if (watchIdRef.current != null) {
          navigator.geolocation.clearWatch(watchIdRef.current)
          watchIdRef.current = null
        }
        hasFirstFixRef.current = false
        if (userMarkerRef.current && mapRef.current) {
          mapRef.current.removeLayer(userMarkerRef.current)
        }
        userMarkerRef.current = null
        setLocateState('idle')
        setLocateError(err && err.code === 1 ? 'denied' : 'error')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )
  }, [locateState, stopTracking])

  const searchResults = searchDogs(dogs, searchQuery, { lang })

  function selectSearchResult(dog) {
    setSearchQuery('')
    if (typeof dog.lastLat === 'number' && typeof dog.lastLng === 'number' && mapRef.current) {
      mapRef.current.setView([dog.lastLat, dog.lastLng], SINGLE_DOG_ZOOM, { animate: false })
    }
    onDogClick?.(dog)
  }

  const locateLabelFor = (key) => {
    if (key === 'denied') return t.mapLocateDenied
    if (key === 'unsupported') return t.mapLocateUnsupported
    return t.mapLocateError
  }

  const locating = locateState === 'locating'
  const tracking = locateState === 'tracking'

  return (
    <div className={styles.mapWrap}>
      <div ref={containerRef} className={styles.mapContainer} aria-label="Map of reported stray dogs" />
      <div className={styles.searchBox}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder={t.mapSearchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery.trim() && (
          <ul className={styles.searchResults}>
            {searchResults.length === 0 && (
              <li className={styles.searchEmpty}>{t.mapSearchNoResults}</li>
            )}
            {searchResults.map((dog) => (
              <li key={dog.id}>
                <button
                  type="button"
                  className={styles.searchResultBtn}
                  onClick={() => selectSearchResult(dog)}
                >
                  {dog.latestPhotoUrl && (
                    <img src={dog.latestPhotoUrl} alt="" className={styles.searchResultThumb} />
                  )}
                  <span className={styles.searchResultName}>{dog.name || t.dogUnnamed}</span>
                  {dog.latestTags?.breedGuess && (
                    <span className={styles.searchResultBreed}>{localizedBreed(dog.latestTags.breedGuess, lang)}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        className={`${styles.locateBtn} ${locating ? styles.locateBtnLoading : ''} ${tracking ? styles.locateBtnActive : ''}`}
        onClick={handleLocate}
        aria-label={tracking ? t.mapLocateStop : t.mapLocate}
        title={tracking ? t.mapLocateStop : t.mapLocate}
        aria-pressed={tracking}
      >
        {locating ? '⏳' : '📍'}
      </button>
      {locateError && <div className={styles.errorNote}>{locateLabelFor(locateError)}</div>}
      {dogs.length === 0 && (
        <div className={styles.emptyNote}>{loading ? t.mapLoadingHint : t.mapEmptyHint}</div>
      )}
    </div>
  )
}
