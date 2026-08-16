import { useRef, useState } from 'react';
import { useLang } from '../LangContext.jsx';
import styles from './CustomTab.module.css';

const EMPTY_FORM = { name: '', kcal: '', protein: '', fat: '', carbs: '', note: '', image: null };

// Compress an image File to a square thumbnail (max 600px) as a base64 data URL.
// Displayed small (40-64px) but stored larger so it still holds up if the
// user views/enlarges it outside the app (no in-app lightbox yet) — 200px
// was too aggressive and looked blurry/pixelated when stretched.
// Returns a Promise<string|null>. Never throws — returns null on any error.
function compressToThumbnail(file) {
  return new Promise((resolve) => {
    const MAX = 600;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const side = Math.min(img.width, img.height, MAX);
        const scale = side / Math.min(img.width, img.height);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve(null);
      img.src = String(e.target.result);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// Feature #59 — RFC 4180 CSV serialize/parse for customFoods.
// Columns: name, kcal, protein, fat, carbs, note. `name` + `kcal` required;
// other numeric cols default to 0; `note` defaults to ''. Names with commas,
// quotes or newlines are properly quoted on export and unquoted on import.
function escapeCsvField(s) {
  const str = String(s ?? '');
  if (/[",\n\r]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

function customFoodsToCsv(foods) {
  const header = 'name,kcal,protein,fat,carbs,note';
  const rows = foods.map((f) =>
    [f.name, f.kcal, f.protein, f.fat, f.carbs, f.note || '']
      .map(escapeCsvField)
      .join(',')
  );
  return [header, ...rows].join('\n') + '\n';
}

function parseCsvRow(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else {
        cur += c;
      }
    } else {
      if (c === ',') { out.push(cur); cur = ''; }
      else if (c === '"' && cur === '') { inQuotes = true; }
      else { cur += c; }
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  // Strip UTF-8 BOM if present (Excel adds one on export).
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  // Split into logical lines, respecting quoted newlines.
  const lines = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      cur += c;
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (cur.length) lines.push(cur);
      cur = '';
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else {
      cur += c;
    }
  }
  if (cur.length) lines.push(cur);
  if (!lines.length) throw new Error('empty file');

  const header = parseCsvRow(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = {
    name: header.indexOf('name'),
    kcal: header.indexOf('kcal'),
    protein: header.indexOf('protein'),
    fat: header.indexOf('fat'),
    carbs: header.indexOf('carbs'),
    note: header.indexOf('note'),
  };
  if (idx.name < 0 || idx.kcal < 0) {
    throw new Error('missing name/kcal columns');
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvRow(lines[i]);
    if (!cols.length || (cols.length === 1 && !cols[0].trim())) continue;
    const name = (cols[idx.name] || '').trim();
    const kcal = Number(cols[idx.kcal]);
    if (!name || !Number.isFinite(kcal)) continue;
    rows.push({
      name,
      kcal,
      protein: Number(cols[idx.protein] || 0) || 0,
      fat: Number(cols[idx.fat] || 0) || 0,
      carbs: Number(cols[idx.carbs] || 0) || 0,
      note: (cols[idx.note] || '').trim(),
    });
  }
  return rows;
}

export default function CustomTab({ store }) {
  const { t } = useLang();
  const { customFoods, addCustomFood, addCustomFoods, removeCustomFood, updateCustomFood, addToLog } = store;
  const [form, setForm] = useState(EMPTY_FORM);
  const [editIndex, setEditIndex] = useState(null);
  const [csvMsg, setCsvMsg] = useState(null);
  const [csvErr, setCsvErr] = useState(false);
  const fileRef = useRef(null);
  const photoRef = useRef(null);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Image picker: compress on selection, store data URL in form state.
  const onPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressToThumbnail(file);
    setForm((f) => ({ ...f, image: dataUrl }));
    // Reset so the same file can be re-selected after removal.
    if (photoRef.current) photoRef.current.value = '';
  };

  // Photo picker for editing an existing food in the list.
  const editPhotoRef = useRef(null);
  const onEditPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressToThumbnail(file);
    if (editIndex !== null) updateCustomFood(editIndex, { image: dataUrl });
    if (editPhotoRef.current) editPhotoRef.current.value = '';
  };

  const submit = () => {
    if (!form.name || !form.kcal) return;
    addCustomFood({
      name: form.name,
      kcal: Number(form.kcal),
      protein: Number(form.protein || 0),
      fat: Number(form.fat || 0),
      carbs: Number(form.carbs || 0),
      note: form.note || t('custom.defaultNote'),
      image: form.image || null,
    });
    setForm(EMPTY_FORM);
  };

  const onExportCsv = () => {
    if (!customFoods.length) {
      setCsvErr(false);
      setCsvMsg(t('custom.csvExportEmpty'));
      return;
    }
    const csv = customFoodsToCsv(customFoods);
    // Prefix with UTF-8 BOM so Excel opens Thai names correctly.
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `custom-foods-${today}.csv`;
    // Same defer-revoke pattern as useNutritionStore.exportData (BUG-06).
    document.body.append(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 0);
    setCsvErr(false);
    setCsvMsg(null);
  };

  const onImportClick = () => fileRef.current?.click();

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      const existing = new Set(customFoods.map((f) => f.name));
      const fresh = [];
      let skipped = 0;
      for (const r of parsed) {
        if (existing.has(r.name)) { skipped++; continue; }
        existing.add(r.name);
        fresh.push(r);
      }
      addCustomFoods(fresh);
      setCsvErr(false);
      setCsvMsg(t('custom.csvImportResult', { n: fresh.length, skip: skipped }));
    } catch (err) {
      setCsvErr(true);
      setCsvMsg(t('custom.csvImportError', { msg: err.message || String(err) }));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <div className={styles.card}>
        <div className={styles.title}>{t('custom.add')}</div>

        <div className={styles.form}>
          <input
            className={`${styles.input} ${styles.full}`}
            placeholder={t('custom.name')}
            value={form.name}
            onChange={update('name')}
          />
          <input
            className={styles.input}
            placeholder={t('custom.kcal')}
            type="number"
            inputMode="numeric"
            value={form.kcal}
            onChange={update('kcal')}
          />
          <input
            className={styles.input}
            placeholder={t('custom.protein')}
            type="number"
            inputMode="numeric"
            value={form.protein}
            onChange={update('protein')}
          />
          <input
            className={styles.input}
            placeholder={t('custom.fat')}
            type="number"
            inputMode="numeric"
            value={form.fat}
            onChange={update('fat')}
          />
          <input
            className={styles.input}
            placeholder={t('custom.carbs')}
            type="number"
            inputMode="numeric"
            value={form.carbs}
            onChange={update('carbs')}
          />
          <input
            className={`${styles.input} ${styles.full}`}
            placeholder={t('custom.note')}
            value={form.note}
            onChange={update('note')}
          />
        </div>

        {/* Photo picker */}
        <div className={styles.photoPicker}>
          {form.image ? (
            <div className={styles.photoPreviewWrap}>
              <img src={form.image} alt="preview" className={styles.photoPreview} />
              <button
                className={styles.photoRemove}
                onClick={() => setForm((f) => ({ ...f, image: null }))}
                aria-label={t('custom.removePhoto')}
                title={t('custom.removePhoto')}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              className={styles.photoAddBtn}
              onClick={() => photoRef.current?.click()}
              type="button"
            >
              {t('custom.photo')}
            </button>
          )}
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            onChange={onPhotoChange}
            style={{ display: 'none' }}
          />
        </div>

        <button className={styles.submit} onClick={submit}>
          {t('custom.submit')}
        </button>
      </div>

      {customFoods.length > 0 && (
        <div className={styles.card}>
          <div className={styles.title}>{t('custom.list', { n: customFoods.length })}</div>
          {customFoods.map((item, i) => (
            <div key={i}>
              <div className={styles.row}>
                {item.image && (
                  <img src={item.image} alt={item.name} className={styles.rowThumb} />
                )}
                <div className={styles.rowInfo}>
                  <div className={styles.name}>{item.name}</div>
                  <div className={styles.macros}>
                    {item.kcal}kcal · P:{item.protein}g · F:{item.fat}g · C:{item.carbs}g
                  </div>
                </div>
                <div className={styles.actions}>
                  <button className={styles.logBtn} onClick={() => addToLog(item)}>
                    {t('custom.log')}
                  </button>
                  <button
                    className={styles.editBtn}
                    onClick={() => setEditIndex(editIndex === i ? null : i)}
                    aria-label="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    className={styles.removeBtn}
                    onClick={() => { removeCustomFood(i); if (editIndex === i) setEditIndex(null); }}
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {editIndex === i && (
                <div className={styles.editPanel}>
                  {item.image ? (
                    <div className={styles.photoPreviewWrap}>
                      <img src={item.image} alt="preview" className={styles.photoPreview} />
                      <button
                        className={styles.photoRemove}
                        onClick={() => updateCustomFood(i, { image: null })}
                        aria-label={t('custom.removePhoto')}
                        title={t('custom.removePhoto')}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      className={styles.photoAddBtn}
                      onClick={() => editPhotoRef.current?.click()}
                      type="button"
                    >
                      {t('custom.photo')}
                    </button>
                  )}
                  <input
                    ref={editPhotoRef}
                    type="file"
                    accept="image/*"
                    onChange={onEditPhotoChange}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Feature #59 — CSV import/export */}
      <div className={styles.card}>
        <div className={styles.title}>{t('custom.csvTitle')}</div>
        <div className={styles.csvActions}>
          <button className={styles.csvBtn} onClick={onExportCsv}>
            {t('custom.csvExport')}
          </button>
          <button className={styles.csvBtn} onClick={onImportClick}>
            {t('custom.csvImport')}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onImportFile}
          style={{ display: 'none' }}
        />
        {csvMsg && (
          <div className={`${styles.csvMsg} ${csvErr ? styles.csvMsgError : ''}`}>
            {csvMsg}
          </div>
        )}
      </div>
    </>
  );
}
