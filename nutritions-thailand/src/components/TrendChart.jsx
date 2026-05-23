import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useLang } from '../LangContext'
import styles from './TrendChart.module.css'

const RANGES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
]

export default function TrendChart({ weights }) {
  const { t, lang } = useLang()
  const [range, setRange] = useState(7)

  // Build chart data from weights entries
  const data = useMemo(() => {
    if (!weights || typeof weights !== 'object') return []
    
    const today = new Date()
    const cutoffMs = today.getTime() - (range * 24 * 60 * 60 * 1000)
    
    // Collect all date-keyed entries within range, sort by date
    const entries = Object.entries(weights)
      .filter(([date]) => {
        const d = new Date(date)
        return d.getTime() >= cutoffMs
      })
      .map(([date, entry]) => ({
        date,
        weight: entry.weight ?? null,
        bodyFat: entry.bodyFat ?? null,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
    
    return entries
  }, [weights, range])

  if (data.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <div className={styles.title}>📊 Weight Trend</div>
          <div className={styles.rangeRow}>
            {RANGES.map(r => (
              <button
                key={r.days}
                className={styles.rangeBtn}
                onClick={() => setRange(r.days)}
                style={{
                  background: range === r.days ? 'var(--accent)' : 'var(--bg3)',
                  color: range === r.days ? '#fff' : 'var(--muted)',
                  borderColor: range === r.days ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
          No weight entries yet — log weights from the Adjust tab
        </div>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <div className={styles.title}>📊 Weight Trend</div>
        <div className={styles.rangeRow}>
          {RANGES.map(r => (
            <button
              key={r.days}
              className={styles.rangeBtn}
              onClick={() => setRange(r.days)}
              style={{
                background: range === r.days ? 'var(--accent)' : 'var(--bg3)',
                color: range === r.days ? '#fff' : 'var(--muted)',
                borderColor: range === r.days ? 'var(--accent)' : 'var(--border)',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--muted)' }}
            stroke="var(--border)"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: 'var(--muted)' }}
            stroke="var(--border)"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: 'var(--muted)' }}
            stroke="var(--border)"
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px',
            }}
            labelStyle={{ color: 'var(--text)' }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="weight"
            stroke="var(--accent)"
            dot={{ r: 3 }}
            isAnimationActive={false}
            name="Weight (kg)"
          />
          {data.some(d => d.bodyFat != null) && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="bodyFat"
              stroke="#9f7aea"
              dot={{ r: 2 }}
              isAnimationActive={false}
              name="Body Fat (%)"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
