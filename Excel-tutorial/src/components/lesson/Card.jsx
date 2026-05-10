import styles from './Card.module.css'

export default function Card({ icon, title, children }) {
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <span className={styles.title}>{title}</span>
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  )
}
