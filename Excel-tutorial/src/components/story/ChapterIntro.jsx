import { useLang } from '../../contexts/LangContext'
import { tr } from '../../lib/tr'
import CharacterDialog from './CharacterDialog'
import styles from './ChapterIntro.module.css'

export default function ChapterIntro({ chapter, onStart, onSkip }) {
  const { lang, t } = useLang()
  if (!chapter) return null
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>
          {t.chapterLabel} {chapter.n}
        </span>
        <h1 className={styles.title}>{tr(chapter.title, lang)}</h1>
        <p className={styles.location}>· {tr(chapter.location, lang)} ·</p>
      </div>

      <div className={styles.lines}>
        {chapter.lines.map((line, i) => (
          <div key={i} style={{ animationDelay: `${i * 0.15}s` }} className={styles.line}>
            <CharacterDialog speaker={line.speaker} text={line.text} />
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button className={styles.skip} onClick={onSkip}>
          {t.skipStory}
        </button>
        <button className={styles.start} onClick={onStart}>
          {t.chapterStart} →
        </button>
      </div>
    </div>
  )
}
