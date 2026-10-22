import { useEffect, useMemo, useState } from 'react'
import { useLangContext } from '../LangContext'
import { db, collection, onSnapshot } from '../firebase'
import { updatePost, deletePost, savePrivateAddress, deletePrivateAddress } from '../hooks/usePosts'
import { useAuthContext } from '../hooks/useAuth'
import { ResidencyBadge } from './PostCard'
import AdminMembers from './AdminMembers'
import AdminCategories from './AdminCategories'
import AdminReports from './AdminReports'
import styles from './ui.module.css'

// Admins only (the tab is hidden otherwise, and firestore.rules only let
// admins read villagePrivate or set `verified`). Lists every post with the
// private house no. / soi so an admin can do the random "do you really live
// here" checks, mark villagers as verified, and remove bad posts.
// House no. / soi with an Edit link, so an admin can correct one a villager
// typed wrong. Saved with the admin's uid (updatedBy); clearing it removes it.
function AddressEditor({ post, address }) {
  const { t } = useLangContext()
  const { user } = useAuthContext()
  const [draft, setDraft] = useState(null) // null = not editing
  const [saving, setSaving] = useState(false)

  async function save() {
    const value = draft.trim()
    setSaving(true)
    try {
      if (value) await savePrivateAddress(post.id, post.collection, value, user.uid)
      else await deletePrivateAddress(post.id)
      setDraft(null)
    } catch (e) {
      console.error('[village] address fix failed:', e?.code)
      alert(t.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  if (draft === null) {
    return (
      <span className={styles.adminAddress}>
        🏠 {address || t.adminNoAddress}{' '}
        <button type="button" className={styles.linkBtn} onClick={() => setDraft(address || '')}>{t.edit}</button>
      </span>
    )
  }
  return (
    <span className={styles.addressEdit}>
      <input
        autoFocus
        maxLength={120}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setDraft(null) }}
        placeholder={t.fAddressPh}
        disabled={saving}
      />
      <button type="button" className={styles.primaryBtn} onClick={save} disabled={saving}>{saving ? '…' : t.save}</button>
      <button type="button" className={styles.linkBtn} onClick={() => setDraft(null)} disabled={saving}>{t.cancel}</button>
    </span>
  )
}

// The account that posted it: name, photo and LINE / Google.
function OwnerLine({ member }) {
  const { t } = useLangContext()
  if (!member) return <span className={styles.meta}>👤 {t.adminUnknownOwner}</span>
  return (
    <span className={styles.ownerLine}>
      {member.photoURL
        ? <img src={member.photoURL} alt="" referrerPolicy="no-referrer" loading="lazy" />
        : <span aria-hidden="true">👤</span>}
      {member.name || t.adminNoName} · {member.provider === 'line' ? 'LINE' : 'Google'}
    </span>
  )
}

export default function AdminPanel({ shops, providers, ratings, isOwner, onOpenPost }) {
  const { t } = useLangContext()
  const [addresses, setAddresses] = useState({})
  // Who posted what (owner only — the members list is owner-only too).
  const [members, setMembers] = useState({})
  // Reports from "Report this post", for every admin.
  const [reports, setReports] = useState([])
  useEffect(() => onSnapshot(
    collection(db, 'villageReports'),
    (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (e) => console.error('[village] reports failed:', e?.code),
  ), [])
  useEffect(() => {
    if (!isOwner) return
    return onSnapshot(
      collection(db, 'villageMembers'),
      (snap) => setMembers(Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]))),
      (e) => console.error('[village] members failed:', e?.code),
    )
  }, [isOwner])
  const [show, setShow] = useState('pending') // 'pending' | 'all' | 'members'

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
      ratings.removeAll(p.id).catch(() => {})
    }).catch((e) => {
      console.error('[village] admin delete failed:', e?.code)
      alert(t.saveFailed)
    })
  }

  return (
    <section>
      <div className={styles.hero}>
        <h2>🛡️ {t.navAdmin} <small className={styles.roleTag}>{isOwner ? t.roleOwner : t.roleAdmin}</small></h2>
        <p>{t.adminBlurb}</p>
        <p style={{ marginTop: 8 }}>
          <a className={styles.secondaryBtn} href={import.meta.env.BASE_URL + '?poster'} target="_blank" rel="noopener">
            🖨️ {t.adminPoster}
          </a>
        </p>
      </div>

      <div className={`${styles.segment} ${styles.adminTabs}`} role="group" style={{ marginBottom: 12 }}>
        {[['pending', t.adminPending], ['all', t.adminAllPosts], ['reports', reports.length ? t.adminReports + ' (' + reports.length + ')' : t.adminReports], ['categories', t.adminCategories], ...(isOwner ? [['members', t.adminMembers]] : [])].map(([key, label]) => (
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

      {show === 'reports' ? (
        <AdminReports reports={reports} shops={shops} providers={providers} ratings={ratings} onOpenPost={onOpenPost} />
      ) : show === 'categories' ? (
        <AdminCategories shops={shops} providers={providers} />
      ) : show === 'members' && isOwner ? (
        <AdminMembers shops={shops} providers={providers} onOpenPost={onOpenPost} />
      ) : rows.length === 0 ? (
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
                {isOwner && <OwnerLine member={members[p.ownerUid]} />}
                {p.isResident
                  ? <AddressEditor post={p} address={addresses[p.id]} />
                  : <span className={styles.adminAddress}>🏠 —</span>}
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
