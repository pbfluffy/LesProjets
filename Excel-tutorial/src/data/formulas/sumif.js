// SUMIF — bilingual formula data
export default {
  id: 'sumif',
  label: 'SUMIF',
  emoji: 'Σ?',
  accent: '#f59e0b',
  accentLight: '#fef3c7',
  accentVar: '--c-sumif',
  accentSoftVar: '--c-sumif-soft',

  tagline: { th: 'รวมเฉพาะ row ที่ตรงเงื่อนไข', en: 'Sum only the rows that match a condition' },
  intro: {
    th: 'SUMIF = SUM + IF รวมกัน — รวมตัวเลขเฉพาะ row ที่ตรงตามเงื่อนไข เช่น รวมยอดขายเฉพาะสาขา A หรือรวมเฉพาะสินค้าที่ราคา > 100 บาท',
    en: 'SUMIF = SUM + IF together. It adds numbers only from rows that match a condition — e.g. total sales for branch A only, or sum of items priced over ฿100.',
  },

  parts: [
    {
      text: '=SUMIF',
      type: 'fn',
      color: '#f59e0b',
      title: { th: 'ชื่อฟังก์ชัน', en: 'Function name' },
      desc: {
        th: 'รวมตัวเลขแบบมีเงื่อนไข — ใช้ 3 argument: คอลัมน์ที่ตรวจ, เงื่อนไข, คอลัมน์ที่รวม',
        en: 'Conditional sum — takes 3 arguments: the column to check, the condition, and the column to add up.',
      },
    },
    { text: '(', type: 'bracket' },
    {
      text: 'A2:A100',
      type: 'arg',
      color: '#ef4444',
      argLabel: { th: '① ตรวจที่', en: '① check' },
      title: { th: 'Range — คอลัมน์ที่ใช้ตรวจเงื่อนไข', en: 'Range — the column to check the condition against' },
      desc: {
        th: "คอลัมน์ที่ Excel จะตรวจว่า row ไหนตรงเงื่อนไข เช่น คอลัมน์ 'สาขา' หรือ 'ประเภท'",
        en: "The column Excel inspects to decide which rows qualify — e.g. a 'Branch' or 'Category' column.",
      },
    },
    { text: ',', type: 'sep' },
    {
      text: '"สาขา A"',
      type: 'arg',
      color: '#10b981',
      argLabel: { th: '② เงื่อนไข', en: '② criteria' },
      title: { th: 'Criteria — เงื่อนไขที่ต้องการกรอง', en: 'Criteria — the condition to match' },
      desc: {
        th: 'บอกว่ากรองเอาอะไร — ข้อความใส่ "" เช่น "สาขา A", ตัวเลขพิมพ์ตรงๆ, หรือใช้ ">100" สำหรับเปรียบเทียบ',
        en: 'What to match. Wrap text in quotes (e.g. "Branch A"), use bare numbers, or use comparison strings like ">100".',
      },
    },
    { text: ',', type: 'sep' },
    {
      text: 'C2:C100',
      type: 'arg',
      color: '#8b5cf6',
      argLabel: { th: '③ รวมที่', en: '③ sum range' },
      title: { th: 'Sum Range — คอลัมน์ที่มีตัวเลขที่ต้องการรวม', en: 'Sum Range — the column whose numbers you actually add' },
      desc: {
        th: 'คอลัมน์ที่มีตัวเลข — ต้องมีขนาด (จำนวน row) เท่ากับ Range ที่ตรวจ',
        en: 'The column of numbers to sum. Its row count must match the check range.',
      },
    },
    { text: ')', type: 'bracket' },
  ],

  steps: [
    { n: 1, text: { th: 'Excel ดู A2:A100 ทีละ row', en: 'Excel walks A2:A100 row by row.' } },
    { n: 2, text: { th: 'ถ้าค่าใน A = "สาขา A" → ✓ เลือก row นี้', en: 'If column A equals "Branch A" → ✓ select this row.' } },
    { n: 3, text: { th: 'ดูตัวเลขในคอลัมน์ C ของ row ที่เลือกไว้', en: 'It looks at column C in the rows it selected.' } },
    { n: 4, text: { th: 'รวมตัวเลขทุก row ที่ผ่านเงื่อนไข แล้วแสดงผล', en: 'It adds those numbers together and returns the total.' } },
  ],

  mistakes: [
    {
      wrong: '=SUMIF(A2:A100,"สาขา A")',
      right: '=SUMIF(A2:A100,"สาขา A",C2:C100)',
      why: {
        th: 'ต้องระบุ sum_range ด้วยว่าจะรวมคอลัมน์ไหน',
        en: 'You have to tell SUMIF which column to actually sum.',
      },
    },
    {
      wrong: '=SUMIF(A2:A100,"สาขา A",C2:C50)',
      right: '=SUMIF(A2:A100,"สาขา A",C2:C100)',
      why: {
        th: 'Range ทั้งสองต้องมีขนาดเท่ากัน',
        en: 'The check range and sum range must have the same number of rows.',
      },
    },
  ],

  usecases: [
    { th: 'รวมยอดขายแยกสาขา', en: 'Sales totals per branch' },
    { th: 'รวมค่าใช้จ่ายแยกหมวด', en: 'Expenses by category' },
    { th: 'รวมสินค้าราคา > 100', en: 'Items priced over 100' },
    { th: 'รวมเฉพาะเดือนที่เลือก', en: 'Total for a selected month' },
  ],

  bonus: {
    label: { th: 'SUMIFS — หลายเงื่อนไข', en: 'SUMIFS — multiple conditions' },
    formula: '=SUMIFS(C2:C100,A2:A100,"สาขา A",B2:B100,"ม.ค.")',
    desc: {
      th: 'รวมเฉพาะสาขา A และเดือน ม.ค. พร้อมกัน',
      en: 'Sum only rows where branch = A AND month = January.',
    },
  },
}
