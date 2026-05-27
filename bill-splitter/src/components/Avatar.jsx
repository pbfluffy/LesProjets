import { useState } from 'react'
import styles from './Avatar.module.css'

// 10-color soft pastel palette for hash-based backgrounds.
// Picked for AA contrast against dark text (#1a1916) on both themes.
const PALETTE = [
  '#F4B6B6', // soft red
  '#F8D6A4', // soft orange
  '#F5E6A1', // soft yellow
  '#C8E6B4', // soft green
  '#A8D8E0', // soft teal
  '#A4C8E8', // soft blue
  '#C2BCE8', // soft purple
  '#E0B8DE', // soft pink
  '#D4CEC0', // soft beige
  '#BFD5C8', // soft sage
]

function hashColor(name) {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return PALETTE[sum % PALETTE.length]
}

function isEmoji(s) {
  return /\p{Extended_Pictographic}/u.test(s)
}

function initialsOf(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return '?'
  if (isEmoji(trimmed)) return Array.from(trimmed)[0]
  const parts = trimmed.split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }
  const ch = Array.from(trimmed)[0]
  return /[a-zA-Z]/.test(ch) ? ch.toUpperCase() : ch
}

export default function Avatar({ name, photoURL, size = 32 }) {
  const [imgError, setImgError] = useState(false)
  const initials = initialsOf(name)
  const bg = hashColor(name || '?')
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) }

  if (photoURL && !imgError) {
    return (
      <img
        className={styles.avatar}
        style={style}
        src={photoURL}
        alt={name || ''}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div className={styles.avatar} style={{ ...style, background: bg }}>
      {initials}
    </div>
  )
}
