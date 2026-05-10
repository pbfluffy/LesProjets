// SUM — bilingual formula data ported from excel-tutorial.html
export default {
  id: 'sum',
  label: 'SUM',
  emoji: 'Σ',
  accent: '#10b981',
  accentLight: '#d1fae5',
  accentVar: '--c-sum',
  accentSoftVar: '--c-sum-soft',

  tagline: {
    th: 'บวกตัวเลขทั้งหมดใน range',
    en: 'Add up all the numbers in a range',
  },
  intro: {
    th: 'SUM คือสูตรที่ใช้บ่อยที่สุดใน Excel — รวม (บวก) ตัวเลขทุกตัวใน range ที่กำหนด แทนที่จะพิมพ์ =A1+A2+A3+... ทีละ cell เพียง =SUM(A1:A100) ก็ได้ผลลัพธ์เดียวกัน',
    en: 'SUM is the most-used formula in Excel — it adds every number in a range you specify. Instead of typing =A1+A2+A3+… one cell at a time, =SUM(A1:A100) gives you the same answer in one shot.',
  },

  parts: [
    {
      text: '=SUM',
      type: 'fn',
      color: '#10b981',
      title: { th: 'ชื่อฟังก์ชัน', en: 'Function name' },
      desc: {
        th: "บอก Excel ว่า 'ฉันอยากรวมตัวเลข' — เครื่องหมาย = ต้องมีเสมอ เพื่อบอกว่านี่คือสูตร ไม่ใช่ข้อความ",
        en: "Tells Excel 'I want to add up numbers'. The = sign is required — it's how Excel knows this is a formula and not just text.",
      },
    },
    { text: '(', type: 'bracket' },
    {
      text: 'B2:B8',
      type: 'arg',
      color: '#f59e0b',
      argLabel: { th: 'ช่วง', en: 'range' },
      title: { th: 'Range ที่จะรวม', en: 'The range to sum' },
      desc: {
        th: 'ระบุช่วง cell — B2:B8 = B2 ถึง B8 (7 ค่า) ใส่หลาย range ได้ เช่น =SUM(B2:B8, D2:D8)',
        en: 'Specifies the cell range — B2:B8 means B2 through B8 (7 values). You can list multiple ranges, e.g. =SUM(B2:B8, D2:D8).',
      },
    },
    { text: ')', type: 'bracket' },
  ],

  steps: [
    {
      n: 1,
      text: { th: 'Excel เห็น =SUM → รู้ว่าจะต้องรวมตัวเลข', en: 'Excel sees =SUM and knows you want to add numbers.' },
    },
    {
      n: 2,
      text: {
        th: 'ขยาย B2:B8 กลายเป็น B2, B3, B4, B5, B6, B7, B8 (7 cells)',
        en: 'It expands B2:B8 into B2, B3, B4, B5, B6, B7, B8 (7 cells).',
      },
    },
    {
      n: 3,
      text: {
        th: 'บวกทีละค่า: 500 + 320 + 780 + 450 + 210 + 630 + 290',
        en: 'It adds each value: 500 + 320 + 780 + 450 + 210 + 630 + 290.',
      },
    },
    {
      n: 4,
      text: { th: 'แสดงผลรวมใน cell ที่พิมพ์สูตร', en: 'It shows the total in the cell where you typed the formula.' },
    },
  ],

  mistakes: [
    {
      wrong: '=SUM(B2+B3+B4)',
      right: '=SUM(B2:B4)',
      why: {
        th: 'ใช้ : เพื่อระบุ range แทน + จะสั้นและง่ายกว่ามาก',
        en: 'Use : to define a range instead of + — it is shorter and far easier to maintain.',
      },
    },
    {
      wrong: '=SUM(B2:B8,)',
      right: '=SUM(B2:B8)',
      why: {
        th: 'คอมม่าท้าย argument สุดท้ายทำให้ error — ลบออก',
        en: 'A trailing comma after the last argument causes an error — drop it.',
      },
    },
  ],

  usecases: [
    { th: 'รวมยอดขายรายเดือน', en: 'Total monthly sales' },
    { th: 'คำนวณค่าใช้จ่ายรวม', en: 'Compute total expenses' },
    { th: 'รวมชั่วโมงทำงาน', en: 'Sum work hours' },
    { th: 'บวกคะแนนทุกวิชา', en: 'Add scores across subjects' },
  ],
}
