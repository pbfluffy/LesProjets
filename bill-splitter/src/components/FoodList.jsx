import { useLang } from '../LangContext'
import FoodItem from './FoodItem'
import EmptyState from './EmptyState'
import styles from './FoodList.module.css'

export default function FoodList({ foods, members, onAdd, onUpdate, onToggleMember, onRemove, onSelectAll }) {
  const { t } = useLang()
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{t.foodItems}</h2>
      {foods.length === 0 && <EmptyState variant="bowl" text={t.noFoods} />}
      {foods.map(food => (
        <FoodItem key={food.id} food={food} members={members} onUpdate={onUpdate} onToggleMember={onToggleMember} onRemove={onRemove} onSelectAll={onSelectAll} />
      ))}
      <button className={styles.addBtn} onClick={onAdd}>{t.addFood}</button>
    </section>
  )
}
