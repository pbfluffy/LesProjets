import { useLang } from '../../contexts/LangContext'
import { tr } from '../../lib/tr'
import styles from './Mistakes.module.css'

export default function Mistakes({ list }) {
  const { lang, t } = useLang()
  return (
    <div className={styles.list}>
      {list.map((m, i) => (
        <div key={i} className={styles.card}>
          <div className={styles.row}>
            <div className={`${styles.cell} ${styles.wrong}`}>
              <div className={styles.cellLabel}>✗ {t.wrong}</div>
              <code className={styles.codeWrong}>{m.wrong}</code>
            </div>
            <div className={`${styles.cell} ${styles.right}`}>
              <div className={styles.cellLabel}>✓ {t.right}</div>
              <code className={styles.codeRight}>{m.right}</code>
            </div>
          </div>
          <div className={styles.why}>
            💡 {tr(m.why, lang)}
          </div>
        </div>
      ))}
    </div>
  )
}
