// Thai food database used in the FOOD tab.
// Each item: { name, kcal, protein, fat, carbs, note }
// Categories are by FOOD TYPE — not meal time — so any item can be logged at
// any hour. Time-of-day is the user's call at log time, not data structure.

export const MEALS = [
  {
    category: '🍚 ข้าวจานเดียว',
    categoryEn: '🍚 Rice dishes',
    color: '#FF6B35',
    id: 'rice',
    items: [
      { name: 'ไข่ดาว 2 ฟอง + ข้าว', kcal: 380, protein: 14, fat: 14, carbs: 45, note: 'หาง่ายทุกที่' },
      { name: 'ไข่เจียวหมูสับ + ข้าว', kcal: 450, protein: 20, fat: 18, carbs: 42, note: 'อิ่มนาน' },
      { name: 'ข้าวไข่พะโล้', kcal: 420, protein: 18, fat: 12, carbs: 52, note: 'หวานนิดหน่อย' },
      { name: 'ข้าวหน้าไก่ย่าง', kcal: 480, protein: 35, fat: 10, carbs: 52, note: 'โปรตีนสูง ✅' },
      { name: 'ข้าวมันไก่ (ไม่เอาหนัง)', kcal: 420, protein: 30, fat: 8, carbs: 48, note: 'ตัดหนังออก ไขมันลด' },
      { name: 'ข้าวหมูแดง (ไม่เอามันกรอบ)', kcal: 460, protein: 28, fat: 12, carbs: 50, note: 'ขอไม่เอามันกรอบ' },
      { name: 'ข้าวราดแกงเขียวหวานไก่', kcal: 520, protein: 28, fat: 18, carbs: 55, note: 'ระวังกะทิ' },
      { name: 'ข้าวกะเพราไก่ไข่ดาว', kcal: 550, protein: 32, fat: 16, carbs: 52, note: 'โปรตีนดี แต่แคลสูง' },
      { name: 'ข้าวราดหมูกระเทียม', kcal: 490, protein: 30, fat: 14, carbs: 48, note: 'โปรตีนดี' },
      { name: 'ข้าวหน้าปลานึ่งซีอิ๊ว', kcal: 500, protein: 34, fat: 14, carbs: 50, note: 'โอเมก้า 3 ดี' },
      { name: 'ข้าวราดเต้าหู้ผัดผัก', kcal: 380, protein: 18, fat: 10, carbs: 45, note: 'มังสวิรัติ' },
    ],
  },
  {
    category: '🍜 ก๋วยเตี๋ยว & โจ๊ก',
    categoryEn: '🍜 Noodles & congee',
    color: '#4FC3F7',
    id: 'noodles',
    items: [
      { name: 'โจ๊กไก่ (ชามเล็ก)', kcal: 210, protein: 14, fat: 4, carbs: 28, note: 'ย่อยง่าย โปรตีนดี' },
      { name: 'โจ๊กหมู (ชามเล็ก)', kcal: 220, protein: 13, fat: 5, carbs: 27, note: 'ย่อยง่าย' },
      { name: 'ข้าวต้มปลา', kcal: 230, protein: 16, fat: 4, carbs: 30, note: 'โปรตีนดี แคลต่ำ' },
      { name: 'ก๋วยเตี๋ยวไก่น้ำใส', kcal: 320, protein: 22, fat: 5, carbs: 42, note: 'แคลต่ำ โปรตีนพอใช้' },
      { name: 'ก๋วยเตี๋ยวหมูตุ๋น', kcal: 380, protein: 24, fat: 10, carbs: 44, note: 'ระวังน้ำมัน' },
    ],
  },
  {
    category: '🥚 ไข่ & นม',
    categoryEn: '🥚 Eggs & dairy',
    color: '#FFD166',
    id: 'eggs',
    items: [
      { name: 'ไข่ต้ม 2 ฟอง', kcal: 140, protein: 12, fat: 10, carbs: 0, note: 'โปรตีนดี ไขมันดี' },
      { name: 'ไข่ขาวต้ม 3 ฟอง', kcal: 50, protein: 11, fat: 0, carbs: 1, note: 'โปรตีนล้วน' },
      { name: 'ขนมปังโฮลวีต + ไข่ต้ม 2 ฟอง', kcal: 310, protein: 18, fat: 10, carbs: 34, note: 'คลีน อิ่มนาน' },
      { name: 'นมจืด 250ml', kcal: 150, protein: 8, fat: 8, carbs: 12, note: 'เพิ่มโปรตีนได้ง่าย' },
      { name: 'โยเกิร์ตกรีก 150g', kcal: 130, protein: 15, fat: 3, carbs: 7, note: 'โปรตีนสูง คลีน 🌟' },
      { name: 'นมไข่ขาว (egg white)', kcal: 60, protein: 13, fat: 0, carbs: 1, note: 'โปรตีนเกือบ 100%' },
      { name: 'นมโปรตีนสูง (Hi-Pro)', kcal: 160, protein: 18, fat: 5, carbs: 10, note: 'หาได้ตาม 7-11' },
    ],
  },
  {
    category: '🥗 สลัด & ของย่าง',
    categoryEn: '🥗 Salads & grills',
    color: '#06D6A0',
    id: 'salads',
    items: [
      { name: 'ส้มตำ + ไก่ย่าง', kcal: 350, protein: 32, fat: 8, carbs: 22, note: 'คลีนมาก 🌟' },
      { name: 'สลัดไก่ย่าง (ไม่ราดน้ำสลัด)', kcal: 250, protein: 28, fat: 6, carbs: 12, note: 'คลีนสุด 🌟' },
      { name: 'ปลาหมึกย่าง (ตัวเล็ก)', kcal: 120, protein: 16, fat: 2, carbs: 4, note: 'โปรตีนสูง ไขมันต่ำ' },
    ],
  },
  {
    category: '🍱 ของว่าง & เสริม',
    categoryEn: '🍱 Snacks & extras',
    color: '#C77DFF',
    id: 'snacks',
    items: [
      { name: 'กล้วย 1 ผล', kcal: 90, protein: 1, fat: 0, carbs: 23, note: 'คาร์บก่อนออกกำลัง' },
      { name: 'ลูกชิ้นปลาต้ม 5 ลูก', kcal: 100, protein: 10, fat: 3, carbs: 5, note: 'หาง่าย ราคาถูก' },
      { name: 'เต้าหู้ขาวนึ่ง 100g', kcal: 70, protein: 8, fat: 4, carbs: 2, note: 'โปรตีนพืช ราคาถูก' },
    ],
  },
  {
    category: '🏪 ร้านสะดวกซื้อ (7-11)',
    categoryEn: '🏪 Convenience store (7-11)',
    color: '#EF476F',
    id: 'seven',
    items: [
      { name: 'ไข่ต้ม 7-11 (2 ฟอง)', kcal: 140, protein: 12, fat: 10, carbs: 0, note: 'สะดวก ราคาถูก 🌟' },
      { name: 'อกไก่ 7-11', kcal: 120, protein: 22, fat: 3, carbs: 2, note: 'โปรตีนสูงมาก 🌟' },
      { name: 'ทูน่ากระป๋องในน้ำ', kcal: 100, protein: 22, fat: 1, carbs: 0, note: 'โปรตีนสูง แคลต่ำ 🌟' },
      { name: 'ข้าวกล่อง 7-11', kcal: 280, protein: 6, fat: 2, carbs: 58, note: 'คาร์บดี ไฟเบอร์สูง' },
      { name: 'สลัดผักรวม 7-11', kcal: 80, protein: 3, fat: 2, carbs: 12, note: 'เพิ่มผักได้ง่าย' },
      { name: 'นมถั่วเหลืองไม่หวาน', kcal: 100, protein: 7, fat: 4, carbs: 8, note: 'โปรตีนพืช' },
      { name: 'โปรตีนบาร์ (ยี่ห้อทั่วไป)', kcal: 200, protein: 20, fat: 7, carbs: 15, note: 'ของว่างฉุกเฉิน' },
      { name: 'ลูกชิ้นเสียบไม้ต้ม (5 ไม้)', kcal: 150, protein: 12, fat: 5, carbs: 10, note: 'หน้าร้าน สะดวก' },
    ],
  },
];
