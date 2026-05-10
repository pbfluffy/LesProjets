// COUNTIF — bilingual formula data
export default {
  id: 'countif',
  label: 'COUNTIF',
  emoji: '#?',
  accent: '#ec4899',
  accentLight: '#fce7f3',
  accentVar: '--c-countif',
  accentSoftVar: '--c-countif-soft',

  tagline: { th: 'นับ row ที่ตรงเงื่อนไข', en: 'Count rows that match a condition' },
  intro: {
    th: 'COUNTIF นับจำนวน cell ที่ตรงตามเงื่อนไข — ต่างจาก COUNT ตรงที่สามารถกรองได้ เช่น นับว่ามีคนผ่านกี่คน หรือมีสินค้าที่ราคา > 500 กี่รายการ',
    en: 'COUNTIF counts how many cells match a condition. Unlike plain COUNT, it filters — e.g. how many people passed, or how many items cost more than ฿500.',
  },

  parts: [
    {
      text: '=COUNTIF',
      type: 'fn',
      color: '#ec4899',
      title: { th: 'ชื่อฟังก์ชัน', en: 'Function name' },
      desc: {
        th: 'นับจำนวนแบบมีเงื่อนไข — ใช้แค่ 2 argument เท่านั้น ง่ายกว่า SUMIF',
        en: 'Conditional counter — only 2 arguments, simpler than SUMIF.',
      },
    },
    { text: '(', type: 'bracket' },
    {
      text: 'C2:C100',
      type: 'arg',
      color: '#ef4444',
      argLabel: { th: '① นับที่', en: '① range' },
      title: { th: 'Range — ช่วงที่ต้องการนับ', en: 'Range — the cells to count over' },
      desc: {
        th: 'คอลัมน์หรือช่วงที่ Excel จะตรวจและนับ — ควรครอบคลุมข้อมูลทั้งหมด',
        en: 'The column or range Excel will check and count. It should cover all your data.',
      },
    },
    { text: ',', type: 'sep' },
    {
      text: '"ผ่าน"',
      type: 'arg',
      color: '#10b981',
      argLabel: { th: '② เงื่อนไข', en: '② criteria' },
      title: { th: 'Criteria — เงื่อนไขที่ต้องการนับ', en: 'Criteria — what to match' },
      desc: {
        th: 'ค่าที่ต้องการนับ — ข้อความใส่ "" เช่น "ผ่าน", ตัวเลขพิมพ์ตรงๆ, หรือใช้ ">50" สำหรับเปรียบเทียบ',
        en: 'What you are counting. Quote text values (e.g. "Pass"), use bare numbers, or comparison strings like ">50".',
      },
    },
    { text: ')', type: 'bracket' },
  ],

  steps: [
    { n: 1, text: { th: 'Excel ดูทุก cell ใน C2:C100', en: 'Excel walks every cell in C2:C100.' } },
    { n: 2, text: { th: 'cell ไหนมีค่า = "ผ่าน" → นับ +1', en: 'Each cell equal to "Pass" adds 1 to the count.' } },
    { n: 3, text: { th: 'ข้ามทุก cell ที่ไม่ตรงเงื่อนไข', en: 'Cells that do not match are skipped.' } },
    { n: 4, text: { th: 'แสดงจำนวนทั้งหมดที่นับได้', en: 'It returns the final count.' } },
  ],

  mistakes: [
    {
      wrong: '=COUNTIF(C2:C100,ผ่าน)',
      right: '=COUNTIF(C2:C100,"ผ่าน")',
      why: { th: 'ข้อความต้องอยู่ใน " " เสมอ', en: 'Text values must always be wrapped in quotes.' },
    },
    {
      wrong: '=COUNTIF(C2:C100,>50)',
      right: '=COUNTIF(C2:C100,">50")',
      why: {
        th: 'เงื่อนไขเปรียบเทียบก็ต้องใส่ใน " " ด้วย',
        en: 'Comparison criteria also need to be quoted as a string.',
      },
    },
  ],

  usecases: [
    { th: 'นับนักเรียนที่ผ่าน/ไม่ผ่าน', en: 'Count students passing / failing' },
    { th: 'นับสินค้าหมดสต็อก', en: 'Count out-of-stock items' },
    { th: 'นับพนักงานแต่ละสาขา', en: 'Headcount per branch' },
    { th: 'นับ order ที่ยังค้าง', en: 'Count open orders' },
  ],
}
