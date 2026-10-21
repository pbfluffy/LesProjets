import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { db, doc, onSnapshot, setDoc, serverTimestamp } from '../firebase'
import { STRINGS, MARKET_CATEGORIES, TRADES } from '../LangContext'

// Marketplace categories and handyman types, editable by admins (admin tab →
// หมวดหมู่). Stored at villageConfig/categories as
//   { market: [{ key, th, en }], trades: [{ key, th, en }] }
// Posts store the keys, so renaming a category keeps its posts. Until an
// admin first saves, the built-in lists (LangContext) are used.
const REF = ['villageConfig', 'categories']

const builtIn = (keys, prefix) =>
  keys.map((key) => ({ key, th: STRINGS.th[prefix + key], en: STRINGS.en[prefix + key] }))
export const DEFAULT_CATEGORIES = {
  market: builtIn(MARKET_CATEGORIES, 'cat_'),
  trades: builtIn(TRADES, 'trade_'),
}

export function useCategories() {
  const [lists, setLists] = useState(DEFAULT_CATEGORIES)

  useEffect(() => onSnapshot(
    doc(db, ...REF),
    (snap) => {
      const d = snap.exists() ? snap.data() : null
      setLists({
        market: d?.market?.length ? d.market : DEFAULT_CATEGORIES.market,
        trades: d?.trades?.length ? d.trades : DEFAULT_CATEGORIES.trades,
      })
    },
    (e) => console.error('[village] categories failed:', e?.code),
  ), [])

  return lists
}

export function saveCategories(lists, uid) {
  return setDoc(doc(db, ...REF), {
    market: lists.market,
    trades: lists.trades,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  })
}

// New keys for admin-added categories (built-in ones keep their names).
export const newCategoryKey = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

// { market, trades, label(kind, key), keys(kind) } — kind 'shop' | 'provider'.
export const CategoriesContext = createContext(null)
export function useCategoriesContext() {
  return useContext(CategoriesContext)
}

export function useCategoryHelpers(lists, lang) {
  return useMemo(() => {
    const listFor = (kind) => (kind === 'shop' ? lists.market : lists.trades)
    const byKey = { shop: new Map(lists.market.map((c) => [c.key, c])), provider: new Map(lists.trades.map((c) => [c.key, c])) }
    return {
      ...lists,
      listFor,
      // A removed category returns null — callers just skip that tag.
      label: (kind, key) => {
        const c = byKey[kind]?.get(key)
        return c ? (lang === 'en' ? c.en || c.th : c.th || c.en) : null
      },
    }
  }, [lists, lang])
}
