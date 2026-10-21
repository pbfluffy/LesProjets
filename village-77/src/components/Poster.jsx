import { useEffect } from 'react'
import QrSvg from './QrSvg'
import { APP_URL, SHARE_URL } from '../share'
import styles from './Poster.module.css'

// Printable A4 poster for the village notice board / guard house: a big QR
// code to the app and three steps. Opened from the admin tab (?poster);
// always Thai and light, whatever the app's own language and theme.
export default function Poster() {
  useEffect(() => {
    const html = document.documentElement
    const prev = html.getAttribute('data-theme')
    html.setAttribute('data-theme', 'light')
    document.title = 'โปสเตอร์ QR · หมู่บ้านของเรา'
    return () => html.setAttribute('data-theme', prev)
  }, [])

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.printBtn} onClick={() => window.print()}>🖨️ พิมพ์โปสเตอร์</button>
        <span>A4 แนวตั้ง · ตั้งค่า "ไม่มีส่วนหัว/ท้ายกระดาษ" ในหน้าพิมพ์จะสวยที่สุด</span>
      </div>

      <main className={styles.page}>
        <div className={styles.logo}>🏘️</div>
        <h1 className={styles.title}>หมู่บ้านของเรา</h1>
        <p className={styles.subtitle}>ตลาดซื้อขาย · สารพัดช่าง · ในหมู่บ้าน</p>

        <div className={styles.qr}>
          <QrSvg value={SHARE_URL} size="100%" level="Q" />
        </div>
        <p className={styles.scan}>สแกนด้วยกล้องมือถือ หรือ LINE</p>
        <p className={styles.url}>{APP_URL.replace(/^https:\/\//, '')}</p>

        <ol className={styles.steps}>
          <li><b>ดูร้านค้าและช่าง</b> ในหมู่บ้าน ไม่ต้องสมัคร</li>
          <li><b>โทรหรือแอดไลน์</b> ร้านค้าหรือช่างได้จากหน้าประกาศเลย</li>
          <li><b>อยากขายของหรือรับงาน?</b> เข้าสู่ระบบด้วย LINE แล้วกด “เปิดร้าน” หรือ “ลงทะเบียนช่าง”</li>
        </ol>

        <p className={styles.en}>Our Village — buy, sell and find a handyman nearby. Scan to open.</p>
      </main>
    </div>
  )
}
