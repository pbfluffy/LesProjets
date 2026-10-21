import { useState } from 'react'
import { tagHue } from '../tagColor.js'
import styles from './TickerLogo.module.css'

// The coloured letter shows straight away and stays as the fallback; the
// real logo (lazy-loaded) fades in over it once it arrives. Before, the
// circle sat empty-white until the image loaded, which on a slow phone
// looked like a broken logo.
export default function TickerLogo({ symbol, size = 32 }) {
  const [status, setStatus] = useState('loading') // 'loading' | 'loaded' | 'failed'
  const hue = tagHue(symbol)
  const style = { '--logo-hue': hue, width: size, height: size, fontSize: Math.round(size * 0.42) }

  return (
    <div className={styles.wrap} style={style} aria-hidden="true">
      {status !== 'loaded' && <div className={styles.fallback}>{symbol.charAt(0)}</div>}
      {status !== 'failed' && (
        <img
          className={styles.logo}
          data-loaded={status === 'loaded'}
          src={`https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('failed')}
        />
      )}
    </div>
  )
}
