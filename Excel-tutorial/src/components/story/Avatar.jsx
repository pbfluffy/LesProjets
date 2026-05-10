import { CHARACTERS } from '../../data/story/characters'
import styles from './Avatar.module.css'

export default function Avatar({ id, size = 48 }) {
  const c = CHARACTERS[id]
  if (!c) return null
  return (
    <div
      className={styles.avatar}
      style={{
        background: c.bg,
        color: c.fg,
        width: size,
        height: size,
        fontSize: size * 0.55,
      }}
      aria-hidden="true"
    >
      <span>{c.emoji}</span>
    </div>
  )
}
