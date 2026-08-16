import { useEffect, useRef, useState } from 'react';
import { useLang } from '../LangContext.jsx';
import styles from './PhotoTab.module.css';

const WORKER_URL = 'https://nutritions-photo.pbfluffygaming.workers.dev/';
const MAX_DIM = 1568;
const JPEG_QUALITY = 0.85;
const THUMB_MAX = 600; // max px for custom-food thumbnail stored in localStorage
const PORTION_MULT = { S: 0.7, M: 1.0, L: 1.4 };

const PROMPT = `You are a food identifier for a nutrition tracker used in Thailand. Identify the dish in the photo, estimate portion size, and estimate macros.

Work in this order:
1. First decide whether the dish is Thai. If it is, identify the specific Thai dish with its Thai and English names.
2. If it is clearly NOT Thai, still identify it as the international or Western dish it actually is (e.g. a ham & cheese toastie, spaghetti carbonara, a croissant). Give its common English name and a Thai name (the usual Thai term, or a transliteration).
3. Only treat the photo as having no food if it genuinely contains no edible food at all (a receipt, a person, an empty table, scenery). Any real dish — Thai or not — must be identified, never reported as "no food".

Portion sizing rules — apply these strictly:
- Default to a standard Thai street-food / restaurant portion: one rice plate ~200g cooked rice + topping, one bowl of noodles ~350ml, one stir-fry portion ~150g protein+veg. Do NOT scale up just because the container looks large in the photo.
- Without a clear size reference object (coin, hand, standard plate) visible in the image, assume the SMALLER of two plausible portion sizes, not the larger.
- When uncertain about oil or sauce quantity, assume a moderate home-cook amount, not a deep-fry or heavy-sauce default.
- Report calories conservatively: if your estimate range is e.g. 400–600 kcal, return 400, not 500 or 600.

Be honest about uncertainty — portion estimation from a photo alone typically has ±20-40% error, especially without a reference object for scale.

Respond ONLY with valid JSON, no markdown fences, no preamble:

{
  "dishNameEn": "English name, e.g. Pad Krapao Gai",
  "dishNameTh": "Thai name in Thai script, e.g. ผัดกะเพราไก่",
  "cuisine": "Thai | Western | Japanese | Chinese | Korean | Other",
  "alternatives": [{"en": "alternate name 1", "th": "alternate Thai name 1"}, {"en": "alternate 2", "th": "alternate Thai 2"}],
  "confidence": "high" | "medium" | "low",
  "estimatedPortion": "e.g. 1 plate, 1 bowl, 1 cup",
  "kcal": <number>,
  "protein": <grams>,
  "fat": <grams>,
  "carbs": <grams>,
  "notes": "one short sentence about visible ingredients, cooking method, or scale assumptions"
}

If the photo genuinely contains no food, respond ONLY with:
{"error": "no food detected"}`;

// BUG-02 Leak B — wrap the object URL lifetime in try/finally so the URL
// is revoked even if Image.onerror fires, drawImage throws, or toBlob/FileReader
// rejects. The previous code only revoked on the happy path.
async function compressImage(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Could not load image'));
      i.src = objectUrl;
    });
    const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Could not encode image'))),
        'image/jpeg',
        JPEG_QUALITY
      )
    );
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(',')[1]); // strip data: prefix
      r.onerror = () => reject(new Error('Could not read image'));
      r.readAsDataURL(blob);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// Compress a File to a small square-ish JPEG thumbnail for localStorage storage.
// Returns a data: URL string, or null on error.
async function compressToThumbnail(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('load failed'));
      i.src = objectUrl;
    });
    const scale = Math.min(1, THUMB_MAX / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function identifyDish(base64Image) {
  const response = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image,
              },
            },
            { text: PROMPT },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API ${response.status}: ${errText.slice(0, 200)}`);
  }
  const data = await response.json();
  // Gemini response shape: data.candidates[0].content.parts[0].text
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No text in response');
  }
  // Strip optional markdown fences and parse JSON
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Bad JSON from model: ${cleaned.slice(0, 200)}`);
  }
}

// BUG-07 — the Cloudflare Worker / Gemini path returns free-form English error
// strings (e.g. "no food detected") that bleed into an otherwise-Thai UI.
// Until the worker switches to error codes, pattern-match the known ones here.
function localizeError(msg, lang) {
  if (typeof msg !== 'string') return String(msg);
  const m = msg.toLowerCase();
  if (m.includes('no food')) {
    return lang === 'th'
      ? 'ไม่พบอาหารในภาพ ลองรูปอื่นดู'
      : 'No food detected in the image. Try another photo.';
  }
  if (m.includes('could not load image') || m.includes('could not read image') || m.includes('could not encode image')) {
    return lang === 'th'
      ? 'อ่านไฟล์รูปไม่ได้ ลองอีกครั้งหรือเลือกรูปอื่น'
      : 'Could not read the image. Try again or pick a different photo.';
  }
  if (m.startsWith('api ')) {
    return lang === 'th'
      ? 'บริการประมวลผลรูปขัดข้องชั่วคราว ลองใหม่อีกครั้ง'
      : 'The photo service is temporarily unavailable. Please try again.';
  }
  return msg;
}

function makeItemId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function PhotoTab({ store }) {
  const { t, lang } = useLang();
  // Each item: { id, file, preview, status: 'pending'|'loading'|'done'|'error',
  // result, error, portionSize, logged, saved }
  const [items, setItems] = useState([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const fileRef = useRef(null);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Revoke every remaining preview object URL on unmount (switching tabs
  // unmounts PhotoTab). Per-item revocation on removal is handled in
  // removeItem/clearAll.
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((it) => it.preview && URL.revokeObjectURL(it.preview));
    };
  }, []);

  function onFiles(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newItems = files.map((f) => ({
      id: makeItemId(),
      file: f,
      preview: URL.createObjectURL(f),
      status: 'pending',
      result: null,
      error: null,
      portionSize: 'M',
      logged: false,
      saved: false,
    }));
    setItems((prev) => [...prev, ...newItems]);
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeItem(id) {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((it) => it.id !== id);
    });
  }

  function clearAll() {
    items.forEach((it) => it.preview && URL.revokeObjectURL(it.preview));
    setItems([]);
    if (fileRef.current) fileRef.current.value = '';
  }

  // Race-safe by construction: every update is a functional setState keyed
  // by item id, so a removed item's id simply matches nothing.
  async function identifyOne(id, file) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: 'loading', error: null } : it)));
    try {
      const base64 = await compressImage(file);
      const r = await identifyDish(base64);
      if (r.error) throw new Error(r.error);
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: 'done', result: r } : it)));
    } catch (e) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, status: 'error', error: localizeError(e.message || String(e), lang) } : it
        )
      );
    }
  }

  async function identifyAll() {
    setBatchRunning(true);
    const toRun = items.filter((it) => it.status === 'pending' || it.status === 'error');
    for (const it of toRun) {
      await identifyOne(it.id, it.file);
    }
    setBatchRunning(false);
  }

  function setItemPortion(id, size) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, portionSize: size } : it)));
  }

  function logItem(id) {
    const it = items.find((x) => x.id === id);
    if (!it || !it.result) return;
    const mult = PORTION_MULT[it.portionSize] ?? 1.0;
    const name =
      lang === 'th'
        ? it.result.dishNameTh || it.result.dishNameEn || 'อาหารจากรูปภาพ'
        : it.result.dishNameEn || it.result.dishNameTh || 'Photo dish';
    store.addToLog({
      name,
      kcal: Math.round((it.result.kcal || 0) * mult),
      protein: Math.round((it.result.protein || 0) * mult),
      fat: Math.round((it.result.fat || 0) * mult),
      carbs: Math.round((it.result.carbs || 0) * mult),
      note: t('photo.logNote'),
    });
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, logged: true } : x)));
    setTimeout(() => {
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, logged: false } : x)));
    }, 2500);
  }

  async function saveItem(id) {
    const it = items.find((x) => x.id === id);
    if (!it || !it.result) return;
    const mult = PORTION_MULT[it.portionSize] ?? 1.0;
    const name =
      lang === 'th'
        ? it.result.dishNameTh || it.result.dishNameEn || 'อาหารจากรูปภาพ'
        : it.result.dishNameEn || it.result.dishNameTh || 'Photo dish';
    // Compress the original file to a small thumbnail for localStorage storage.
    let image = null;
    try {
      image = await compressToThumbnail(it.file);
    } catch {
      // image stays null — food still saves without photo
    }
    store.addCustomFood({
      name,
      kcal: Math.round((it.result.kcal || 0) * mult),
      protein: Math.round((it.result.protein || 0) * mult),
      fat: Math.round((it.result.fat || 0) * mult),
      carbs: Math.round((it.result.carbs || 0) * mult),
      note: t('photo.logNote'),
      image,
    });
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, saved: true } : x)));
    setTimeout(() => {
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, saved: false } : x)));
    }, 2500);
  }

  const hasRunnable = items.some((it) => it.status === 'pending' || it.status === 'error');

  return (
    <div className={styles.wrap}>
      {/* Picker card */}
      <div className={styles.card}>
        <div className={styles.title}>{t('photo.title')}</div>

        <button className={styles.pickBtn} onClick={() => fileRef.current?.click()}>
          {t('photo.choose')}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onFiles}
          style={{ display: 'none' }}
        />

        {items.length > 0 && (
          <div className={styles.row} style={{ marginTop: 10 }}>
            <button
              className={`${styles.btn} ${styles.primary}`}
              onClick={identifyAll}
              disabled={batchRunning || !hasRunnable}
            >
              {batchRunning ? t('photo.identifying') : t('photo.identifyAll', { n: items.length })}
            </button>
            <button className={styles.btn} onClick={clearAll} disabled={batchRunning}>
              {t('photo.clearAll')}
            </button>
          </div>
        )}
      </div>

      {items.map((it) => (
        <PhotoItemCard
          key={it.id}
          item={it}
          lang={lang}
          t={t}
          disabled={batchRunning && it.status === 'pending'}
          onIdentify={() => identifyOne(it.id, it.file)}
          onRemove={() => removeItem(it.id)}
          onPortion={(size) => setItemPortion(it.id, size)}
          onLog={() => logItem(it.id)}
          onSave={() => saveItem(it.id)}
        />
      ))}
    </div>
  );
}

function PhotoItemCard({ item, lang, t, disabled, onIdentify, onRemove, onPortion, onLog, onSave }) {
  const { status, result } = item;
  const mult = PORTION_MULT[item.portionSize] ?? 1.0;
  const scaledResult = result
    ? {
        ...result,
        kcal: Math.round((result.kcal || 0) * mult),
        protein: Math.round((result.protein || 0) * mult),
        fat: Math.round((result.fat || 0) * mult),
        carbs: Math.round((result.carbs || 0) * mult),
      }
    : null;
  const dishName = result
    ? lang === 'th'
      ? result.dishNameTh || result.dishNameEn
      : result.dishNameEn || result.dishNameTh
    : null;

  const statusText =
    status === 'loading'
      ? t('photo.identifying')
      : status === 'error'
      ? item.error
      : status === 'pending'
      ? t('photo.pendingHint')
      : null;

  return (
    <div className={styles.card}>
      <div className={styles.itemHeader}>
        <img src={item.preview} alt="" className={styles.itemThumb} />
        <div className={styles.itemHeaderInfo}>
          {status === 'done' ? (
            <div className={styles.dishName}>{dishName}</div>
          ) : (
            <div className={styles.itemStatus} style={status === 'error' ? { color: 'var(--red)' } : undefined}>
              {statusText}
            </div>
          )}
        </div>
        <button className={styles.removeBtn} onClick={onRemove} aria-label={t('photo.removeItem')} disabled={disabled}>
          ×
        </button>
      </div>

      {(status === 'pending' || status === 'error') && (
        <div className={styles.row} style={{ marginTop: 10 }}>
          <button className={`${styles.btn} ${styles.primary}`} onClick={onIdentify} disabled={disabled}>
            {status === 'error' ? t('photo.retry') : t('photo.identify')}
          </button>
        </div>
      )}

      {status === 'done' && result && (
        <div className={styles.itemBody}>
          <div className={styles.resultHeader}>
            <div />
            <div className={`${styles.confidence} ${styles[`conf_${result.confidence}`] || ''}`}>
              {result.confidence}
            </div>
          </div>

          {result.dishNameEn && result.dishNameTh && (
            <div className={styles.altName}>{lang === 'th' ? result.dishNameEn : result.dishNameTh}</div>
          )}

          <div className={styles.portion}>{t('photo.portion', { v: result.estimatedPortion || '—' })}</div>

          <div className={styles.portionRow}>
            {['S', 'M', 'L'].map((sz) => (
              <button
                key={sz}
                className={`${styles.portionBtn} ${item.portionSize === sz ? styles.portionActive : ''}`}
                onClick={() => onPortion(sz)}
              >
                {sz === 'S'
                  ? lang === 'th'
                    ? 'เล็ก'
                    : 'Small'
                  : sz === 'M'
                  ? lang === 'th'
                    ? 'กลาง'
                    : 'Medium'
                  : lang === 'th'
                  ? 'ใหญ่'
                  : 'Large'}
              </button>
            ))}
          </div>

          <div className={styles.macros}>
            <div className={styles.macroCell}>
              <div className={styles.macroVal}>{scaledResult.kcal ?? '—'}</div>
              <div className={styles.macroLbl}>kcal</div>
            </div>
            <div className={styles.macroCell}>
              <div className={styles.macroVal}>{scaledResult.protein ?? '—'}g</div>
              <div className={styles.macroLbl}>{t('macro.protein')}</div>
            </div>
            <div className={styles.macroCell}>
              <div className={styles.macroVal}>{scaledResult.fat ?? '—'}g</div>
              <div className={styles.macroLbl}>{t('macro.fat')}</div>
            </div>
            <div className={styles.macroCell}>
              <div className={styles.macroVal}>{scaledResult.carbs ?? '—'}g</div>
              <div className={styles.macroLbl}>{t('macro.carbs')}</div>
            </div>
          </div>

          {result.alternatives && result.alternatives.length > 0 && (
            <>
              <div className={styles.altTitle}>{t('photo.alternatives')}</div>
              <ul className={styles.altList}>
                {result.alternatives.map((alt, i) => (
                  <li key={i}>{lang === 'th' ? alt.th || alt.en : alt.en || alt.th}</li>
                ))}
              </ul>
            </>
          )}

          {result.notes && (
            <>
              <div className={styles.altTitle}>{t('photo.notes')}</div>
              <div className={styles.notes}>{result.notes}</div>
            </>
          )}

          <button className={styles.logBtn} onClick={onLog} disabled={item.logged}>
            {item.logged ? t('photo.logged') : t('photo.logBtn')}
          </button>
          <button className={styles.saveBtn} onClick={onSave} disabled={item.saved}>
            {item.saved ? t('photo.saved') : t('photo.saveBtn')}
          </button>

          <div className={styles.disclaimer}>{t('photo.disclaimer')}</div>
        </div>
      )}
    </div>
  );
}
