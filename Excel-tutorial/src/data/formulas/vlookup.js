// VLOOKUP — bilingual formula data
export default {
  id: 'vlookup',
  label: 'VLOOKUP',
  emoji: '⟳',
  accent: '#0ea5e9',
  accentLight: '#e0f2fe',
  accentVar: '--c-vlookup',
  accentSoftVar: '--c-vlookup-soft',

  tagline: { th: 'ค้นหาข้อมูลในตาราง', en: 'Look up data inside a table' },
  intro: {
    th: 'VLOOKUP ใช้ค้นหาข้อมูลในตาราง — บอกค่าที่ต้องการค้น Excel จะวิ่งลงคอลัมน์แรกของตาราง พอเจอค่าที่ตรงก็จะเดินไปดึงข้อมูลจากคอลัมน์ที่ต้องการ เหมือนค้นพจนานุกรม',
    en: "VLOOKUP looks something up in a table. You give it a value to find; Excel walks down the first column of the table, and when it finds a match, it walks across to pull data from a column you specify — like flipping through a dictionary.",
  },

  parts: [
    {
      text: '=VLOOKUP',
      type: 'fn',
      color: '#0ea5e9',
      title: { th: 'ชื่อฟังก์ชัน', en: 'Function name' },
      desc: {
        th: 'V = Vertical (แนวตั้ง) — Excel ค้นหาในคอลัมน์แรกจากบนลงล่าง แล้วดึงข้อมูลจากคอลัมน์ที่ระบุ',
        en: "V = Vertical. Excel searches the first column top-to-bottom, then pulls data from a column you specify.",
      },
    },
    { text: '(', type: 'bracket' },
    {
      text: 'A10',
      type: 'arg',
      color: '#ef4444',
      argLabel: { th: '① ค่าที่ค้น', en: '① lookup value' },
      title: { th: 'Lookup Value — บอก Excel ว่าค้นหาอะไร', en: "Lookup Value — tell Excel what you're searching for" },
      desc: {
        th: 'cell หรือค่าที่ต้องการค้น — Excel จะเอาค่านี้ไปวิ่งหาในคอลัมน์แรกของตาราง เช่น รหัสสินค้า, รหัสพนักงาน',
        en: 'A cell reference or literal value to look up. Excel takes this and searches the first column of the table — e.g. a product code or employee ID.',
      },
    },
    { text: ',', type: 'sep' },
    {
      text: '$A$2:$D$100',
      type: 'arg',
      color: '#f59e0b',
      argLabel: { th: '② ตาราง', en: '② table' },
      title: { th: 'Table Array — ตารางข้อมูลทั้งหมด', en: 'Table Array — the full lookup table' },
      desc: {
        th: 'ช่วงของตารางที่จะค้น — คอลัมน์แรกต้องมีค่าที่ค้น ใส่ $ เพื่อ lock range เมื่อ copy สูตร เช่น $A$2:$D$100',
        en: 'The range to search. The first column must contain the values you look up. Use $ to lock the range when copying the formula, e.g. $A$2:$D$100.',
      },
    },
    { text: ',', type: 'sep' },
    {
      text: '3',
      type: 'arg',
      color: '#10b981',
      argLabel: { th: '③ คอลัมน์ที่', en: '③ column #' },
      title: { th: 'Col Index — ดึงข้อมูลจากคอลัมน์ที่เท่าไหร่', en: 'Col Index — which column to pull from' },
      desc: {
        th: 'นับจากซ้ายของตาราง — 1 = คอลัมน์แรก, 2 = คอลัมน์ที่สอง, 3 = คอลัมน์ที่สาม ฯลฯ',
        en: 'Counted from the left of the table — 1 = first column, 2 = second, 3 = third, and so on.',
      },
    },
    { text: ',', type: 'sep' },
    {
      text: 'FALSE',
      type: 'arg',
      color: '#6366f1',
      argLabel: { th: '④ วิธีค้น', en: '④ match mode' },
      title: { th: 'Range Lookup — FALSE = ค้นแบบตรงๆ เสมอ!', en: 'Range Lookup — always use FALSE for exact match!' },
      desc: {
        th: 'FALSE = Exact Match ค้นหาแบบตรงตัว (ใส่เสมอ!) — TRUE = Approximate ค้นใกล้เคียง ใช้กับตารางเกรดเท่านั้น',
        en: "FALSE = exact match (always use this). TRUE = approximate match — only useful for sorted lookup tables like grade bands.",
      },
    },
    { text: ')', type: 'bracket' },
  ],

  steps: [
    { n: 1, text: { th: "Excel รับค่าจาก A10 เช่น 'P003'", en: "Excel reads the lookup value from A10, e.g. 'P003'." } },
    { n: 2, text: { th: 'วิ่งลงคอลัมน์แรกของตาราง $A$2:$D$100 ทีละ row', en: 'It walks down the first column of $A$2:$D$100 row by row.' } },
    { n: 3, text: { th: "เจอ row ที่คอลัมน์แรกมีค่า = 'P003' → หยุด!", en: "It finds the row where column 1 equals 'P003' and stops." } },
    { n: 4, text: { th: 'เดินไปทางขวา ดึงค่าจากคอลัมน์ที่ 3 กลับมา', en: 'It walks across to column 3 and returns that value.' } },
  ],

  mistakes: [
    {
      wrong: '=VLOOKUP(A10,A2:D100,3,TRUE)',
      right: '=VLOOKUP(A10,A2:D100,3,FALSE)',
      why: {
        th: 'ใส่ FALSE เสมอ TRUE ทำให้อาจได้ผลผิด',
        en: 'Always pass FALSE — TRUE silently returns wrong results unless your table is sorted just right.',
      },
    },
    {
      wrong: '=VLOOKUP(A10,B2:D100,3,FALSE)',
      right: '=VLOOKUP(A10,A2:D100,3,FALSE)',
      why: {
        th: 'ตารางต้องเริ่มจากคอลัมน์ที่มีค่าที่ค้น',
        en: 'The table range must start at the column that contains the lookup values.',
      },
    },
  ],

  usecases: [
    { th: 'ดึงราคาจากรหัสสินค้า', en: 'Look up price from product code' },
    { th: 'ค้นชื่อจาก Employee ID', en: 'Find name by employee ID' },
    { th: 'หาเกรดจากคะแนน', en: 'Map score to grade' },
    { th: 'ดึงรายละเอียดออเดอร์', en: 'Pull order details' },
  ],
}
