import { createContext, useContext, useState } from 'react'

export const LangContext = createContext(null)

export const STRINGS = {
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
    snacks: '\u{1F35F} Snacks / Others',
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
  th: {
    appName: '\u0E2B\u0E32\u0E23\u0E1A\u0E34\u0E25',
    tabSplit: '\u0E2B\u0E32\u0E23\u0E1A\u0E34\u0E25',
    tabSushi: 'Sushiro',
    members: '\u0E04\u0E19\u0E17\u0E35\u0E48\u0E23\u0E48\u0E27\u0E21\u0E01\u0E34\u0E19',
    addMember: '+ \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E04\u0E19',
    memberPlaceholder: '\u0E0A\u0E37\u0E48\u0E2D \u0E40\u0E0A\u0E48\u0E19 \u0E41\u0E2D\u0E19',
    foodItems: '\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E32\u0E2B\u0E32\u0E23',
    addFood: '+ \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2D\u0E32\u0E2B\u0E32\u0E23',
    foodPlaceholder: '\u0E0A\u0E37\u0E48\u0E2D\u0E2D\u0E32\u0E2B\u0E32\u0E23',
    price: '\u0E23\u0E32\u0E04\u0E32',
    extras: '\u0E04\u0E48\u0E32\u0E18\u0E23\u0E23\u0E21\u0E40\u0E19\u0E35\u0E22\u0E21\u0E1E\u0E34\u0E40\u0E28\u0E29',
    vat: 'VAT',
    serviceCharge: 'Service Charge',
    result: '\u0E2A\u0E23\u0E38\u0E1B\u0E22\u0E2D\u0E14',
    total: '\u0E23\u0E27\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14',
    perPerson: '\u0E04\u0E19\u0E25\u0E30',
    share: '\u0E41\u0E0A\u0E23\u0E4C\u0E2A\u0E23\u0E38\u0E1B',
    reset: '\u0E23\u0E35\u0E40\u0E0B\u0E47\u0E15',
    people: '\u0E04\u0E19\u0E17\u0E35\u0E48\u0E01\u0E34\u0E19',
    addPerson: '+ \u0E40\u0E1E\u0E34\u0E48\u0E21',
    personPlaceholder: '\u0E0A\u0E37\u0E48\u0E2D \u0E40\u0E0A\u0E48\u0E19 \u0E1E\u0E38\u0E21, \u0E01\u0E35\u0E01\u0E35\u0E49',
    nameTaken: '\u0E0A\u0E37\u0E48\u0E2D\u0E19\u0E35\u0E49\u0E21\u0E35\u0E41\u0E25\u0E49\u0E27',
    platesOf: '\u0E08\u0E32\u0E19\u0E02\u0E2D\u0E07',
    resetAll: '\u0E23\u0E35\u0E40\u0E0B\u0E47\u0E15\u0E17\u0E38\u0E01\u0E04\u0E19',
    snacks: '\u{1F35F} \u0E02\u0E2D\u0E07\u0E01\u0E34\u0E19\u0E40\u0E25\u0E48\u0E19 / \u0E2D\u0E37\u0E48\u0E19\u0E46',
    snackName: '\u0E0A\u0E37\u0E48\u0E2D\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 (\u0E44\u0E21\u0E48\u0E1A\u0E31\u0E07\u0E04\u0E31\u0E1A)',
    snackPrice: '\u0E23\u0E32\u0E04\u0E32',
    subtotalOf: '\u0E23\u0E27\u0E21\u0E02\u0E2D\u0E07',
    options: '\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01',
    summary: '\u0E2A\u0E23\u0E38\u0E1B\u0E23\u0E32\u0E22\u0E04\u0E19',
    plates: '\u0E08\u0E32\u0E19',
    items: '\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23',
    grandTotal: '\u0E23\u0E27\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14',
    foodSubtotal: '\u0E22\u0E2D\u0E14\u0E2D\u0E32\u0E2B\u0E32\u0E23',
    addEmpty: '\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E0A\u0E37\u0E48\u0E2D\u0E04\u0E19\u0E01\u0E48\u0E2D\u0E19 \u0E41\u0E25\u0E49\u0E27\u0E04\u0E48\u0E2D\u0E22\u0E19\u0E31\u0E1A\u0E08\u0E32\u0E19\u0E43\u0E2B\u0E49\u0E41\u0E15\u0E48\u0E25\u0E30\u0E04\u0E19',
  },
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState('en')
  const t = STRINGS[lang]
  const toggle = () => setLang(l => l === 'th' ? 'en' : 'th')
  return (
    <LangContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
