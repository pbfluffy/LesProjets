import { useLang } from '../contexts/LangContext'
import SkillTree from '../components/tree/SkillTree'
import styles from './HomeScreen.module.css'

export default function HomeScreen({ onSelect }) {
  const { t } = useLang()
  return (
    <div className={styles.wrap}>
      <div className={styles.welcome}>
        <div className={styles.welcomeBadge}>☕</div>
        <div className={styles.welcomeBody}>
          <div className={styles.welcomeTitle}>{t.welcomeFirst}</div>
          <div className={styles.welcomeNote}>{t.phase1Note}</div>
        </div>
      </div>

      <SkillTree onSelect={onSelect} />
    </div>
  )
}
