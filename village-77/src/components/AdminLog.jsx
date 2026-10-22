import { useEffect, useMemo, useState } from 'react'
import { useLangContext } from '../LangContext'
import { db, collection, query, orderBy, limit, onSnapshot } from '../firebase'
import { ADMIN_ACTIONS } from '../adminLog'
import styles from './ui.module.css'

// Owner only (firestore.rules): the latest admin actions — who did what,
// to which post or person, and when. Filter by admin or by action.
export default function AdminLog({ shops, providers, onOpenPost }) {
  const { t, lang } = useLangContext()
  const [entries, setEntries] = useState(null)
  const [by, setBy] = useState('')
  const [action, setAction] = useState('')

  useEffect(() => onSnapshot(
    query(collection(db, 'villageAdminLog'), orderBy('at', 'desc'), limit(300)),
    (snap) => setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (e) => {
      console.error('[village] admin log failed:', e?.code)
      setEntries([])
    },
  ), [])

  const postIds = useMemo(() => new Set([...shops, ...providers].map((p) => p.id)), [shops, providers])
  // uid -> name, for the "by" filter
  const admins = useMemo(() => {
    const m = {}
    for (const e of entries || []) m[e.by] = e.byName || e.by
    return m
  }, [entries])

  const when = (ts) => ts?.toDate?.().toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }) || '…'

  if (entries === null) return <p className={styles.empty}>{t.loading}</p>
  const rows = entries.filter((e) => (!by || e.by === by) && (!action || e.action === action))

  return (
    <>
      <p className={styles.hint} style={{ marginBottom: 8 }}>{t.logExplain}</p>
      <div className={styles.adminFilters}>
        <select className={styles.adminSelect} value={by} onChange={(e) => setBy(e.target.value)}>
          <option value="">{t.logAllAdmins}</option>
          {Object.entries(admins).map(([uid, name]) => <option key={uid} value={uid}>{name}</option>)}
        </select>
        <select className={styles.adminSelect} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">{t.logAllActions}</option>
          {ADMIN_ACTIONS.map((a) => <option key={a} value={a}>{t['log_' + a] || a}</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <p className={styles.empty}>{t.logEmpty}</p>
      ) : (
        <ul className={styles.adminList} style={{ marginTop: 8 }}>
          {rows.map((e) => (
            <li key={e.id} className={styles.adminRow}>
              <div className={styles.adminMain}>
                <strong>{t['log_' + e.action] || e.action}</strong>
                {e.detail && <span>{e.detail}</span>}
                <span className={styles.meta}>
                  {e.byName || e.by} · {when(e.at)}
                  {e.postId && postIds.has(e.postId) && (
                    <>{' · '}<button type="button" className={styles.linkBtn} onClick={() => onOpenPost(e.postId)}>{t.logOpenPost}</button></>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
