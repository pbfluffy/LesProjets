import { useEffect, useMemo, useState } from 'react'
import { useLangContext, interp } from '../LangContext'
import { useAuthContext } from '../hooks/useAuth'
import { useCategoriesContext, saveCategories, newCategoryKey } from '../hooks/useCategories'
import { logAdmin } from '../adminLog'
import styles from './ui.module.css'

const MAX = 30 // firestore.rules: up to 30 per list

// Admin tab → หมวดหมู่: add, rename, reorder and remove the marketplace
// categories and handyman types. Edits stay local until Save, which writes
// both lists to villageConfig/categories. Posts keep the category keys, so
// renaming keeps them tagged; removing just drops that tag from them.
export default function AdminCategories({ shops, providers }) {
  const { t } = useLangContext()
  const { user } = useAuthContext()
  const cats = useCategoriesContext()
  const [draft, setDraft] = useState(() => ({ market: cats.market, trades: cats.trades }))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Someone else saved meanwhile and nothing is being edited here: follow it.
  useEffect(() => {
    if (!dirty) setDraft({ market: cats.market, trades: cats.trades })
  }, [cats.market, cats.trades, dirty])

  // key -> how many posts use it, so removing one says what it affects.
  const usage = useMemo(() => {
    const count = (posts, field) => {
      const n = {}
      for (const p of posts) for (const k of p[field] || []) n[k] = (n[k] || 0) + 1
      return n
    }
    return { market: count(shops, 'categories'), trades: count(providers, 'trades') }
  }, [shops, providers])

  const edit = (list, fn) => {
    setDraft((d) => ({ ...d, [list]: fn(d[list]) }))
    setDirty(true)
    setSaved(false)
  }
  const setName = (list, i, field, value) =>
    edit(list, (l) => l.map((c, j) => (j === i ? { ...c, [field]: value } : c)))
  const move = (list, i, by) => edit(list, (l) => {
    const next = [...l]
    const [c] = next.splice(i, 1)
    next.splice(i + by, 0, c)
    return next
  })
  const remove = (list, i) => {
    const c = draft[list][i]
    const n = usage[list][c.key] || 0
    const msg = n ? interp(t.catRemoveUsed, { name: c.th || c.en, n }) : interp(t.catRemoveConfirm, { name: c.th || c.en })
    if (window.confirm(msg)) edit(list, (l) => l.filter((_, j) => j !== i))
  }
  const add = (list) => edit(list, (l) => [...l, { key: newCategoryKey(), th: '', en: '' }])

  async function save() {
    const clean = (l) => l
      .map((c) => ({ key: c.key, th: c.th.trim().slice(0, 40), en: c.en.trim().slice(0, 40) }))
      .filter((c) => c.th || c.en)
    const next = { market: clean(draft.market), trades: clean(draft.trades) }
    if (!next.market.length || !next.trades.length) return alert(t.catNeedOne)
    setSaving(true)
    try {
      await saveCategories(next, user.uid)
      logAdmin(user, 'editCategories', { detail: next.market.length + ' / ' + next.trades.length })
      setDraft(next)
      setDirty(false)
      setSaved(true)
    } catch (e) {
      console.error('[village] categories save failed:', e?.code)
      alert(t.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  const section = (list, title) => (
    <div className={styles.catSection}>
      <h3 className={styles.catTitle}>{title}</h3>
      <ul className={styles.catList}>
        {draft[list].map((c, i) => (
          <li key={c.key} className={styles.catRow}>
            <div className={styles.catNames}>
              <input value={c.th} maxLength={40} placeholder={t.catTh} onChange={(e) => setName(list, i, 'th', e.target.value)} />
              <input value={c.en} maxLength={40} placeholder={t.catEn} onChange={(e) => setName(list, i, 'en', e.target.value)} />
            </div>
            <span className={styles.catUse}>{interp(t.catUsed, { n: usage[list][c.key] || 0 })}</span>
            <div className={styles.catBtns}>
              <button type="button" onClick={() => move(list, i, -1)} disabled={i === 0} aria-label={t.catUp}>↑</button>
              <button type="button" onClick={() => move(list, i, 1)} disabled={i === draft[list].length - 1} aria-label={t.catDown}>↓</button>
              <button type="button" onClick={() => remove(list, i)} aria-label={t.delete} className={styles.catDel}>🗑</button>
            </div>
          </li>
        ))}
      </ul>
      {draft[list].length < MAX && (
        <button type="button" className={styles.secondaryBtn} onClick={() => add(list)}>{t.catAdd}</button>
      )}
    </div>
  )

  return (
    <>
      <p className={styles.hint} style={{ marginBottom: 12 }}>{t.catBlurb}</p>
      {section('market', '🛒 ' + t.navMarket)}
      {section('trades', '🔧 ' + t.navServices)}
      <div className={styles.catSave}>
        {saved && !dirty && <span className={styles.catSaved}>✓ {t.catSaved}</span>}
        <button type="button" className={styles.primaryBtn} onClick={save} disabled={!dirty || saving}>
          {saving ? t.saving : t.save}
        </button>
      </div>
    </>
  )
}
