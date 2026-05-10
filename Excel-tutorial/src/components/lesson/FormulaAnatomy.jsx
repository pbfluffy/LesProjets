import { useState } from 'react'
import { useLang } from '../../contexts/LangContext'
import { tr } from '../../lib/tr'
import styles from './FormulaAnatomy.module.css'

export default function FormulaAnatomy({ parts }) {
  const { lang, t } = useLang()
  const [active, setActive] = useState(null)

  const argParts = parts.filter(p => p.type === 'arg')

  return (
    <div>
      <div className={styles.row}>
        {parts.map((p, i) => {
          if (p.type === 'bracket' || p.type === 'sep') {
            return (
              <span key={i} className={styles.punct}>
                {p.text}
              </span>
            )
          }
          const isActive = active?.text === p.text
          return (
            <div key={i} className={styles.partCol}>
              {p.argLabel && (
                <span
                  className={styles.argLabel}
                  style={{ color: isActive ? p.color : 'var(--text-faint)' }}
                >
                  {tr(p.argLabel, lang)}
                </span>
              )}
              <button
                onClick={() => setActive(isActive ? null : p)}
                className={`${styles.partBtn} ${p.type === 'fn' ? styles.partFn : ''}`}
                style={{
                  '--accent': p.color,
                  background: isActive ? p.color : `${p.color}15`,
                  color: isActive ? '#fff' : p.color,
                  borderColor: isActive ? p.color : `${p.color}50`,
                }}
              >
                {p.text}
              </button>
            </div>
          )
        })}
      </div>

      <div className={styles.detailWrap}>
        {active ? (
          <div
            className={styles.detail}
            style={{
              background: `${active.color}0c`,
              borderColor: `${active.color}40`,
              borderLeftColor: active.color,
            }}
          >
            <div className={styles.detailLabel} style={{ color: active.color }}>
              [{active.argLabel ? tr(active.argLabel, lang) : 'FUNCTION'}] — {tr(active.title, lang)}
            </div>
            <div className={styles.detailBody}>{tr(active.desc, lang)}</div>
          </div>
        ) : (
          <div className={styles.detailHint}>{t.tapHint}</div>
        )}
      </div>

      {argParts.length > 0 && (
        <div className={styles.legend}>
          {argParts.map((p, i) => {
            const isActive = active?.text === p.text
            return (
              <button
                key={i}
                onClick={() => setActive(isActive ? null : p)}
                className={styles.chip}
                style={{
                  background: isActive ? `${p.color}15` : 'var(--surface-alt)',
                  borderColor: isActive ? p.color : 'var(--border)',
                  color: isActive ? p.color : 'var(--text-muted)',
                }}
              >
                <span className={styles.dot} style={{ background: p.color }} />
                {tr(p.argLabel, lang)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
