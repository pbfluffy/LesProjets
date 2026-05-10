// IFERROR — bilingual formula data
export default {
  id: 'iferror',
  label: 'IFERROR',
  emoji: '!',
  accent: '#6366f1',
  accentLight: '#e0e7ff',
  accentVar: '--c-iferror',
  accentSoftVar: '--c-iferror-soft',

  tagline: { th: 'จัดการ error ให้สวยงาม', en: 'Make errors look clean' },
  intro: {
    th: 'IFERROR จัดการกรณีที่สูตรเกิด error — เช่น VLOOKUP ไม่เจอข้อมูล (#N/A) หรือหารด้วยศูนย์ (#DIV/0!) แทนที่จะแสดง error น่าเกลียด ให้แสดงข้อความที่เราต้องการแทน',
    en: 'IFERROR handles cases where a formula returns an error — e.g. VLOOKUP not finding a match (#N/A) or division by zero (#DIV/0!). Instead of showing an ugly error code, you can show whatever you want.',
  },

  parts: [
    {
      text: '=IFERROR',
      type: 'fn',
      color: '#6366f1',
      title: { th: 'ชื่อฟังก์ชัน', en: 'Function name' },
      desc: {
        th: 'ห่อสูตรอื่นไว้ข้างใน — ถ้าสูตรข้างในเกิด error ทุกชนิด (#N/A, #DIV/0!, #VALUE!, #REF!) จะแสดงค่าที่เรากำหนดแทน',
        en: 'Wraps another formula. If that inner formula throws any error (#N/A, #DIV/0!, #VALUE!, #REF!), the value you provide is shown instead.',
      },
    },
    { text: '(', type: 'bracket' },
    {
      text: 'VLOOKUP(A1,...)',
      type: 'arg',
      color: '#f59e0b',
      argLabel: { th: '① สูตรหลัก', en: '① main formula' },
      title: { th: 'Value — สูตรที่ต้องการรัน', en: 'Value — the formula you want to run' },
      desc: {
        th: 'ใส่สูตรทั้งหมดที่นี่ — ถ้ารันได้ปกติจะแสดงผลปกติ ถ้าเกิด error จะแสดงค่าใน argument ที่ 2 แทน',
        en: 'Put your full formula here. If it runs fine, its result is shown. If it errors, the second argument is shown instead.',
      },
    },
    { text: ',', type: 'sep' },
    {
      text: '"ไม่พบข้อมูล"',
      type: 'arg',
      color: '#10b981',
      argLabel: { th: '② ถ้า error', en: '② if error' },
      title: { th: 'Value if Error — แสดงอะไรถ้า error', en: 'Value if Error — what to show on failure' },
      desc: {
        th: 'ค่าที่แสดงแทน error — นิยมใช้ "" (ว่างเปล่า), "ไม่พบ", 0, หรือ "-" ตามความเหมาะสม',
        en: 'What appears in place of the error. Common choices: "" (blank), "Not found", 0, or "-".',
      },
    },
    { text: ')', type: 'bracket' },
  ],

  steps: [
    { n: 1, text: { th: 'Excel รัน VLOOKUP(A1,...) ก่อนเลย', en: 'Excel runs the inner formula VLOOKUP(A1,...) first.' } },
    { n: 2, text: { th: 'ถ้าได้ผลปกติ → แสดงผลนั้น เสร็จ ✓', en: 'If it succeeds → show that result, done ✓.' } },
    { n: 3, text: { th: 'ถ้าเกิด error ใดๆ → ข้ามไปดู argument ที่ 2', en: 'If any error occurs → fall through to argument 2.' } },
    { n: 4, text: { th: 'แสดง "ไม่พบข้อมูล" สวยงาม ไม่น่าเกลียด', en: 'Show "Not found" — clean, no scary error code.' } },
  ],

  mistakes: [
    {
      wrong: '=VLOOKUP(A1,B:D,2,FALSE)',
      right: '=IFERROR(VLOOKUP(A1,B:D,2,FALSE),"ไม่พบ")',
      why: {
        th: 'ควรห่อ VLOOKUP ด้วย IFERROR เสมอ',
        en: 'Always wrap VLOOKUP in IFERROR — error states are common.',
      },
    },
    {
      wrong: '=IFERROR("ไม่พบ",VLOOKUP(...))',
      right: '=IFERROR(VLOOKUP(...),"ไม่พบ")',
      why: {
        th: 'สูตรหลักต้องอยู่ก่อน ค่า error อยู่หลัง',
        en: 'The main formula goes first, the fallback value goes second.',
      },
    },
  ],

  usecases: [
    { th: 'ป้องกัน #N/A จาก VLOOKUP', en: 'Catch #N/A from VLOOKUP' },
    { th: 'ป้องกัน #DIV/0!', en: 'Catch #DIV/0!' },
    { th: 'ทำ report ดูสะอาด', en: 'Keep reports clean' },
    { th: 'แสดง 0 แทน error ใน chart', en: 'Show 0 instead of errors in charts' },
  ],
}
