import { useLang } from '../../contexts/LangContext'
import { tr } from '../../lib/tr'
import { CHARACTERS } from '../../data/story/characters'
import Avatar from './Avatar'
import styles from './CharacterDialog.module.css'

export default function CharacterDialog({ speaker, text }) {
  const { lang } = useLang()
  const c = CHARACTERS[speaker]
  if (!c) return null
  return (
    <div className={styles.row}>
      <Avatar id={speaker} size={44} />
      <div className={styles.bubble}>
        <div className={styles.name}>{tr(c.name, lang)}</div>
        <div className={styles.text}>{tr(text, lang)}</div>
      </div>
    </div>
  )
}
