import FoodItem from './FoodItem'
import styles from './FoodList.module.css'
export default function FoodList({ foods, members, onAdd, onUpdate, onToggleMember, onRemove, onSelectAll }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>รายการอาหาร</h2>
      {foods.length === 0 && <p className={styles.empty}>ยังไม่มีรายการ — กด "+ เพิ่มรายการ" เพื่อเริ่ม</p>}
      {foods.map(food => <FoodItem key={food.id} food={food} members={members} onUpdate={onUpdate} onToggleMember={onToggleMember} onRemove={onRemove} onSelectAll={onSelectAll} />)}
      <button className={styles.addBtn} onClick={onAdd}>+ เพิ่มรายการ</button>
    </section>
  )
}
