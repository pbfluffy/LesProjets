import { createContext, useContext, useEffect, useState } from 'react'

export const LangContext = createContext(null)

export const STRINGS = {
  en: {
    appName: 'Stock Ranges',
    tagline: 'See where each stock sits in its own recent price range.',
    backToHome: 'Back to portfolio',
    addPlaceholder: 'Ticker, e.g. AAPL',
    addBtn: 'Add',
    lookbackLabel: 'Lookback',
    range1d: '1 day',
    range7d: '7 days',
    range3mo: '3 months',
    range6mo: '6 months',
    range1y: '1 year',
    range2y: '2 years',
    range5y: '5 years',
    emptyWatchlist: 'No tickers yet — add one above to see its price range.',
    noTagMatches: 'No tickers match the selected tags.',
    filterByTag: 'Filter',
    addTag: 'Tag',
    addTagPlaceholder: 'Tag name',
    removeTag: 'Remove tag',
    low: 'Low',
    high: 'High',
    band: 'Band',
    signalBuy: 'Buy zone',
    signalHold: 'Hold',
    signalSell: 'Sell zone',
    signalFlat: 'Not enough range',
    loading: 'Loading…',
    errorPrefix: 'Error: ',
    removeLabel: 'Remove',
    duplicateTicker: 'Already in your watchlist',
    updatedJustNow: 'Updated just now',
    updatedPrefix: 'Updated',
    updatedMinSuffix: 'm ago',
    currencyToggle: 'Switch between USD and THB',
    langToggle: 'Switch language',
    themeToggleLight: 'Switch to light mode',
    themeToggleDark: 'Switch to dark mode',
    chartTypeSwitchToCandle: 'Switch to candlestick view',
    chartTypeSwitchToLine: 'Switch to line view',
    fxUnavailable: 'Exchange rate unavailable — showing native currency',
    disclaimerTitle: 'Not financial advice',
    disclaimer: 'The band and buy/hold/sell label are a simple statistical measure of where today’s price sits within its own recent range — nothing more. They say nothing about a company’s fundamentals or future performance. Do your own research before making any investment decision.',
    acctSignIn: 'Sign in',
    acctContinueWithGoogle: 'Continue with Google',
    acctSigningIn: 'Signing in…',
    acctSignOut: 'Sign out',
    acctSyncing: 'Syncing…',
    acctSynced: 'Synced',
    acctSyncError: 'Sync error',
    acctSyncBlurb: 'Sign in to sync your watchlist across devices.',
    conflictTitle: 'Watchlist differs on another device',
    conflictBody: 'This account already has a synced watchlist that doesn’t match this device. Pick which one to keep — the other will be replaced.',
    conflictThisDevice: 'This device',
    conflictOtherDevice: 'Other device',
    conflictTickerCount: '{n} tickers',
    conflictLastSaved: 'Last saved {when}',
    conflictNeverSaved: 'Not saved yet',
    conflictUse: 'Use this',
  },
  th: {
    appName: 'ช่วงราคาหุ้น',
    tagline: 'ดูว่าราคาหุ้นแต่ละตัวอยู่ตรงไหนในช่วงราคาล่าสุดของมันเอง',
    backToHome: 'กลับสู่หน้ารวมแอป',
    addPlaceholder: 'สัญลักษณ์หุ้น เช่น AAPL',
    addBtn: 'เพิ่ม',
    lookbackLabel: 'ช่วงเวลาย้อนหลัง',
    range1d: '1 วัน',
    range7d: '7 วัน',
    range3mo: '3 เดือน',
    range6mo: '6 เดือน',
    range1y: '1 ปี',
    range2y: '2 ปี',
    range5y: '5 ปี',
    emptyWatchlist: 'ยังไม่มีหุ้นในรายการ — เพิ่มด้านบนเพื่อดูช่วงราคา',
    noTagMatches: 'ไม่มีหุ้นที่ตรงกับแท็กที่เลือก',
    filterByTag: 'กรอง',
    addTag: 'แท็ก',
    addTagPlaceholder: 'ชื่อแท็ก',
    removeTag: 'ลบแท็ก',
    low: 'ต่ำสุด',
    high: 'สูงสุด',
    band: 'ระดับ',
    signalBuy: 'โซนซื้อ',
    signalHold: 'ถือ',
    signalSell: 'โซนขาย',
    signalFlat: 'ข้อมูลไม่พอ',
    loading: 'กำลังโหลด…',
    errorPrefix: 'ผิดพลาด: ',
    removeLabel: 'ลบ',
    duplicateTicker: 'มีอยู่ในรายการแล้ว',
    updatedJustNow: 'อัปเดตล่าสุด',
    updatedPrefix: 'อัปเดตเมื่อ',
    updatedMinSuffix: ' นาทีที่แล้ว',
    currencyToggle: 'สลับระหว่าง USD และ THB',
    langToggle: 'เปลี่ยนภาษา',
    themeToggleLight: 'สลับเป็นโหมดสว่าง',
    themeToggleDark: 'สลับเป็นโหมดมืด',
    chartTypeSwitchToCandle: 'สลับเป็นกราฟแท่งเทียน',
    chartTypeSwitchToLine: 'สลับเป็นกราฟเส้น',
    fxUnavailable: 'ไม่สามารถแปลงสกุลเงินได้ — แสดงสกุลเงินต้นฉบับ',
    disclaimerTitle: 'ไม่ใช่คำแนะนำการลงทุน',
    disclaimer: 'ระดับและป้ายซื้อ/ถือ/ขาย เป็นเพียงการวัดทางสถิติง่ายๆ ว่าราคาปัจจุบันอยู่ตรงไหนในช่วงราคาล่าสุดของหุ้นนั้นเท่านั้น ไม่ได้บ่งบอกถึงพื้นฐานบริษัทหรือผลการดำเนินงานในอนาคต โปรดศึกษาข้อมูลเพิ่มเติมก่อนตัดสินใจลงทุน',
    acctSignIn: 'เข้าสู่ระบบ',
    acctContinueWithGoogle: 'ดำเนินการต่อด้วย Google',
    acctSigningIn: 'กำลังเข้าสู่ระบบ…',
    acctSignOut: 'ออกจากระบบ',
    acctSyncing: 'กำลังซิงค์…',
    acctSynced: 'ซิงค์แล้ว',
    acctSyncError: 'ซิงค์ผิดพลาด',
    acctSyncBlurb: 'เข้าสู่ระบบเพื่อซิงค์รายการหุ้นของคุณข้ามอุปกรณ์',
    conflictTitle: 'รายการหุ้นไม่ตรงกับอุปกรณ์อื่น',
    conflictBody: 'บัญชีนี้มีรายการหุ้นที่ซิงค์ไว้แล้วซึ่งไม่ตรงกับอุปกรณ์นี้ เลือกว่าจะเก็บรายการไหนไว้ — อีกอันจะถูกแทนที่',
    conflictThisDevice: 'อุปกรณ์นี้',
    conflictOtherDevice: 'อุปกรณ์อื่น',
    conflictTickerCount: '{n} หุ้น',
    conflictLastSaved: 'บันทึกล่าสุด {when}',
    conflictNeverSaved: 'ยังไม่ได้บันทึก',
    conflictUse: 'ใช้อันนี้',
  },
}

const LANG_KEY = 'stockranges_lang'

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || 'th')

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang)
    document.documentElement.lang = lang
  }, [lang])

  const toggle = () => setLang((l) => (l === 'th' ? 'en' : 'th'))

  return (
    <LangContext.Provider value={{ lang, toggle, s: STRINGS[lang] }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
