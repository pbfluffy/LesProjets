import { useState } from 'react'
import { useLangContext, interp } from '../LangContext'
import PostCard from './PostCard'
import { shopsWithDeals } from '../deals'
import { useCategoriesContext } from '../hooks/useCategories'
import { NewsCard } from './NewsBoard'
import styles from './ui.module.css'

const SAVED_PREVIEW = 4 // saved posts shown before "see all"

export default function Home({ shops, providers, news, ratings, onGo, onEditShop, onEditProvider, onEditNews, onOpenPost, myPosts = [], newReviews, savedPosts = [] }) {
  const { t } = useLangContext()
  const [allSaved, setAllSaved] = useState(false)
  const deals = shopsWithDeals(shops) // sales and new items, newest first
  const itemsForSale = shops.reduce((n, s) => n + (s.items || []).filter((it) => !it.sold).length, 0)

  // One search over every shop, item and handyman (names, descriptions,
  // item names and tag labels); while it has text, the results replace the rest.
  const cats = useCategoriesContext()
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const matches = (p, kind) => [
    p.name, p.description,
    ...(p.items || []).map((it) => it.name),
    ...(p[kind === 'shop' ? 'categories' : 'trades'] || []).map((c) => cats.label(kind, c)),
  ].filter(Boolean).join(' ').toLowerCase().includes(q)
  const results = q
    ? [...shops.filter((p) => matches(p, 'shop')).map((p) => ({ ...p, kind: 'shop' })),
       ...providers.filter((p) => matches(p, 'provider')).map((p) => ({ ...p, kind: 'provider' }))]
    : []

  const top = (
    <>
      <div className={styles.hero}>
        <h2>{t.homeWelcome}</h2>
        <p>{t.homeBlurb}</p>
      </div>
      <input
        type="search"
        className={styles.search}
        style={{ width: '100%', marginBottom: 16 }}
        placeholder={t.homeSearchPh}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </>
  )

  if (q) {
    return (
      <section>
        {top}
        <div className={styles.sectionHead}>
          <h3>{interp(t.homeSearchResults, { n: results.length })}</h3>
          <button type="button" className={styles.linkBtn} onClick={() => setSearch('')}>{t.cancel}</button>
        </div>
        {results.length === 0 ? (
          <p className={styles.empty}>{t.noMatches}</p>
        ) : (
          <div className={styles.grid}>
            {results.map((p) => (
              <PostCard key={p.id} kind={p.kind} collectionName={p.kind === 'shop' ? 'villageShops' : 'villageProviders'} post={p} ratings={ratings}
                onEdit={p.kind === 'shop' ? onEditShop : onEditProvider} compact onOpen={(post) => onOpenPost(post.id)} />
            ))}
          </div>
        )}
      </section>
    )
  }

  return (
    <section>
      {top}

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

      {/* My shops: the signed-in person's own posts, first, with new reviews. */}
      {myPosts.length > 0 && (
        <>
          <div className={styles.sectionHead}>
            <h3>{t.myPosts}</h3>
          </div>
          <div className={styles.grid} style={{ marginBottom: 24 }}>
            {myPosts.map((p) => {
              const n = newReviews(p.id)
              return (
                <PostCard key={p.id} kind={p.kind} collectionName={p.kind === 'shop' ? 'villageShops' : 'villageProviders'} post={p} ratings={ratings}
                  onEdit={p.kind === 'shop' ? onEditShop : onEditProvider} compact onOpen={(post) => onOpenPost(post.id)}
                  badge={n > 0 ? interp(t.newReviews, { n }) : null} />
              )
            })}
          </div>
        </>
      )}

      {savedPosts.length > 0 && (
        <>
          <div className={styles.sectionHead}>
            <h3>♥ {t.savedPosts} ({savedPosts.length})</h3>
            {savedPosts.length > SAVED_PREVIEW && (
              <button type="button" className={styles.linkBtn} onClick={() => setAllSaved(!allSaved)}>{allSaved ? t.showLess : t.seeAll}</button>
            )}
          </div>
          <div className={styles.grid} style={{ marginBottom: 24 }}>
            {(allSaved ? savedPosts : savedPosts.slice(0, SAVED_PREVIEW)).map((p) => (
              <PostCard key={p.id} kind={p.kind} collectionName={p.kind === 'shop' ? 'villageShops' : 'villageProviders'} post={p} ratings={ratings}
                onEdit={p.kind === 'shop' ? onEditShop : onEditProvider} compact onOpen={(post) => onOpenPost(post.id)} />
            ))}
          </div>
        </>
      )}

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

      {deals.length > 0 && (
        <>
          <div className={styles.sectionHead}>
            <h3>🏷️ {t.homeDeals}</h3>
          </div>
          <div className={styles.grid} style={{ marginBottom: 24 }}>
            {deals.slice(0, 4).map((p) => (
              <PostCard key={p.id} kind="shop" collectionName="villageShops" post={p} ratings={ratings} onEdit={onEditShop}
                compact onOpen={(post) => onOpenPost(post.id)} />
            ))}
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
                compact onOpen={(post) => onOpenPost(post.id)} />
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
              <PostCard key={p.id} kind="provider" collectionName="villageProviders" post={p} ratings={ratings} onEdit={onEditProvider}
                compact onOpen={(post) => onOpenPost(post.id)} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
