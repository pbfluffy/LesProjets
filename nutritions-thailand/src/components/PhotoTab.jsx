import { useEffect, useRef, useState } from 'react';
import { useLang } from '../LangContext.jsx';
import styles from './PhotoTab.module.css';

const WORKER_URL = 'https://nutritions-photo.pbfluffygaming.workers.dev/';
const MAX_DIM = 1568;
const JPEG_QUALITY = 0.85;

const PROMPT = `You are identifying Thai food in a photo for a nutrition tracker.

Identify the dish, estimate portion size, and estimate macros. Be honest about uncertainty — portion estimation from a photo alone typically has \u00b120-40% error, especially without a reference object for scale.

Respond ONLY with valid JSON, no markdown fences, no preamble:

{
  "dishNameEn": "English name, e.g. Pad Krapao Gai",
  "dishNameTh": "Thai name in Thai script, e.g. \u0e1c\u0e31\u0e14\u0e01\u0e30\u0e40\u0e1e\u0e23\u0e32\u0e44\u0e01\u0e48",
  "alternatives": [{"en": "alternate name 1", "th": "alternate Thai name 1"}, {"en": "alternate 2", "th": "alternate Thai 2"}],
  "confidence": "high" | "medium" | "low",
  "estimatedPortion": "e.g. 1 plate, 1 bowl, 1 cup",
  "kcal": <number>,
  "protein": <grams>,
  "fat": <grams>,
  "carbs": <grams>,
  "notes": "one short sentence about visible ingredients, cooking method, or scale assumptions"
}

If the photo does not contain food, respond ONLY with:
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

export default function PhotoTab({ store }) {
  const { t, lang } = useLang();
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState(null);
  const [logged, setLogged] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  // BUG-04 — monotonically increasing request id. Each onIdentify captures the
  // current id; any setResult/setError after that checks the id is still
  // current. Picking a new image or clearing bumps the id, invalidating any
  // in-flight identify call so its result can't land on the wrong photo.
  const requestIdRef = useRef(0);

  // BUG-02 Leak A — revoke the object URL on imagePreview change OR unmount.
  // Switching tabs unmounts PhotoTab; without this cleanup the multi-MB blob
  // stays in memory until full page reload.
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    requestIdRef.current++; // invalidate any in-flight identify
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
    setLoading(false);
  }

  function onClear() {
    requestIdRef.current++; // invalidate any in-flight identify
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    setLoading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function onIdentify() {
    if (!imageFile) {
      setError(t('photo.noImage'));
      return;
    }
    const reqId = ++requestIdRef.current;
    const submittedFile = imageFile;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const base64 = await compressImage(submittedFile);
      const r = await identifyDish(base64);
      // BUG-04 — guard against a new image being picked mid-flight
      if (reqId !== requestIdRef.current) return;
      if (r.error) throw new Error(r.error);
      setResult(r);
    } catch (e) {
      if (reqId !== requestIdRef.current) return;
      setError(localizeError(e.message || String(e), lang));
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }

  const dishName = result
    ? lang === 'th'
      ? result.dishNameTh || result.dishNameEn
      : result.dishNameEn || result.dishNameTh
    : null;

  const handleLog = () => {
    if (!result) return;
    const name =
      lang === 'th'
        ? result.dishNameTh || result.dishNameEn || 'อาหารจากรูปภาพ'
        : result.dishNameEn || result.dishNameTh || 'Photo dish';
    store.addToLog({
      name,
      kcal: Math.round(result.kcal || 0),
      protein: Math.round(result.protein || 0),
      fat: Math.round(result.fat || 0),
      carbs: Math.round(result.carbs || 0),
      note: t('photo.logNote'),
    });
    setLogged(true);
    setTimeout(() => setLogged(false), 2500);
  };
  const handleSave = () => {
    if (!result) return;
    const name =
      lang === 'th'
        ? result.dishNameTh || result.dishNameEn || 'อาหารจากรูปภาพ'
        : result.dishNameEn || result.dishNameTh || 'Photo dish';
    store.addCustomFood({
      name,
      kcal: Math.round(result.kcal || 0),
      protein: Math.round(result.protein || 0),
      fat: Math.round(result.fat || 0),
      carbs: Math.round(result.carbs || 0),
      note: t('photo.logNote'),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };




  return (
    <div className={styles.wrap}>
      {/* Picker / preview card */}
      <div className={styles.card}>
        <div className={styles.title}>{t('photo.title')}</div>

        {!imagePreview && (
          <button
            className={styles.pickBtn}
            onClick={() => fileRef.current?.click()}
          >
            {t('photo.choose')}
          </button>
        )}

        {imagePreview && (
          <>
            <img src={imagePreview} alt="preview" className={styles.preview} />
            <div className={styles.row}>
              <button
                className={`${styles.btn} ${styles.primary}`}
                onClick={onIdentify}
                disabled={loading}
              >
                {loading ? t('photo.identifying') : t('photo.identify')}
              </button>
              <button
                className={styles.btn}
                onClick={onClear}
                disabled={loading}
              >
                {t('photo.clear')}
              </button>
            </div>
          </>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onFile}
          style={{ display: 'none' }}
        />

        {error && <div className={styles.error}>{error}</div>}
      </div>

      {/* Result card */}
      {result && (
        <div className={styles.card}>
          <div className={styles.resultHeader}>
            <div className={styles.dishName}>{dishName}</div>
            <div
              className={`${styles.confidence} ${
                styles[`conf_${result.confidence}`] || ''
              }`}
            >
              {result.confidence}
            </div>
          </div>

          {/* The other-language name */}
          {result.dishNameEn && result.dishNameTh && (
            <div className={styles.altName}>
              {lang === 'th' ? result.dishNameEn : result.dishNameTh}
            </div>
          )}

          <div className={styles.portion}>
            {t('photo.portion', { v: result.estimatedPortion || '—' })}
          </div>

          {/* Macro grid */}
          <div className={styles.macros}>
            <div className={styles.macroCell}>
              <div className={styles.macroVal}>{result.kcal ?? '—'}</div>
              <div className={styles.macroLbl}>kcal</div>
            </div>
            <div className={styles.macroCell}>
              <div className={styles.macroVal}>{result.protein ?? '—'}g</div>
              <div className={styles.macroLbl}>{t('macro.protein')}</div>
            </div>
            <div className={styles.macroCell}>
              <div className={styles.macroVal}>{result.fat ?? '—'}g</div>
              <div className={styles.macroLbl}>{t('macro.fat')}</div>
            </div>
            <div className={styles.macroCell}>
              <div className={styles.macroVal}>{result.carbs ?? '—'}g</div>
              <div className={styles.macroLbl}>{t('macro.carbs')}</div>
            </div>
          </div>

          {result.alternatives && result.alternatives.length > 0 && (
            <>
              <div className={styles.altTitle}>{t('photo.alternatives')}</div>
              <ul className={styles.altList}>
                {result.alternatives.map((alt, i) => (
                  <li key={i}>
                    {lang === 'th'
                      ? alt.th || alt.en
                      : alt.en || alt.th}
                  </li>
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
        <button
          className={styles.logBtn}
          onClick={handleLog}
          disabled={logged}
        >
          {logged ? t('photo.logged') : t('photo.logBtn')}
        </button>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saved}
        >
          {saved ? t('photo.saved') : t('photo.saveBtn')}
        </button>

          <div className={styles.disclaimer}>{t('photo.disclaimer')}</div>
        </div>
      )}
    </div>
  );
}
