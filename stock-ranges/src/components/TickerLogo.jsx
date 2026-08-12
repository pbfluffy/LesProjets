import { useState } from 'react'
import { tagHue } from '../tagColor.js'
import styles from './TickerLogo.module.css'

// Real company logos for well-known tickers (free, no-key public endpoint),
// falling back to a colored initial avatar — same deterministic hue-per-
// string trick already used for tags, so a ticker's color stays consistent
// wherever it shows up. Crypto/futures/index symbols (BTC-USD, GC=F,
// ^GSPC) won't have a logo there and just fall back immediately, which is
// fine — the fallback is designed to look intentional, not broken.
export default function TickerLogo({ symbol, size = 32 }) {
  const [failed, setFailed] = useState(false)
  const hue = tagHue(symbol)
  const style = { '--logo-hue': hue, width: size, height: size, fontSize: Math.round(size * 0.42) }

  if (failed) {
    return (
      <div className={styles.fallback} style={style} aria-hidden="true">
        {symbol.charAt(0)}
      </div>
    )
  }

  return (
    <img
      className={styles.logo}
      style={style}
      src={`https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
