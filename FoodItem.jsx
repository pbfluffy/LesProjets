import { useLang } from '../LangContext.jsx';
import styles from './Header.module.css';

export default function Header({ theme, onToggleTheme, onReset }) {
  const { lang, toggle: toggleLang, t } = useLang();
  return (
    <>
      <a href="./" className={styles.home} title={t('header.home')} aria-label="Home">
        ← {t('header.home')}
      </a>
      <div className={styles.header}>
        <span className={styles.title}>{t('app.title')}</span>
        <div className={styles.controls}>
          <button
            className={styles.iconBtn}
            onClick={toggleLang}
            aria-label="Toggle language"
            title="EN / TH"
          >
            {lang === 'en' ? 'EN' : 'TH'}
          </button>
          <button
            className={styles.iconBtn}
            onClick={onToggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? t('header.themeDark') : t('header.themeLight')}
          </button>
          <button
            className={styles.iconBtn}
            onClick={onReset}
            title={t('header.resetTitle')}
            aria-label={t('header.resetTitle')}
          >
            {t('header.reset')}
          </button>
        </div>
      </div>
    </>
  );
}
