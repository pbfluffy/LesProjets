import { useState } from 'react'
import { useLang } from '../LangContext.jsx'
import { convert } from '../fx.js'
import { formatPrice } from '../format.js'
import { computeHoldingPL, computeInstallmentSchedule } from '../wallet.js'
import styles from './HoldingCard.module.css'

function interp(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function HoldingCard({
  symbol, holding, currentPrice, currentCurrency, displayCurrency, rates,
  plans, dividends,
  onEdit, onRemove,
  onAddPlan, onMarkPlanDone, onRemovePlan,
  onAddDividend, onRemoveDividend,
}) {
  const { s, lang } = useLang()
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [showDivForm, setShowDivForm] = useState(false)

  const convertedAvgCost = convert(holding.avgCost, holding.costCurrency, displayCurrency, rates)
  const convertedCurrent = typeof currentPrice === 'number' ? convert(currentPrice, currentCurrency, displayCurrency, rates) : null
  const fxOk = convertedAvgCost !== null && convertedCurrent !== null
  const pl = fxOk ? computeHoldingPL({ qty: holding.qty, avgCost: convertedAvgCost, currentPrice: convertedCurrent }) : null

  const symbolPlans = plans.filter((p) => p.symbol === symbol)
  const symbolDividends = dividends.filter((d) => d.symbol === symbol)
  const dividendTotal = symbolDividends.reduce((sum, d) => sum + (convert(d.amount, d.currency, displayCurrency, rates) ?? 0), 0)

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div className={styles.titleBlock}>
          <div className={styles.symbol}>{symbol}</div>
          <div className={styles.qtyLine}>{holding.qty} @ {formatPrice(holding.avgCost, holding.costCurrency)}</div>
        </div>
        <div className={styles.headRight}>
          {pl && (
            <div className={styles.plBlock} data-direction={pl.pl >= 0 ? 'up' : 'down'}>
              <div className={styles.plValue}>{pl.pl >= 0 ? '+' : ''}{formatPrice(pl.pl, displayCurrency)}</div>
              {pl.plPercent !== null && (
                <div className={styles.plPercent}>{pl.pl >= 0 ? '+' : ''}{pl.plPercent.toFixed(2)}%</div>
              )}
            </div>
          )}
          <button className={styles.iconBtn} onClick={() => onEdit(symbol)} aria-label={s.saveHoldingBtn} title={s.saveHoldingBtn}>✎</button>
          <button className={styles.iconBtn} onClick={() => onRemove(symbol)} aria-label={s.removeHoldingLabel} title={s.removeHoldingLabel}>✕</button>
        </div>
      </div>

      {fxOk ? (
        <div className={styles.statsRow}>
          <div className={styles.stat}><span>{s.currentPriceLabel}</span><strong>{formatPrice(convertedCurrent, displayCurrency)}</strong></div>
          <div className={styles.stat}><span>{s.summaryCostBasis}</span><strong>{formatPrice(pl.costBasis, displayCurrency)}</strong></div>
          <div className={styles.stat}><span>{s.summaryMarketValue}</span><strong>{formatPrice(pl.marketValue, displayCurrency)}</strong></div>
        </div>
      ) : (
        <div className={styles.fxNote}>{s.fxUnavailable}</div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <span>{s.planSectionTitle}</span>
          <button className={styles.sectionAddBtn} onClick={() => setShowPlanForm((v) => !v)}>{s.addPlanBtn}</button>
        </div>
        {showPlanForm && (
          <PlanForm
            s={s}
            onSave={(plan) => { onAddPlan(symbol, plan); setShowPlanForm(false) }}
            onCancel={() => setShowPlanForm(false)}
          />
        )}
        {symbolPlans.length === 0 && !showPlanForm && <div className={styles.emptyNote}>{s.noPlans}</div>}
        {symbolPlans.map((plan) => (
          <PlanRow
            key={plan.id}
            plan={plan}
            s={s}
            onMarkDone={() => onMarkPlanDone(plan.id)}
            onRemove={() => onRemovePlan(plan.id)}
          />
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <span>{s.dividendSectionTitle}{symbolDividends.length > 0 && ` · ${formatPrice(dividendTotal, displayCurrency)}`}</span>
          <button className={styles.sectionAddBtn} onClick={() => setShowDivForm((v) => !v)}>{s.addDividendBtn}</button>
        </div>
        {showDivForm && (
          <DividendForm
            s={s}
            onSave={(div) => { onAddDividend(symbol, div); setShowDivForm(false) }}
            onCancel={() => setShowDivForm(false)}
          />
        )}
        {symbolDividends.length === 0 && !showDivForm && <div className={styles.emptyNote}>{s.noDividends}</div>}
        {symbolDividends.slice().sort((a, b) => b.date.localeCompare(a.date)).map((div) => (
          <div key={div.id} className={styles.dividendRow}>
            <span className={styles.dividendDate}>{div.date}</span>
            <span className={styles.dividendAmount}>{formatPrice(div.amount, div.currency)}</span>
            <button className={styles.iconBtn} onClick={() => onRemoveDividend(div.id)} aria-label={s.removeDividendLabel} title={s.removeDividendLabel}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlanForm({ s, onSave, onCancel }) {
  const [totalAmount, setTotalAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [cadence, setCadence] = useState('monthly')
  const [periods, setPeriods] = useState('')
  const [startDate, setStartDate] = useState(todayISO)

  function submit(e) {
    e.preventDefault()
    const amountNum = parseFloat(totalAmount)
    const periodsNum = parseInt(periods, 10)
    if (!Number.isFinite(amountNum) || amountNum <= 0) return
    if (!Number.isInteger(periodsNum) || periodsNum <= 0) return
    onSave({
      id: crypto.randomUUID(),
      totalAmount: amountNum,
      currency,
      cadence,
      periods: periodsNum,
      startDate,
      completed: 0,
    })
  }

  return (
    <form className={styles.formPanel} onSubmit={submit}>
      <div className={styles.formFields}>
        <label className={styles.field}>
          <span>{s.planTotalAmountLabel}</span>
          <input type="number" min="0" step="any" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} required autoFocus />
        </label>
        <label className={styles.field}>
          <span>{s.costCurrencyLabel}</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="USD">USD</option>
            <option value="THB">THB</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>{s.planCadenceLabel}</span>
          <select value={cadence} onChange={(e) => setCadence(e.target.value)}>
            <option value="monthly">{s.cadenceMonthly}</option>
            <option value="quarterly">{s.cadenceQuarterly}</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>{s.planPeriodsLabel}</span>
          <input type="number" min="1" step="1" value={periods} onChange={(e) => setPeriods(e.target.value)} required />
        </label>
        <label className={styles.field}>
          <span>{s.planStartDateLabel}</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </label>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.secondaryBtn} onClick={onCancel}>{s.cancelBtn}</button>
        <button type="submit" className={styles.saveBtn}>{s.savePlanBtn}</button>
      </div>
    </form>
  )
}

function PlanRow({ plan, s, onMarkDone, onRemove }) {
  const schedule = computeInstallmentSchedule(plan)
  const allDone = plan.completed >= plan.periods

  return (
    <div className={styles.planRow}>
      <div className={styles.planRowHead}>
        <span>{formatPrice(plan.totalAmount, plan.currency)} · {plan.cadence === 'monthly' ? s.cadenceMonthly : s.cadenceQuarterly}</span>
        <span className={styles.planProgress}>{interp(s.planCompletedCount, { done: plan.completed, total: plan.periods })}</span>
        <button className={styles.iconBtn} onClick={onRemove} aria-label={s.removePlanLabel} title={s.removePlanLabel}>✕</button>
      </div>
      <ul className={styles.scheduleList}>
        {schedule.map((item) => (
          <li key={item.index} data-done={item.done}>
            <span>{item.dueDate}</span>
            <span>{formatPrice(item.amount, plan.currency)}</span>
            <span className={styles.doneMark} aria-hidden="true">{item.done ? '✓' : ''}</span>
          </li>
        ))}
      </ul>
      {!allDone ? (
        <button className={styles.markDoneBtn} onClick={onMarkDone}>{s.planMarkDoneBtn}</button>
      ) : (
        <div className={styles.emptyNote}>{s.planAllDone}</div>
      )}
    </div>
  )
}

function DividendForm({ s, onSave, onCancel }) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [date, setDate] = useState(todayISO)

  function submit(e) {
    e.preventDefault()
    const amountNum = parseFloat(amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) return
    onSave({ id: crypto.randomUUID(), amount: amountNum, currency, date })
  }

  return (
    <form className={styles.formPanel} onSubmit={submit}>
      <div className={styles.formFields}>
        <label className={styles.field}>
          <span>{s.dividendAmountLabel}</span>
          <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
        </label>
        <label className={styles.field}>
          <span>{s.costCurrencyLabel}</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="USD">USD</option>
            <option value="THB">THB</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>{s.dividendDateLabel}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.secondaryBtn} onClick={onCancel}>{s.cancelBtn}</button>
        <button type="submit" className={styles.saveBtn}>{s.saveDividendBtn}</button>
      </div>
    </form>
  )
}
