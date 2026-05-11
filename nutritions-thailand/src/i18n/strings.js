// Translation strings. Keys are dot-paths; t() supports interpolation via {token}.
// EN is the default (matches Bill Splitter convention); TH mirrors the original UI copy.

const en = {
  'app.title': '🔥 Cut · Keep Muscle',

  'tab.overview': '📊 Overview',
  'tab.food': '🍱 Food',
  'tab.adjust': '⚙️ Adjust',
  'tab.custom': '➕ Custom',

  'header.home': 'Home',
  'header.themeDark': '🌞',
  'header.themeLight': '🌙',
  'header.reset': '↺',
  'header.resetTitle': 'Reset today',

  'stat.tdee': 'TDEE',
  'stat.tdeeUnit': 'kcal/day',
  'stat.target': 'TARGET',
  'stat.targetUnit': 'kcal/day',
  'stat.bmi': 'BMI',
  'stat.lean': 'LEAN MASS',
  'stat.bfNote': 'body fat ~{bf}%',

  'cal.today': '🔥 Calories today',
  'cal.over': '⚠️ {n} kcal over',
  'cal.under': '✅ {n} kcal remaining',

  'macro.protein': 'PROTEIN',
  'macro.fat': 'FAT',
  'macro.carbs': 'CARBS',

  'water.title': '💧 Water today',
  'water.progress': '{ml}ml / {goal}ml',

  'log.title': 'Food logged today',
  'log.empty': 'Nothing logged yet — pick from 🍱 Food',

  'food.search': '🔍 Search food…',
  'food.all': 'All',
  'food.custom': '⭐ Mine',
  'food.empty': 'No matches found',
  'food.kcal': 'kcal',

  'adjust.body': 'Body stats',
  'adjust.weight': 'Weight: {v} kg',
  'adjust.height': 'Height: {v} cm',
  'adjust.age': 'Age: {v} y',
  'adjust.male': '♂ Male',
  'adjust.female': '♀ Female',
  'adjust.deficit': 'Deficit goal',
  'adjust.deficitVal': 'Cut: {v} kcal/day',
  'adjust.deficitRate': '~{kg} kg/week',

  'activity.sedentary': 'Sedentary',
  'activity.light': 'Light (1–3 days/wk)',
  'activity.moderate': 'Moderate (3–5 days/wk)',
  'activity.active': 'Active (6–7 days/wk)',

  'deficit.maintain': 'Maintain',
  'deficit.small': 'Mild',
  'deficit.medium': 'Moderate',
  'deficit.aggressive': 'Aggressive',

  'bmi.under': 'Underweight',
  'bmi.normal': 'Normal',
  'bmi.over': 'Overweight',
  'bmi.obese': 'Obese',
  'bmi.veryObese': 'Very obese',

  'custom.add': 'Add custom food',
  'custom.name': 'Food name *',
  'custom.kcal': 'Calories (kcal) *',
  'custom.protein': 'Protein (g)',
  'custom.fat': 'Fat (g)',
  'custom.carbs': 'Carbs (g)',
  'custom.note': 'Note',
  'custom.submit': '+ Add food',
  'custom.list': 'My foods ({n})',
  'custom.defaultNote': 'My food',
  'custom.log': '+ Log',

  'data.title': 'Data',
  'data.export': '⬇ Export JSON',
  'data.import': '⬆ Import JSON',
  'data.clear': '🗑 Clear all',
  'data.confirm': 'Erase everything (stats, log, custom foods)?',
  'data.imported': 'Imported ✓',
  'data.importErr': 'Import failed — bad file',

  'date.today': 'Today',
  'date.prev': '←',
  'date.next': '→',
};

const th = {
  'app.title': '🔥 ลดไขมัน · รักษากล้ามเนื้อ',

  'tab.overview': '📊 ภาพรวม',
  'tab.food': '🍱 อาหาร',
  'tab.adjust': '⚙️ ปรับค่า',
  'tab.custom': '➕ เพิ่มเอง',

  'header.home': 'หน้าแรก',
  'header.themeDark': '🌞',
  'header.themeLight': '🌙',
  'header.reset': '↺',
  'header.resetTitle': 'รีเซ็ตวันนี้',

  'stat.tdee': 'TDEE',
  'stat.tdeeUnit': 'kcal/วัน',
  'stat.target': 'เป้าหมาย',
  'stat.targetUnit': 'kcal/วัน',
  'stat.bmi': 'BMI',
  'stat.lean': 'กล้ามเนื้อ',
  'stat.bfNote': 'ไขมัน ~{bf}%',

  'cal.today': '🔥 แคลอรี่วันนี้',
  'cal.over': '⚠️ เกิน {n} kcal',
  'cal.under': '✅ เหลือ {n} kcal',

  'macro.protein': 'โปรตีน',
  'macro.fat': 'ไขมัน',
  'macro.carbs': 'คาร์บ',

  'water.title': '💧 น้ำวันนี้',
  'water.progress': '{ml}ml / {goal}ml',

  'log.title': 'บันทึกอาหารวันนี้',
  'log.empty': 'ยังไม่มีอาหาร — เลือกจากแท็บ 🍱 อาหาร',

  'food.search': '🔍 ค้นหาอาหาร...',
  'food.all': 'ทั้งหมด',
  'food.custom': '⭐ ของฉัน',
  'food.empty': 'ไม่พบอาหารที่ค้นหา',
  'food.kcal': 'kcal',

  'adjust.body': 'ข้อมูลร่างกาย',
  'adjust.weight': 'น้ำหนัก: {v} kg',
  'adjust.height': 'ส่วนสูง: {v} cm',
  'adjust.age': 'อายุ: {v} ปี',
  'adjust.male': '♂ ชาย',
  'adjust.female': '♀ หญิง',
  'adjust.deficit': 'เป้าหมาย Deficit',
  'adjust.deficitVal': 'ลดแคลอรี่: {v} kcal/วัน',
  'adjust.deficitRate': '~{kg} kg/อาทิตย์',

  'activity.sedentary': 'นั่งทำงาน',
  'activity.light': 'ออกกำลัง 1-3 วัน/อาทิตย์',
  'activity.moderate': 'ออกกำลัง 3-5 วัน/อาทิตย์',
  'activity.active': 'ออกกำลัง 6-7 วัน/อาทิตย์',

  'deficit.maintain': 'รักษา',
  'deficit.small': 'ลดน้อย',
  'deficit.medium': 'ลดปานกลาง',
  'deficit.aggressive': 'ลดเร็ว',

  'bmi.under': 'น้ำหนักน้อย',
  'bmi.normal': 'ปกติ',
  'bmi.over': 'น้ำหนักเกิน',
  'bmi.obese': 'อ้วน',
  'bmi.veryObese': 'อ้วนมาก',

  'custom.add': 'เพิ่มอาหารของฉัน',
  'custom.name': 'ชื่ออาหาร *',
  'custom.kcal': 'แคลอรี่ (kcal) *',
  'custom.protein': 'โปรตีน (g)',
  'custom.fat': 'ไขมัน (g)',
  'custom.carbs': 'คาร์บ (g)',
  'custom.note': 'หมายเหตุ',
  'custom.submit': '+ เพิ่มอาหาร',
  'custom.list': 'อาหารของฉัน ({n} รายการ)',
  'custom.defaultNote': 'อาหารของฉัน',
  'custom.log': '+ บันทึก',

  'data.title': 'ข้อมูล',
  'data.export': '⬇ ส่งออก JSON',
  'data.import': '⬆ นำเข้า JSON',
  'data.clear': '🗑 ลบทั้งหมด',
  'data.confirm': 'ลบข้อมูลทั้งหมด (สถิติ, บันทึก, อาหาร) หรือไม่?',
  'data.imported': 'นำเข้าสำเร็จ ✓',
  'data.importErr': 'นำเข้าล้มเหลว — ไฟล์ไม่ถูกต้อง',

  'date.today': 'วันนี้',
  'date.prev': '←',
  'date.next': '→',
};

export const STRINGS = { en, th };

export function makeTranslator(lang) {
  const dict = STRINGS[lang] || STRINGS.en;
  return function t(key, vars) {
    let s = dict[key];
    if (s === undefined) s = STRINGS.en[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replaceAll(`{${k}}`, String(v));
      }
    }
    return s;
  };
}
