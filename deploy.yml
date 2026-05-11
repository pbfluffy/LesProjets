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

/** Default state shape — also used as the localStorage fallback. */
export const DEFAULT_STATS = {
  weight: 75,
  height: 170,
  age: 25,
  gender: 'male',
  activity: 'moderate',
  deficit: 400,
};

export const DEFICIT_PRESETS = [
  { v: 0, labelKey: 'deficit.maintain' },
  { v: 300, labelKey: 'deficit.small' },
  { v: 400, labelKey: 'deficit.medium' },
  { v: 600, labelKey: 'deficit.aggressive' },
];

export const WATER_GLASSES = 8;
export const WATER_ML_PER_GLASS = 250;
