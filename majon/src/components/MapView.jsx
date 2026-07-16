import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster'
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

function buildMarkerHtml(dog) {
  const photo = dog.latestPhotoUrl
  return `
    <div class="${styles.markerWrap}">
      <div class="${styles.markerBadge}">
        ${photo
          ? `<img class="${styles.markerImg}" src="${escapeHtml(photo)}" alt="" />`
          : `<span class="${styles.markerIcon}">🐕</span>`}
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
      <div class="${styles.popupTitle}">🐾 ${escapeHtml(name)}</div>
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

export default function MapView({ dogs = [], onDogClick, theme = 'light', lang = 'en', t }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const tileLayerRef = useRef(null)
  const markersLayerRef = useRef(null)
  const userMarkerRef = useRef(null)
  const onDogClickRef = useRef(onDogClick)
  const watchIdRef = useRef(null)
  const hasFirstFixRef = useRef(false)
  const [locateState, setLocateState] = useState('idle') // idle | locating | tracking
  const [locateError, setLocateError] = useState(null)

  useEffect(() => {
    onDogClickRef.current = onDogClick
  }, [onDogClick])

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

    const cfg = TILES[theme] || TILES.light
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    markersLayerRef.current = L.markerClusterGroup({
      iconCreateFunction: buildClusterIcon,
      showCoverageOnHover: false,
      maxClusterRadius: 60,
      disableClusteringAtZoom: 16,
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

    if (valid.length === 1) {
      map.setView([valid[0].lastLat, valid[0].lastLng], SINGLE_DOG_ZOOM)
    } else {
      const group = L.featureGroup(markers)
      map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 14 })
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
      {dogs.length === 0 && <div className={styles.emptyNote}>{t.mapEmptyHint}</div>}
    </div>
  )
}
