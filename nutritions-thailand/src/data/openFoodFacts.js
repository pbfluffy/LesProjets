// Feature #16 — Barcode → nutrition lookup via OpenFoodFacts (no key, free).
// API docs: https://wiki.openfoodfacts.org/API
//
// We hit the v2 product endpoint. OFF responds with `status: 1` on hit,
// `status: 0` on miss. We prefer per-serving values when the product has
// a defined serving size, falling back to per-100g.

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS = [
  'product_name',
  'product_name_en',
  'generic_name',
  'brands',
  'serving_size',
  'serving_quantity',
  'nutriments',
  'image_small_url',
  'nutriscore_grade',
].join(',');

function pickPerServing(n, key) {
  // Prefer per-serving when available, else fall back to per-100g.
  const s = n[`${key}_serving`];
  const h = n[`${key}_100g`];
  if (typeof s === 'number' && Number.isFinite(s)) return s;
  if (typeof h === 'number' && Number.isFinite(h)) return h;
  return 0;
}

function roundOneDp(x) {
  return Math.round(x * 10) / 10;
}

/** Look up a barcode against OpenFoodFacts.
 *  Returns:
 *    { found: true, food: {...} }  on hit
 *    { found: false }              on miss
 *    { found: false, error: msg }  on network / parse failure
 */
export async function lookupBarcode(barcode) {
  const clean = String(barcode || '').replace(/\D/g, '');
  if (!clean) return { found: false, error: 'empty' };

  const url = `${OFF_BASE}/${encodeURIComponent(clean)}.json?fields=${FIELDS}`;
  let data;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return { found: false, error: `http_${res.status}` };
    data = await res.json();
  } catch (e) {
    return { found: false, error: 'network' };
  }

  if (!data || data.status !== 1 || !data.product) return { found: false };

  const p = data.product;
  const n = p.nutriments || {};
  const name =
    p.product_name_en?.trim() ||
    p.product_name?.trim() ||
    p.generic_name?.trim() ||
    `Barcode ${clean}`;

  const kcalRaw = pickPerServing(n, 'energy-kcal');
  const kcal = kcalRaw > 0
    ? Math.round(kcalRaw)
    // Some products report only energy in kJ — convert.
    : Math.round(pickPerServing(n, 'energy-kj') / 4.184);

  return {
    found: true,
    food: {
      barcode: clean,
      name,
      brand: p.brands || '',
      servingSize: p.serving_size || '',
      kcal,
      protein: roundOneDp(pickPerServing(n, 'proteins')),
      fat: roundOneDp(pickPerServing(n, 'fat')),
      carbs: roundOneDp(pickPerServing(n, 'carbohydrates')),
      imageUrl: p.image_small_url || null,
      nutriscore: p.nutriscore_grade || null,
    },
  };
}
