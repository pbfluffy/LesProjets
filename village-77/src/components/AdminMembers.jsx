import { useEffect, useMemo, useState } from 'react'
import { useLangContext, interp } from '../LangContext'
import { db, collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from '../firebase'
import { OWNER_UID } from '../config'
import styles from './ui.module.css'

// Everyone who has signed in to the app (villageMembers, written on each
// sign-in), whether or not they've posted yet. Owner only (firestore.rules):
// this is also where the owner makes someone a village admin or removes
// them (villageAdmins).
export default function AdminMembers({ shops, providers }) {
  const { t, lang } = useLangContext()
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
      .catch((e) => {
        console.error('[village] admin change failed:', e?.code)
        alert(t.saveFailed)
      })
  }

  // uid -> number of shops / handymen they posted
  const postCounts = useMemo(() => {
    const n = {}
    for (const p of [...shops, ...providers]) n[p.ownerUid] = (n[p.ownerUid] || 0) + 1
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

  return (
    <>
      <p className={styles.hint} style={{ marginBottom: 8 }}>{interp(t.adminMemberCount, { n: sorted.length })}</p>
      <ul className={styles.adminList}>
        {sorted.map((m) => (
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
              <span className={styles.meta}>
                {m.provider === 'line' ? '💬 LINE' : 'Google'}
                {' · '}
                {postCounts[m.uid] ? interp(t.adminPosts, { n: postCounts[m.uid] }) : t.adminNoPosts}
              </span>
              <span className={styles.meta}>
                {t.adminFirstSeen} {when(m.firstSeen)} · {t.adminLastSeen} {when(m.lastSeen)}
              </span>
            </div>
            {m.uid !== OWNER_UID && (
              <button
                type="button"
                className={`${styles.linkBtn} ${admins.has(m.uid) ? styles.dangerLink : ''} ${styles.memberAction}`}
                onClick={() => toggleAdmin(m)}
              >
                {admins.has(m.uid) ? t.adminRevoke : t.adminGrant}
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
