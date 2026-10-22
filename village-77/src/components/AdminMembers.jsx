import { useEffect, useMemo, useState } from 'react'
import { useLangContext, interp } from '../LangContext'
import { db, collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from '../firebase'
import { OWNER_UID } from '../config'
import { unbanUser } from '../hooks/useBans'
import { useAuthContext } from '../hooks/useAuth'
import { logAdmin } from '../adminLog'
import styles from './ui.module.css'

// Everyone who has signed in to the app (villageMembers, written on each
// sign-in), whether or not they've posted yet. Owner only (firestore.rules):
// this is also where the owner makes someone a village admin or removes
// them (villageAdmins).
export default function AdminMembers({ shops, providers, onOpenPost, bans = {}, onBan }) {
  const { t, lang } = useLangContext()
  const { user } = useAuthContext()
  const [members, setMembers] = useState(null)
  const [admins, setAdmins] = useState(new Set()) // uids in villageAdmins

  useEffect(() => onSnapshot(
    collection(db, 'villageMembers'),
    (snap) => setMembers(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))),
    (e) => {
      console.error('[village] members failed:', e?.code)
      setMembers([])
    },
  ), [])

  useEffect(() => onSnapshot(
    collection(db, 'villageAdmins'),
    (snap) => setAdmins(new Set(snap.docs.map((d) => d.id))),
    (e) => console.error('[village] admins failed:', e?.code),
  ), [])

  function toggleAdmin(m) {
    const isAdm = admins.has(m.uid)
    const msg = interp(isAdm ? t.adminRevokeConfirm : t.adminGrantConfirm, { name: m.name || t.adminNoName })
    if (!window.confirm(msg)) return
    const ref = doc(db, 'villageAdmins', m.uid)
    ;(isAdm ? deleteDoc(ref) : setDoc(ref, { name: m.name || '', grantedAt: serverTimestamp() }))
      .then(() => logAdmin(user, isAdm ? 'revokeAdmin' : 'grantAdmin', { detail: m.name || '', targetUid: m.uid }))
      .catch((e) => {
        console.error('[village] admin change failed:', e?.code)
        alert(t.saveFailed)
      })
  }

  // uid -> their posts, by name (shops 🛒, handymen 🔧)
  const postsByOwner = useMemo(() => {
    const n = {}
    for (const p of shops) (n[p.ownerUid] ||= []).push({ id: p.id, label: '🛒 ' + p.name })
    for (const p of providers) (n[p.ownerUid] ||= []).push({ id: p.id, label: '🔧 ' + p.name })
    return n
  }, [shops, providers])

  const sorted = useMemo(
    () => (members || []).slice().sort((a, b) => (b.lastSeen?.seconds || 0) - (a.lastSeen?.seconds || 0)),
    [members],
  )

  const when = (ts) => ts?.toDate?.().toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }) || '—'

  if (members === null) return <p className={styles.empty}>{t.loading}</p>
  if (!sorted.length) return <p className={styles.empty}>{t.adminNoMembers}</p>

  function unban(m) {
    if (!window.confirm(interp(t.unbanConfirm, { name: m.name || t.adminNoName }))) return
    unbanUser(m.uid).then(() => logAdmin(user, 'unban', { detail: m.name || '', targetUid: m.uid }), (e) => {
      console.error('[village] unban failed:', e?.code)
      alert(t.saveFailed)
    })
  }

  // Active members first; banned ones in their own list below, with Unban.
  const active = sorted.filter((m) => !bans[m.uid])
  const banned = sorted.filter((m) => bans[m.uid])

  const row = (m) => {
    const ban = bans[m.uid]
    return (
      <li key={m.uid} className={`${styles.adminRow} ${styles.memberRow}`}>
        {m.photoURL
          ? <img className={styles.memberAvatar} src={m.photoURL} alt="" referrerPolicy="no-referrer" loading="lazy" />
          : <span className={styles.memberAvatar}>{(m.name || '?').slice(0, 1)}</span>}
        <div className={styles.adminMain}>
          <strong>
            {m.name || t.adminNoName}
            {m.uid === OWNER_UID && <span className={styles.roleTag}> {t.roleOwner}</span>}
            {admins.has(m.uid) && <span className={styles.roleTag}> {t.roleAdmin}</span>}
          </strong>
          {ban && (
            <span className={styles.bannedTag}>
              ⛔ {interp(t.bannedBy, { name: ban.byName || '—' })}{ban.reason && ' · ' + ban.reason}
            </span>
          )}
          <span className={styles.meta}>
            {m.provider === 'line' ? '💬 LINE' : 'Google'}
            {' · '}
            {postsByOwner[m.uid] ? interp(t.adminPosts, { n: postsByOwner[m.uid].length }) : t.adminNoPosts}
          </span>
          <span className={styles.meta}>
            {t.adminFirstSeen} {when(m.firstSeen)} · {t.adminLastSeen} {when(m.lastSeen)}
          </span>
          {postsByOwner[m.uid] && (
            <span className={styles.memberPosts}>
              {postsByOwner[m.uid].map((p, i) => (
                <span key={p.id}>
                  {i > 0 && ' · '}
                  <button type="button" className={styles.linkBtn} onClick={() => onOpenPost(p.id)}>{p.label}</button>
                </span>
              ))}
            </span>
          )}
        </div>
        {m.uid !== OWNER_UID && (
          <div className={`${styles.adminActions} ${styles.memberAction}`}>
            {ban ? (
              <button type="button" className={styles.linkBtn} onClick={() => unban(m)}>{t.unban}</button>
            ) : (
              <>
                <button type="button" className={`${styles.linkBtn} ${admins.has(m.uid) ? styles.dangerLink : ''}`} onClick={() => toggleAdmin(m)}>
                  {admins.has(m.uid) ? t.adminRevoke : t.adminGrant}
                </button>
                {onBan && (
                  <button type="button" className={`${styles.linkBtn} ${styles.dangerLink}`} onClick={() => onBan({ uid: m.uid, name: m.name })}>
                    ⛔ {t.banUser}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </li>
    )
  }

  return (
    <>
      <div className={styles.sectionHead}>
        <h3>✅ {interp(t.adminActiveMembers, { n: active.length })}</h3>
      </div>
      {active.length ? <ul className={styles.adminList}>{active.map(row)}</ul> : <p className={styles.empty}>{t.adminNoMembers}</p>}

      <div className={styles.sectionHead} style={{ marginTop: 24 }}>
        <h3>⛔ {interp(t.adminBannedMembers, { n: banned.length })}</h3>
      </div>
      {banned.length ? <ul className={styles.adminList}>{banned.map(row)}</ul> : <p className={styles.empty}>{t.adminNoBans}</p>}
    </>
  )
}
