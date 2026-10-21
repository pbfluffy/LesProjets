import { useEffect } from 'react'
import { useLangContext } from '../LangContext'
import PostCard from './PostCard'
import styles from './ui.module.css'

// One shop, opened from its card: shop photos, every item, contacts, share,
// and edit / delete for the poster (or delete for admins). Full screen on a
// phone. App.jsx keeps it in the address bar (?p=<id>), so the phone's back
// button closes it and a shared shop link opens it directly.
export default function ShopPage({ post, ratings, onEdit, onClose }) {
  const { t } = useLangContext()

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    // the page behind shouldn't scroll while the shop is open
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className={styles.shopPage} role="dialog" aria-modal="true" aria-label={post.name}>
      <div className={styles.shopPageBar}>
        <button type="button" className={styles.shopBack} onClick={onClose} aria-label={t.back}>←</button>
        <strong className={styles.shopPageTitle}>{post.name}</strong>
      </div>
      <div className={styles.shopPageBody}>
        <PostCard kind="shop" collectionName="villageShops" post={post} ratings={ratings} onEdit={onEdit} />
      </div>
    </div>
  )
}
