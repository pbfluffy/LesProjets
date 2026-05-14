import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import styles from './MapView.module.css'

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

// Color ramp for paw tiers — light → dark accent
const TIER_COLOR = {
  1: 'var(--accent-light)',
  2: '#f0a672',
  3: '#d97a30',
  4: 'var(--accent)',
}

// Text contrast against tier background
const TIER_TEXT_COLOR = {
  1: 'var(--accent)',
  2: '#ffffff',
  3: '#ffffff',
  4: '#ffffff',
}

/**
 * Builds the HTML for a single marker.
 * Small rounded badge with paw count; "Pumba was here" gets an outer ring.
 */
function buildMarkerHtml(place) {
  const tier = Math.max(1, Math.min(4, place.tier || 1))
  const bg = TIER_COLOR[tier]
  const fg = TIER_TEXT_COLOR[tier]
  const verified = !!place.pumbaWasHere
  return `
    <div class="${styles.markerWrap} ${verified ? styles.markerVerified : ''}">
      <div class="${styles.markerBadge}" style="background:${bg};color:${fg};">
        <span class="${styles.markerPaw}">🐾</span>
        <span class="${styles.markerNum}">${tier}</span>
      </div>
    </div>
  `
}

function buildIcon(place) {
  return L.divIcon({
    html: buildMarkerHtml(place),
    className: styles.markerIcon, // empty class, prevents Leaflet's default styling
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

export default function MapView({ places = [], onPlaceClick, theme = 'light', lang = 'en' }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const tileLayerRef = useRef(null)
  const markersLayerRef = useRef(null)

  // Initialise map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    const map = L.map(containerRef.current, {
      center: [BANGKOK.lat, BANGKOK.lng],
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
      // Touch-friendly, but keep wheel zoom for desktop
      scrollWheelZoom: true,
    })
    mapRef.current = map

    // Tile layer (initial theme)
    const cfg = TILES[theme] || TILES.light
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    // Markers layer group
    markersLayerRef.current = L.layerGroup().addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
      tileLayerRef.current = null
      markersLayerRef.current = null
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

  // Render markers when places change
  useEffect(() => {
    const map = mapRef.current
    const layer = markersLayerRef.current
    if (!map || !layer) return

    layer.clearLayers()

    const valid = places.filter(
      (p) => typeof p.lat === 'number' && typeof p.lng === 'number',
    )

    if (valid.length === 0) {
      map.setView([BANGKOK.lat, BANGKOK.lng], DEFAULT_ZOOM)
      return
    }

    const markers = valid.map((place) => {
      const marker = L.marker([place.lat, place.lng], {
        icon: buildIcon(place),
        title: place.name?.[lang] || place.name?.en || place.id,
        keyboard: true,
        riseOnHover: true,
      })
      marker.on('click', () => onPlaceClick?.(place))
      marker.addTo(layer)
      return marker
    })

    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], SINGLE_PLACE_ZOOM)
    } else {
      const group = L.featureGroup(markers)
      map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 14 })
    }
  }, [places, lang, onPlaceClick])

  const skipped = places.filter(
    (p) => typeof p.lat !== 'number' || typeof p.lng !== 'number',
  ).length

  return (
    <div className={styles.mapWrap}>
      <div ref={containerRef} className={styles.mapContainer} aria-label="Map of pet-friendly places" />
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
