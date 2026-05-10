import { useState, useEffect } from 'react'
import { useLang } from '../contexts/LangContext'
import { tr } from '../lib/tr'
import { getFormula } from '../data/formulas'
import { getChapter } from '../data/story/chapters'
import ChapterIntro from '../components/story/ChapterIntro'
import Card from '../components/lesson/Card'
import FormulaAnatomy from '../components/lesson/FormulaAnatomy'
import Steps from '../components/lesson/Steps'
import Mistakes from '../components/lesson/Mistakes'
import Demo from '../components/practice/Demo'
import styles from './MissionScreen.module.css'

const STAGES = ['intro', 'lesson', 'practice', 'quiz']

export default function MissionScreen({ formulaId, onBack }) {
  const { lang, t } = useLang()
  const [stage, setStage] = useState('intro')
  const f = getFormula(formulaId)
  const chapter = getChapter(formulaId)

  // Reset stage if user switches formula
  useEffect(() => {
    setStage('intro')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [formulaId])

  if (!f) {
    return (
      <div className={styles.wrap}>
        <button className={styles.backBtn} onClick={onBack}>{t.backToTree}</button>
        <p style={{ padding: 20 }}>Formula not found.</p>
      </div>
    )
  }

  const stageIndex = STAGES.indexOf(stage)
  const advance = () => {
    const next = STAGES[stageIndex + 1]
    if (next) setStage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={styles.wrap}>
      <button className={styles.backBtn} onClick={onBack}>{t.backToTree}</button>

      {/* Stage progress */}
      <div className={styles.progress}>
        {STAGES.map((s, i) => (
          <div
            key={s}
            className={`${styles.pip} ${i <= stageIndex ? styles.pipActive : ''}`}
            style={{ '--accent': f.accent }}
          >
            <span className={styles.pipDot} />
            <span className={styles.pipLabel}>
              {s === 'intro' ? t.chapterLabel
                : s === 'lesson' ? t.stageLesson
                : s === 'practice' ? t.stagePractice
                : t.stageQuiz}
            </span>
          </div>
        ))}
      </div>

      {stage === 'intro' && (
        <ChapterIntro
          chapter={chapter}
          onStart={advance}
          onSkip={advance}
        />
      )}

      {(stage === 'lesson' || stage === 'practice' || stage === 'quiz') && (
        <>
          {/* Hero with formula tagline */}
          <div className={styles.hero} style={{ background: f.accent }}>
            <div className={styles.heroFn}>={f.label}()</div>
            <div className={styles.heroTagline}>{tr(f.tagline, lang)}</div>
            <div className={styles.heroIntro}>{tr(f.intro, lang)}</div>
          </div>

          {/* Use cases */}
          <div className={styles.usecases}>
            {f.usecases.map((u, i) => (
              <span
                key={i}
                className={styles.usecase}
                style={{
                  background: f.accentLight,
                  color: f.accent,
                }}
              >
                {tr(u, lang)}
              </span>
            ))}
          </div>
        </>
      )}

      {stage === 'lesson' && (
        <>
          <Card icon="🔬" title={t.secAnatomy}>
            <FormulaAnatomy parts={f.parts} />
          </Card>

          <Card icon="⚙️" title={t.secSteps}>
            <Steps steps={f.steps} accent={f.accent} />
          </Card>

          <Card icon="⚠️" title={t.secMistakes}>
            <Mistakes list={f.mistakes} />
          </Card>

          {f.bonus && (
            <div className={styles.bonus}>
              <div className={styles.bonusLabel}>
                ⭐ {t.secBonus} — {tr(f.bonus.label, lang)}
              </div>
              <code className={styles.bonusFormula}>{f.bonus.formula}</code>
              <div className={styles.bonusDesc}>{tr(f.bonus.desc, lang)}</div>
            </div>
          )}

          <button
            className={styles.advance}
            style={{ background: f.accent }}
            onClick={advance}
          >
            {t.gotIt} →
          </button>
        </>
      )}

      {stage === 'practice' && (
        <>
          <Card icon="🧪" title={t.secPractice}>
            <Demo id={f.id} />
          </Card>

          <button
            className={styles.advance}
            style={{ background: f.accent }}
            onClick={advance}
          >
            {t.donePlaying} →
          </button>
        </>
      )}

      {stage === 'quiz' && (
        <div className={styles.quizPlaceholder}>
          <div className={styles.quizIcon}>🎯</div>
          <div className={styles.quizTitle}>{t.stageQuiz}</div>
          <div className={styles.quizNote}>{t.quizComingSoon}</div>
          <button className={styles.advanceMuted} onClick={onBack}>
            {t.backToTree}
          </button>
        </div>
      )}
    </div>
  )
}
