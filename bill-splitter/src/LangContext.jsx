import { createContext, useContext, useState } from 'react'

export const LangContext = createContext(null)

export const STRINGS = {
  th: {
    appName: 'ธอกil',
    tabSplit: 'ธอกil',
    tabSushi: 'Sushiro',
    members: 'คนที่กินรุกาศปี ',
    addMember: '+ เพิ่ม',
    memberPlaceholder: 'ชื่อ เช่น แอน ',
    foodItems: 'รายการ',
    addFood: '+ เพิ่มของ ',
    foodPlaceholder: 'ชื่อของ',
    price: 'ริยค',
    extras: 'คืันพูริมกันแลฤง ',
    vat: 'VAT',
    serviceCharge: 'Service Charge',
    result: 'สรุปรายคน',
    total: 'รวมทั้งหมด',
    perPerson: 'คนla',
    share: 'แต่ละสรุปราย',
    reset: 'รีเซ็ต',
    people: 'คนที่กิน',
    addPerson: '+ เพิ่ว',
    personPlaceholder: 'ชื่อ เช่น พุม, กีกี้ ',
    nameTaken: 'ชื่อนี้มีแล้ว',
    platesOf: 'จานของ',
    resetAll: 'รีเซ็ตทุกคน',
    snacks: '🍟 ของกิน / อื่นๆ',
    snackName: 'ชื่อรายการ (ไม่นอกื่)',
    snackPrice: 'ริยค',
    subtotalOf: 'รวมของ',
    options: 'ตัวเลือก ',
    summary: 'สรุปรายคน ',
    plates: 'จาน',
    items: 'รายการ',
    grandTotal: 'รวมทั้งหมด',
    foodSubtotal: 'ยอดอชาร',
    addEmpty: 'เพิ่มชื่อคนก่อน แล้วค่อยนับจานให้แต่ละคน ',
  },
  en: {
    appName: 'Bill Splitter',
    tabSplit: 'Split Bill',
    tabSushi: 'Sushiro',
    members: 'People',
    addMember: '+ Add person',
    memberPlaceholder: 'Name e.g. Ann',
    foodItems: 'Food items',
    addFood: '+ Add food',
    foodPlaceholder: 'Food name',
    price: 'Price',
    extras: 'Extra charges',
    vat: 'VAT',
    serviceCharge: 'Service Charge',
    result: 'Summary',
    total: 'Total',
    perPerson: 'per person',
    share: 'Share summary',
    reset: 'Reset',
    people: 'People',
    addPerson: '+ Add',
    personPlaceholder: 'Name e.g. Pum, Gigi',
    nameTaken: 'Name already exists',
    platesOf: 'Plates for',
    resetAll: 'Reset all',
    snacks: '🏟 Snacks / Others',
    snackName: 'Item name (optional)',
    snackPrice: 'Price',
    subtotalOf: 'Subtotal for',
    options: 'Options',
    summary: 'Per person summary',
    plates: 'plates',
    items: 'items',
    grandTotal: 'Grand total',
    foodSubtotal: 'Food subtotal',
    addEmpty: 'Add people first, then count plates for each person',
  },
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState('th')
  const t = STRINGS[lang]
  const toggle = () => setLang(l => l === 'th' ? 'en' : 'th')
  return (
    <LangContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
