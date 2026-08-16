// Thai food database used in the FOOD tab.
// Each item: { name, kcal, protein, fat, carbs, note, nameEn, noteEn }
// Categories are by FOOD TYPE — not meal time — so any item can be logged at
// any hour. Time-of-day is the user's call at log time, not data structure.
//
// `name`/`note` are Thai (the dish IS Thai); `nameEn`/`noteEn` are descriptive
// English for the language toggle. Custom user foods carry only `name`.

export const MEALS = [
  {
    category: 'ข้าวจานเดียว',
    categoryEn: 'Rice dishes',
    color: '#FF6B35',
    id: 'rice',
    items: [
      { name: 'ไข่ดาว 2 ฟอง + ข้าว', nameEn: 'Fried eggs (2) + rice', kcal: 380, protein: 14, fat: 14, carbs: 45, note: 'หาง่ายทุกที่', noteEn: 'Easy to find anywhere' },
      { name: 'ไข่เจียวหมูสับ + ข้าว', nameEn: 'Pork-mince omelette + rice', kcal: 450, protein: 20, fat: 18, carbs: 42, note: 'อิ่มนาน', noteEn: 'Filling' },
      { name: 'ข้าวไข่พะโล้', nameEn: 'Five-spice egg over rice', kcal: 420, protein: 18, fat: 12, carbs: 52, note: 'หวานนิดหน่อย', noteEn: 'Slightly sweet' },
      { name: 'ข้าวหน้าไก่ย่าง', nameEn: 'Grilled chicken over rice', kcal: 480, protein: 35, fat: 10, carbs: 52, note: 'โปรตีนสูง', noteEn: 'High protein' },
      { name: 'ข้าวมันไก่ (ไม่เอาหนัง)', nameEn: 'Chicken rice (no skin)', kcal: 420, protein: 30, fat: 8, carbs: 48, note: 'ตัดหนังออก ไขมันลด', noteEn: 'Skin off — less fat' },
      { name: 'ข้าวหมูแดง (ไม่เอาหมูกรอบ)', nameEn: 'Red pork rice (no crispy pork)', kcal: 460, protein: 28, fat: 12, carbs: 50, note: 'ขอไม่เอาหมูกรอบ', noteEn: 'Ask: no crispy pork' },
      { name: 'ข้าวราดแกงเขียวหวานไก่', nameEn: 'Green curry chicken over rice', kcal: 520, protein: 28, fat: 18, carbs: 55, note: 'ระวังกะทิ', noteEn: 'Watch the coconut milk' },
      { name: 'ข้าวกะเพราไก่ไข่ดาว', nameEn: 'Basil chicken + fried egg over rice', kcal: 550, protein: 32, fat: 16, carbs: 52, note: 'โปรตีนดี แต่แคลสูง', noteEn: 'Good protein but high cal' },
      { name: 'ข้าวผัดกระเทียมหมู', nameEn: 'Garlic pork stir-fry over rice', kcal: 490, protein: 30, fat: 14, carbs: 48, note: 'โปรตีนดี', noteEn: 'Good protein' },
      { name: 'ข้าวหน้าปลานึ่งมะนาว', nameEn: 'Lime-steamed fish over rice', kcal: 500, protein: 34, fat: 14, carbs: 50, note: 'โอเมก้า 3 ดี', noteEn: 'Good omega-3' },
      { name: 'ข้าวเต้าหู้ผัดผัก', nameEn: 'Tofu & veg stir-fry over rice', kcal: 380, protein: 18, fat: 10, carbs: 45, note: 'มังสวิรัติ', noteEn: 'Vegetarian' },
    ],
  },
  {
    category: 'ก๋วยเตี๋ยว & โจ๊ก',
    categoryEn: 'Noodles & congee',
    color: '#4FC3F7',
    id: 'noodles',
    items: [
      { name: 'โจ๊กไก่ (ชามเล็ก)', nameEn: 'Chicken congee (small bowl)', kcal: 210, protein: 14, fat: 4, carbs: 28, note: 'ย่อยง่าย โปรตีนดี', noteEn: 'Easy to digest, good protein' },
      { name: 'โจ๊กหมู (ชามเล็ก)', nameEn: 'Pork congee (small bowl)', kcal: 220, protein: 13, fat: 5, carbs: 27, note: 'ย่อยง่าย', noteEn: 'Easy to digest' },
      { name: 'ข้าวต้มปลา', nameEn: 'Fish rice soup', kcal: 230, protein: 16, fat: 4, carbs: 30, note: 'โปรตีนดี แคลต่ำ', noteEn: 'Good protein, low cal' },
      { name: 'ก๋วยเตี๋ยวไก่น้ำใส', nameEn: 'Clear chicken noodle soup', kcal: 320, protein: 22, fat: 5, carbs: 42, note: 'แคลต่ำ โปรตีนพอใช้', noteEn: 'Low cal, decent protein' },
      { name: 'ก๋วยเตี๋ยวหมูตุ๋น', nameEn: 'Stewed pork noodles', kcal: 380, protein: 24, fat: 10, carbs: 44, note: 'ระวังน้ำมัน', noteEn: 'Watch the oil' },
    ],
  },
  {
    category: 'ไข่ & นม',
    categoryEn: 'Eggs & dairy',
    color: '#FFD166',
    id: 'eggs',
    items: [
      { name: 'ไข่ต้ม 2 ฟอง', nameEn: '2 boiled eggs', kcal: 140, protein: 12, fat: 10, carbs: 0, note: 'โปรตีนดี ไขมันดี', noteEn: 'Good protein, good fat' },
      { name: 'ไข่ขาวต้ม 3 ฟอง', nameEn: '3 boiled egg whites', kcal: 50, protein: 11, fat: 0, carbs: 1, note: 'โปรตีนล้วน', noteEn: 'Pure protein' },
      { name: 'ขนมปังโฮลวีต + ไข่ต้ม 2 ฟอง', nameEn: 'Whole-wheat bread + 2 boiled eggs', kcal: 310, protein: 18, fat: 10, carbs: 34, note: 'คลีน อิ่มนาน', noteEn: 'Clean, filling' },
      { name: 'นมจืด 250ml', nameEn: 'Plain milk 250ml', kcal: 150, protein: 8, fat: 8, carbs: 12, note: 'เพิ่มโปรตีนได้ง่าย', noteEn: 'Easy way to add protein' },
      { name: 'โยเกิร์ตกรีก 150g', nameEn: 'Greek yogurt 150g', kcal: 130, protein: 15, fat: 3, carbs: 7, note: 'โปรตีนสูง คลีน', noteEn: 'High protein, clean' },
      { name: 'นมไข่ขาว (egg white)', nameEn: 'Egg-white drink', kcal: 60, protein: 13, fat: 0, carbs: 1, note: 'โปรตีนเกือบ 100%', noteEn: 'Almost 100% protein' },
      { name: 'นมโปรตีนสูง (Hi-Pro)', nameEn: 'High-protein milk (Hi-Pro)', kcal: 160, protein: 18, fat: 5, carbs: 10, note: 'หาได้ตาม 7-11', noteEn: 'Found at 7-11' },
    ],
  },
  {
    category: 'สลัด & ของย่าง',
    categoryEn: 'Salads & grilled',
    color: '#06D6A0',
    id: 'salads',
    items: [
      { name: 'ส้มตำ + ไก่ย่าง', nameEn: 'Papaya salad + grilled chicken', kcal: 350, protein: 32, fat: 8, carbs: 22, note: 'คลีนมาก', noteEn: 'Very clean' },
      { name: 'สลัดไก่ย่าง (ไม่ราดน้ำสลัด)', nameEn: 'Grilled chicken salad (no dressing)', kcal: 250, protein: 28, fat: 6, carbs: 12, note: 'คลีนสุด', noteEn: 'Cleanest' },
      { name: 'ปลาหมึกย่าง (ตัวเล็ก)', nameEn: 'Grilled squid (small)', kcal: 120, protein: 16, fat: 2, carbs: 4, note: 'โปรตีนสูง ไขมันต่ำ', noteEn: 'High protein, low fat' },
    ],
  },
  {
    category: 'ของว่าง & เสริม',
    categoryEn: 'Snacks & extras',
    color: '#C77DFF',
    id: 'snacks',
    items: [
      { name: 'กล้วย 1 ผล', nameEn: '1 banana', kcal: 90, protein: 1, fat: 0, carbs: 23, note: 'คาร์บก่อนออกกำลัง', noteEn: 'Carbs pre-workout' },
      { name: 'ลูกชิ้นปลาต้ม 5 ลูก', nameEn: '5 boiled fish balls', kcal: 100, protein: 10, fat: 3, carbs: 5, note: 'หาง่าย ราคาถูก', noteEn: 'Easy to find, cheap' },
      { name: 'เต้าหู้ขาวนึ่ง 100g', nameEn: 'Steamed white tofu 100g', kcal: 70, protein: 8, fat: 4, carbs: 2, note: 'โปรตีนพืช ราคาถูก', noteEn: 'Plant protein, cheap' },
    ],
  },
  {
    category: 'ร้านสะดวกซื้อ (7-11)',
    categoryEn: 'Convenience store (7-11)',
    color: '#EF476F',
    id: 'seven',
    items: [
      { name: 'ไข่ต้ม 7-11 (2 ฟอง)', nameEn: '7-11 boiled eggs (2)', kcal: 140, protein: 12, fat: 10, carbs: 0, note: 'สะดวก ราคาถูก', noteEn: 'Convenient, cheap' },
      { name: 'อกไก่ 7-11', nameEn: '7-11 chicken breast', kcal: 120, protein: 22, fat: 3, carbs: 2, note: 'โปรตีนสูงมาก', noteEn: 'Very high protein' },
      { name: 'ทูน่ากระป๋องในน้ำ', nameEn: 'Canned tuna in water', kcal: 100, protein: 22, fat: 1, carbs: 0, note: 'โปรตีนสูง แคลต่ำ', noteEn: 'High protein, low cal' },
      { name: 'ข้าวกล่อง 7-11', nameEn: '7-11 boxed rice meal', kcal: 280, protein: 6, fat: 2, carbs: 58, note: 'คาร์บดี ไฟเบอร์สูง', noteEn: 'Good carbs, high fiber' },
      { name: 'สลัดผักรวม 7-11', nameEn: '7-11 mixed-veg salad', kcal: 80, protein: 3, fat: 2, carbs: 12, note: 'เพิ่มผักได้ง่าย', noteEn: 'Easy way to add veg' },
      { name: 'นมถั่วเหลืองไม่หวาน', nameEn: 'Unsweetened soy milk', kcal: 100, protein: 7, fat: 4, carbs: 8, note: 'โปรตีนพืช', noteEn: 'Plant protein' },
      { name: 'โปรตีนบาร์ (ยี่ห้อทั่วไป)', nameEn: 'Protein bar (generic)', kcal: 200, protein: 20, fat: 7, carbs: 15, note: 'ของว่างฉุกเฉิน', noteEn: 'Emergency snack' },
      { name: 'ลูกชิ้นเสียบไม้ต้ม (5 ไม้)', nameEn: 'Boiled meatball skewers (5)', kcal: 150, protein: 12, fat: 5, carbs: 10, note: 'หน้าร้าน สะดวก', noteEn: 'Storefront, convenient' },
    ],
  },
];
