/* Wildlight Expedition – Sign in with Google and cloud save.
 *
 * Same Firebase project and pattern as Cloudlingo: the SDK comes from gstatic, the save is one JSON string in
 * Firestore `userWildlight/{uid}` (see firestore.rules), and the newest save wins. The first time an account is
 * used on a device where BOTH sides already have progress, the player chooses which one to keep.
 *
 * game.js owns the save. It calls cloud.saved() after every progress change and renders cloudCard() on the Map tab;
 * cloud.js reads `save` and replaces it through adoptSave() (never while a fight is running).
 */
(function () {
  'use strict';

  const FIREBASE = {
    version: '12.13.0',
    appName: 'wildlight',        // a named app keeps this game's sign-in separate from the site's other apps
    config: {
      apiKey: 'AIzaSyCDciJLEz3jOkMSVMOUjEN6_jPkSdKpU_c',     // public web key, same project as the other apps
      authDomain: 'auth.pumbafluffycorgi.com',
      projectId: 'pumgoda',
      storageBucket: 'pumgoda.firebasestorage.app',
      messagingSenderId: '675478948836',
      appId: '1:675478948836:web:3ad94d736b6a677d8495f1',
    },
  };
  const COLLECTION = 'userWildlight';
  const UID_KEY = 'wildlight:uid';        // the account this device last synced with
  const PUSH_DELAY = 1500;                // wait for a burst of changes to settle before uploading
  const RETRY_DELAY = 20000;

  // auth: 'loading' | 'out' | 'in' | 'unavailable'      sync: 'idle' | 'saving' | 'synced' | 'error'
  const st = { auth: 'loading', user: null, sync: 'idle', syncedAt: 0, choice: null };
  let fb = null, backend = null, linked = false, pushTimer = 0, pushing = false, pushAgain = false;

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const parse = s => { try { const o = JSON.parse(s); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } };
  const busy = () => typeof B !== 'undefined' && !!B;                    // a fight is running
  const stageCount = s => Object.keys((s && s.cleared) || {}).length;
  const levelSum = s => ['bren', 'tavi', 'iona'].reduce((a, id) => a + (((s && s.heroes) || {})[id] || { lvl: 1 }).lvl, 0);

  /* "Has this save been played?" A brand-new save has nothing to lose. */
  function hasProgress(s) {
    if (!s) return false;
    const items = Object.values(s.items || {}).reduce((a, arr) => a + (arr || []).reduce((x, y) => x + y, 0), 0);
    return stageCount(s) > 0 || levelSum(s) > 3 || (s.gold || 0) > 0 || (s.iron || 0) > 0 || items > 3 || Object.keys(s.recipes || {}).length > 0;
  }

  /* ------------------------------ cloud I/O ------------------------------ */
  function snapshotDoc() {
    return { state: JSON.stringify(save), updatedAt: save.updatedAt || Date.now(), level: levelSum(save), cleared: stageCount(save) };
  }

  async function pushNow() {
    clearTimeout(pushTimer);
    if (!linked || !backend || !st.user) return;
    if (pushing) { pushAgain = true; return; }
    pushing = true; pushAgain = false;
    st.sync = 'saving'; paint();
    try {
      await backend.set(st.user.uid, snapshotDoc());
      st.sync = 'synced'; st.syncedAt = Date.now();
    } catch (e) {
      st.sync = 'error';
      pushTimer = setTimeout(pushNow, RETRY_DELAY);
    }
    pushing = false;
    paint();
    if (pushAgain) pushNow();
  }

  /* Called by game.js whenever the player's progress changes. */
  function saved() {
    if (!linked) return;
    st.sync = 'saving';
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, PUSH_DELAY);
    paint();
  }

  /* --------------------------- reconcile on sign-in ------------------------ */
  function link(uid, push) {
    try { localStorage.setItem(UID_KEY, uid); } catch (e) { /* ignore */ }
    linked = true;
    st.sync = 'synced'; st.syncedAt = Date.now();
    if (push) pushNow();
    paint();
  }

  function adopt(remoteState) {
    if (busy()) return false;
    adoptSave(remoteState);
    return true;
  }

  async function reconcile(uid) {
    let remote = null;
    try { remote = await backend.get(uid); } catch (e) { st.sync = 'error'; paint(); return; }
    const rstate = remote ? parse(remote.state) : null;
    if (remote && !rstate) remote = null;                        // unreadable cloud copy: treat as empty and overwrite it
    let lastUid = null;
    try { lastUid = localStorage.getItem(UID_KEY); } catch (e) { /* ignore */ }
    const local = save.updatedAt || 0, cloud = remote ? remote.updatedAt || 0 : 0;

    if (remote && cloud !== local && lastUid !== uid && hasProgress(save) && hasProgress(rstate)) {
      // First time this account meets this device and both have progress: let the player pick.
      st.choice = { uid, remote, rstate };
      askChoice();
      return;
    }
    let push = false;
    if (!remote) push = true;                                    // first save for this account
    else if (cloud > local) { if (!adopt(rstate)) return; }      // the account is newer
    else if (lastUid !== uid && !hasProgress(save)) { if (!adopt(rstate)) return; }   // fresh device: take the account's
    else if (cloud < local) push = true;                         // this device is newer
    link(uid, push);
  }

  /* The player's answer to "which progress should we keep?" */
  function choose(which) {
    const c = st.choice;
    if (!c) return;
    closeDialog();
    st.choice = null;
    if (which === 'cloud') {
      if (!adopt(c.rstate)) { toast('Finish your fight first, then choose again.'); st.choice = c; askChoice(); return; }
      link(c.uid, false);
    } else {
      save.updatedAt = Math.max(Date.now(), (c.remote.updatedAt || 0) + 1);    // this device now wins over the old cloud copy
      persist(true);
      link(c.uid, true);
    }
  }

  function summary(s) {
    return `Level ${levelSum(s)} total · ${stageCount(s)} stage${stageCount(s) === 1 ? '' : 's'} cleared`;
  }

  function askChoice() {
    closeDialog();
    const c = st.choice;
    const d = document.createElement('div');
    d.className = 'result dialog'; d.id = 'cloud-dialog';
    d.innerHTML = `<div class="box"><h2>Which progress to keep?</h2>
      <p class="note">This account already has a saved game, and so does this device.</p>
      <div class="stack">
        <button class="btn good" data-act="keepcloud">Use my account's save<br><small>${esc(summary(c.rstate))}</small></button>
        <button class="btn alt" data-act="keepdevice">Keep this device's save<br><small>${esc(summary(save))}</small></button>
      </div></div>`;
    document.body.appendChild(d);
  }
  function closeDialog() { const d = document.getElementById('cloud-dialog'); if (d) d.remove(); }

  /* ----------------------------- account card ----------------------------- */
  const gLogo = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';

  function ago(t) {
    const s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 10) return 'just now';
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }

  function cardInner() {
    if (st.auth === 'loading') return `<p class="note">Checking your account…</p>`;
    if (st.auth === 'unavailable') return `<h2>Save your progress</h2><p class="note">Cloud save isn't available right now (offline?). Your progress is still saved on this device.</p>`;
    if (st.auth === 'in' && st.user) {
      const status = st.sync === 'saving' ? '☁ Saving…'
        : st.sync === 'error' ? '⚠ Couldn’t reach the cloud, will retry'
        : st.sync === 'synced' ? `☁ Saved to your account · ${ago(st.syncedAt)}`
        : '☁ Connecting…';
      return `<div class="account">
        ${st.user.photo ? `<img class="avatar" src="${esc(st.user.photo)}" alt="" referrerpolicy="no-referrer">` : '<span class="avatar ph">★</span>'}
        <div class="who"><b>${esc(st.user.name)}</b><div class="note">${status}</div></div>
        <button class="ghost small" data-act="signout">Sign out</button></div>`;
    }
    return `<h2>Save your progress</h2>
      <p class="sub">Sign in with Google to keep your progress safe and play on any device. Your fights, weapons and farming are saved to your account.</p>
      <button class="gbtn" data-act="signin">${gLogo}<span>Sign in with Google</span></button>`;
  }
  function cardHtml() { return `<div class="card" id="account-card">${cardInner()}</div>`; }
  function paint() { const el = document.getElementById('account-card'); if (el) el.innerHTML = cardInner(); }
  setInterval(() => { if (st.auth === 'in' && st.sync === 'synced') paint(); }, 30000);     // keeps "2m ago" fresh

  /* ------------------------------- auth ---------------------------------- */
  function onUser(user) {
    clearTimeout(pushTimer);
    linked = false; st.choice = null; closeDialog();
    if (!user) {
      st.user = null; st.auth = 'out'; st.sync = 'idle';
      try { localStorage.removeItem(UID_KEY); } catch (e) { /* ignore */ }
      paint();
      return;
    }
    st.user = { uid: user.uid, name: user.displayName || user.email || 'Signed in', photo: user.photoURL || '' };
    st.auth = 'in'; st.sync = 'idle';
    paint();
    reconcile(user.uid);
  }

  async function signIn() {
    if (!fb) { toast('Cloud save is still loading, try again in a moment.'); return; }
    const provider = new fb.au.GoogleAuthProvider();
    try {
      await fb.au.signInWithPopup(fb.auth, provider);
    } catch (e) {
      const code = e && e.code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-environment') fb.au.signInWithRedirect(fb.auth, provider);
      else if (code === 'auth/operation-not-allowed') toast('Google sign-in is switched off for this project.');
      else if (code === 'auth/account-exists-with-different-credential') toast('That email is already used with another sign-in method.');
      else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') toast('Sign-in failed. Please try again.');
    }
  }

  async function signOut() {
    if (!fb) return;
    if (linked && st.sync !== 'synced') await pushNow();      // do not lose the last changes
    fb.au.signOut(fb.auth);
    toast('Signed out. Your progress stays on this device.');
  }

  /* Pull in changes made on another device when the player comes back to this tab. */
  document.addEventListener('visibilitychange', async () => {
    if (!linked || !backend || !st.user) return;
    if (document.visibilityState === 'hidden') { if (st.sync === 'saving') pushNow(); return; }
    if (busy()) return;
    try {
      const remote = await backend.get(st.user.uid);
      const rstate = remote ? parse(remote.state) : null;
      if (rstate && (remote.updatedAt || 0) > (save.updatedAt || 0)) { if (adopt(rstate)) { st.sync = 'synced'; st.syncedAt = Date.now(); paint(); } }
      else if (!remote || (remote.updatedAt || 0) < (save.updatedAt || 0)) pushNow();
    } catch (e) { /* offline: try again next time */ }
  });
  window.addEventListener('online', () => { if (linked && st.sync === 'error') pushNow(); });

  /* -------------------------------- boot --------------------------------- */
  async function init() {
    try {
      const base = `https://www.gstatic.com/firebasejs/${FIREBASE.version}/`;
      const [fa, au, fs] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
      const app = fa.getApps().find(a => a.name === FIREBASE.appName) || fa.initializeApp(FIREBASE.config, FIREBASE.appName);
      fb = { au, fs, auth: au.getAuth(app), db: fs.getFirestore(app) };
      backend = {
        get: async uid => { const s = await fs.getDoc(fs.doc(fb.db, COLLECTION, uid)); return s.exists() ? s.data() : null; },
        set: (uid, data) => fs.setDoc(fs.doc(fb.db, COLLECTION, uid), data),
      };
    } catch (e) { st.auth = 'unavailable'; paint(); return; }
    fb.au.getRedirectResult(fb.auth).catch(e => {
      if (e && e.code === 'auth/account-exists-with-different-credential') toast('That email is already used with another sign-in method.');
    });
    fb.au.onAuthStateChanged(fb.auth, onUser);
  }

  window.cloud = {
    saved, signIn, signOut, choose,
    // for tests and debugging: swap in a fake backend and drive the sign-in flow without Google
    _test: { st, setBackend: b => { backend = b; }, onUser, hasProgress, pushNow },
  };
  window.cloudCard = cardHtml;
  if (typeof render === 'function' && !busy()) render();       // show the account card now that it exists
  init();
})();
