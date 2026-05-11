import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { makeTranslator } from './i18n/strings.js';

const STORAGE_KEY = 'nutritions.lang';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'th') return saved;
    } catch {
      /* sandboxed / privacy mode — fall through */
    }
    return 'en';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const value = useMemo(() => {
    const t = makeTranslator(lang);
    const toggle = () => setLang((l) => (l === 'en' ? 'th' : 'en'));
    return { lang, setLang, toggle, t };
  }, [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>');
  return ctx;
}
