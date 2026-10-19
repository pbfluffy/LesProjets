import { useLangContext, interp } from '../LangContext'
import PostCard from './PostCard'
import styles from './ui.module.css'

export default function Home({ listings, providers, my, onGo, onEditListing, onEditProvider }) {
  const { t } = useLangContext()
  const forSale = listings.filter((l) => !l.sold)

  return (
    <section>
      <div className={styles.hero}>
        <h2>{t.homeWelcome}</h2>
        <p>{t.homeBlurb}</p>
      </div>

      <div className={styles.homeCards}>
        <button type="button" className={styles.homeCard} onClick={() => onGo('market')}>
          <span className={styles.homeIcon}>🛒</span>
          <strong>{t.navMarket}</strong>
          <small>{interp(t.homeMarketCard, { n: forSale.length })}</small>
        </button>
        <button type="button" className={styles.homeCard} onClick={() => onGo('services')}>
          <span className={styles.homeIcon}>🔧</span>
          <strong>{t.navServices}</strong>
          <small>{interp(t.homeServicesCard, { n: providers.length })}</small>
        </button>
      </div>

      {forSale.length > 0 && (
        <>
          <div className={styles.sectionHead}>
            <h3>{t.homeLatestMarket}</h3>
            <button type="button" className={styles.linkBtn} onClick={() => onGo('market')}>{t.seeAll}</button>
          </div>
          <div className={styles.grid}>
            {forSale.slice(0, 4).map((p) => (
              <PostCard key={p.id} kind="listing" collectionName="villageListings" post={p} my={my} onEdit={onEditListing} />
            ))}
          </div>
        </>
      )}

      {providers.length > 0 && (
        <>
          <div className={styles.sectionHead}>
            <h3>{t.homeLatestServices}</h3>
            <button type="button" className={styles.linkBtn} onClick={() => onGo('services')}>{t.seeAll}</button>
          </div>
          <div className={styles.grid}>
            {providers.slice(0, 4).map((p) => (
              <PostCard key={p.id} kind="provider" collectionName="villageProviders" post={p} my={my} onEdit={onEditProvider} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
