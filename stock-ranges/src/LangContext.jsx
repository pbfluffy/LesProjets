import { createContext, useContext, useEffect, useState } from 'react'

export const LangContext = createContext(null)

export const STRINGS = {
  en: {
    appName: 'Stock Ranges',
    tagline: 'See where each stock sits in its own recent price range.',
    addPlaceholder: 'Ticker, e.g. AAPL',
    addBtn: 'Add',
    lookbackLabel: 'Lookback',
    range3mo: '3 months',
    range6mo: '6 months',
    range1y: '1 year',
    range2y: '2 years',
    range5y: '5 years',
    emptyWatchlist: 'No tickers yet — add one above to see its price range.',
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
    currencyToggle: 'Switch between USD and THB',
    fxUnavailable: 'Exchange rate unavailable — showing native currency',
    disclaimerTitle: 'Not financial advice',
    disclaimer: 'The band and buy/hold/sell label are a simple statistical measure of where today’s price sits within its own recent range — nothing more. They say nothing about a company’s fundamentals or future performance. Do your own research before making any investment decision.',
  },
  th: {
    appName: 'ช่วงราคาหุ้น',
    tagline: 'ดูว่าราคาหุ้นแต่ละตัวอยู่ตรงไหนในช่วงราคาล่าสุดของมันเอง',
    addPlaceholder: 'สัญลักษณ์หุ้น เช่น AAPL',
    addBtn: 'เพิ่ม',
    lookbackLabel: 'ช่วงเวลาย้อนหลัง',
    range3mo: '3 เดือน',
    range6mo: '6 เดือน',
    range1y: '1 ปี',
    range2y: '2 ปี',
    range5y: '5 ปี',
    emptyWatchlist: 'ยังไม่มีหุ้นในรายการ — เพิ่มด้านบนเพื่อดูช่วงราคา',
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
    currencyToggle: 'สลับระหว่าง USD และ THB',
    fxUnavailable: 'ไม่สามารถแปลงสกุลเงินได้ — แสดงสกุลเงินต้นฉบับ',
    disclaimerTitle: 'ไม่ใช่คำแนะนำการลงทุน',
    disclaimer: 'ระดับและป้ายซื้อ/ถือ/ขาย เป็นเพียงการวัดทางสถิติง่ายๆ ว่าราคาปัจจุบันอยู่ตรงไหนในช่วงราคาล่าสุดของหุ้นนั้นเท่านั้น ไม่ได้บ่งบอกถึงพื้นฐานบริษัทหรือผลการดำเนินงานในอนาคต โปรดศึกษาข้อมูลเพิ่มเติมก่อนตัดสินใจลงทุน',
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
