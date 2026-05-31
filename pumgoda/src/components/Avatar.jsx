import { useState } from 'react'
import styles from './Avatar.module.css'

const PALETTE = [
  '#F4B6B6', '#F8D6A4', '#F5E6A1', '#C8E6B4', '#A8D8E0',
  '#A4C8E8', '#C2BCE8', '#E0B8DE', '#D4CEC0', '#BFD5C8',
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
        referrerPolicy="no-referrer"
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
