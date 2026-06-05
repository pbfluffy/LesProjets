import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useLang } from '../LangContext'
import styles from './TrendChart.module.css'

const RANGES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
]

function tabStyle(active) {
  return {
    background: active ? 'var(--accent)' : 'var(--bg3)',
    color: active ? '#fff' : 'var(--muted)',
    borderColor: active ? 'var(--accent)' : 'var(--border)',
  }
}

export default function TrendChart({ weights, days, calorieTarget, proteinTarget }) {
  const { t, lang } = useLang()
  const [range, setRange] = useState(7)
  const [mode, setMode] = useState('body') // 'body' | 'intake'

  const cutoffMs = useMemo(() => Date.now() - range * 24 * 60 * 60 * 1000, [range])

  // Body data — weight + body fat, from the weights map (Feature #17/#70).
  const bodyData = useMemo(() => {
    if (!weights || typeof weights !== 'object') return []
    return Object.entries(weights)
      .filter(([date]) => new Date(date).getTime() >= cutoffMs)
      .map(([date, entry]) => ({ date, weight: entry.weight ?? null, bodyFat: entry.bodyFat ?? null }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [weights, cutoffMs])

  // Intake data — per-day kcal + protein totals summed from each day's log (#102).
  const intakeData = useMemo(() => {
    if (!days || typeof days !== 'object') return []
    return Object.entries(days)
      .filter(([date]) => new Date(date).getTime() >= cutoffMs)
      .map(([date, day]) => {
        const log = Array.isArray(day?.log) ? day.log : []
        const kcal = log.reduce((a, x) => a + (x.kcal || 0), 0)
        const protein = log.reduce((a, x) => a + (x.protein || 0), 0)
        return { date, kcal: Math.round(kcal), protein: Math.round(protein) }
      })
      .filter((d) => d.kcal > 0 || d.protein > 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [days, cutoffMs])

  const isIntake = mode === 'intake'
  const data = isIntake ? intakeData : bodyData
  const title = isIntake ? t('trend.intakeTitle') : t('trend.weightTitle')
  const emptyMsg = isIntake ? t('trend.emptyIntake') : t('trend.emptyWeight')

  const header = (
    <div className={styles.headerRow}>
      <div className={styles.title}>{title}</div>
      <div className={styles.rangeRow}>
        <button className={styles.rangeBtn} onClick={() => setMode('body')} style={tabStyle(!isIntake)}>{t('trend.body')}</button>
        <button className={styles.rangeBtn} onClick={() => setMode('intake')} style={tabStyle(isIntake)}>{t('trend.intake')}</button>
        <span style={{ display: 'inline-block', width: 6 }} />
        {RANGES.map((r) => (
          <button key={r.days} className={styles.rangeBtn} onClick={() => setRange(r.days)} style={tabStyle(range === r.days)}>
            {r.label}
          </button>
        ))}
      </div>
    </div>
  )

  if (data.length === 0) {
    return (
      <div className={styles.card}>
        {header}
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
          {emptyMsg}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      {header}
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} stroke="var(--border)" />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--muted)' }} stroke="var(--border)" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--muted)' }} stroke="var(--border)" domain={isIntake ? [0, 'auto'] : [0, 100]} />
          <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px' }} labelStyle={{ color: 'var(--text)' }} />
          {isIntake ? (
            <>
              {Number.isFinite(calorieTarget) && (
                <ReferenceLine yAxisId="left" y={calorieTarget} stroke="var(--accent)" strokeDasharray="4 4" strokeOpacity={0.5} />
              )}
              {Number.isFinite(proteinTarget) && (
                <ReferenceLine yAxisId="right" y={proteinTarget} stroke="#9f7aea" strokeDasharray="4 4" strokeOpacity={0.5} />
              )}
              <Line yAxisId="left" type="monotone" dataKey="kcal" stroke="var(--accent)" dot={{ r: 3 }} isAnimationActive={false} name={t('trend.sCalories')} />
              <Line yAxisId="right" type="monotone" dataKey="protein" stroke="#9f7aea" dot={{ r: 2 }} isAnimationActive={false} name={t('trend.sProtein')} />
            </>
          ) : (
            <>
              <Line yAxisId="left" type="monotone" dataKey="weight" stroke="var(--accent)" dot={{ r: 3 }} isAnimationActive={false} name={t('trend.sWeight')} />
              {data.some((d) => d.bodyFat != null) && (
                <Line yAxisId="right" type="monotone" dataKey="bodyFat" stroke="#9f7aea" dot={{ r: 2 }} isAnimationActive={false} name={t('trend.sBodyFat')} />
              )}
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
