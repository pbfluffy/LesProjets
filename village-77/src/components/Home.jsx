import { useLangContext, interp } from '../LangContext'
import PostCard from './PostCard'
import { NewsCard } from './NewsBoard'
import styles from './ui.module.css'

export default function Home({ shops, providers, news, ratings, onGo, onEditShop, onEditProvider, onEditNews, onOpenShop }) {
  const { t } = useLangContext()
  const itemsForSale = shops.reduce((n, s) => n + (s.items || []).filter((it) => !it.sold).length, 0)

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
          <small>{interp(t.homeMarketCard, { shops: shops.length, items: itemsForSale })}</small>
        </button>
        <button type="button" className={styles.homeCard} onClick={() => onGo('services')}>
          <span className={styles.homeIcon}>🔧</span>
          <strong>{t.navServices}</strong>
          <small>{interp(t.homeServicesCard, { n: providers.length })}</small>
        </button>
      </div>

      {news.length > 0 && (
        <>
          <div className={styles.sectionHead}>
            <h3>{t.homeLatestNews}</h3>
            <button type="button" className={styles.linkBtn} onClick={() => onGo('news')}>{t.seeAll}</button>
          </div>
          <div className={styles.newsList}>
            {news.slice(0, 2).map((p) => <NewsCard key={p.id} post={p} onEdit={onEditNews} />)}
          </div>
        </>
      )}

      {shops.length > 0 && (
        <>
          <div className={styles.sectionHead}>
            <h3>{t.homeLatestMarket}</h3>
            <button type="button" className={styles.linkBtn} onClick={() => onGo('market')}>{t.seeAll}</button>
          </div>
          <div className={styles.grid}>
            {shops.slice(0, 4).map((p) => (
              <PostCard key={p.id} kind="shop" collectionName="villageShops" post={p} ratings={ratings} onEdit={onEditShop}
                compact onOpen={(post) => onOpenShop(post.id)} />
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
              <PostCard key={p.id} kind="provider" collectionName="villageProviders" post={p} ratings={ratings} onEdit={onEditProvider} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
