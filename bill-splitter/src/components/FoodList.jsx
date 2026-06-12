import { useState, useCallback, useRef } from 'react'
import { useLang } from '../LangContext'
import FoodItem from './FoodItem'
import styles from './FoodList.module.css'

const UNDO_MS = 4000

export default function FoodList({ foods, members, onAdd, onUpdate, onToggleMember, onRemove, onDuplicate, onRestore, onSelectAll, currencySymbol = '฿' }) {
  const { t } = useLang()
  const [undoItem, setUndoItem] = useState(null)  // { food, afterId }
  const timerRef = useRef(null)

  const handleRemove = useCallback((id) => {
    const idx = foods.findIndex(f => f.id === id)
    if (idx === -1) return
    const food = foods[idx]
    const afterId = idx > 0 ? foods[idx - 1].id : null
    onRemove(id)
    clearTimeout(timerRef.current)
    setUndoItem({ food, afterId })
    timerRef.current = setTimeout(() => setUndoItem(null), UNDO_MS)
  }, [foods, onRemove])

  const handleUndo = useCallback(() => {
    if (!undoItem) return
    clearTimeout(timerRef.current)
    onRestore(undoItem.food, undoItem.afterId)
    setUndoItem(null)
  }, [undoItem, onRestore])

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{t.foodItems}</h2>
      {foods.length === 0 && <p className={styles.empty}>{t.noFoods}</p>}
      {foods.map(food => (
        <FoodItem key={food.id} food={food} members={members} onUpdate={onUpdate} onToggleMember={onToggleMember} onRemove={handleRemove} onDuplicate={onDuplicate} onSelectAll={onSelectAll} currencySymbol={currencySymbol} />
      ))}
      <button className={styles.addBtn} onClick={onAdd}>{t.addFood}</button>
      {undoItem && (
        <div className={styles.undoToast}>
          <span>{t.itemRemoved ?? 'Item removed'}</span>
          <button className={styles.undoBtn} onClick={handleUndo}>{t.undo ?? 'Undo'}</button>
        </div>
      )}
    </section>
  )
}
