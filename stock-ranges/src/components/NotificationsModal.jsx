import { useEffect, useRef, useState } from 'react'
import { useLang } from '../LangContext.jsx'
import { useFocusTrap } from '../hooks/useFocusTrap.js'
import Icon from './Icon.jsx'
import styles from './NotificationsModal.module.css'

function interp(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

// Notification history (real buy/sell alerts written by the GitHub Actions
// alert check, plus test pushes) and a "Send test notification" button —
// opened from the account menu. Data comes from the Worker's /alerts route
// (`history` / `testPush`), via usePriceAlerts.
export default function NotificationsModal({ user, loadHistory, sendTest, onClose }) {
  const { s, lang } = useLang()
  const modalRef = useRef(null)
  useFocusTrap(modalRef)
  const [items, setItems] = useState(undefined) // undefined = loading, null = failed
  const [testing, setTesting] = useState(false)
  const [testMsg, setTestMsg] = useState(null)

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const refresh = () => loadHistory(user).then(setItems)
  useEffect(() => { refresh() }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleTest() {
    if (testing) return
    setTesting(true)
    setTestMsg(null)
    const r = await sendTest(user)
    setTesting(false)
    if (r.status === 'ok') {
      setTestMsg(r.devices ? interp(s.notifTestSent, { sent: r.sent, devices: r.devices }) : s.notifTestNone)
      refresh()
    } else if (r.status === 'tooSoon') setTestMsg(s.notifTestTooSoon)
    else if (r.status === 'denied') setTestMsg(s.notifTestDenied)
    else setTestMsg(s.notifTestFailed)
  }

  const fmtTime = (ts) => new Date(ts).toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div ref={modalRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="notif-title" onClick={(e) => e.stopPropagation()}>
        <div className={styles.title} id="notif-title">{s.notifTitle}</div>
        <div className={styles.body}>{s.notifIntro}</div>

        <button type="button" className={styles.testBtn} onClick={handleTest} disabled={testing}>
          <Icon name="bell" size={14} /> {testing ? s.notifTesting : s.notifTestBtn}
        </button>
        {testMsg && <div className={styles.testMsg} role="status">{testMsg}</div>}

        {items === undefined && <div className={styles.empty}>…</div>}
        {items === null && <div className={styles.empty}>{s.notifLoadError}</div>}
        {Array.isArray(items) && items.length === 0 && <div className={styles.empty}>{s.notifEmpty}</div>}
        {Array.isArray(items) && items.length > 0 && (
          <ul className={styles.list}>
            {items.map((it, i) => (
              <li key={`${it.ts}-${i}`} className={styles.item} data-kind={it.test ? 'test' : it.direction}>
                <span className={styles.kindDot} aria-hidden="true" />
                <div className={styles.itemText}>
                  <div className={styles.itemTitle}>
                    {it.test && <span className={styles.testTag}>{s.notifTestLabel}</span>}
                    {it.title}
                  </div>
                  {it.body && <div className={styles.itemBody}>{it.body}</div>}
                  <div className={styles.itemMeta}>
                    {fmtTime(it.ts)}
                    {typeof it.devices === 'number' && it.delivered < it.devices && (
                      <> · {interp(s.notifDelivered, { delivered: it.delivered, devices: it.devices })}</>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.closeBtn} onClick={onClose}>{s.closeBtn}</button>
        </div>
      </div>
    </div>
  )
}
