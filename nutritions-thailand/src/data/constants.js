// Activity-level multipliers for TDEE.
// `labelKey` resolves through i18n at render time.
export const ACTIVITY = [
  { k: 'sedentary', labelKey: 'activity.sedentary', mult: 1.2 },
  { k: 'light', labelKey: 'activity.light', mult: 1.375 },
  { k: 'moderate', labelKey: 'activity.moderate', mult: 1.55 },
  { k: 'active', labelKey: 'activity.active', mult: 1.725 },
];

// BMI bands. `textKey` resolves through i18n.
export const BMI_INFO = [
  { max: 18.5, textKey: 'bmi.under', color: '#4FC3F7' },
  { max: 23, textKey: 'bmi.normal', color: '#06D6A0' },
  { max: 25, textKey: 'bmi.over', color: '#FFD166' },
  { max: 30, textKey: 'bmi.obese', color: '#EF476F' },
  { max: 999, textKey: 'bmi.veryObese', color: '#C41E3A' },
];

export function getBMIBand(bmi) {
  return BMI_INFO.find((b) => bmi < b.max) || BMI_INFO[BMI_INFO.length - 1];
}

/** Mifflin–St Jeor. weight in kg, height in cm, age in years. */
export function calcBMR(weight, height, age, gender) {
  return gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
}

/** Body composition rough estimate keyed off BMI band. */
export function estimateBodyComp(weight, bmi) {
  const bf = bmi > 25 ? 22 : bmi > 23 ? 17 : 13;
  const lean = Math.round(weight * (1 - bf / 100));
  return { estimatedBodyFat: bf, leanMass: lean };
}

/** Default state shape — also used as the localStorage fallback.
 * `calorieDelta` is signed: negative = cut, 0 = maintain, positive = bulk.
 * Range: -1000 to +1000 kcal/day vs TDEE.
 *
 * Macro target fields (Feature #19, added 2026-05-22):
 *   macroMode    — 'auto' (default) uses the legacy protein curve only;
 *                  'custom' uses the three g/kg fields below.
 *   proteinPerKg — null in auto mode; number in custom mode.
 *   fatPerKg     — null in auto mode; number in custom mode.
 *   carbsPerKg   — null in auto mode; number in custom mode.
 */
export const DEFAULT_STATS = {
  weight: 75,
  height: 170,
  age: 25,
  gender: 'male',
  activity: 'moderate',
  calorieDelta: 0,
  macroMode: 'auto',
  proteinPerKg: null,
  fatPerKg: null,
  carbsPerKg: null,
  // Feature #21 — water reminders. All off by default; user opts in.
  waterReminderEnabled: false,
  waterReminderInterval: 90, // minutes between nudges
  waterReminderQuietStart: 22, // 10 pm
  waterReminderQuietEnd: 7, // 7 am
};

/** Sensible starting values when the user first switches to custom mode.
 *  Roughly: high protein, moderate fat, carbs as the bulk. */
export const CUSTOM_MACRO_DEFAULTS = {
  proteinPerKg: 2.0,
  fatPerKg: 0.8,
  carbsPerKg: 3.0,
};

/** Returns mode key for the current calorieDelta. Keys resolve to i18n via `mode.{key}`. */
export function getCalorieMode(delta) {
  if (delta <= -750) return 'aggressiveCut';
  if (delta <= -400) return 'moderateCut';
  if (delta <= -100) return 'mildCut';
  if (delta < 100) return 'maintain';
  if (delta < 400) return 'leanBulk';
  if (delta < 750) return 'bulk';
  return 'aggressiveBulk';
}

export const WATER_GLASSES = 8;
export const WATER_ML_PER_GLASS = 250;

/** Daily protein target in grams. 2.0g/kg on cut, 1.8g/kg otherwise. */
export function getProteinTarget(weight, calorieDelta) {
  const gPerKg = calorieDelta < 0 ? 2.0 : 1.8;
  return Math.round(weight * gPerKg);
}

/** Daily macro targets in grams.
 * Returns { protein, fat, carbs } — each value is either a number (grams)
 * or null when the macro is not targeted.
 *
 * In 'auto' mode: protein follows the default curve; fat and carbs are null.
 * In 'custom' mode: each macro uses its own g/kg field; if a field is null
 * (shouldn't normally happen once custom is engaged), that macro is null too.
 */
export function getMacroTargets(stats) {
  const { weight, calorieDelta, macroMode, proteinPerKg, fatPerKg, carbsPerKg } = stats;
  if (macroMode === 'custom') {
    return {
      protein: proteinPerKg != null ? Math.round(weight * proteinPerKg) : null,
      fat: fatPerKg != null ? Math.round(weight * fatPerKg) : null,
      carbs: carbsPerKg != null ? Math.round(weight * carbsPerKg) : null,
    };
  }
  return {
    protein: getProteinTarget(weight, calorieDelta),
    fat: null,
    carbs: null,
  };
}

/** Convert macro grams → kcal contribution. Protein/carbs = 4 kcal/g; fat = 9. */
export function macroKcal({ protein, fat, carbs }) {
  return (protein ?? 0) * 4 + (fat ?? 0) * 9 + (carbs ?? 0) * 4;
}
