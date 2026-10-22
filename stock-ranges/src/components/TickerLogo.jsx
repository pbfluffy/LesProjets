import { useCallback, useState } from 'react'
import { tagHue } from '../tagColor.js'
import styles from './TickerLogo.module.css'

// The coloured letter shows straight away and stays as the fallback; the
// real logo (lazy-loaded) fades in over it once it arrives. Before, the
// circle sat empty-white until the image loaded, which on a slow phone
// looked like a broken logo.
export default function TickerLogo({ symbol, size = 32 }) {
  const [status, setStatus] = useState('loading') // 'loading' | 'loaded' | 'failed'
  const hue = tagHue(symbol)
  // An image already in the browser cache can finish loading before React
  // hears about it, so onLoad never fires and the logo stays hidden behind
  // the letter — check on mount too.
  const imgRef = useCallback((img) => {
    if (img?.complete) setStatus(img.naturalWidth > 0 ? 'loaded' : 'failed')
  }, [])
  const style = { '--logo-hue': hue, width: size, height: size, fontSize: Math.round(size * 0.42) }

  return (
    <div className={styles.wrap} style={style} aria-hidden="true">
      {status !== 'loaded' && <div className={styles.fallback}>{symbol.charAt(0)}</div>}
      {status !== 'failed' && (
        <img
          ref={imgRef}
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
