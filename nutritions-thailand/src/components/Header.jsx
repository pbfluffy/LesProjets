import { useLang } from '../LangContext.jsx';
import styles from './Header.module.css';

export default function Header({ theme, onToggleTheme, onReset }) {
  const { lang, toggle: toggleLang, t } = useLang();
  return (
    <div className={styles.header}>
      <span className={styles.title}>{t('app.title')}</span>
      <div className={styles.controls}>
        <a
          href="./"
          className={styles.iconBtn}
          title={t('header.home')}
          aria-label="Home"
        >
          🏠
        </a>
        <button
          className={styles.iconBtn}
          onClick={toggleLang}
          aria-label="Toggle language"
          title={lang === 'en' ? 'Switch to Thai' : 'Switch to English'}
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
  );
}
