// IF — bilingual formula data
export default {
  id: 'if',
  label: 'IF',
  emoji: '?',
  accent: '#8b5cf6',
  accentLight: '#ede9fe',
  accentVar: '--c-if',
  accentSoftVar: '--c-if-soft',

  tagline: { th: 'ถ้า... แล้ว... มิฉะนั้น...', en: 'If… then… otherwise…' },
  intro: {
    th: "IF ให้ Excel 'ตัดสินใจ' — ตรวจเงื่อนไข ถ้าจริงให้แสดงค่าหนึ่ง ถ้าเท็จให้แสดงอีกค่า คิดแบบนี้: 'ถ้าคะแนน ≥ 50 ให้แสดง ผ่าน มิฉะนั้นให้แสดง ไม่ผ่าน'",
    en: "IF lets Excel 'make a decision' — it checks a condition and shows one value if true, another if false. Think: 'if score ≥ 50, show Pass, otherwise show Fail.'",
  },

  parts: [
    {
      text: '=IF',
      type: 'fn',
      color: '#8b5cf6',
      title: { th: 'ชื่อฟังก์ชัน', en: 'Function name' },
      desc: {
        th: 'สั่ง Excel ให้ตรวจเงื่อนไข — ต้องมี argument ครบ 3 ตัวเสมอ ขาดไม่ได้',
        en: 'Tells Excel to test a condition. It always needs 3 arguments — none are optional.',
      },
    },
    { text: '(', type: 'bracket' },
    {
      text: 'B2>=50',
      type: 'arg',
      color: '#ef4444',
      argLabel: { th: '① เงื่อนไข', en: '① condition' },
      title: { th: 'Logical Test — สิ่งที่จะตรวจ', en: 'Logical Test — what to check' },
      desc: {
        th: 'เงื่อนไขที่ Excel จะตรวจว่าจริงหรือเท็จ — ใช้ได้: >= (≥), <= (≤), = (เท่ากับ), <> (ไม่เท่ากับ), > (มากกว่า), < (น้อยกว่า)',
        en: 'The condition Excel evaluates as true or false. Operators you can use: >= (≥), <= (≤), = (equals), <> (not equal), > (greater), < (less).',
      },
    },
    { text: ',', type: 'sep' },
    {
      text: '"ผ่าน"',
      type: 'arg',
      color: '#10b981',
      argLabel: { th: '② ถ้าจริง', en: '② if true' },
      title: { th: 'Value if True — แสดงเมื่อเงื่อนไขถูก', en: 'Value if True — shown when the condition holds' },
      desc: {
        th: 'ค่าที่แสดงเมื่อเงื่อนไขเป็นจริง — ข้อความต้องอยู่ใน " " เสมอ ตัวเลขไม่ต้องใส่ เช่น =IF(A1>0, 100, 0)',
        en: 'What appears when the condition is true. Text values must be wrapped in " " — numbers do not, e.g. =IF(A1>0, 100, 0).',
      },
    },
    { text: ',', type: 'sep' },
    {
      text: '"ไม่ผ่าน"',
      type: 'arg',
      color: '#f59e0b',
      argLabel: { th: '③ ถ้าเท็จ', en: '③ if false' },
      title: { th: 'Value if False — แสดงเมื่อเงื่อนไขผิด', en: 'Value if False — shown when the condition fails' },
      desc: {
        th: 'ค่าที่แสดงเมื่อเงื่อนไขเป็นเท็จ — สามารถซ้อน IF อีกตัวตรงนี้ได้ เพื่อทำหลายเงื่อนไข',
        en: 'What appears when the condition is false. You can nest another IF here to handle multiple conditions.',
      },
    },
    { text: ')', type: 'bracket' },
  ],

  steps: [
    { n: 1, text: { th: 'Excel ดูค่าใน B2 (สมมติ = 72)', en: 'Excel reads the value in B2 (say it is 72).' } },
    { n: 2, text: { th: 'ตรวจ: 72 >= 50 → จริง หรือ เท็จ?', en: 'It checks: is 72 >= 50 — true or false?' } },
    { n: 3, text: { th: '72 >= 50 → จริง ✓ เลือก argument ที่ 2', en: '72 >= 50 → true ✓, so it picks argument 2.' } },
    { n: 4, text: { th: 'แสดง "ผ่าน" ใน cell นั้น', en: 'It displays "Pass" in the cell.' } },
  ],

  mistakes: [
    {
      wrong: '=IF(B2>=50,ผ่าน,ไม่ผ่าน)',
      right: '=IF(B2>=50,"ผ่าน","ไม่ผ่าน")',
      why: {
        th: 'ข้อความต้องครอบด้วย " " เสมอ ขาดไม่ได้',
        en: 'Text values must always be wrapped in " " — required, no exceptions.',
      },
    },
    {
      wrong: '=IF(B2>=50)',
      right: '=IF(B2>=50,"ผ่าน","ไม่ผ่าน")',
      why: {
        th: 'ต้องมี argument ครบ 3 ตัว: เงื่อนไข, ถ้าจริง, ถ้าเท็จ',
        en: 'All 3 arguments are required: condition, value-if-true, value-if-false.',
      },
    },
  ],

  usecases: [
    { th: 'ตรวจผ่าน/ไม่ผ่าน', en: 'Pass / Fail check' },
    { th: 'ตัดเกรด A–F', en: 'Letter grades A–F' },
    { th: 'เช็คสินค้าหมดสต็อก', en: 'Out-of-stock flag' },
    { th: 'แสดง status ต่างๆ', en: 'Status labels' },
  ],

  bonus: {
    label: { th: 'Nested IF — ซ้อนหลายเงื่อนไข', en: 'Nested IF — chain multiple conditions' },
    formula: '=IF(B2>=80,"A",IF(B2>=70,"B",IF(B2>=60,"C","F")))',
    desc: {
      th: 'ตัดเกรด — ซ้อน IF ใน argument ที่ 3 ได้เรื่อยๆ',
      en: 'Assigning grades — keep nesting IF inside the 3rd argument as deep as you need.',
    },
  },
}
