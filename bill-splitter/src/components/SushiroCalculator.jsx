import { useState } from 'react'
import { useSushiroStore, PLATES } from '../hooks/useSushiroStore'
import { useLang } from '../LangContext'
import styles from './SushiroCalculator.module.css'

const fmt = n => n.toFixed(2)

function Counter({ value, onInc, onDec }) {
  return (
    <div className={styles.counter}>
      <button type="button" className={styles.cntBtn} onClick={onDec}>âˆ’</button>
      <span className={styles.cntVal}>{value}</span>
      <button type="button" className={styles.cntBtn} onClick={onInc}>+</button>
    </div>
  )
}

function SnackAdder({ person, onAdd }) {
  const { t } = useLang()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const handleAdd = () => { const ok = onAdd(person, name, price); if (ok) { setName(''); setPrice('') } }
  return (
    <div className={styles.snackAdder}>
      <input type="text" placeholder={t.snackName} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} className={styles.snackName} />
      <div className={styles.snackPriceWrap}>
        <span className={styles.bahtSign}>à¸¿</span>
        <input type="number" placeholder={t.snackPrice} value={price} min="0" onChange={e => setPrice(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} className={styles.snackPrice} />
      </div>
      <button type="button" className={styles.snackAddBtn} onClick={handleAdd}>+</button>
    </div>
  )
}

export default function SushiroCalculator() {
  const store = useSushiroStore()
  const result = store.calculate()
  const { t } = useLang()
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')

  const handleAddPerson = () => {
    const ok = store.addPerson(nameInput)
    if (ok) { setNameInput(''); setNameError('') }
    else if (nameInput.trim()) { setNameError(t.nameTaken); setTimeout(() => setNameError(''), 1500) }
  }

  return (
    <div>
      <section className={styles.section}>
        <h2 className={styles.title}>{t.people}</h2>
        <div className={styles.inputRow}>
          <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPerson()} placeholder={t.personPlaceholder} className={nameError ? styles.inputError : ''} />
          <button type="button" className={styles.addBtn} onClick={handleAddPerson}>{t.addPerson}</button>
        </div>
        {nameError && <p className={styles.error}>{nameError}</p>}
        {store.people.length > 0 && (
          <div className={styles.personTabs}>
            {store.people.map(name => (
              <button type="button" key={name} className={`${styles.personTab} ${store.activePerson === name ? styles.personTabActive : ''}`} onClick={() => store.setActivePerson(name)}>
                <span className={styles.avatar}>{name.charAt(0).toUpperCase()}</span>
                {name}
                <span className={styles.removePersonBtn} onClick={e => { e.stopPropagation(); store.removePerson(name) }}>Ã—</pan>
              </button>
            ))}
          </div>
        )}
        {store.people.length === 0 && <p className={styles.empty}>{t.addEmpty}</p>}
      </section>

      {store.activePerson && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.title}>{t.platesOf} <span className={styles.activePersonBadge}>{store.activePerson}</span></h2>
            <button type="button" className={styles.resetBtn} onClick={store.resetAll}>{t.resetAll}</button>
          </div>
          <div className={styles.plateList}>
            {PLATES.map(plate => {
              const count = (store.plates[store.activePerson] ?? {})[plate.id] ?? 0
              return (
                <div key={plate.id} className={styles.plateRow}>
                  <span className={styles.dot} style={{ background: plate.color, border: `2px solid ${plate.border}` }} />
                  <span className={styles.plateName}>{plate.label}</span>
                  <span className={styles.platePriceTag}>à¸¿{plate.price}</span>
                  <Counter value={count} onInc={() => store.changePlate(store.activePerson, plate.id, 1)} onDec={() => store.changePlate(store.activePerson, plate.id, -1)} />
                  {count > 0 && <span className={styles.plateSubtotal}>à¸¿{count * plate.price}</span>}
                </div>
              )
            })}
          </div>
          <div className={styles.snackSection}>
            <div className={styles.snackTitle}>{t.snacks}</div>
            {(store.snacks[store.activePerson] ?? []).map(snack => (
              <div key={snack.id} className={styles.snackRow}>
                <span className={styles.snackRowName}>{s¹…¬¹¹…µ•ôð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”õíÍÑå±•Ì¹Í¹…­I½ÝAÉ¥•ôû‚âýíÍ¹…¬¹ÁÉ¥”€”€Ä€ôôô€À€üÍ¹…¬¹ÁÉ¥”€è™µÐ¡Í¹…¬¹ÁÉ¥”¥ôð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€ñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÍ9…µ”õíÍÑå±•Ì¹Í¹…­I•µ½Ù•ô½¹±¥¬õì ¤€ôøÍÑ½É”¹É•µ½Ù•M¹…¬¡ÍÑ½É”¹…Ñ¥Ù•A•ÉÍ½¸°Í¹…¬¹¥¥ôû\ð½‰ÕÑÑ½¸ø(€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€¤¥ô(€€€€€€€€€€€€ñM¹…­‘‘•ÈÁ•ÉÍ½¸õíÍÑ½É”¹…Ñ¥Ù•A•ÉÍ½¹ô½¹‘õíÍÑ½É”¹…‘‘M¹…­ô€¼ø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€ì  ¤€ôøì½¹ÍÐÍÕˆ€ôÉ•ÍÕ±Ð¹Á•ÉÍ½¹MÕ‰Ñ½Ñ…±ÍmÍÑ½É”¹…Ñ¥Ù•A•ÉÍ½¹t€üü€ÀìÉ•ÑÕÉ¸ÍÕˆ€ø€À€ü€ ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹Á•ÉÍ½¹MÕ‰	…ÉôøñÍÁ…¸ùíÐ¹ÍÕ‰Ñ½Ñ…±=™ôíÍÑ½É”¹…Ñ¥Ù•A•ÉÍ½¹ôð½ÍÁ…¸øñÍÁ…¸±…ÍÍ9…µ”õíÍÑå±•Ì¹Á•ÉÍ½¹MÕ‰µÑôû‚âýíÍÕˆ¹Ñ½1½…±•MÑÉ¥¹œ ¥ôð½ÍÁ…¸øð½‘¥Øø¤€è¹Õ±°ô¤ ¥ô(€€€€€€€€ð½Í•Ñ¥½¸ø(€€€€€€¥ô((€€€€€íÍÑ½É”¹Á•½Á±”¹±•¹Ñ €ø€À€˜˜€ (€€€€€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”õíÍÑå±•Ì¹Í•Ñ¥½¹ôø(€€€€€€€€€€ñ È±…ÍÍ9…µ”õíÍÑå±•Ì¹Ñ¥Ñ±•ôùíÐ¹½ÁÑ¥½¹Íôð½ Èø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹Ñ½±•Íôø(€€€€€€€€€€€€ñ±…‰•°±…ÍÍ9…µ”õíÍÑå±•Ì¹Ñ½±•ôøñ¥¹ÁÕÐÑåÁ”ô‰¡•­‰½àˆ¡•­•õíÍÑ½É”¹Ù…Ñ¹…‰±•‘ô½¹¡…¹”õí”€ôøÍÑ½É”¹Í•ÑY…Ñ¹…‰±•¡”¹Ñ…É•Ð¹¡•­•¥ô€¼øñÍÁ…¸ùíÐ¹Ù…Ñôð½ÍÁ…¸øñÍÁ…¸±…ÍÍ9…µ”õí€‘íÍÑå±•Ì¹‰…‘•ô€‘íÍÑå±•Ì¹‰±Õ•õôøÜ”ð½ÍÁ…¸øð½±…‰•°ø(€€€€€€€€€€€€ñ±…‰•°±…ÍÍ9…µ”õíÍÑå±•Ì¹Ñ½±•ôøñ¥¹ÁÕÐÑåÁ”ô‰¡•­‰½àˆ¡•­•õíÍÑ½É”¹Í•ÉÙ¥•¡…É•¹…‰±•‘ô½¹¡…¹”õí”€ôøÍÑ½É”¹Í•ÑM•ÉÙ¥•¡…É•¹…‰±•¡”¹Ñ…É•Ð¹¡•­•¥ô€¼øñÍÁ…¸ùíÐ¹Í•ÉÙ¥•¡…É•ôð½ÍÁ…¸øñÍÁ…¸±…ÍÍ9…µ”õí€‘íÍÑå±•Ì¹‰…‘•ô€‘íÍÑå±•Ì¹É••¹õôøÄÀ”ð½ÍÁ…¸øð½±…‰•°ø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€ð½Í•Ñ¥½¸ø(€€€€€€¥ô((€€€€€íÍÑ½É”¹Á•½Á±”¹±•¹Ñ €ø€À€˜˜É•ÍÕ±Ð¹Ñ½Ñ…±A±…Ñ•Ì€ø€À€˜˜€ (€€€€€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”õíÍÑå±•Ì¹Í•Ñ¥½¹ôø(€€€€€€€€€€ñ È±…ÍÍ9…µ”õíÍÑå±•Ì¹Ñ¥Ñ±•ôùíÐ¹ÍÕµµ…Éåôð½ Èø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹Á•ÉÍ½¹MÕµµ…Éå1¥ÍÑôø(€€€€€€€€€€€íÍÑ½É”¹Á•½Á±”¹µ…À¡¹…µ”€ôøì(€€€€€€€€€€€€€½¹ÍÐÑ½Ñ…°€ôÉ•ÍÕ±Ð¹Á•ÉÍ½¹Q½Ñ…±Ím¹…µ•t€üü€À(€€€€€€€€€€€€€½¹ÍÐÁÐ€ôÉ•ÍÕ±Ð¹É…¹‘Q½Ñ…°€ø€À€ü€¡Ñ½Ñ…°€¼É•ÍÕ±Ð¹É…¹‘Q½Ñ…°¤€¨€ÄÀÀ€è€À(€€€€€€€€€€€€€½¹ÍÐÕÍ•‘A±…Ñ•Ì€ôA1QD¹™¥±Ñ•È¡À€ôø€ ¡ÍÑ½É”¹Á±…Ñ•Ím¹…µ•t€üüíô¥mÀ¹¥‘t€üü€À¤€ø€À¤(€€€€€€€€€€€€€½¹ÍÐÁ•ÉÍ½¹M¹…­Ì€ôÍÑ½É”¹Í¹…­Ím¹…µ•t€üümt(€€€€€€€€€€€€€É•ÑÕÉ¸€ (€€€€€€€€€€€€€€€€ñ‘¥Ø­•äõí¹…µ•ô±…ÍÍ9…µ”õíÍÑå±•Ì¹Á•ÉÍ½¹MÕµµ…Éå…É‘ôø(€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹Á•ÉÍ½¹MÕµµ…Éå!•…‘•Éôø(€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹Á•ÉÍ½¹MÕµµ…Éå1•™Ñôø(€€€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”õíÍÑå±•Ì¹…Ù…Ñ…Éôùí¹…µ”¹¡…ÉÐ À¤¹Ñ½UÁÁ•É…Í” ¥ôð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Øø(€€€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹Á•ÉÍ½¹MÕµµ…Éå9…µ•ôùí¹…µ•ôð½‘¥Øø(€€€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹Á•ÉÍ½¹A±…Ñ•½ÑÍôø(€€€€€€€€€€€€€€€€€€€€€€€€€íÕÍ•‘A±…Ñ•Ì¹µ…À¡À€ôø€ñÍÁ…¸­•äõíÀ¹¥‘ô±…ÍÍ9…µ”õíÍÑå±•Ì¹Á±…Ñ•½ÑMµ…±±ôÍÑå±”õíì‰…­É½Õ¹èÀ¹½±½È°‰½É‘•Èè€ÅÁàÍ½±¥€‘íÀ¹‰½É‘•Éõ€õôÑ¥Ñ±”õíÀ¹±…‰•±ô€¼ø¥ô(€€€€€€€€€€€€€€€€€€€€€€€€€íÕÍ•‘A±…Ñ•Ì¹±•¹Ñ €ø€À€˜˜€ñÍÁ…¸±…ÍÍ9…µ”õíÍÑå±•Ì¹Á•ÉÍ½¹A±…Ñ•½Õ¹ÑôùíA1QL¹É•‘Õ” ¡Ì±À¤€ôøÌ¬ ¡ÍÑ½É”¹Á±…Ñ•Ím¹…µ•tüýíô¥mÀ¹¥‘tüüÀ¤°À¥ôíÐ¹Á±…Ñ•Íôð½ÍÁ…¸ùô(€€€€€€€€€€€€€€€€€€€€€€€€€íÁ•ÉÍ½¹M¹…­Ì¹±•¹Ñ €ø€À€˜˜€ñÍÁ…¸±…ÍÍ9…µ”õíÍÑå±•Ì¹Í¹…­½Õ¹Ñôø¬íÁ•ÉÍ½¹M¹…­Ì¹±•¹Ñ¡ôíÐ¹¥Ñ•µÍôð½ÍÁ…¸ùô(€€€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”õíÍÑå±•Ì¹Á•ÉÍ½¹MÕµµ…ÉåµÑôû‚âýí™µÐ¡Ñ½Ñ…°¥ôð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹‰…Éôøñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹‰…É¥±±ôÍÑå±”õíìÝ¥‘Ñ è€‘íÁÑô•€õô€¼øð½‘¥Øø(€€€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€€€¤(€€€€€€€€€€€ô¥ô(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹É…¹‘Q½Ñ…±	½áôø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹É…¹‘Q½Ñ…±I½ÝôøñÍÁ…¸±…ÍÍ9…µ”õíÍÑå±•Ì¹É…¹‘Q½Ñ…±1…‰•±ôùíÐ¹™½½‘MÕ‰Ñ½Ñ…±ôð½ÍÁ…¸øñÍÁ…¸û‚âýí™µÐ¡É•ÍÕ±Ð¹ÍÕ‰Ñ½Ñ…°¥ôð½ÍÁ…¸øð½‘¥Øø(€€€€€€€€€€€íÉ•ÍÕ±Ð¹Í•ÉÙ¥•¡…É”€ø€À€˜˜€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹É…¹‘Q½Ñ…±I½ÝôøñÍÁ…¸±…ÍÍ9…µ”õíÍÑå±•Ì¹É…¹‘Q½Ñ…±1…‰•±ôùíÐ¹Í•ÉÙ¥•¡…É•ô€ ÄÀ”¤ð½ÍÁ…¸øñÍÁ…¸û‚âýí™µÐ¡É•ÍÕ±Ð¹Í•ÉÙ¥•¡…É”¥ôð½ÍÁ…¸øð½‘¥Øùô(€€€€€€€€€€€íÉ•ÍÕ±Ð¹Ù…Ð€ø€À€˜˜€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹É…¹‘Q½Ñ…±I½ÝôøñÍÁ…¸±…ÍÍ9…µ”õíÍÑå±•Ì¹É…¹‘Q½Ñ…±1…‰•±ôùíÐ¹Ù…Ñô€ Ü”¤ð½ÍÁ…¸øñÍÁ…¸û‚âýí™µÐ¡É•ÍÕ±Ð¹Ù…Ð¥ôð½ÍÁ…¸øð½‘¥Øùô(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õí€‘íÍÑå±•Ì¹É…¹‘Q½Ñ…±I½Ýô€‘íÍÑå±•Ì¹É…¹‘Q½Ñ…±¥¹…±õôøñÍÁ…¸ùíÐ¹É…¹‘Q½Ñ…±ô€¡íÉ•ÍÕ±Ð¹Ñ½Ñ…±A±…Ñ•ÍôíÐ¹Á±…Ñ•Íô¤ð½ÍÁ…¸øñÍÁ…¸û‚âýí™µÐ¡É•ÍÕ±Ð¹É…¹‘Q½Ñ…°¥ôð½ÍÁ…¸øð½‘¥Øø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€ð½Í•Ñ¥½¸ø(€€€€€€¥ô(€€€€ð½‘¥Øø(€€¤)ô(