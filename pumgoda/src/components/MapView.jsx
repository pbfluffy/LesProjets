import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import styles from './MapView.module.css'
import { computeTier } from '../data/computeTier'

// Tile providers (CARTO — free for non-commercial, no API key)
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

// Default view if no places have coords (centered on Bangkok)
const BANGKOK = { lat: 13.7563, lng: 100.5018 }
const DEFAULT_ZOOM = 11
const SINGLE_PLACE_ZOOM = 15
const USER_LOCATION_ZOOM = 14

// Pumba mascot image (resolved against Vite's base URL)
const PUMBA_IMG = `${import.meta.env.BASE_URL}pumba.png`

// Color ramp for paw tiers — light → dark accent
const TIER_COLOR = {
  1: 'var(--accent-light)',
  2: '#f0a672',
  3: '#d97a30',
  4: 'var(--accent)',
}
const TIER_TEXT_COLOR = {
  1: 'var(--accent)',
  2: '#ffffff',
  3: '#ffffff',
  4: '#ffffff',
}

// Venue type → emoji. Keys are normalized: lowercase, non-letters → underscore.
const TYPE_ICON = {
  cafe: '☕',
  restaurant: '🍴',
  hotel: '🏨',
  park: '🌳',
  mall: '🏬',
  beach: '🏖️',
  vet: '🏥',
  pet_shop: '🛒',
  grooming: '✂️',
}

function normalizeType(type) {
  if (!type) return ''
  return String(type).toLowerCase().replace(/é/g, 'e').replace(/[-\s]/g, '_')
}
function getTypeIcon(type) {
  return TYPE_ICON[normalizeType(type)] || '📍'
}

// Tier names per language (for popup)
const TIER_NAME = {
  en: { 1: 'Pet-allowed', 2: 'Pet-friendly', 3: 'Welcoming', 4: 'Pet paradise' },
  th: { 1: 'รับสัตว์เลี้ยง', 2: 'เป็นมิตรกับสัตว์', 3: 'ต้อนรับสัตว์เลี้ยง', 4: 'สวรรค์ของสัตว์เลี้ยง' },
}

// Popup labels per language
const POPUP_LABELS = {
  en: { details: 'See details', maps: 'Open in Maps', pumbaWasHere: 'Pumba was here' },
  th: { details: 'ดูรายละเอียด', maps: 'เปิดในแผนที่', pumbaWasHere: 'พุมบ้ามาที่นี่' },
}

// Locate-me labels
const LOCATE_LABELS = {
  en: {
    button: 'Find my location',
    denied: 'Location permission denied',
    error: "Couldn't find your location",
    unsupported: 'Geolocation not supported',
  },
  th: {
    button: 'ค้นหาตำแหน่งของฉัน',
    denied: 'ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง',
    error: 'ค้นหาตำแหน่งไม่สำเร็จ',
    unsupported: 'อุปกรณ์ไม่รองรับ',
  },
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  )
}

/**
 * Marker badge — emoji on a tier-colored background. Verified gets an accent ring.
 */
function buildMarkerHtml(place) {
  const tier = Math.max(1, Math.min(4, computeTier(place).paws || 1))
  const bg = TIER_COLOR[tier]
  const fg = TIER_TEXT_COLOR[tier]
  const verified = !!place.pumba?.verified
  const icon = getTypeIcon(place.type)
  return `
    <div class="${styles.markerWrap} ${verified ? styles.markerVerified : ''}">
      <div class="${styles.markerBadge}" style="background:${bg};color:${fg};">
        <span class="${styles.markerIcon}">${icon}</span>
      </div>
    </div>
  `
}

function buildIcon(place) {
  return L.divIcon({
    html: buildMarkerHtml(place),
    className: styles.markerLeaflet,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

/**
 * Popup card — name, tier, verified line, two action buttons.
 */
function buildPopupHtml(place, lang) {
  const tier = Math.max(1, Math.min(4, computeTier(place).paws || 1))
  const verified = !!place.pumba?.verified
  const tierName = (TIER_NAME[lang] && TIER_NAME[lang][tier]) || TIER_NAME.en[tier]
  const labels = POPUP_LABELS[lang] || POPUP_LABELS.en
  const name = place.name?.[lang] || place.name?.en || place.id || '?'
  const paws = '🐾'.repeat(tier)
  const typeIcon = getTypeIcon(place.type)
  const mapsUrl =
    place.googleMapsUrl ||
    (Array.isArray(place.coords)
      ? `https://www.google.com/maps?q=${place.coords[0]},${place.coords[1]}`
      : null)
  return `
    <div class="${styles.popupCard}">
      <div class="${styles.popupTitle}">${typeIcon} ${escapeHtml(name)}</div>
      <div class="${styles.popupTier}">${paws} ${escapeHtml(tierName)}</div>
      ${verified ? `<div class="${styles.popupVerified}"><img class="${styles.popupVerifiedImg}" src="${PUMBA_IMG}" alt="" /> ${escapeHtml(labels.pumbaWasHere)}</div>` : ''}
      <div class="${styles.popupActions}">
        <button class="${styles.popupBtn}" data-action="details" type="button">${escapeHtml(labels.details)}</button>
        ${mapsUrl ? `<a class="${styles.popupBtn} ${styles.popupBtnSecondary}" data-action="maps" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(labels.maps)}</a>` : ''}
      </div>
    </div>
  `
}

/**
 * User-location marker — pulsing blue dot.
 */
function buildUserIcon() {
  return L.divIcon({
    html: `<div class="${styles.userDot}"><div class="${styles.userDotInner}"></div></div>`,
    className: styles.userIconLeaflet,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export default function MapView({ places = [], onPlaceClick, theme = 'light', lang = 'en' }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const tileLayerRef = useRef(null)
  const markersLayerRef = useRef(null)
  const userMarkerRef = useRef(null)
  const onPlaceClickRef = useRef(onPlaceClick)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState(null)

  // Keep the latest onPlaceClick in a ref so the popup handler always sees the current value
  useEffect(() => {
    onPlaceClickRef.current = onPlaceClick
  }, [onPlaceClick])

  // Initialise map once
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

    markersLayerRef.current = L.layerGroup().addTo(map)

    // Wire popup action buttons via delegation
    map.on('popupopen', (e) => {
      const node = e.popup.getElement()
      if (!node) return
      const detailsBtn = node.querySelector('[data-action="details"]')
      if (detailsBtn) {
        detailsBtn.onclick = () => {
          const place = e.popup._sourcePlace
          if (place && onPlaceClickRef.current) onPlaceClickRef.current(place)
          map.closePopup()
        }
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
      tileLayerRef.current = null
      markersLayerRef.current = null
      userMarkerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Swap tile layer on theme change
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

  // Render markers when places or lang change
  useEffect(() => {
    const map = mapRef.current
    const layer = markersLayerRef.current
    if (!map || !layer) return

    layer.clearLayers()

    const valid = places.filter(
      (p) => Array.isArray(p.coords) && typeof p.coords[0] === 'number' && typeof p.coords[1] === 'number'
    )

    if (valid.length === 0) {
      map.setView([BANGKOK.lat, BANGKOK.lng], DEFAULT_ZOOM)
      return
    }

    const markers = valid.map((place) => {
      const marker = L.marker(place.coords, {
        icon: buildIcon(place),
        title: place.name?.[lang] || place.name?.en || place.id,
        keyboard: true,
        riseOnHover: true,
      })
      const popup = L.popup({
        closeButton: true,
        autoClose: true,
        className: styles.leafletPopup,
        maxWidth: 260,
        minWidth: 200,
      }).setContent(buildPopupHtml(place, lang))
      popup._sourcePlace = place
      marker.bindPopup(popup)
      marker.addTo(layer)
      return marker
    })

    if (valid.length === 1) {
      map.setView(valid[0].coords, SINGLE_PLACE_ZOOM)
    } else {
      const group = L.featureGroup(markers)
      map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 14 })
    }
  }, [places, lang])

  // Locate me handler
  const handleLocate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocateError('unsupported')
      return
    }
    if (!mapRef.current) return
    setLocating(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const map = mapRef.current
        if (!map) return
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([latitude, longitude])
        } else {
          userMarkerRef.current = L.marker([latitude, longitude], {
            icon: buildUserIcon(),
            keyboard: false,
            interactive: false,
            zIndexOffset: 1000,
          }).addTo(map)
        }
        map.flyTo([latitude, longitude], USER_LOCATION_ZOOM, { duration: 1.2 })
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        setLocateError(err && err.code === 1 ? 'denied' : 'error')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  const skipped = places.filter(
    (p) => !Array.isArray(p.coords) || typeof p.coords[0] !== 'number' || typeof p.coords[1] !== 'number'
  ).length

  const locateLabels = LOCATE_LABELS[lang] || LOCATE_LABELS.en
  const errorText = locateError ? locateLabels[locateError] || locateLabels.error : null

  return (
    <div className={styles.mapWrap}>
      <div ref={containerRef} className={styles.mapContainer} aria-label="Map of pet-friendly places" />
      <button
        type="button"
        className={`${styles.locateBtn} ${locating ? styles.locateBtnLoading : ''}`}
        onClick={handleLocate}
        aria-label={locateLabels.button}
        title={locateLabels.button}
        disabled={locating}
      >
        {locating ? '⏳' : '📍'}
      </button>
      {errorText && <div className={styles.errorNote}>{errorText}</div>}
      {skipped > 0 && (
        <div className={styles.skippedNote}>
          {lang === 'th'
            ? `${skipped} สถานที่ไม่มีพิกัด ไม่แสดงบนแผนที่`
            : `${skipped} place${skipped > 1 ? 's' : ''} without coordinates not shown`}
        </div>
      )}
    </div>
  )
}
