import styles from './HomeButton.module.css'

export default function HomeButton({ href = '../', label = '← Home' }) {
  return (
    <a href={href} className={styles.btn} title="Home">
      {label}
    </a>
  )
}
