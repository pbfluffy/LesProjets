// Chapter intros — short narrative beats that frame each formula
// as a problem at Pumba's Coffee Shop. Phase 1 wires intros only;
// outros + character reactions arrive in Phase 3.

export const CHAPTERS = {
  sum: {
    n: 1,
    title: { th: 'วันแรก', en: 'First Day' },
    location: { th: 'ร้านพุมบ้า สาขาสุขุมวิท · เช้า', en: "Pumba's Coffee, Sukhumvit · Morning" },
    lines: [
      {
        speaker: 'pumba',
        text: {
          th: 'ยินดีต้อนรับวันแรก! เมื่อเช้าเราขายไป 4 รายการ — Auntie Noi กำลังบวกอยู่ในสมุดใช่ไหม...',
          en: "Welcome to day one! We sold 4 things this morning — Auntie Noi is adding them up in the notebook right now...",
        },
      },
      {
        speaker: 'auntie_noi',
        text: {
          th: '...อย่ามายุ่งฉัน',
          en: "...don't bother me.",
        },
      },
      {
        speaker: 'pumba',
        text: {
          th: 'ลองช่วยเร่งหน่อยได้ไหม? Excel มีสูตรชื่อ SUM น่าจะเร็วกว่ากระดาษ',
          en: 'Can you speed things along? Excel has this thing called SUM — should beat paper.',
        },
      },
    ],
  },

  if: {
    n: 2,
    title: { th: 'บัตรสมาชิก', en: 'The Loyalty Card' },
    location: { th: 'หลังเคาน์เตอร์ · ช่วงบ่าย', en: 'Behind the counter · Afternoon' },
    lines: [
      {
        speaker: 'mike',
        text: {
          th: 'พี่ครับ ลูกค้าซื้อเกิน 200 บาทได้ขนมฟรีใช่มะ? ผมจำไม่ได้แต่ละโต๊ะแล้ว',
          en: "Hey — customers spending over ฿200 get a free pastry, right? I keep forgetting which tables qualify.",
        },
      },
      {
        speaker: 'pumba',
        text: {
          th: 'ทำคอลัมน์ตรวจอัตโนมัติเลย ใช้ IF: ถ้ายอด ≥ 200 → "ผ่าน" ไม่งั้น "ไม่ผ่าน"',
          en: "Just automate the check. Use IF: if total ≥ 200 → \"qualify\", otherwise → \"no\".",
        },
      },
    ],
  },

  vlookup: {
    n: 3,
    title: { th: 'ลูกค้าถามราคา', en: '"How much is that?"' },
    location: { th: 'หน้าร้าน · ชั่วโมงเร่งด่วน', en: 'At the counter · Rush hour' },
    lines: [
      {
        speaker: 'mike',
        text: {
          th: 'ลูกค้าถามราคา M07 หาในเมนูยังไม่เจอเลย ทำไงดี',
          en: "Customer's asking the price for M07 — I can't find it on the menu fast enough.",
        },
      },
      {
        speaker: 'pumba',
        text: {
          th: 'ใส่รหัสในช่องเดียว แล้วใช้ VLOOKUP ดึงราคาจากตารางสินค้า ไม่ต้องเลื่อนหา',
          en: 'Type the code in one cell, then use VLOOKUP to pull the price from the product table. No scrolling.',
        },
      },
    ],
  },

  sumif: {
    n: 4,
    title: { th: 'สาขาใหม่', en: 'The New Branch' },
    location: { th: 'โต๊ะหลังร้าน · ปลายเดือน', en: 'Back office · End of month' },
    lines: [
      {
        speaker: 'pumba',
        text: {
          th: 'เปิดสาขาทองหล่อมาเดือนนึงแล้ว อยากรู้ว่ายอดขายแยกสาขาเป็นยังไง',
          en: "It's been a month since we opened the Thonglor branch. I want to compare sales by branch.",
        },
      },
      {
        speaker: 'pumba',
        text: {
          th: 'SUMIF ทำได้ — รวมเฉพาะ row ที่สาขาตรงกับที่เลือก',
          en: 'SUMIF handles that — sums only the rows where the branch matches.',
        },
      },
    ],
  },

  countif: {
    n: 5,
    title: { th: 'กาแฟประจำเดือน', en: 'Coffee of the Month' },
    location: { th: 'ที่เดิม · กาแฟเย็นในมือ', en: 'Same office · Iced coffee in hand' },
    lines: [
      {
        speaker: 'pumba',
        text: {
          th: 'เมนูใหม่ "ลาเต้กล้วยหอม" ขายดีจริงเหรอ? อยากรู้ว่ามีออเดอร์กี่ครั้งเดือนนี้',
          en: 'Is the new "Banana Latte" actually selling? I want to know how many orders this month.',
        },
      },
      {
        speaker: 'mike',
        text: {
          th: 'COUNTIF น่าจะนับให้ได้ — กรองเฉพาะรายการที่เป็นเมนูนั้น',
          en: 'COUNTIF should count those — filter just the rows for that drink.',
        },
      },
    ],
  },

  iferror: {
    n: 6,
    title: { th: 'วันศุกร์ที่วุ่นวาย', en: 'Messy Friday' },
    location: { th: 'หลังร้าน · ก่อนปิด', en: 'Back office · Just before closing' },
    lines: [
      {
        speaker: 'pumba',
        text: {
          th: 'POS ส่งออกข้อมูลพังอีกแล้ว... รายงานเต็มไปด้วย #N/A',
          en: 'POS export is broken again... the report is full of #N/A.',
        },
      },
      {
        speaker: 'mike',
        text: {
          th: 'ห่อสูตรด้วย IFERROR ก็ดูสะอาดแล้วครับ',
          en: 'Wrap the formulas in IFERROR — instantly looks clean.',
        },
      },
    ],
  },
}

export function getChapter(formulaId) {
  return CHAPTERS[formulaId] || null
}
