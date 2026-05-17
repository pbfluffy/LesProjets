import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_STATS } from '../data/constants.js';

const STORAGE_KEY = 'nutritions.store.v1';

/** Local YYYY-MM-DD — used as the per-day log key. */
export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const EMPTY_DAY = { log: [], water: 0 };

/** Migrate legacy `deficit` (cut-only, positive) → `calorieDelta` (signed). */
function migrateStats(saved) {
  const stats = { ...DEFAULT_STATS, ...(saved || {}) };
  if (stats.deficit !== undefined) {
    if (saved?.calorieDelta === undefined) {
      stats.calorieDelta = -stats.deficit;
    }
    delete stats.deficit;
  }
  return stats;
}

const INITIAL_STATE = {
  stats: { ...DEFAULT_STATS },
  customFoods: [],
  days: {}, // { 'YYYY-MM-DD': { log, water } }
  theme: 'dark',
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw);
    return { ...INITIAL_STATE, ...parsed, stats: migrateStats(parsed.stats) };
  } catch {
    return INITIAL_STATE;
  }
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota or sandbox */
  }
}

export function useNutritionStore() {
  const [state, setState] = useState(() => { const s = load(); const t = localStorage.getItem('theme'); return (t === 'dark' || t === 'light') ? { ...s, theme: t } : s; });
  const [dateKey, setDateKey] = useState(todayKey());

  // Persist on every change.
  useEffect(() => {
    persist(state);
  }, [state]);

  // Reflect theme on <html>.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('theme', state.theme);
  }, [state.theme]);

  const day = state.days[dateKey] ?? EMPTY_DAY;

  // Derived totals for the selected day.
  const totals = useMemo(() => {
    return day.log.reduce(
      (acc, x) => ({
        kcal: acc.kcal + (x.kcal || 0),
        protein: acc.protein + (x.protein || 0),
        fat: acc.fat + (x.fat || 0),
        carbs: acc.carbs + (x.carbs || 0),
      }),
      { kcal: 0, protein: 0, fat: 0, carbs: 0 }
    );
  }, [day.log]);

  const setStat = useCallback((key, value) => {
    setState((s) => ({ ...s, stats: { ...s.stats, [key]: value } }));
  }, []);

  const setTheme = useCallback((theme) => {
    setState((s) => ({ ...s, theme }));
  }, []);

  const toggleTheme = useCallback(() => {
    setState((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }));
  }, []);

  const mutateDay = useCallback(
    (key, fn) => {
      setState((s) => {
        const prev = s.days[key] ?? EMPTY_DAY;
        const next = fn(prev);
        return { ...s, days: { ...s.days, [key]: next } };
      });
    },
    []
  );

  const addToLog = useCallback(
    (item) => {
      mutateDay(dateKey, (d) => ({
        ...d,
        log: [...d.log, { ...item, id: Date.now() + Math.random() }],
      }));
    },
    [dateKey, mutateDay]
  );

  const removeFromLog = useCallback(
    (id) => {
      mutateDay(dateKey, (d) => ({ ...d, log: d.log.filter((x) => x.id !== id) }));
    },
    [dateKey, mutateDay]
  );

  const setWater = useCallback(
    (n) => {
      mutateDay(dateKey, (d) => ({ ...d, water: n }));
    },
    [dateKey, mutateDay]
  );

  const resetDay = useCallback(() => {
    mutateDay(dateKey, () => ({ log: [], water: 0 }));
  }, [dateKey, mutateDay]);

  const addCustomFood = useCallback((food) => {
    setState((s) => ({ ...s, customFoods: [...s.customFoods, food] }));
  }, []);

  const removeCustomFood = useCallback((index) => {
    setState((s) => ({ ...s, customFoods: s.customFoods.filter((_, i) => i !== index) }));
  }, []);

  const shiftDate = useCallback((deltaDays) => {
    setDateKey((cur) => {
      const [y, m, d] = cur.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + deltaDays);
      return todayKey(dt);
    });
  }, []);

  const goToday = useCallback(() => setDateKey(todayKey()), []);

  // Export / import — JSON blob.
  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutritions-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const importData = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        try {
          const parsed = JSON.parse(String(r.result));
          if (typeof parsed !== 'object' || parsed === null) throw new Error('bad shape');
          setState({
            ...INITIAL_STATE,
            ...parsed,
            stats: migrateStats(parsed.stats),
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      r.onerror = () => reject(r.error);
      r.readAsText(file);
    });
  }, []);

  const clearAll = useCallback(() => setState(INITIAL_STATE), []);

  return {
    // raw state
    stats: state.stats,
    customFoods: state.customFoods,
    theme: state.theme,
    dateKey,
    log: day.log,
    water: day.water,
    totals,
    // setters
    setStat,
    setTheme,
    toggleTheme,
    addToLog,
    removeFromLog,
    setWater,
    resetDay,
    addCustomFood,
    removeCustomFood,
    shiftDate,
    goToday,
    exportData,
    importData,
    clearAll,
  };
}
