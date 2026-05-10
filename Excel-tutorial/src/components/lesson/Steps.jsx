import { useState } from 'react'
import { useLang } from '../../contexts/LangContext'
import { tr } from '../../lib/tr'
import styles from './Steps.module.css'

export default function Steps({ steps, accent }) {
  const { lang, t } = useLang()
  const [cur, setCur] = useState(0)
  const current = steps[cur]

  return (
    <div>
      <div className={styles.dots}>
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setCur(i)}
            className={styles.dot}
            style={{
              background:
                i === cur ? accent : i < cur ? `${accent}40` : 'var(--surface-alt)',
              color: i === cur ? '#fff' : i < cur ? accent : 'var(--text-faint)',
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div
        className={styles.panel}
        style={{ background: `${accent}08`, borderColor: `${accent}25` }}
      >
        <div className={styles.label}>
          {t.stepLabel} {current.n}
        </div>
        <div className={styles.text}>{tr(current.text, lang)}</div>
      </div>

      <div className={styles.nav}>
        <button
          className={styles.navBtn}
          onClick={() => setCur(c => Math.max(0, c - 1))}
          disabled={cur === 0}
        >
          {t.prev}
        </button>
        <button
          className={styles.navBtn}
          onClick={() => setCur(c => Math.min(steps.length - 1, c + 1))}
          disabled={cur === steps.length - 1}
        >
          {t.next}
        </button>
      </div>
    </div>
  )
}
