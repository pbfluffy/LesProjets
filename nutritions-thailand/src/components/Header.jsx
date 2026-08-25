import { useLang } from '../LangContext.jsx';
import styles from './Header.module.css';

import { useState, useEffect, useRef } from 'react';
import { auth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from '../firebase.js';

export default function Header({ theme, onToggleTheme, onReset, syncStatus }) {
  const { lang, toggle: toggleLang, t } = useLang();
  const [user, setUser] = useState(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const popoverWrapRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setPopoverOpen(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e) => {
      if (popoverWrapRef.current && !popoverWrapRef.current.contains(e.target)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popoverOpen]);

  const handleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setPopoverOpen(false);
    } catch (e) {
      console.warn('[acct] sign-in failed:', e);
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setPopoverOpen(false);
    } catch (e) {
      console.warn('[acct] sign-out failed:', e);
    }
  };

  return (
    <div className={styles.header}>
      <span className={styles.title}>{t('app.title')}</span>
      <div className={styles.controls}>
        <a
          href="../"
          className={styles.iconBtn}
          title={t('header.home')}
          aria-label="Home"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <path d="M9 22V12h6v10" />
          </svg>
        </a>
        <button
          className={styles.iconBtn}
          onClick={toggleLang}
          aria-label="Toggle language"
          title={lang === 'en' ? 'Switch to Thai' : 'Switch to English'}
        >
          {lang === 'en' ? 'TH' : 'EN'}
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
          onClick={() => { if (window.confirm(t('header.resetConfirm'))) onReset(); }}
          title={t('header.resetTitle')}
          aria-label={t('header.resetTitle')}
        >
          {t('header.reset')}
        </button>
      <div className={styles.acctWrap} ref={popoverWrapRef}>
        {/* Feature #66 — sync status dot (corner of avatar button) */}
        {syncStatus && syncStatus !== 'idle' && (
          <span
            aria-hidden="true"
            title={'Sync: ' + syncStatus}
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background:
                syncStatus === 'syncing' ? '#f5c542' :
                syncStatus === 'synced' ? '#2e7d32' :
                syncStatus === 'error' ? '#d32f2f' :
                '#888',
              border: '2px solid var(--bg, #fff)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
        )}
        <button
          className={`${styles.iconBtn} ${styles.acctBtn}`}
          onClick={() => setPopoverOpen(o => !o)}
          aria-label={user ? t('account.signedInAs') : t('account.signIn')}
          title={user ? (user.displayName || user.email || '') : t('account.signIn')}
        >
          {user && user.photoURL ? (
            <img src={user.photoURL} alt="" className={styles.acctAvatar} referrerPolicy="no-referrer" />
          ) : (
            <span className={styles.acctAvatarPlaceholder}>👤</span>
          )}
        </button>
        {popoverOpen && (
          <div className={styles.acctPopover}>
            {user ? (
              <>
                <div className={styles.acctPopoverHeader}>
                  {user.photoURL && (
                    <img src={user.photoURL} alt="" className={styles.acctPopoverAvatar} referrerPolicy="no-referrer" />
                  )}
                  <div className={styles.acctPopoverInfo}>
                    <div className={styles.acctName}>{user.displayName || 'User'}</div>
                    <div className={styles.acctEmail}>{user.email}</div>
                  </div>
                </div>
                <button onClick={handleSignOut} className={styles.acctSignOutBtn}>
                  {t('account.signOut')}
                </button>
              </>
            ) : (
              <>
                <div className={styles.acctHeading}>{t('account.signIn')}</div>
                <button onClick={handleSignIn} disabled={signingIn} className={styles.acctGoogleBtn}>
                  <span className={styles.acctGoogleIcon} aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="14" height="14">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                    </svg>
                  </span>
                  <span>{signingIn ? t('account.signingIn') : t('account.continueWithGoogle')}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
