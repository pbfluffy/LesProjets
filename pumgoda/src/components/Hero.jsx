import './Hero.css'

export default function Hero({ tagline, subtitle, dogBadge }) {
  return (
    <section className="ph-hero">
      <div className="ph-mascot-wrap" aria-hidden="true">
        {/* Mascot is the paw glyph as a placeholder; swap to /pumba.png if you
            add a real image to the public/ folder. */}
        <span className="ph-mascot-glyph">🐾</span>
      </div>
      <div className="ph-hero-text">
        <h1 className="ph-hero-title">{tagline}</h1>
        <p className="ph-hero-sub">{subtitle}</p>
        <span className="ph-dog-badge mono">{dogBadge}</span>
      </div>
    </section>
  )
}
