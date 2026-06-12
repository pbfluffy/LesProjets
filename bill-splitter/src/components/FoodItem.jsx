import { useLang } from '../LangContext'
import styles from './FoodItem.module.css'

export default function FoodItem({ food, members, onUpdate, onToggleMember, onRemove, onSelectAll, currencySymbol = '฿' }) {
  const { t } = useLang()
  const allSelected = members.length > 0 && members.every(m => food.who.includes(m))
  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <input type="text" className={styles.nameInput} placeholder={t.foodPlaceholder} value={food.name} onChange={e => onUpdate(food.id, 'name', e.target.value)} />
        <div className={styles.priceWrap}>
          <span className={styles.baht}>{currencySymbol}</span>
          <input type="number" className={styles.priceInput} placeholder="0" min="0" value={food.price} onChange={e => onUpdate(food.id, 'price', e.target.value)} />
        </div>
        <button className={styles.removeBtn} onClick={() => onRemove(food.id)} aria-label={t.removeLabel}>×</button>
      </div>
      {members.length > 0 && (
        <div className={styles.whoRow}>
          <span className={styles.whoLabel}>{t.whoEats}</span>
          <div className={styles.chips}>
            <button className={`${styles.chip} ${allSelected ? styles.chipAll : styles.chipAllOff}`} onClick={() => onSelectAll(food.id, allSelected ? [] : members)}>{t.everyone}</button>
            {members.map(m => (
              <button key={m} className={`${styles.chip} ${food.who.includes(m) ? styles.chipOn : ''}`} onClick={() => onToggleMember(food.id, m)}>{m}</button>
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
