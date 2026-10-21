import { useEffect, useMemo, useState } from 'react'
import { useLangContext } from '../LangContext'
import { db, collection, onSnapshot } from '../firebase'
import { updatePost, deletePost, deletePrivateAddress } from '../hooks/usePosts'
import { ResidencyBadge } from './PostCard'
import styles from './ui.module.css'

// Admins only (the tab is hidden otherwise, and firestore.rules only let
// admins read villagePrivate or set `verified`). Lists every post with the
// private house no. / soi so an admin can do the random "do you really live
// here" checks, mark villagers as verified, and remove bad posts.
export default function AdminPanel({ shops, providers, ratings }) {
  const { t } = useLangContext()
  const [addresses, setAddresses] = useState({})
  const [show, setShow] = useState('pending') // 'pending' | 'all'

  useEffect(() => onSnapshot(
    collection(db, 'villagePrivate'),
    (snap) => setAddresses(Object.fromEntries(snap.docs.map((d) => [d.id, d.data().address]))),
    (e) => console.error('[village] private addresses failed:', e?.code),
  ), [])

  const rows = useMemo(() => {
    const all = [
      ...shops.map((p) => ({ ...p, collection: 'villageShops', kindLabel: '🛒 ' + t.navMarket })),
      ...providers.map((p) => ({ ...p, collection: 'villageProviders', kindLabel: '🔧 ' + t.navServices })),
    ].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    return show === 'pending' ? all.filter((p) => p.isResident && !p.verified) : all
  }, [shops, providers, show, t])

  function toggleVerified(p) {
    updatePost(p.collection, p.id, { verified: !p.verified }).catch((e) => {
      console.error('[village] verify failed:', e?.code)
      alert(t.saveFailed)
    })
  }

  function remove(p) {
    if (!window.confirm(t.deleteConfirm)) return
    deletePost(p.collection, p.id).then(() => {
      deletePrivateAddress(p.id).catch(() => {})
      if (p.collection === 'villageProviders') ratings.removeAll(p.id).catch(() => {})
    }).catch((e) => {
      console.error('[village] admin delete failed:', e?.code)
      alert(t.saveFailed)
    })
  }

  return (
    <section>
      <div className={styles.hero}>
        <h2>🛡️ {t.navAdmin}</h2>
        <p>{t.adminBlurb}</p>
      </div>

      <div className={styles.segment} role="group" style={{ marginBottom: 12 }}>
        {[['pending', t.adminPending], ['all', t.filterAll]].map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={show === key}
            className={`${styles.segmentBtn} ${show === key ? styles.segmentBtnActive : ''}`}
            onClick={() => setShow(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className={styles.empty}>{show === 'pending' ? t.adminNothingPending : t.noMatches}</p>
      ) : (
        <ul className={styles.adminList}>
          {rows.map((p) => (
            <li key={p.id} className={styles.adminRow}>
              <div className={styles.adminMain}>
                <div className={styles.cardTags}>
                  <ResidencyBadge isResident={p.isResident} />
                  <span className={styles.tag}>{p.kindLabel}</span>
                </div>
                <strong>{p.name}</strong>
                <span className={styles.adminAddress}>
                  🏠 {p.isResident ? (addresses[p.id] || t.adminNoAddress) : '—'}
                </span>
                <span className={styles.meta}>📞 {[p.phone, p.line && 'LINE ' + p.line].filter(Boolean).join(' · ')}</span>
              </div>
              <div className={styles.adminActions}>
                {p.isResident && (
                  <label className={styles.adminVerify}>
                    <input type="checkbox" checked={!!p.verified} onChange={() => toggleVerified(p)} />
                    {t.verified}
                  </label>
                )}
                <button type="button" className={`${styles.linkBtn} ${styles.dangerLink}`} onClick={() => remove(p)}>{t.delete}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
