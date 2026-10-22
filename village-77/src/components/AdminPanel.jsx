import { useEffect, useMemo, useState } from 'react'
import { useLangContext, interp } from '../LangContext'
import { db, collection, onSnapshot } from '../firebase'
import { updatePost, deletePost, savePrivateAddress, deletePrivateAddress } from '../hooks/usePosts'
import { useAuthContext } from '../hooks/useAuth'
import { ResidencyBadge } from './PostCard'
import AdminMembers from './AdminMembers'
import AdminCategories from './AdminCategories'
import AdminReports from './AdminReports'
import BanSheet from './BanSheet'
import { useBans, unbanUser } from '../hooks/useBans'
import { OWNER_UID } from '../config'
import { isStale, updatedLabel } from '../freshness'
import styles from './ui.module.css'

const WEEK = 7 * 24 * 60 * 60 * 1000
const sinceMs = (ts) => (ts?.toMillis ? Date.now() - ts.toMillis() : Infinity)
const isNew = (p) => sinceMs(p.createdAt) < WEEK

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

// Banned accounts, newest first, each with an Unban link.
function BanList({ bans }) {
  const { t, lang } = useLangContext()
  const list = Object.entries(bans).sort(([, a], [, b]) => (b.at?.seconds || 0) - (a.at?.seconds || 0))
  if (!list.length) return <p className={styles.empty}>{t.adminNoBans}</p>

  function unban(uid, name) {
    if (!window.confirm(interp(t.unbanConfirm, { name: name || t.adminNoName }))) return
    unbanUser(uid).catch((e) => {
      console.error('[village] unban failed:', e?.code)
      alert(t.saveFailed)
    })
  }

  return (
    <ul className={styles.adminList}>
      {list.map(([uid, b]) => (
        <li key={uid} className={styles.adminRow}>
          <div className={styles.adminMain}>
            <strong>⛔ {b.name || t.adminNoName}</strong>
            {b.reason && <span className={styles.meta}>{b.reason}</span>}
            <span className={styles.meta}>
              {interp(t.bannedBy, { name: b.byName || '—' })}
              {b.at?.toDate && ' · ' + b.at.toDate().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className={styles.adminActions}>
            <button type="button" className={styles.linkBtn} onClick={() => unban(uid, b.name)}>{t.unban}</button>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function AdminPanel({ shops, providers, ratings, isOwner, onOpenPost }) {
  const { t, lang } = useLangContext()
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
  const [show, setShow] = useState('pending') // 'pending' | 'all' | 'new' | 'stale' | 'reports' | 'categories' | 'bans' | 'members'
  const bans = useBans() // uid -> ban
  const [banTarget, setBanTarget] = useState(null) // { uid, name } while the ban sheet is open

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
    if (show === 'pending') return all.filter((p) => p.isResident && !p.verified)
    if (show === 'new') return all.filter(isNew)
    if (show === 'stale') return all.filter(isStale)
    return all
  }, [shops, providers, show, t])

  const allPosts = shops.concat(providers)
  const memberList = Object.values(members)
  const activeMembers = memberList.filter((m) => sinceMs(m.lastSeen) < WEEK).length

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

      {/* At-a-glance counts; tapping one opens the matching list. */}
      <div className={styles.adminStats}>
        {[
          ['🛒', shops.length, t.navMarket, 'all'],
          ['🔧', providers.length, t.navServices, 'all'],
          ['🆕', allPosts.filter(isNew).length, t.adminNewWeek, 'new'],
          ['⏳', allPosts.filter((p) => p.isResident && !p.verified).length, t.adminPending, 'pending'],
          ['💤', allPosts.filter(isStale).length, t.adminStale, 'stale'],
          ['🚩', reports.length, t.adminReports, 'reports'],
          ['★', ratings.total, t.adminRatingsCount, null],
          ...(isOwner ? [['👥', memberList.length, t.adminMembers, 'members', interp(t.adminActiveWeek, { n: activeMembers })]] : []),
        ].map(([icon, n, label, view, sub]) => (
          <button key={label} type="button" className={styles.adminStat} disabled={!view} onClick={() => view && setShow(view)}>
            <strong>{icon} {n}</strong>
            <small>{label}</small>
            {sub && <small>{sub}</small>}
          </button>
        ))}
      </div>

      <div className={`${styles.segment} ${styles.adminTabs}`} role="group" style={{ marginBottom: 12 }}>
        {[['pending', t.adminPending], ['all', t.adminAllPosts], ['reports', reports.length ? t.adminReports + ' (' + reports.length + ')' : t.adminReports], ['categories', t.adminCategories], ['bans', Object.keys(bans).length ? t.adminBans + ' (' + Object.keys(bans).length + ')' : t.adminBans], ...(isOwner ? [['members', t.adminMembers]] : [])].map(([key, label]) => (
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

      {(show === 'new' || show === 'stale') && (
        <p className={styles.meta} style={{ marginBottom: 8 }}>
          {show === 'new' ? '🆕 ' + t.adminNewWeek : '💤 ' + t.adminStaleHint}{' '}
          <button type="button" className={styles.linkBtn} onClick={() => setShow('all')}>{t.adminAllPosts}</button>
        </p>
      )}

      {show === 'reports' ? (
        <AdminReports reports={reports} shops={shops} providers={providers} ratings={ratings} onOpenPost={onOpenPost} bans={bans} onBan={setBanTarget} />
      ) : show === 'categories' ? (
        <AdminCategories shops={shops} providers={providers} />
      ) : show === 'bans' ? (
        <BanList bans={bans} />
      ) : show === 'members' && isOwner ? (
        <AdminMembers shops={shops} providers={providers} onOpenPost={onOpenPost} bans={bans} onBan={setBanTarget} />
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
                {bans[p.ownerUid] && <span className={styles.bannedTag}>⛔ {t.bannedTag}</span>}
                {p.isResident
                  ? <AddressEditor post={p} address={addresses[p.id]} />
                  : <span className={styles.adminAddress}>🏠 —</span>}
                <span className={styles.meta}>📞 {[p.phone, p.line && 'LINE ' + p.line].filter(Boolean).join(' · ')}</span>
                <span className={styles.meta}>🕒 {updatedLabel(p, t, lang)}</span>
              </div>
              <div className={styles.adminActions}>
                {p.isResident && (
                  <label className={styles.adminVerify}>
                    <input type="checkbox" checked={!!p.verified} onChange={() => toggleVerified(p)} />
                    {t.verified}
                  </label>
                )}
                <button type="button" className={`${styles.linkBtn} ${styles.dangerLink}`} onClick={() => remove(p)}>{t.delete}</button>
                {p.ownerUid !== OWNER_UID && !bans[p.ownerUid] && (
                  <button type="button" className={`${styles.linkBtn} ${styles.dangerLink}`} onClick={() => setBanTarget({ uid: p.ownerUid, name: members[p.ownerUid]?.name || p.name })}>⛔ {t.banUser}</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {banTarget && (
        <BanSheet uid={banTarget.uid} name={banTarget.name} shops={shops} providers={providers} ratings={ratings}
          onClose={() => setBanTarget(null)} />
      )}
    </section>
  )
}
