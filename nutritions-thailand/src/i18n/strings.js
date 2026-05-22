// Translation strings. Keys are dot-paths; t() supports interpolation via {token}.
// EN is the default (matches Bill Splitter convention); TH mirrors the original UI copy.

const en = {
  'app.title': '🥗 Nutritions in Thailand',

  'tab.overview': '📊 Overview',
  'tab.food': '🍱 Food',
  'tab.photo': '📷 Photo',
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
  'stat.bmr': 'BMR',
  'stat.bmi': 'BMI',
  'stat.lean': 'LEAN MASS',
  'stat.bfNote': 'body fat ~{bf}%',

  'cal.today': '🔥 Calories today',
  'cal.over': '⚠️ {n} kcal over',
  'cal.under': '✅ {n} kcal remaining',

  'protein.title': '💪 Protein today',
  'protein.toGo': '🎯 {n}g to go',
  'protein.hit': '✅ Goal hit!',

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

  'activity.sedentary': 'Sedentary',
  'activity.light': 'Light (1–3 days/wk)',
  'activity.moderate': 'Moderate (3–5 days/wk)',
  'activity.active': 'Active (6–7 days/wk)',


  'adjust.target': 'Calorie target',
  'adjust.targetVal': 'Target: {v} kcal/day',
  'adjust.targetRate': '~{kg} kg/week',

  'adjust.macroTargets': 'Macro targets',
  'adjust.macroAuto': 'Auto',
  'adjust.macroCustom': 'Custom',
  'adjust.macroAutoNote': 'Auto: {p}g protein/day · fat & carbs untargeted',
  'adjust.proteinPerKg': 'Protein: {v} g/kg',
  'adjust.fatPerKg': 'Fat: {v} g/kg',
  'adjust.carbsPerKg': 'Carbs: {v} g/kg',
  'adjust.macroTotal': 'Macros total',
  'adjust.ofTarget': 'of target',

  'mode.aggressiveCut': 'Aggressive cut',
  'mode.moderateCut': 'Moderate cut',
  'mode.mildCut': 'Mild cut',
  'mode.maintain': 'Maintain',
  'mode.leanBulk': 'Lean bulk',
  'mode.bulk': 'Bulk',
  'mode.aggressiveBulk': 'Aggressive bulk',

  'warn.cautionLow': 'Aggressive cut. Hard to sustain and risks muscle loss.',
  'warn.unsafeLow': 'Below your resting metabolic rate ({bmr} kcal). Your body will break down muscle and slow metabolism. Eat more, or talk to a doctor.',
  'warn.cautionHigh': 'Most of this extra goes to fat — muscle gain caps out around +300 kcal/day.',
  'warn.unsafeHigh': 'This surplus is mostly fat gain. Consider +200–400 kcal for lean growth.',

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

  'barcode.scanCta': 'Scan barcode',
  'barcode.title': 'Scan a barcode',
  'barcode.close': 'Close',
  'barcode.aim': 'Align the barcode inside the frame',
  'barcode.starting': 'Starting camera…',
  'barcode.permDenied': 'Camera access denied. Enter the barcode manually below.',
  'barcode.cameraFail': "Couldn't start the camera. Enter the barcode manually below.",
  'barcode.unsupported': 'Live scanning is not supported on this browser. Enter the barcode manually below.',
  'barcode.or': 'or',
  'barcode.manualPlaceholder': 'Type barcode number',
  'barcode.lookUp': 'Look up',
  'barcode.looking': 'Looking up product…',
  'barcode.foundReview': 'Product found — review and save below',
  'barcode.notFound': 'Not in OpenFoodFacts. Fill in the macros from the label and save.',
  'barcode.lookupErr': "Couldn't reach OpenFoodFacts. Fill in manually.",
  'barcode.noteWithServing': 'Barcode {code} · serving {serving}',
  'barcode.noteOnly': 'Barcode {code}',

  'data.title': 'Backup',
  'data.export': '⬇ Save backup',
  'data.import': '⬆ Restore backup',
  'data.clear': '🗑 Clear all data',
  'data.confirm': 'Erase everything (stats, log, custom foods)?',
  'data.imported': 'Restored ✓',
  'data.importErr': 'Restore failed — wrong file',
  'data.exportErr': 'Backup failed',

  'photo.title': 'Identify Thai dish',
  'photo.choose': '📷 Choose photo',
  'photo.identify': 'Identify dish',
  'photo.identifying': 'Identifying…',
  'photo.clear': 'Clear',
  'photo.portion': 'Estimated portion: {v}',
  'photo.alternatives': 'Could also be',
  'photo.notes': 'Notes',
  'photo.noImage': 'Pick a photo first.',
  'photo.disclaimer': 'Portion + macro estimates from a photo are rough (±20–40%). Treat as starting point, not truth.',
  'photo.logBtn': '✚ Log this meal',
  'photo.logged': '✓ Logged!',
  'photo.logNote': 'From photo',
  'photo.saveBtn': '⭐ Save to my foods',
  'photo.saved': '✓ Saved to my foods!',

  'date.today': 'Today',
  'date.prev': '←',
  'date.next': '→',
};

const th = {
  'app.title': '🥗 โภชนาการในไทย',

  'tab.overview': '📊 ภาพรวม',
  'tab.food': '🍱 อาหาร',
  'tab.photo': '📷 รูปภาพ',
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
  'stat.bmr': 'BMR',
  'stat.bmi': 'BMI',
  'stat.lean': 'กล้ามเนื้อ',
  'stat.bfNote': 'ไขมัน ~{bf}%',

  'cal.today': '🔥 แคลอรี่วันนี้',
  'cal.over': '⚠️ เกิน {n} kcal',
  'cal.under': '✅ เหลือ {n} kcal',

  'protein.title': '💪 โปรตีนวันนี้',
  'protein.toGo': '🎯 เหลืออีก {n}g',
  'protein.hit': '✅ ครบเป้าหมาย!',

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

  'activity.sedentary': 'นั่งทำงาน',
  'activity.light': 'ออกกำลัง 1-3 วัน/อาทิตย์',
  'activity.moderate': 'ออกกำลัง 3-5 วัน/อาทิตย์',
  'activity.active': 'ออกกำลัง 6-7 วัน/อาทิตย์',


  'adjust.target': 'เป้าหมายแคลอรี่',
  'adjust.targetVal': 'เป้าหมาย: {v} kcal/วัน',
  'adjust.targetRate': '~{kg} kg/สัปดาห์',

  'adjust.macroTargets': 'เป้าหมายมาโคร',
  'adjust.macroAuto': 'อัตโนมัติ',
  'adjust.macroCustom': 'กำหนดเอง',
  'adjust.macroAutoNote': 'อัตโนมัติ: โปรตีน {p}g/วัน · ไม่กำหนดไขมันและคาร์บ',
  'adjust.proteinPerKg': 'โปรตีน: {v} g/kg',
  'adjust.fatPerKg': 'ไขมัน: {v} g/kg',
  'adjust.carbsPerKg': 'คาร์บ: {v} g/kg',
  'adjust.macroTotal': 'รวมมาโคร',
  'adjust.ofTarget': 'ของเป้าหมาย',

  'mode.aggressiveCut': 'ลดเร็ว',
  'mode.moderateCut': 'ลดปานกลาง',
  'mode.mildCut': 'ลดน้อย',
  'mode.maintain': 'รักษา',
  'mode.leanBulk': 'เพิ่มเบา',
  'mode.bulk': 'เพิ่ม',
  'mode.aggressiveBulk': 'เพิ่มเร็ว',

  'warn.cautionLow': 'ลดหนัก ทำตามยากและเสี่ยงเสียกล้ามเนื้อ',
  'warn.unsafeLow': 'ต่ำกว่าค่าเผาผลาญพื้นฐาน ({bmr} kcal) ร่างกายจะเผากล้ามเนื้อและทำให้เมแทบอลิซึมช้าลง ควรกินเพิ่มหรือปรึกษาแพทย์',
  'warn.cautionHigh': 'ส่วนเกินส่วนใหญ่จะกลายเป็นไขมัน กล้ามเนื้อสร้างได้แค่ราว ~300 kcal/วัน',
  'warn.unsafeHigh': 'ส่วนเกินเท่านี้ส่วนใหญ่เป็นไขมัน ลองลดเหลือ +200-400 kcal เพื่อสร้างกล้ามแบบลีน',

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

  'barcode.scanCta': 'สแกนบาร์โค้ด',
  'barcode.title': 'สแกนบาร์โค้ด',
  'barcode.close': 'ปิด',
  'barcode.aim': 'จัดบาร์โค้ดให้อยู่ในกรอบ',
  'barcode.starting': 'กำลังเปิดกล้อง…',
  'barcode.permDenied': 'ไม่ได้รับสิทธิ์ใช้กล้อง พิมพ์บาร์โค้ดด้านล่างแทน',
  'barcode.cameraFail': 'เปิดกล้องไม่สำเร็จ พิมพ์บาร์โค้ดด้านล่างแทน',
  'barcode.unsupported': 'เบราว์เซอร์นี้ไม่รองรับการสแกน พิมพ์บาร์โค้ดด้านล่างแทน',
  'barcode.or': 'หรือ',
  'barcode.manualPlaceholder': 'พิมพ์เลขบาร์โค้ด',
  'barcode.lookUp': 'ค้นหา',
  'barcode.looking': 'กำลังค้นหาสินค้า…',
  'barcode.foundReview': 'พบสินค้า — ตรวจสอบและบันทึกด้านล่าง',
  'barcode.notFound': 'ไม่พบใน OpenFoodFacts กรอกค่าจากฉลากแล้วบันทึก',
  'barcode.lookupErr': 'เชื่อมต่อ OpenFoodFacts ไม่ได้ กรอกค่าเอง',
  'barcode.noteWithServing': 'บาร์โค้ด {code} · ต่อ {serving}',
  'barcode.noteOnly': 'บาร์โค้ด {code}',

  'data.title': 'สำรองข้อมูล',
  'data.export': '⬇ บันทึกสำรอง',
  'data.import': '⬆ กู้คืนข้อมูล',
  'data.clear': '🗑 ลบข้อมูลทั้งหมด',
  'data.confirm': 'ลบข้อมูลทั้งหมด (สถิติ, บันทึก, อาหาร) หรือไม่?',
  'data.imported': 'กู้คืนสำเร็จ ✓',
  'data.importErr': 'กู้คืนล้มเหลว — ไฟล์ไม่ถูกต้อง',
  'data.exportErr': 'บันทึกสำรองล้มเหลว',

  'photo.title': 'ระบุอาหารไทยจากภาพ',
  'photo.choose': '📷 เลือกรูป',
  'photo.identify': 'วิเคราะห์อาหาร',
  'photo.identifying': 'กำลังวิเคราะห์…',
  'photo.clear': 'ล้าง',
  'photo.portion': 'ปริมาณโดยประมาณ: {v}',
  'photo.alternatives': 'อาจเป็น',
  'photo.notes': 'หมายเหตุ',
  'photo.noImage': 'เลือกรูปก่อน',
  'photo.disclaimer': 'ค่าประมาณจากภาพมีความคลาดเคลื่อน ±20–40% ใช้เป็นแนวทาง ไม่ใช่ค่าจริง',
  'photo.logBtn': '✚ บันทึกมื้อนี้',
  'photo.logged': '✓ บันทึกแล้ว!',
  'photo.logNote': 'จากรูปภาพ',
  'photo.saveBtn': '⭐ บันทึกในอาหารของฉัน',
  'photo.saved': '✓ บันทึกในอาหารของฉันแล้ว!',

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
