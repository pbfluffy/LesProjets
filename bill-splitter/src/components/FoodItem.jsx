import { useLang } from '../LangContext'
import styles from './FoodItem.module.css'

const PALETTE = ['#F4B6B6','#F8D6A4','#F5E6A1','#C8E6B4','#A8D8E0','#A4C8E8','#C2BCE8','#E0B8DE','#D4CEC0','#BFD5C8']
function hashColor(name) {
  let sum = 0
  for (let i = 0; i < (name || '').length; i++) sum += name.charCodeAt(i)
  return PALETTE[sum % PALETTE.length]
}

export default function FoodItem({ food, members, onUpdate, onToggleMember, onRemove, onDuplicate, onSelectAll, currencySymbol = '฿' }) {
  const { t } = useLang()
  const allSelected = members.length > 0 && members.every(m => food.who.includes(m))
  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <input type="text" className={styles.nameInput} placeholder={t.foodPlaceholder} value={food.name} onChange={e => onUpdate(food.id, 'name', e.target.value)} maxLength={80} />
        <div className={styles.priceWrap}>
          <span className={styles.baht}>{currencySymbol}</span>
          <input type="number" className={styles.priceInput} placeholder="0" min="0" value={food.price} onChange={e => onUpdate(food.id, 'price', e.target.value)} />
        </div>
        <button className={styles.dupBtn} onClick={() => onDuplicate(food.id)} aria-label={t.duplicateItem ?? 'Duplicate'} title={t.duplicateItem ?? 'Duplicate'}>⧉</button>
        <button className={styles.removeBtn} onClick={() => onRemove(food.id)} aria-label={t.removeLabel}>×</button>
      </div>
      {members.length > 0 && (
        <div className={styles.whoRow}>
          <span className={styles.whoLabel}>{t.whoEats}</span>
          <div className={styles.chips}>
            <button className={`${styles.chip} ${allSelected ? styles.chipAll : styles.chipAllOff}`} onClick={() => onSelectAll(food.id, allSelected ? [] : members)}>{t.everyone}</button>
            {members.map(m => (
              <button key={m} className={`${styles.chip} ${food.who.includes(m) ? styles.chipOn : ''}`} onClick={() => onToggleMember(food.id, m)} style={food.who.includes(m) ? {} : { '--chip-dot': hashColor(m) }}>
                {food.who.includes(m) && <span className={styles.chipDot} style={{ background: hashColor(m) }} />}
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
      {food.who.length > 1 && food.price && (
        <p className={styles.hint}>{t.splitHint} {currencySymbol}{(parseFloat(food.price) / food.who.length).toFixed(2)}</p>
      )}
    </div>
  )
}
