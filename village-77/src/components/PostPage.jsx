import { useEffect } from 'react'
import { useLangContext } from '../LangContext'
import PostCard from './PostCard'
import Icon from './Icon'
import { useAuthContext } from '../hooks/useAuth'
import { track } from '../hooks/useStats'
import styles from './ui.module.css'

// One shop or handyman, opened from its card: photos, every item (shops) or
// stars and reviews (handymen), contacts, share,
// and edit / delete for the poster (or delete for admins). Full screen on a
// phone. App.jsx keeps it in the address bar (?p=<id>), so the phone's back
// button closes it and a shared shop link opens it directly.
export default function PostPage({ kind, post, ratings, onEdit, onClose }) {
  const { t } = useLangContext()
  const { user } = useAuthContext()

  // one "open" for the owner's weekly stats (not their own visits)
  useEffect(() => { track(post.id, 'open', user, post.ownerUid) }, [post.id, post.ownerUid, user])

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
        <button type="button" className={styles.shopBack} onClick={onClose} aria-label={t.back}><Icon name="back" size={20} strokeWidth={2.2} /></button>
        <strong className={styles.shopPageTitle}>{post.name}</strong>
      </div>
      <div className={styles.shopPageBody}>
        <PostCard kind={kind} collectionName={kind === 'shop' ? 'villageShops' : 'villageProviders'} post={post} ratings={ratings} onEdit={onEdit} />
      </div>
    </div>
  )
}
