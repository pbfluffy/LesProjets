(() => {
  'use strict';

  // ---------- Constants & helpers ----------
  // This build's version: the commit stamped into the script's ?v= link at deploy ('dev' locally).
  const APP_VERSION = (() => { try { return new URL(document.currentScript.src).searchParams.get('v') || 'dev'; } catch { return 'dev'; } })();
  const APP_BUILT = '__BUILD_DATE__'; // deploy date, filled in at deploy (deploy.yml)
  const APP_LABEL = APP_BUILT.startsWith('__') ? APP_VERSION : APP_BUILT + ' · ' + APP_VERSION;
  let updatePending = false; // a newer version is waiting for the current lesson or exam to end
  const COURSES = window.COURSES;
  const app = document.getElementById('app');
  const modalRoot = document.getElementById('modal-root');
  const STORE = 'cloudlingo:v1';
  const LESSONS_PER_UNIT = 3;
  const Q_PER_LESSON = 7;
  const FIRST_LESSON_Q = 4; // the very first lesson is short, so it's a quick win
  const GOALS = [
    { xp: 10, key: 'goal_casual' }, { xp: 20, key: 'goal_regular' },
    { xp: 30, key: 'goal_serious' }, { xp: 50, key: 'goal_intense' }
  ];
  const MAX_FREEZES = 2, FREEZE_EVERY = 7;

  // ---------- Language (shared with the other apps on the site via localStorage "lang") ----------
  const I18N = window.I18N || { en: {} };
  const LANG_KEY = 'lang';
  let lang = (() => {
    try { const v = localStorage.getItem(LANG_KEY); if (v === 'th' || v === 'en') return v; } catch { /* ignore */ }
    return /^th\b/i.test(navigator.language || '') ? 'th' : 'en';
  })();
  const fill = (s, v) => v ? String(s).replace(/\{(\w+)\}/g, (_, k) => v[k] != null ? v[k] : '') : s;
  const t = (k, v) => fill(I18N[lang] && I18N[lang][k] != null ? I18N[lang][k] : I18N.en[k] != null ? I18N.en[k] : k, v);
  const tn = (k, n, v = {}) => {
    const d = I18N[lang] || {}, key = n === 1 && d[k + '_one'] != null ? k + '_one' : k + '_other';
    return fill(d[key] != null ? d[key] : I18N.en[n === 1 ? k + '_one' : k + '_other'], { n, ...v });
  };
  const locale = () => lang === 'th' ? 'th-TH' : undefined;
  function setLang(l) {
    lang = l;
    try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
    document.documentElement.lang = l;
    if (l === 'th') loadThai();
  }
  document.documentElement.lang = lang;
  // Thai explanations and hints (js/th/*.js) load only when Thai is in use.
  const ASSET_V = ((document.querySelector('script[src*="js/app.js"]') || {}).src || '').split('?')[1] || '';
  let thaiLoading = null;
  function loadThai() {
    if (window.TH_EXPLAIN && window.TH_GLOSS) return Promise.resolve();
    if (thaiLoading) return thaiLoading;
    const files = ['glossary', 'clf', 'aif', 'saa', 'dva', 'soa', 'dea', 'why-clf', 'why-aif', 'why-saa'].map(f => 'js/th/' + f + '.js' + (ASSET_V ? '?' + ASSET_V : ''));
    thaiLoading = Promise.all(files.map(src => new Promise(res => {
      const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = res; document.head.appendChild(el);
    }))).then(() => { if (typeof refresh === 'function') refresh(); });
    return thaiLoading;
  }
  const explain = q => (lang === 'th' && (q.eth || (window.TH_EXPLAIN && window.TH_EXPLAIN[q.id]))) || q.e;
  // "Why not" notes (js/why/*.js; Thai in js/th/why-*.js): one per wrong option, in bank order.
  // Hidden once an admin has edited a question's options, since they may no longer line up.
  const whyNot = (q, i) => {
    if (q.tf || i == null || !q.o || (q._edited && JSON.stringify(q._orig.o) !== JSON.stringify(q.o))) return '';
    const th = lang === 'th' && window.TH_WHY && window.TH_WHY[q.id];
    return (th && th[i]) || (window.WHY_NOT && window.WHY_NOT[q.id] && window.WHY_NOT[q.id][i]) || '';
  };
  // The note for each wrong option picked, then the other wrong options folded away.
  function whyHTML(q, picked) {
    const isRight = i => Array.isArray(q.a) ? q.a.includes(i) : q.a === i;
    const mine = (Array.isArray(picked) ? picked : picked == null ? [] : [picked]).filter(i => !isRight(i) && whyNot(q, i));
    const rest = (q.o || []).map((o, i) => i).filter(i => !isRight(i) && !mine.includes(i) && whyNot(q, i));
    return mine.map(i => `<div class="whynot"><b>${esc(t('why_not', { a: q.o[i] }))}</b> ${esc(whyNot(q, i))}</div>`).join('')
      + (rest.length ? `<details class="whyothers"><summary>${t('why_others')}</summary><ul>${rest.map(i => `<li><b>${esc(q.o[i])}:</b> ${esc(whyNot(q, i))}</li>`).join('')}</ul></details>` : '');
  }
  const blurb = c => (window.I18N_COURSES && I18N_COURSES[lang] && I18N_COURSES[lang][c.id]) || c.blurb;
  const domainLabel = d => lang === 'en' ? d : d.replace(/^Domains?\b/, m => t(m === 'Domains' ? 'domains' : 'domain'));

  const ICON = window.ICON || (() => '');
  // Line icon for each unit (replaces the emoji stored in the data files).
  const UNIT_ICON = {
    'clf-1': 'cloud', 'clf-2': 'shieldlock', 'clf-3': 'server', 'clf-4': 'globe', 'clf-5': 'card',
    'aif-1': 'chip', 'aif-2': 'sparkle', 'aif-3': 'puzzle', 'aif-4': 'scale',
    'saa-1': 'shield', 'saa-2': 'layers', 'saa-3': 'bolt', 'saa-4': 'coins',
    'dva-1': 'code', 'dva-2': 'key', 'dva-3': 'rocket',
    'soa-1': 'activity', 'soa-2': 'repeat', 'soa-3': 'gear', 'soa-4': 'globe',
    'dea-1': 'inbox', 'dea-2': 'database', 'dea-3': 'lock'
  };
  const unitIcon = u => ICON(UNIT_ICON[u.id] || 'cloud');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const range = n => [...Array(n).keys()];
  const fmtTime = secs => { secs = Math.max(0, Math.round(secs)); return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`; };
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dayAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return dayKey(d); };
  const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Index questions and units; normalize true/false into multiple choice.
  const QINDEX = {}, UNITS = {};
  COURSES.forEach(c => c.units.forEach((u, ui) => {
    u.course = c.id; u.index = ui; UNITS[u.id] = u;
    u.questions.forEach((q, qi) => {
      q.id = `${u.id}-${qi}`; q.unit = u.id; q.course = c.id;
      if (q.t === 'tf') { q.t = 'mc'; q.tf = true; q.o = ['True', 'False']; q.a = q.a ? 0 : 1; }
      QINDEX[q.id] = q;
    });
  }));

  // ---------- Question edits from the admin page ----------
  // Admins can fix or hide a question (Firestore cloudlingoEdits/{questionId}).
  // Edits are cached on the device and applied over the built-in question bank.
  const EDITS_KEY = 'cloudlingo:edits';
  function rawOf(q) {
    if (!q._orig) q._orig = JSON.parse(JSON.stringify(q.tf ? { t: 'tf', q: q.q, a: q.a === 0, e: q.e } : { t: q.t, q: q.q, o: q.o, a: q.a, e: q.e, pairs: q.pairs }));
    return q._orig;
  }
  function applyEdits(map) {
    Object.values(QINDEX).forEach(q => { if (q._edited) { const o = rawOf(q); setRaw(q, o); q.disabled = false; q.eth = null; q._edited = false; } });
    for (const [qid, ed] of Object.entries(map || {})) {
      const q = QINDEX[qid];
      if (!q || !ed) continue;
      const base = Object.assign({}, rawOf(q), ed.fields || {}, { t: rawOf(q).t }); // the question type never changes
      setRaw(q, base);
      q.disabled = !!ed.disabled; q.eth = ed.eth || null; q._edited = true;
    }
  }
  function setRaw(q, r) {
    q.q = r.q; q.e = r.e;
    if (r.t === 'tf') { q.t = 'mc'; q.tf = true; q.o = ['True', 'False']; q.a = r.a ? 0 : 1; }
    else { q.t = r.t; q.tf = false; q.o = r.o; q.a = r.a; q.pairs = r.pairs; }
  }
  try { applyEdits(JSON.parse(localStorage.getItem(EDITS_KEY) || '{}')); } catch { /* no cached edits */ }
  const live = q => q && !q.disabled;

  // ---------- Persistent state ----------
  const DEFAULTS = () => ({
    cert: null, xp: 0, dailyGoal: 20, xpByDay: {}, streak: 0, lastStreakDay: null,
    session: null, progress: {}, stats: {}, mistakes: {},
    exams: [], lessons: 0, theme: 'auto'
  });
  let S = load();
  function load() {
    try { const raw = localStorage.getItem(STORE); return raw ? { ...DEFAULTS(), ...JSON.parse(raw) } : DEFAULTS(); }
    catch { return DEFAULTS(); }
  }
  function save() {
    S.updatedAt = Date.now();
    try { localStorage.setItem(STORE, JSON.stringify(S)); } catch { /* storage unavailable */ }
    scheduleSync();
    scheduleBoard();
  }

  // ---------- Cloud sync ----------
  // Browser storage always holds progress. On top of that, progress is copied to
  // the learner's account so it follows them across devices:
  //  - on the website: Google sign-in (Firebase, shared with the other apps on the
  //    same site), stored in Firestore at userCloudlingo/{uid};
  //  - as a claude.ai artifact: the viewer's private artifact document.
  // A sync "ref" is anything with set(data). The newest copy (by updatedAt) wins.
  let syncRef = null, syncTimer = null, syncBusy = false, syncAgain = false;
  function scheduleSync() {
    if (!syncRef) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(pushSync, 1500);
  }
  async function pushSync() {
    if (!syncRef) return;
    if (syncBusy) { syncAgain = true; return; }
    syncBusy = true;
    try { await syncRef.set({ state: JSON.stringify(S), updatedAt: S.updatedAt || Date.now(), xp: S.xp || 0, lessons: S.lessons || 0 }); }
    catch (e) {
      if (!e || e.code !== 'unavailable') { // no write access: stay local-only
        syncRef = null;
        if (account) { account.error = true; refresh(); }
      }
    }
    syncBusy = false;
    if (syncAgain) { syncAgain = false; pushSync(); }
  }
  const busyView = () => view === 'lesson' || view === 'examRun';
  const refresh = () => { if (!busyView()) render(); };
  const hasProgress = st => (st.xp || 0) > 0 || (st.lessons || 0) > 0 || Object.keys(st.progress || {}).length > 0;
  function adopt(remote) {
    S = { ...DEFAULTS(), ...JSON.parse(remote.state) };
    try { localStorage.setItem(STORE, JSON.stringify(S)); } catch { /* ignore */ }
    applyFreezes();
    applyTheme();
    if (view === 'onboard' && S.cert) view = 'learn';
    refresh();
  }

  async function initClaudeSync() {
    try {
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      const ref = db.doc(`data/users/${id}/progress`);
      const snap = await ref.get();
      const remote = snap.exists ? snap.data() : null;
      if (remote && (remote.updatedAt || 0) > (S.updatedAt || 0)) adopt(remote);
      syncRef = ref;
      if (!remote || (remote.updatedAt || 0) < (S.updatedAt || 0)) pushSync();
    } catch { syncRef = null; }
  }

  // ---------- Account (website) ----------
  const FIREBASE = {
    version: '12.13.0',
    appName: 'cloudlingo',
    config: {
      apiKey: 'AIzaSyCDciJLEz3jOkMSVMOUjEN6_jPkSdKpU_c',
      authDomain: 'auth.pumbafluffycorgi.com',
      projectId: 'pumgoda',
      storageBucket: 'pumgoda.firebasestorage.app',
      messagingSenderId: '675478948836',
      appId: '1:675478948836:web:3ad94d736b6a677d8495f1'
    }
  };
  const UID_KEY = 'cloudlingo:uid'; // account last synced on this device
  // authState: 'off' (no accounts here) | 'loading' | 'out' | 'in' | 'unavailable'
  let fb = null, authState = 'off', account = null, unwatch = null, choice = null;

  let fbLoading = null;
  async function initFirebaseSync() {
    authState = 'loading';
    refresh();
    try {
      const base = `https://www.gstatic.com/firebasejs/${FIREBASE.version}/`;
      fbLoading = Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
      const [fa, au, fs] = await fbLoading;
      // A named Firebase app keeps Cloudlingo's sign-in separate from the other
      // apps on the site: Firebase stores each app's session under its own name.
      // Same project, so an account still reaches the same progress.
      const fapp = fa.getApps().find(a => a.name === FIREBASE.appName) || fa.initializeApp(FIREBASE.config, FIREBASE.appName);
      fb = { au, fs, auth: au.getAuth(fapp), db: fs.getFirestore(fapp) };
    } catch { authState = 'unavailable'; refresh(); return; }
    fb.au.getRedirectResult(fb.auth).then(res => { if (res && res.providerId === 'microsoft.com') fetchMicrosoftPhoto(res); }).catch(e => {
      if (e && e.code === 'auth/account-exists-with-different-credential') infoModal(t('signin_failed'), t('account_exists'));
    });
    finishLine().then(returned => { if (!returned) collectLineHandoff(); });
    fb.fs.getDocs(fb.fs.collection(fb.db, 'cloudlingoEdits')).then(snap => {
      const map = {}; snap.forEach(d => { map[d.id] = d.data(); });
      try { localStorage.setItem(EDITS_KEY, JSON.stringify(map)); } catch { /* ignore */ }
      applyEdits(map); refresh();
    }).catch(() => { /* keep the cached edits */ });
    fb.au.onAuthStateChanged(fb.auth, user => {
      if (unwatch) { unwatch(); unwatch = null; }
      syncRef = null; choice = null;
      if (!user) {
        if (lastUid) forgetPhoto(lastUid);
        lastUid = null;
        account = null; authState = 'out';
        try { localStorage.removeItem(UID_KEY); } catch { /* ignore */ }
        refresh(); return;
      }
      remind = { loaded: false, on: false, hour: 19, busy: false };
      account = { uid: user.uid, name: user.displayName || user.email || t('signed_in'), first: (user.displayName || '').trim().split(/\s+/)[0] || '', email: user.email || '', photo: user.photoURL || savedPhoto(user.uid), synced: false };
      lastUid = user.uid;
      checkRevoked(user);
      authState = 'in';
      track('signin'); clearTimeout(fnTimer); fnTimer = setTimeout(sendFunnel, 1500);
      refresh();
      fb.fs.setDoc(fb.fs.doc(fb.db, 'userProfiles', user.uid), {
        name: user.displayName || '', email: user.email || '', photoURL: user.photoURL || null,
        lastSeen: fb.fs.serverTimestamp(), lastApp: 'Cloudlingo'
      }, { merge: true }).catch(() => { /* profile is best-effort */ });
      const dref = fb.fs.doc(fb.db, 'userCloudlingo', user.uid);
      const ref = { set: data => fb.fs.setDoc(dref, data) };
      let first = true;
      unwatch = fb.fs.onSnapshot(dref, snap => {
        if (snap.metadata.hasPendingWrites) return;
        const remote = snap.exists() ? snap.data() : null;
        if (first) { first = false; reconcile(ref, remote, user.uid); return; }
        if (choice) { choice.remote = remote; return; }
        // Progress made on another device while this one is open.
        if (remote && syncRef && (remote.updatedAt || 0) > (S.updatedAt || 0) && !busyView()) adopt(remote);
      }, () => { account.error = true; refresh(); });
    });
  }

  function reconcile(ref, remote, uid) {
    let lastUid = null;
    try { lastUid = localStorage.getItem(UID_KEY); } catch { /* ignore */ }
    const local = S.updatedAt || 0, cloud = remote ? remote.updatedAt || 0 : 0;
    if (remote && cloud !== local && lastUid !== uid && hasProgress(S) && hasProgress(JSON.parse(remote.state))) {
      // First sign-in on this device, and both copies have progress: let the learner pick.
      choice = { ref, remote, uid };
      askChoice();
      return;
    }
    let push = false;
    if (!remote) push = true;                                      // first save for this account
    else if (cloud > local) adopt(remote);                         // account is newer
    else if (lastUid !== uid && !hasProgress(S)) adopt(remote);    // fresh device: take the account's
    else if (cloud < local) push = true;                           // this device is newer
    linkSync(ref, uid, push);
  }
  function linkSync(ref, uid, push) {
    try { localStorage.setItem(UID_KEY, uid); } catch { /* ignore */ }
    syncRef = ref;
    if (account) account.synced = true;
    if (push) pushSync();
    scheduleBoard();
    if (view === 'board') loadBoard();
    refresh();
  }
  function askChoice() {
    const r = JSON.parse(choice.remote.state);
    const sessions = n => tn('sessions', n || 0);
    modal(`${mascot(80, 'think')}<h2>${t('keep_q')}</h2>
      <p>${t('keep_sub')}</p>
      <div class="stack">
        <button class="btn" data-act="keepcloud">${t('keep_account', { xp: r.xp || 0, s: sessions(r.lessons) })}</button>
        <button class="btn ghost" data-act="keepdevice">${t('keep_device', { xp: S.xp, s: sessions(S.lessons) })}</button>
      </div>`, 'sticky');
  }
  const infoModal = (title, body, mood = 'shocked') =>
    modal(`${mascot(80, mood === 'happy' ? 'laugh' : mood)}<h2>${title}</h2><p>${body}</p><button class="btn block" data-act="closemodal">${t('ok')}</button>`);

  // The sign-in sheet: Google, LINE, and (once it's switched on in Firebase) Microsoft.
  // Firebase Authentication → Microsoft, backed by the Entra app "pumbafluffycorgi.com sign-in".
  // Its client secret expires: renew it in Azure and update it in Firebase, or this button stops working.
  const MICROSOFT_ON = true;
  // Microsoft sign-in is for a small group of invited testers: guests invited into our
  // Entra tenant (Azure portal → Entra ID → Users → Invite external user). The public uses
  // Google or LINE. With MS_TENANT set, Microsoft only accepts users in that tenant, and
  // the Entra app must be single-tenant. Leave it empty to accept any Microsoft account.
  const MS_TENANT = 'd2209c2a-d8d5-496b-93f9-27507d8cb9dc'; // "Default Directory" (pumbafluffycorgi.com)
  function signInSheet() {
    modal(`${mascot(80, 'idea')}<h2>${t('signin_sheet')}</h2><p>${t('signin_pitch')}</p>
      <div class="stack">
        <button class="btn prov google" data-act="signinwith" data-p="google"><span class="pico">G</span>${t('continue_google')}</button>
        <button class="btn prov line" data-act="signinwith" data-p="line"><span class="pico">LINE</span>${t('continue_line')}</button>
        ${MICROSOFT_ON ? `<button class="btn prov ms" data-act="signinwith" data-p="microsoft"><span class="pico"><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect width="9" height="9" fill="#f25022"/><rect x="11" width="9" height="9" fill="#7fba00"/><rect y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg></span>${t('continue_microsoft')}${MS_TENANT ? `<span class="prov-tag">${ICON('sparkle')} ${t('ms_tag')}</span>` : ''}</button>` : ''}
      </div>`);
  }

  // Microsoft doesn't give Firebase a photo URL. Right after a Microsoft sign-in
  // we get a short-lived Graph access token, download the account's photo once,
  // shrink it to 96px, and keep it on this device for that account.
  const PHOTO_KEY = uid => 'cloudlingo:photo:' + uid;
  let lastUid = null;
  function savedPhoto(uid) { try { return localStorage.getItem(PHOTO_KEY(uid)) || ''; } catch { return ''; } }
  function forgetPhoto(uid) { try { localStorage.removeItem(PHOTO_KEY(uid)); } catch { /* ignore */ } }
  async function fetchMicrosoftPhoto(result) {
    try {
      const cred = fb.au.OAuthProvider.credentialFromResult(result);
      if (!cred || !cred.accessToken) return;
      const res = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', { headers: { Authorization: 'Bearer ' + cred.accessToken } });
      if (!res.ok) return; // no photo on this account: the Nimbus avatar stays
      const bmp = await createImageBitmap(await res.blob());
      const n = 96, c = document.createElement('canvas'); c.width = c.height = n;
      const side = Math.min(bmp.width, bmp.height);
      c.getContext('2d').drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, n, n);
      const url = c.toDataURL('image/jpeg', 0.85);
      try { localStorage.setItem(PHOTO_KEY(result.user.uid), url); } catch { /* storage full: show it this session only */ }
      if (account && account.uid === result.user.uid) { account.photo = url; refresh(); }
    } catch { /* the photo is optional */ }
  }

  // Beta testers whose access was revoked in admindepum (Firestore cloudlingoRevoked/{account}).
  // Signs a Microsoft-signed-in tester out here, even though their Firebase session is still alive.
  // Learners whose Cloudlingo access was revoked in admindepum (cloudlingoBlocked/{uid}, any
  // sign-in method) are signed out too; the same account keeps working in the site's other apps.
  async function checkRevoked(user) {
    if (!user) return;
    try {
      const blocked = await fb.fs.getDoc(fb.fs.doc(fb.db, 'cloudlingoBlocked', user.uid));
      if (blocked.exists()) { await fb.au.signOut(fb.auth); infoModal(t('blocked_t'), t('blocked_b')); return; }
    } catch { /* can't check right now: try again next time the app opens */ }
    if (!user.email || !(user.providerData || []).some(p => p.providerId === 'microsoft.com')) return;
    try {
      const snap = await fb.fs.getDoc(fb.fs.doc(fb.db, 'cloudlingoRevoked', user.email.toLowerCase()));
      if (!snap.exists()) return;
      await fb.au.signOut(fb.auth);
      infoModal(t('revoked_t'), t('revoked_b'));
    } catch { /* can't check right now: try again next time the app opens */ }
  }

  async function signIn(which = 'google') {
    if (!fb && fbLoading) { try { await fbLoading; } catch { /* handled below */ } }
    if (!fb) { infoModal(t('signin_cant_load'), t('signin_cant_load_sub')); return; }
    if (which === 'line') { goToLine(); return; }
    let provider;
    if (which === 'microsoft') {
      provider = new fb.au.OAuthProvider('microsoft.com');
      provider.setCustomParameters(Object.assign({ prompt: 'select_account' }, MS_TENANT ? { tenant: MS_TENANT } : {}));
      provider.addScope('User.Read'); // lets us read the account's profile photo once, right after sign-in
    } else provider = new fb.au.GoogleAuthProvider();
    closeModal();
    fb.au.signInWithPopup(fb.auth, provider).then(res => { if (which === 'microsoft') fetchMicrosoftPhoto(res); }).catch(e => {
      const code = e && e.code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-environment') fb.au.signInWithRedirect(fb.auth, provider);
      else if (code === 'auth/account-exists-with-different-credential') infoModal(t('signin_failed'), t('account_exists'));
      else if (code === 'auth/operation-not-allowed') infoModal(t('signin_failed'), t('provider_off'));
      // A Microsoft account outside the testers' tenant is refused by Microsoft: point to Google or LINE.
      else if (which === 'microsoft' && MS_TENANT && code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') infoModal(t('signin_failed'), t('ms_invited_only'));
      else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') infoModal(t('signin_failed'), t('signin_failed_sub'));
    });
  }

  // ---------- Sign in with LINE ----------
  // Firebase has no LINE provider. LINE sends the person back here with
  // ?code=…&state=…, and the site's LINE Worker (the same one the home page and
  // Village 77 use) trades the code for a Firebase custom token. A LINE account
  // connected to a Google account on the home page opens that same account.
  // On phones LINE may send the person back to a different browser than the
  // one they started in; then that browser parks the sign-in on the Worker
  // under a one-time id, and the starting browser collects it when they return.
  const LINE_WORKER = 'https://village-77.pbfluffygaming.workers.dev';
  const LINE_CHANNEL_ID = '2012133281';
  const LINE_REDIRECT = location.origin + location.pathname.replace(/index\.html$/, '');
  const LINE_PENDING_KEY = 'cloudlingo:line'; // { state, started } while away at LINE
  const LINE_PENDING_MAX_MS = 10 * 60 * 1000;
  const randomHex = () => [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
  function readLinePending() {
    try { const p = JSON.parse(localStorage.getItem(LINE_PENDING_KEY)); return p && Date.now() - p.started < LINE_PENDING_MAX_MS ? p : null; }
    catch { return null; }
  }
  const clearLinePending = () => { try { localStorage.removeItem(LINE_PENDING_KEY); } catch { /* ignore */ } };
  function goToLine() {
    const state = 'h' + randomHex();
    try { localStorage.setItem(LINE_PENDING_KEY, JSON.stringify({ state, started: Date.now() })); } catch { /* ignore */ }
    const params = new URLSearchParams({ response_type: 'code', client_id: LINE_CHANNEL_ID, redirect_uri: LINE_REDIRECT, state, scope: 'profile openid' });
    location.assign('https://access.line.me/oauth2/v2.1/authorize?' + params);
  }
  async function postLine(path, body) {
    const res = await fetch(LINE_WORKER + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const err = new Error(data.error || 'LINE request failed'); err.status = res.status; throw err; }
    return data;
  }
  async function signInWithLine(result) {
    const cred = await fb.au.signInWithCustomToken(fb.auth, result.customToken);
    // A new LINE account has no name or photo yet: use LINE's.
    if (!cred.user.displayName && result.name) {
      await fb.au.updateProfile(cred.user, { displayName: result.name, photoURL: result.picture || null });
      if (account && account.uid === cred.user.uid) {
        Object.assign(account, { name: result.name, first: result.name.trim().split(/\s+/)[0], photo: result.picture || '' });
        refresh();
      }
    }
  }
  // Runs once Firebase is loaded: finishes a LINE sign-in if LINE just sent the
  // person here. Returns true when this page load was such a return.
  async function finishLine() {
    const params = new URLSearchParams(location.search);
    const code = params.get('code'), lineError = params.get('error');
    if (!code && !lineError) return false;
    history.replaceState(null, '', location.pathname + location.hash); // a reload mustn't replay the code
    const state = params.get('state') || '';
    const pending = readLinePending();
    const startedHere = !!pending && pending.state === state;
    if (startedHere) clearLinePending();
    if (lineError) { if (lineError !== 'access_denied') infoModal(t('signin_failed'), t('line_failed')); return true; }
    const id = state.slice(1);
    if (state[0] !== 'h' || !/^[0-9a-f]{32}$/.test(id)) { infoModal(t('signin_failed'), t('line_failed')); return true; }
    try {
      if (startedHere) await signInWithLine(await postLine('/line-auth', { code, redirectUri: LINE_REDIRECT }));
      else if (!pending) {
        await postLine('/line-auth', { code, redirectUri: LINE_REDIRECT, handoff: id });
        infoModal(t('line_elsewhere_t'), t('line_elsewhere'), 'happy');
      } else infoModal(t('signin_failed'), t('line_failed'));
    } catch { infoModal(t('signin_failed'), t('line_failed')); }
    return true;
  }
  let collectingLine = false;
  async function collectLineHandoff() {
    const pending = readLinePending();
    if (!pending) { clearLinePending(); return; }
    if (collectingLine || !fb || fb.auth.currentUser) return;
    collectingLine = true;
    try {
      const res = await fetch(LINE_WORKER + '/line-handoff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handoff: pending.state.slice(1) }) });
      if (res.status !== 404) { // 404: not finished in the other browser yet
        clearLinePending();
        if (res.ok) await signInWithLine(await res.json());
      }
    } catch { /* try again next time the page is shown */ }
    collectingLine = false;
  }

  function initSync() {
    if (window.claude && typeof window.claude.use === 'function') initClaudeSync();
    else if (/^https?:$/.test(location.protocol)) initFirebaseSync();
  }

  const course = () => COURSES.find(c => c.id === S.cert) || COURSES[0];
  const xpToday = () => S.xpByDay[dayKey()] || 0;
  const streakNow = () => (S.lastStreakDay === dayKey() || S.lastStreakDay === dayAgo(1)) ? S.streak : 0;

  // Save the in-progress lesson so the learner can leave and pick it up later.
  function saveSession(queue) {
    S.session = L ? { mode: L.mode, unit: L.unit, cert: S.cert, queue: queue || L.queue, all: L.all, total: L.total, done: L.done, missed: [...L.missed], elapsed: Date.now() - L.start } : null;
    save();
  }
  const savedSession = () => {
    const s = S.session;
    return s && s.cert === S.cert && s.queue && s.queue.length && s.queue.every(id => live(QINDEX[id])) ? s : null;
  };
  const modeName = m => ['lesson', 'replay', 'practice', 'mistakes', 'review', 'placement'].includes(m) ? t('mode_' + m) : t('mode_session');

  // ---------- Streak freezes ----------
  // Earn one for every 7 days in a row (hold up to 2). Each covers one missed day:
  // when the learner comes back after missing days and has enough freezes, the
  // streak continues instead of resetting.
  const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
  function applyFreezes() {
    if (!S.streak || !S.lastStreakDay) return;
    const missed = daysBetween(S.lastStreakDay, dayAgo(1)); // whole days with no goal, up to yesterday
    if (missed <= 0) return;
    const have = S.freezes || 0;
    if (missed > have) return; // not enough: the streak lapses as usual
    S.freezes = have - missed;
    S.lastStreakDay = dayAgo(1);
    S.freezeNotice = { n: missed, streak: S.streak, day: dayKey() };
    save();
  }

  // ---------- Daily quests + double XP ----------
  // Three small goals a day, picked from QUESTS by the date. Each one finished gives
  // QUEST_XP; finishing all three starts BOOST_MIN minutes of double lesson XP.
  const QUESTS = [
    { id: 'lessons', n: 2, icon: 'book' },
    { id: 'perfect', n: 1, icon: 'checkcircle' },
    { id: 'combo', n: 5, icon: 'flame' },
    { id: 'right', n: 15, icon: 'check' },
    { id: 'cards', n: 1, icon: 'layers' },
    { id: 'fix', n: 3, icon: 'wrench', when: () => Object.keys(S.mistakes || {}).length >= 3 },
    { id: 'goal', n: 1, icon: 'target' }
  ];
  const QUEST_XP = 5, BOOST_MIN = 15;
  const QDEF = id => QUESTS.find(q => q.id === id);
  let questNew = [], questExtended = false; // finished since last shown; did a quest's XP extend the streak
  function quests() {
    const k = dayKey();
    if (!S.quest || S.quest.day !== k) {
      let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const pool = QUESTS.filter(q => !q.when || q.when()), ids = [];
      while (ids.length < 3 && pool.length) { h = (Math.imul(h, 1103515245) + 12345) >>> 0; ids.push(pool.splice(h % pool.length, 1)[0].id); }
      S.quest = { day: k, ids, p: {}, done: {}, chest: false };
    }
    return S.quest;
  }
  // Adds to a quest's progress (or raises it to `to`) and rewards it once it's reached.
  function questAdd(id, by = 1, to = null) {
    const Q = quests();
    if (!Q.ids.includes(id) || Q.done[id]) return;
    const def = QDEF(id);
    Q.p[id] = Math.min(def.n, to != null ? Math.max(Q.p[id] || 0, to) : (Q.p[id] || 0) + by);
    if (Q.p[id] < def.n) return;
    Q.done[id] = Date.now();
    questNew.push(id);
    if (!Q.chest && Q.ids.every(x => Q.done[x])) { Q.chest = true; S.boostUntil = Date.now() + BOOST_MIN * 60000; questNew.push('chest'); }
    if (addXP(QUEST_XP).extended) questExtended = true;
  }
  const takeQuestExt = () => { const x = questExtended; questExtended = false; return x; };
  const boostOn = () => (S.boostUntil || 0) > Date.now();
  const boostMins = () => Math.max(1, Math.ceil(((S.boostUntil || 0) - Date.now()) / 60000));
  const questName = id => t('q_' + id, { n: QDEF(id).n });
  function questCard() {
    const Q = quests();
    const rows = Q.ids.map(id => {
      const def = QDEF(id), n = Q.p[id] || 0, done = !!Q.done[id];
      return `<div class="quest ${done ? 'done' : ''}"><div class="qicon">${ICON(done ? 'check' : def.icon)}</div><div class="grow"><div class="qtext">${questName(id)}</div><div class="progress"><div style="width:${Math.round(100 * n / def.n)}%"></div></div></div><span class="qcount">${n}/${def.n}</span></div>`;
    }).join('');
    const foot = boostOn() ? `<div class="quest-foot on">${ICON('rocket')} ${t('boost_on', { m: boostMins() })}</div>`
      : Q.chest ? `<div class="quest-foot">${ICON('check')} ${t('quests_all_done')}</div>`
      : `<div class="quest-foot">${ICON('rocket')} ${t('quests_reward', { m: BOOST_MIN })}</div>`;
    return `<h3 class="ic-title">${ICON('star')} ${t('quests_title')}</h3>${rows}${foot}`;
  }
  // Lesson-end lines for quests finished during the session.
  function questLine(list) {
    const done = (list || []).filter(id => id !== 'chest');
    return (done.length ? `<div class="stat quest-new"><div class="lbl">${t('quest_done')}</div>${done.map(id => `<div class="val">${ICON('star')} ${questName(id)} · +${QUEST_XP} XP</div>`).join('')}</div>` : '')
      + ((list || []).includes('chest') ? `<div class="stat boost"><div class="lbl">${t('boost_unlocked', { m: BOOST_MIN })}</div><div class="val">${ICON('rocket')} ${t('boost_sub')}</div></div>` : '');
  }
  // Quests finished outside a lesson (exam, goal change) get a short toast.
  function questToasts() {
    const list = questNew.splice(0); questExtended = false;
    list.forEach((id, i) => setTimeout(() => toast(id === 'chest' ? `${ICON('rocket')} ${t('boost_unlocked', { m: BOOST_MIN })}` : `${ICON('star')} ${t('quest_done')}: ${questName(id)} · +${QUEST_XP} XP`), i * 1800));
    if (list.length) sfx('badge');
  }
  function toast(html) {
    const d = document.createElement('div');
    d.className = 'toast'; d.setAttribute('role', 'status'); d.innerHTML = html;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 3400);
  }

  function addXP(n) {
    applyFreezes();
    const k = dayKey();
    S.xp += n; S.xpByDay[k] = (S.xpByDay[k] || 0) + n;
    let extended = false, earnedFreeze = false;
    if (S.xpByDay[k] >= S.dailyGoal && S.lastStreakDay !== k) {
      S.streak = S.lastStreakDay === dayAgo(1) ? S.streak + 1 : 1;
      S.lastStreakDay = k; extended = true;
      S.bestStreak = Math.max(S.bestStreak || 0, S.streak);
      if (S.streak % FREEZE_EVERY === 0 && (S.freezes || 0) < MAX_FREEZES) { S.freezes = (S.freezes || 0) + 1; earnedFreeze = true; }
    }
    save();
    if (S.xpByDay[k] >= S.dailyGoal) questAdd('goal');
    return { extended, earnedFreeze };
  }

  const unitDone = u => Math.min(S.progress[u.id] || 0, LESSONS_PER_UNIT);
  function accuracyOf(questions) {
    let seen = 0, correct = 0;
    questions.forEach(q => { const s = S.stats[q.id]; if (s) { seen += s.seen; correct += s.correct; } });
    return { seen, pct: seen ? Math.round(100 * correct / seen) : null };
  }
  // Prefer questions the learner has seen least.
  function pickQuestions(pool, n) {
    const seen = q => (S.stats[q.id] && S.stats[q.id].seen) || 0;
    return shuffle(shuffle(pool.filter(live)).sort((a, b) => seen(a) - seen(b)).slice(0, n).map(q => q.id));
  }
  const mistakesFor = cid => Object.keys(S.mistakes).filter(id => live(QINDEX[id]) && QINDEX[id].course === cid);

  // ---------- Report a problem with a question ----------
  // Reports go to Firestore (cloudlingoReports) and show up in the admin page.
  const reportBtn = q => authState === 'off' ? '' : (S.reported && S.reported[q.id])
    ? `<span class="reportbtn done">${ICON('check')} ${t('report_done')}</span>`
    : `<button class="linkbtn reportbtn" data-act="report" data-q="${q.id}">${ICON('flag')} ${t('report')}</button>`;
  let reportQ = null;
  function openReport(qid) {
    reportQ = qid;
    modal(`<h2 class="ic-title">${ICON('flag')} ${t('report_title')}</h2><p>${t('report_sub')}</p>
      <div class="reasons">${['wrong', 'unclear', 'typo', 'outdated', 'other'].map((r, i) => `<label class="reason"><input type="radio" name="reason" value="${r}" ${i === 0 ? 'checked' : ''}><span>${t('report_' + r)}</span></label>`).join('')}</div>
      <textarea id="report-note" maxlength="500" rows="3" placeholder="${t('report_note')}"></textarea>
      <div class="stack" style="margin-top:14px"><button class="btn" data-act="sendreport">${t('report_send')}</button><button class="btn ghost" data-act="closemodal">${t('cancel')}</button></div>`, 'wide');
  }
  async function sendReport(btn) {
    const q = QINDEX[reportQ];
    if (!q) return;
    const picked = modalRoot.querySelector('input[name=reason]:checked');
    const reason = picked ? picked.value : 'other';
    const noteEl = modalRoot.querySelector('#report-note');
    const note = noteEl ? noteEl.value.trim().slice(0, 500) : '';
    if (btn) btn.disabled = true;
    if (!fb && fbLoading) { try { await fbLoading; } catch { /* below */ } }
    if (!fb) { infoModal(t('report_failed'), t('report_failed_sub')); return; }
    try {
      await fb.fs.addDoc(fb.fs.collection(fb.db, 'cloudlingoReports'), {
        qid: q.id, cert: q.course, reason, note, lang, uid: account ? account.uid : null,
        qtext: String(q.q).slice(0, 800), answer: String(correctText(q)).slice(0, 400),
        ts: fb.fs.serverTimestamp(), status: 'open'
      });
      S.reported = S.reported || {}; S.reported[q.id] = 1; save();
      infoModal(t('report_thanks'), t('report_thanks_sub'), 'happy');
      refresh();
    } catch { infoModal(t('report_failed'), t('report_failed_sub')); }
  }

  // ---------- Spaced review ----------
  // Each answered question sits in a box 0–4. Right on the first try moves it up
  // a box; wrong sends it to box 0. It's due again after 1, 3, 7, 21 or 60 days.
  const SRS_DAYS = [1, 3, 7, 21, 60];
  const daysFromNow = n => { const d = new Date(); d.setDate(d.getDate() + n); return dayKey(d); };
  function srsUpdate(id, ok) {
    S.srs = S.srs || {};
    const prev = S.srs[id];
    const b = ok ? (prev ? Math.min(prev.b + 1, 4) : 1) : 0;
    S.srs[id] = { b, due: daysFromNow(SRS_DAYS[b]) };
  }
  // Due today, for this certification, oldest first (mistakes have their own queue).
  const dueFor = cid => Object.entries(S.srs || {})
    .filter(([id, c]) => live(QINDEX[id]) && QINDEX[id].course === cid && c.due <= dayKey() && !S.mistakes[id])
    .sort((a, b) => a[1].due < b[1].due ? -1 : 1).map(([id]) => id);

  // ---------- Exam readiness ----------
  // Accuracy per unit, weighted by the unit's share of the real exam (the % in its
  // domain label, split between units that share a domain). A unit only counts
  // fully once you've answered at least half of its questions.
  function readiness(c) {
    const pct = u => { const m = /(\d+)%/.exec(u.domain); return m ? +m[1] : 0; };
    const sameLabel = u => c.units.filter(x => x.domain === u.domain).length;
    const fallback = 100 / c.units.length;
    let sum = 0, wsum = 0, weakest = null;
    for (const u of c.units) {
      const w = (pct(u) || fallback) / sameLabel(u);
      let seen = 0, correct = 0, distinct = 0;
      u.questions.forEach(q => { const s = S.stats[q.id]; if (s && s.seen) { seen += s.seen; correct += s.correct; distinct++; } });
      const acc = seen ? correct / seen : 0;
      const score = acc * Math.min(1, distinct / (u.questions.length * 0.5));
      sum += w * score; wsum += w;
      if (!weakest || score < weakest.score) weakest = { u, score };
    }
    const value = Math.round(100 * sum / wsum);
    const tier = value >= 75 ? 'ready' : value >= 60 ? 'close' : value >= 35 ? 'building' : 'start';
    return { value, tier, weakest: weakest && weakest.u };
  }
  function readinessCard(c, compact) {
    const r = readiness(c);
    const color = r.tier === 'ready' ? 'green' : r.tier === 'close' ? 'blue' : '';
    return `<div class="card readiness"><div class="row" style="justify-content:space-between;margin-bottom:8px">
        <strong class="ic-title">${ICON('trend')} ${t('ready_for', { code: c.code })}</strong><span class="rpct ${r.tier}">${r.value}%</span></div>
      <div class="progress ${color}" style="height:12px"><div style="width:${r.value}%"></div></div>
      <p class="muted small" style="margin-top:8px">${t('ready_' + r.tier)}${!compact && r.weakest && r.tier !== 'ready' ? ' ' + t('ready_focus', { unit: esc(r.weakest.title) }) : ''}</p></div>`;
  }

  // ---------- Exam date + study plan ----------
  const daysUntil = d => Math.round((new Date(d + 'T12:00:00') - new Date(dayKey() + 'T12:00:00')) / 86400000);
  // Questions still to master: never answered, or not yet past box 1 in spaced review.
  const toMaster = c => c.units.reduce((n, u) => n + u.questions.filter(q => live(q) && !(S.srs && S.srs[q.id] && S.srs[q.id].b >= 2)).length, 0);
  function studyPlan(c) {
    const date = S.examDates && S.examDates[c.id];
    if (!date) return null;
    const days = daysUntil(date);
    if (days < 0) return { date, days, past: true };
    const left = toMaster(c), studyDays = Math.max(1, days - 3); // keep the last 3 days for mock exams
    const lessons = Math.min(6, Math.max(1, Math.ceil(left / 7 / studyDays)));
    const xp = lessons * 12;
    const goal = (GOALS.find(g => g.xp >= xp) || GOALS[GOALS.length - 1]).xp;
    const weak = readiness(c).weakest;
    return { date, days, left, lessons, goal, weak, final: days <= 3 };
  }
  function examDateCard(c) {
    const p = studyPlan(c);
    if (!p || p.past) return `<div class="card examdate"><div class="row"><div class="bigicon">${ICON('calendar')}</div><div class="grow">
      <h3 style="margin-bottom:2px">${p && p.past ? t('exam_past') : t('exam_set_t')}</h3><p class="muted small">${t('exam_set_sub')}</p></div>
      <button class="btn ghost" data-act="examdate">${t('exam_set_btn')}</button></div></div>`;
    const when = new Date(p.date + 'T12:00:00').toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' });
    const plan = p.final ? t('plan_final') : tn('plan_daily', p.lessons, { xp: p.goal }) + (p.weak ? ' ' + t('plan_focus', { unit: esc(p.weak.title) }) : '');
    return `<div class="card examdate on"><div class="row"><div class="countdown"><b>${p.days}</b><span>${t(p.days === 1 ? 'day_left' : 'days_left')}</span></div><div class="grow">
      <h3 style="margin-bottom:2px">${t('exam_on', { code: c.code, date: when })}</h3><p class="muted small">${plan}</p></div></div>
      <div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap">${!p.final && S.dailyGoal !== p.goal ? `<button class="btn" data-act="usegoal" data-g="${p.goal}">${t('plan_use', { xp: p.goal })}</button>` : ''}
        <button class="btn ghost" data-act="examdate">${t('exam_change')}</button></div></div>`;
  }
  function examDateModal() {
    const c = course(), cur = (S.examDates && S.examDates[c.id]) || '';
    modal(`${mascot(80, 'laptop')}<h2>${t('exam_modal_t', { code: c.code })}</h2><p>${t('exam_modal_sub')}</p>
      <input type="date" id="exam-date" class="dateinput" min="${dayKey()}" value="${cur}">
      <div class="stack" style="margin-top:14px"><button class="btn" data-act="saveexamdate">${t('save')}</button>
        ${cur ? `<button class="btn ghost" data-act="clearexamdate">${t('exam_remove')}</button>` : `<button class="btn ghost" data-act="closemodal">${t('cancel')}</button>`}</div>`);
  }

  // ---------- Course-complete certificate ----------
  const certComplete = c => c.units.every(u => unitDone(u) >= LESSONS_PER_UNIT);
  function certificateCard(c) {
    if (!certComplete(c)) return '';
    return `<div class="card certcard"><div class="row">${mascot(64, 'proud')}<div class="grow"><h3 style="margin-bottom:2px">${t('cert_done_t', { code: c.code })}</h3>
      <p class="muted small">${t('cert_done_sub')}</p></div></div><button class="btn block" style="margin-top:12px" data-act="certificate">${ICON('award')} ${t('cert_get')}</button></div>`;
  }
  function certificateModal() {
    const name = S.certName || (account && account.name) || '';
    modal(`${mascot(80, 'cool')}<h2>${t('cert_name_t')}</h2><p>${t('cert_name_sub')}</p>
      <input type="text" id="cert-name" class="dateinput" maxlength="40" value="${esc(name)}" placeholder="${t('cert_name_ph')}">
      <div class="stack" style="margin-top:14px"><button class="btn" data-act="makecert">${t('cert_make')}</button><button class="btn ghost" data-act="closemodal">${t('cancel')}</button></div>`);
  }
  async function makeCertificate(name) {
    const c = course(), W = 1600, H = 1130;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const font = (w, px) => `${w} ${px}px Nunito, 'Noto Sans Thai', system-ui, sans-serif`;
    try { await Promise.all([document.fonts.load(font(900, 80)), document.fonts.load(font(700, 30))]); } catch { /* system font */ }
    x.fillStyle = '#fbfdff'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#1f8ef1'; x.lineWidth = 14; x.strokeRect(40, 40, W - 80, H - 80);
    x.strokeStyle = '#bcdcfb'; x.lineWidth = 3; x.strokeRect(70, 70, W - 140, H - 140);
    const img = new Image(); img.src = (window.NIMBUS_IMG && window.NIMBUS_IMG.proud) || 'img/nimbus/proud.webp';
    try { await img.decode(); const h = 230, w = h * img.naturalWidth / img.naturalHeight; x.drawImage(img, W - 140 - w, H - 120 - h, w, h); } catch { /* no picture */ }
    x.textAlign = 'center';
    x.fillStyle = '#1f8ef1'; x.font = font(900, 54); x.fillText('Cloudlingo', W / 2, 180);
    x.fillStyle = '#1d2b3a'; x.font = font(900, 80); x.fillText(t('cert_title'), W / 2, 300);
    x.fillStyle = '#64748b'; x.font = font(700, 34); x.fillText(t('cert_line1'), W / 2, 400);
    x.fillStyle = '#1d2b3a'; x.font = font(900, 90); x.fillText(name, W / 2, 520);
    x.strokeStyle = '#f07f1a'; x.lineWidth = 4; x.beginPath(); x.moveTo(W / 2 - 360, 555); x.lineTo(W / 2 + 360, 555); x.stroke();
    x.fillStyle = '#64748b'; x.font = font(700, 34); x.fillText(t('cert_line2'), W / 2, 640);
    x.fillStyle = '#1f8ef1'; x.font = font(900, 52); x.fillText(`${c.name} (${c.code})`, W / 2, 720);
    const date = new Date().toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
    x.fillStyle = '#1d2b3a'; x.font = font(800, 34); x.fillText(date, W / 2, 810);
    x.fillStyle = '#94a3b8'; x.font = font(700, 24); x.fillText(t('cert_note'), W / 2, H - 110);
    const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
    if (!blob) return;
    const file = new File([blob], `cloudlingo-${c.code}.png`, { type: 'image/png' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // ---------- Flashcards ----------
  // AWS terms that appear in this certification's questions, flipped like cards.
  // Each term sits in a box 0–3 (`S.cards`); "Got it" moves it up, "Again" back to 0.
  let FC = null;
  const deckCache = {};
  function deckFor(c) {
    if (deckCache[c.id]) return deckCache[c.id];
    const found = new Set();
    c.units.forEach(u => u.questions.forEach(q => {
      [q.q, q.e].concat(q.o || [], (q.pairs || []).flat()).forEach(text => { hinted(String(text), found, new Set()); });
    }));
    return (deckCache[c.id] = found.size >= 10 ? [...found] : GLOSS.map((_, i) => i));
  }
  function startCards() {
    const c = course(), box = gi => (S.cards || {})[GLOSS[gi].k] || 0;
    const deck = shuffle(deckFor(c)).sort((a, b) => box(a) - box(b)).slice(0, 12);
    FC = { deck: shuffle(deck), total: deck.length, flipped: false, known: 0, start: Date.now() };
    closeModal(); go('cards');
  }
  function cardsView() {
    const gi = FC.deck[0], g = GLOSS[gi], pct = Math.round(100 * FC.known / FC.total);
    const def = (lang === 'th' && window.TH_GLOSS && window.TH_GLOSS[g.k]) || g.d;
    return `<div class="lesson">
      <div class="lesson-top"><button class="x" data-act="quitcards" aria-label="${t('save_exit')}">${ICON('x')}</button>
        <div class="progress"><div style="width:${pct}%"></div></div><span class="muted small" style="font-weight:900">${FC.known}/${FC.total}</span></div>
      <section class="qwrap"><div class="kicker2">${t('cards_kicker')}</div>
        <button class="flashcard ${FC.flipped ? 'flipped' : ''}" data-act="flip" aria-label="${t('cards_flip')}">
          <span class="face front"><span class="term">${esc(g.k)}</span><span class="muted small">${t('cards_tap')}</span></span>
          <span class="face back"><span class="term small">${esc(g.k)}</span><span class="def">${esc(def)}</span></span>
        </button></section>
      <footer class="lesson-foot"><div class="foot-inner">${FC.flipped
        ? `<button class="btn ghost" data-act="cardagain">${t('cards_again')}</button><button class="btn good" data-act="cardgot">${t('cards_got')}</button>`
        : `<button class="btn block" data-act="flip">${t('cards_show')}</button>`}</div></footer>
    </div>`;
  }
  function cardAnswer(got) {
    const gi = FC.deck.shift(), k = GLOSS[gi].k;
    S.cards = S.cards || {};
    if (got) { S.cards[k] = Math.min(3, (S.cards[k] || 0) + 1); FC.known++; sfx('correct'); }
    else { S.cards[k] = 0; FC.deck.push(gi); }
    FC.flipped = false;
    if (!FC.deck.length) return finishCards();
    save(); render();
  }
  function finishCards() {
    const boosted = boostOn();
    const xp = 5 * (boosted ? 2 : 1);
    S.lessons = (S.lessons || 0) + 1;
    const xpRes = addXP(xp);
    questAdd('cards');
    const { earnedFreeze } = xpRes, extended = xpRes.extended || takeQuestExt();
    const badges = checkBadges(), questsDone = questNew.splice(0);
    sfx('complete');
    const special = badges.length || questsDone.length ? 'badge' : earnedFreeze ? 'freeze' : extended ? 'streak' : null;
    if (special) sfx(special, 950);
    END = { xp, perfect: false, extended, earnedFreeze, badges, streak: S.streak, boosted, quests: questsDone, acc: 100, secs: Math.round((Date.now() - FC.start) / 1000), unitCompleted: null, mode: 'cards', cards: FC.total };
    FC = null; save(); go('lessonEnd'); confetti();
  }

  // ---------- Achievements ----------
  const BADGES = [
    { id: 'first', icon: 'sprout', test: s => (s.lessons || 0) >= 1 },
    { id: 'perfect', icon: 'checkcircle', test: s => (s.perfects || 0) >= 1 },
    { id: 'streak3', icon: 'flame', test: s => (s.bestStreak || 0) >= 3 },
    { id: 'streak7', icon: 'snowflake', test: s => (s.bestStreak || 0) >= 7 },
    { id: 'streak30', icon: 'award', test: s => (s.bestStreak || 0) >= 30 },
    { id: 'xp100', icon: 'bolt', test: s => s.xp >= 100 },
    { id: 'xp1000', icon: 'bolts', test: s => s.xp >= 1000 },
    { id: 'unit', icon: 'trophy', test: s => Object.values(s.progress || {}).some(n => n >= LESSONS_PER_UNIT) },
    { id: 'fixer', icon: 'wrench', test: s => (s.fixed || 0) >= 10 },
    { id: 'exam', icon: 'clipboard', test: s => (s.exams || []).some(e => e.pass) },
    { id: 'full', icon: 'cap', test: s => (s.exams || []).some(e => e.pass && e.mode === 'full') },
    { id: 'explorer', icon: 'compass', test: s => new Set(Object.keys(s.stats || {}).map(id => QINDEX[id] && QINDEX[id].course).filter(Boolean)).size >= COURSES.length }
  ];
  // Returns badges unlocked just now (and records them).
  function checkBadges() {
    S.badges = S.badges || {};
    const fresh = BADGES.filter(b => !S.badges[b.id] && b.test(S));
    fresh.forEach(b => { S.badges[b.id] = Date.now(); });
    return fresh;
  }
  const badgeLine = list => list.length ? `<div class="stat badge-new"><div class="lbl">${t('badge_new')}</div><div class="val">${list.map(b => `${ICON(b.icon)} ${t('badge_' + b.id)}`).join(' · ')}</div></div>` : '';

  // ---------- Sounds (short, quiet, and only for meaningful moments) ----------
  // Sound effects generated by art-src/sounds.js (sounds/*.mp3). They're preloaded on
  // the first tap (browsers only allow audio after one); until then, or if a file
  // can't load, a tiny synthesized beep plays instead.
  const SFX = ['correct', 'wrong', 'complete', 'streak', 'badge', 'freeze', 'pass', 'tryagain'];
  const SFX_VOLUME = 0.55;
  const sfxBuf = {};
  let audio = null, sfxLoading = null;
  const audioCtx = () => (audio = audio || new (window.AudioContext || window.webkitAudioContext)());
  function loadSfx() {
    if (sfxLoading) return sfxLoading;
    try { audioCtx(); } catch { return Promise.resolve(); }
    sfxLoading = Promise.all(SFX.map(async n => {
      try {
        const src = (window.SOUNDS && window.SOUNDS[n]) || `sounds/${n}.mp3${ASSET_V ? '?' + ASSET_V : ''}`;
        const data = await (await fetch(src)).arrayBuffer();
        sfxBuf[n] = await new Promise((res, rej) => audio.decodeAudioData(data, res, rej));
      } catch { /* that one falls back to a beep */ }
    }));
    return sfxLoading;
  }
  document.addEventListener('pointerdown', () => { if (S.sound !== false) loadSfx(); }, { once: true, passive: true });
  // Play one of SFX after `delay` ms (used to layer a badge or streak sound after "complete").
  function sfx(kind, delay = 0) {
    if (S.sound === false) return;
    if (delay) { setTimeout(() => sfx(kind), delay); return; }
    if (document.hidden) return;
    const name = { right: 'correct', done: 'complete' }[kind] || kind;
    try {
      audioCtx();
      if (audio.state === 'suspended') audio.resume();
      const buf = sfxBuf[name];
      if (buf) {
        const src = audio.createBufferSource(), g = audio.createGain();
        src.buffer = buf; g.gain.value = SFX_VOLUME;
        src.connect(g).connect(audio.destination); src.start();
      } else {
        loadSfx();
        beep(name);
      }
    } catch { /* no audio: fine */ }
    // One tiny tap, wrong answers only (browsers allow it only after the person has touched the page).
    if (name === 'wrong' && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(25);
  }
  function beep(name) {
    {
      const kind = name === 'wrong' || name === 'tryagain' ? 'wrong' : name === 'correct' ? 'right' : 'done';
      const notes = { right: [[659, 0], [880, 0.08]], wrong: [[247, 0]], done: [[523, 0], [659, 0.1], [784, 0.2]] }[kind];
      const peak = kind === 'wrong' ? 0.035 : 0.05, len = kind === 'wrong' ? 0.2 : 0.15;
      notes.forEach(([f, at]) => {
        const o = audio.createOscillator(), g = audio.createGain(), at0 = audio.currentTime + at;
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, at0);
        g.gain.exponentialRampToValueAtTime(peak, at0 + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, at0 + len);
        o.connect(g).connect(audio.destination); o.start(at0); o.stop(at0 + len + 0.02);
      });
    }
  }

  // ---------- Share card ----------
  // A 1080x1080 image of your streak, XP and readiness, shared to LINE etc.
  // through the phone's share sheet, or downloaded where sharing files isn't supported.
  async function shareCard() {
    const c = course(), r = readiness(c), W = 1080;
    const cv = document.createElement('canvas'); cv.width = cv.height = W;
    const x = cv.getContext('2d');
    const grad = x.createLinearGradient(0, 0, 0, W); grad.addColorStop(0, '#eaf5ff'); grad.addColorStop(1, '#d6ecff');
    x.fillStyle = grad; x.fillRect(0, 0, W, W);
    const font = (w, px) => `${w} ${px}px Nunito, 'Noto Sans Thai', system-ui, sans-serif`;
    try { await Promise.all([document.fonts.load(font(900, 80)), document.fonts.load(font(800, 40))]); } catch { /* system font */ }
    const img = new Image(); img.src = (window.NIMBUS_IMG && window.NIMBUS_IMG.cool) || 'img/nimbus/cool.webp';
    try { await img.decode(); const h = 430, w = h * img.naturalWidth / img.naturalHeight; x.drawImage(img, (W - w) / 2, 110, w, h); } catch { /* no picture */ }
    x.textAlign = 'center';
    x.fillStyle = '#1f8ef1'; x.font = font(900, 64); x.fillText('Cloudlingo', W / 2, 90);
    // Draws one of the line icons (path-only ones) centred at cx,cy.
    const drawIcon = (name, cx, cy, size, color) => {
      const ds = [...((window.ICONS || {})[name] || '').matchAll(/ d="([^"]+)"/g)].map(m => m[1]);
      x.save(); x.translate(cx - size / 2, cy - size / 2); x.scale(size / 24, size / 24);
      x.strokeStyle = color; x.lineWidth = 2.2; x.lineCap = 'round'; x.lineJoin = 'round';
      ds.forEach(d => x.stroke(new Path2D(d))); x.restore();
    };
    const line = (txt, fontSpec, color, y, iconName) => {
      x.font = fontSpec; const w = x.measureText(txt).width, sz = iconName ? parseInt(fontSpec.split(' ')[1], 10) * 0.95 : 0, gap = iconName ? sz * 0.35 : 0;
      const left = W / 2 - (w + sz + gap) / 2;
      if (iconName) drawIcon(iconName, left + sz / 2, y - sz * 0.36, sz, color);
      x.fillStyle = color; x.textAlign = 'left'; x.fillText(txt, left + sz + gap, y); x.textAlign = 'center';
    };
    line(t('streak_days', { n: streakNow() }), font(900, 92), '#f07f1a', 680, 'flame');
    line(`${S.xp} XP  ·  ${c.code} ${r.value}%`, font(800, 54), '#1d2b3a', 780, 'bolt');
    x.fillStyle = '#64748b'; x.font = font(800, 40); x.fillText(t('share_tagline'), W / 2, 880);
    x.fillStyle = '#1f8ef1'; x.font = font(800, 38); x.fillText('pumbafluffycorgi.com/cloudlingo', W / 2, 990);
    const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
    if (!blob) return;
    const file = new File([blob], 'cloudlingo.png', { type: 'image/png' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: t('share_text') + ' https://pumbafluffycorgi.com/cloudlingo/' });
        return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cloudlingo.png';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // ---------- View state ----------
  let view = S.cert ? 'learn' : 'onboard';
  let L = null;       // active lesson/practice session
  let E = null;       // active exam
  let R = null;       // last exam result
  let END = null;     // lesson-complete summary
  let OB = { cert: null, goal: 20 };

  // ---------- Friend challenges ----------
  // A shared link like ?c=clf&s=85&k=e means "a friend scored 85% on a CLF-C02 mock exam"
  // (k=l: a lesson). Only the certification and score are in the link, nothing personal.
  let CH = null;
  try {
    const p = new URLSearchParams(location.search), c = p.get('c'), s = Number(p.get('s'));
    if (COURSES.some(x => x.id === c) && p.get('s') !== null && Number.isInteger(s) && s >= 0 && s <= 100) {
      CH = { c, s, k: p.get('k') === 'e' ? 'e' : 'l' };
      if (!S.cert) OB.cert = c;
      ['c', 's', 'k'].forEach(x => p.delete(x));
      history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '') + location.hash);
    }
  } catch { /* not a challenge link */ }
  const challengeLine = () => { const c = COURSES.find(x => x.id === CH.c); return t(CH.k === 'e' ? 'ch_got_exam' : 'ch_got_lesson', { s: CH.s, code: c.code.replace('-', '‑') }); }; // non-breaking hyphen keeps "SAA-C03" on one line
  function challengeCard() {
    if (!CH) return '';
    return `<div class="card challenge"><div class="row"><div class="bigicon">${ICON('trophy')}</div><div class="grow"><h3 style="margin-bottom:2px">${challengeLine()}</h3><p class="muted small">${t('ch_beat')}</p></div></div>
      <div class="row" style="margin-top:12px;gap:8px"><button class="btn grow" data-act="chgo">${t('ch_take')}</button><button class="btn ghost" data-act="chno">${t('dismiss')}</button></div></div>`;
  }
  async function shareChallenge(k, s, cid) {
    const c = COURSES.find(x => x.id === cid) || course();
    const url = `https://pumbafluffycorgi.com/cloudlingo/?c=${c.id}&s=${s}&k=${k}`;
    const text = t(k === 'e' ? 'ch_text_exam' : 'ch_text_lesson', { s, code: c.code });
    if (navigator.share) {
      try { await navigator.share({ text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text + ' ' + url); toast(`${ICON('check')} ${t('ch_copied')}`); }
    catch { modal(`<h2>${t('ch_btn')}</h2><p>${t('ch_link')}</p><input class="words-search" readonly value="${esc(url)}" onfocus="this.select()"><div class="stack" style="margin-top:14px"><button class="btn" data-act="closemodal">${t('done')}</button></div>`); }
  }

  // ---------- Glossary ("Words") ----------
  let wordQuery = '';
  const wordDef = g => (lang === 'th' && window.TH_GLOSS && window.TH_GLOSS[g.k]) || g.d;
  function wordsList() {
    const q = wordQuery.trim().toLowerCase();
    // Best matches first: the term itself, then names containing the search, then definitions.
    const names = g => [g.k, ...(g.also || [])].map(x => x.toLowerCase());
    const rank = g => !q ? 0 : names(g).includes(q) ? 0 : names(g).some(x => x.includes(q)) ? 1 : 2;
    const list = GLOSS.filter(g => !q || [g.k, ...(g.also || []), g.d, (window.TH_GLOSS || {})[g.k] || ''].some(x => String(x).toLowerCase().includes(q)))
      .sort((a, b) => rank(a) - rank(b) || a.k.localeCompare(b.k, 'en', { sensitivity: 'base' }));
    return list.length ? list.map(g => `<div class="card wordcard"><h3>${esc(g.k)}</h3>${g.also && g.also.length ? `<p class="muted small">${esc(t('words_also', { w: g.also.join(', ') }))}</p>` : ''}<p>${esc(wordDef(g))}</p></div>`).join('')
      : `<div class="card muted">${t('words_none')}</div>`;
  }
  function wordsView() {
    return shell(`<h1 class="section-title">${t('words_title')}</h1><p class="section-sub">${t('words_sub', { n: GLOSS.length })}</p>
      <input class="words-search" type="search" id="wordsq" placeholder="${t('words_search')}" value="${esc(wordQuery)}" autocomplete="off" aria-label="${t('words_search')}">
      <div class="stack words-list" id="wordslist">${wordsList()}</div>`);
  }
  document.addEventListener('input', e => {
    if (e.target && e.target.id === 'wordsq') { wordQuery = e.target.value; const l = document.getElementById('wordslist'); if (l) l.innerHTML = wordsList(); }
  });
  let examTimer = null;

  function applyTheme() {
    if (S.theme === 'light' || S.theme === 'dark') document.documentElement.dataset.theme = S.theme;
    else delete document.documentElement.dataset.theme;
    // Larger text scales the whole page (the shared tour already allows for page zoom).
    document.documentElement.style.zoom = TEXT_SIZES.includes(S.textSize) && S.textSize !== 1 ? S.textSize : '';
  }
  const TEXT_SIZES = [1, 1.12, 1.25];
  const pageZoom = () => parseFloat(document.documentElement.style.zoom) || 1;

  function go(v) {
    view = v;
    if (questNew.length && !['lesson', 'lessonEnd', 'examRun'].includes(v)) setTimeout(questToasts, 400);
    if (updatePending && !busyView()) { applyUpdate(); }
    render();
    window.scrollTo(0, 0);
    if (v === 'learn') {
      maybeAutoTour();
      const cur = document.querySelector('.node.current');
      if (cur) cur.scrollIntoView({ block: 'center' });
    }
  }

  function render() {
    const views = { cards: () => FC ? cardsView() : learnView(), onboard: onboardView, learn: learnView, practice: practiceView, exam: examView, board: boardView, profile: profileView, lesson: lessonView, lessonEnd: lessonEndView, path: pathView, words: wordsView, diagrams: diagramsView, streakDay: streakDayView, examRun: examRunView, examResult: examResultView };
    closeHint();
    app.innerHTML = (views[view] || learnView)();
  }

  // ---------- Shared pieces ----------
  // Nimbus, the mascot: one pose per mood, cut from the character sheet by art-src/cut.js.
  const POSES = ['hero', 'cool', 'laugh', 'think', 'angry', 'tired', 'proud', 'idea', 'laptop', 'shocked', 'sleep'];
  const POSE_ALIAS = { happy: 'laugh', sad: 'tired' };
  function mascot(size = 48, pose = 'hero', cls = '') {
    const p = POSES.includes(pose) ? pose : POSE_ALIAS[pose] || 'hero';
    return `<img class="mascot ${cls}" src="${(window.NIMBUS_IMG && window.NIMBUS_IMG[p]) || `img/nimbus/${p}.webp`}" width="${size}" height="${size}" alt="" aria-hidden="true" draggable="false" decoding="async">`;
  }

  const navItem = (v, icon, label) =>
    `<button class="navitem ${view === v ? 'active' : ''}" data-act="nav" data-v="${v}" data-tour="nav-${v}" aria-label="${label}"><span class="ico">${icon}</span><span class="lbl">${label}</span></button>`;

  function shell(main) {
    return `<div class="shell">
      <nav class="sidenav">
        <div class="brand">${mascot(40, 'hero')}<span>cloudlingo</span></div>
        ${navItem('learn', ICON('home'), t('nav_learn'))}${navItem('practice', ICON('target'), t('nav_practice'))}${navItem('exam', ICON('clipboard'), t('nav_exam'))}${navItem('path', ICON('compass'), t('nav_path'))}${authState !== 'off' ? navItem('board', ICON('trophy'), t('nav_board')) : ''}${navItem('profile', ICON('user'), t('nav_profile'))}
      </nav>
      <main class="main">${topbar()}${main}<div class="appver">Cloudlingo v${esc(APP_LABEL)}</div></main>
      <aside class="rightcol">${rightCol()}</aside>
    </div>`;
  }

  function topbar() {
    const c = course(), st = streakNow();
    return `<div class="topbar">
      <button class="chip certchip" data-tour="cert" data-act="pickcert" title="${t('switch_cert')}"><span class="certlabel"><span class="cname">${esc(c.name)}</span><span class="code">${c.code}</span></span><span class="muted small">▾</span></button>
      <div class="topstats">
        <button class="chip flame ${st ? '' : 'cold'}" data-tour="streak" data-act="nav" data-v="profile" title="${t('day_streak')}">${ICON('flame')} ${st}</button>
        <button class="chip xp" data-act="nav" data-v="profile" title="${t('total_xp')}">${ICON('bolt')} ${S.xp}${boostOn() ? '<span class="x2">×2</span>' : ''}</button>${pwaReady ? `<button class="chip help" data-tour="help" data-act="tour" title="${t('tour_btn')}" aria-label="${t('tour_btn')}">${ICON('help')}</button>` : ''}${accountChip()}</div>
    </div>`;
  }

  function avatar(size) {
    return account.photo
      ? `<img class="avatar" src="${esc(account.photo)}" alt="" width="${size}" height="${size}" style="width:${size}px;height:${size}px" referrerpolicy="no-referrer">`
      : `<img class="avatar nimbus" src="${(window.NIMBUS_IMG && window.NIMBUS_IMG.hero) || 'img/nimbus/hero.webp'}" alt="" width="${size}" height="${size}" style="width:${size}px;height:${size}px">`;
  }
  function accountChip() {
    if (authState === 'out' || authState === 'loading') return `<button class="signin-btn" data-tour="account" data-act="signin" title="${t('signin_title')}" aria-label="${t('signin')}">${ICON('user')}<span class="lbl">${t('signin')}</span></button>`;
    if (authState === 'in' && account) return `<button class="chip" data-tour="account" data-act="nav" data-v="profile" title="${esc(account.name)}">${avatar(26)}</button>`;
    return '';
  }
  function accountCard() {
    if (authState === 'out' || authState === 'unavailable') return `<div class="card account" style="margin-bottom:16px"><div class="row"><div class="bigicon">${ICON('cloud')}</div><div class="grow">
      <h3 style="margin-bottom:2px">${t('save_progress')}</h3><p class="muted small">${authState === 'unavailable' ? t('signin_unavailable') : t('signin_pitch')}</p></div></div>
      ${authState === 'out' ? `<button class="btn block" style="margin-top:14px" data-act="signin">${t('signin')}</button>` : ''}</div>`;
    if (authState === 'in' && account) return `<div class="card account" style="margin-bottom:16px"><div class="row">${avatar(44)}<div class="grow">
      <h3 style="margin-bottom:2px">${esc(account.name)}</h3><p class="muted small">${account.error ? t('acct_error') : account.synced ? ICON('check', 'ok') + ' ' + t('acct_synced') : t('connecting')}</p></div>
      <button class="linkbtn" data-act="signout">${t('signout')}</button></div></div>`;
    return '';
  }

  function goalInner() {
    const today = xpToday(), g = S.dailyGoal, pct = Math.min(100, Math.round(100 * today / g));
    return `<div class="goalrow"><div class="big">${ICON('target')}</div><div class="grow">
      <div class="row" style="justify-content:space-between;margin-bottom:7px"><strong>${t('daily_goal')}</strong><span class="muted small">${today} / ${g} XP</span></div>
      <div class="progress"><div style="width:${pct}%"></div></div></div></div>`;
  }

  function streakCard() {
    const st = streakNow();
    return `<h3 class="ic-title">${ICON('flame')} ${t('streak_days', { n: st })}</h3><p class="muted small">${st ? (S.lastStreakDay === dayKey() ? t('streak_met') : t('streak_keep')) : t('streak_start')}</p>
      <p class="small freeze-line" title="${t('freezes_how')}">${ICON('snowflake')} ${t('freezes', { n: S.freezes || 0 })}</p>`;
  }
  function freezeNotice() {
    const f = S.freezeNotice;
    if (!f || f.day !== dayKey()) return '';
    return `<div class="card notice"><p>${ICON('snowflake')} ${tn('freeze_used', f.n, { s: f.streak })}</p><button class="linkbtn" data-act="dismissfreeze">${t('dismiss')}</button></div>`;
  }

  function rightCol() {
    const mist = mistakesFor(course().id).length;
    return `<div class="card" data-tour="goal-side">${goalInner()}</div>
      <div class="card questcard">${questCard()}</div>
      <div class="card">${streakCard()}</div>
      ${mist ? `<div class="card"><h3 class="ic-title">${ICON('repeat')} ${t('to_review', { n: mist })}</h3><p class="muted small" style="margin-bottom:12px">${t('to_review_sub')}</p><button class="btn ghost block" data-act="mistakes">${t('fix_mistakes')}</button></div>` : ''}`;
  }

  function modal(html, cls = '') {
    modalRoot.innerHTML = `<div class="overlay" data-overlay><div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div></div>`;
    const b = modalRoot.querySelector('.btn'); if (b) b.focus();
  }
  const closeModal = () => { modalRoot.innerHTML = ''; };

  function confetti() {
    if (reducedMotion()) return;
    const colors = ['#1f8ef1', '#2bb673', '#f5b800', '#ff8a1f', '#e2457a', '#8b5cf6'];
    for (let i = 0; i < 90; i++) {
      const d = document.createElement('div');
      d.className = 'confetti';
      d.style.left = Math.random() * 100 + 'vw';
      d.style.background = colors[i % colors.length];
      d.style.animationDuration = (1.8 + Math.random() * 1.8) + 's';
      d.style.animationDelay = (Math.random() * 0.5) + 's';
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 4500);
    }
  }

  const BADGE_COLORS = {
    clf: ['#1f8ef1', '#12a594'], aif: ['#e2457a', '#8b5cf6'], saa: ['#8b5cf6', '#1f8ef1'],
    dva: ['#ea7a1c', '#e2457a'], soa: ['#12a594', '#2bb673'], dea: ['#f5a300', '#ea7a1c']
  };
  function certBadge(c) {
    const [a, b] = BADGE_COLORS[c.id] || ['#1f8ef1', '#8b5cf6'];
    return `<div class="badge-cert" style="background:linear-gradient(135deg, ${a}, ${b})">${c.code.replace('-', '<br>')}</div>`;
  }

  // ---------- Certification path ----------
  // The 6 certifications by level, with progress, readiness and passed mock exams.
  // The suggested next one follows NEXT_CERT from the current certification.
  const NEXT_CERT = { clf: 'saa', aif: 'saa', saa: 'dva', dva: 'soa', soa: 'dea', dea: 'saa' };
  const passedCert = id => (S.exams || []).some(e => e.cert === id && e.pass);
  function suggestedCert() {
    let id = S.cert || 'clf';
    for (let i = 0; i < COURSES.length; i++) { id = NEXT_CERT[id]; if (id && id !== S.cert && !passedCert(id)) return id; }
    return null;
  }
  function pathCard(c, next) {
    const total = c.units.length * LESSONS_PER_UNIT, done = c.units.reduce((s, u) => s + unitDone(u), 0);
    const tags = (c.id === S.cert ? `<span class="pill pathtag cur">${t('path_current')}</span>` : '')
      + (passedCert(c.id) ? `<span class="pill pathtag ok">${ICON('check')} ${t('path_passed')}</span>` : '')
      + (c.id === next ? `<span class="pill pathtag next">${ICON('star')} ${t('path_next')}</span>` : '');
    return `<button class="certopt pathcard ${c.id === S.cert ? 'on' : ''}" data-act="pathpick" data-c="${c.id}">${certBadge(c)}
      <div class="grow"><h3>${c.name}</h3>${tags ? `<div class="pathtags">${tags}</div>` : ''}
        <div class="pathmeta"><span>${t('path_lessons', { d: done, t: total })}</span><span>${t('path_ready', { n: readiness(c).value })}</span></div>
        <div class="progress blue" style="height:8px;margin-top:6px"><div style="width:${Math.round(100 * done / total)}%"></div></div></div></button>`;
  }
  function pathView() {
    const next = suggestedCert();
    const level = (l, icon, sub) => `<section class="pathlevel"><h2 class="ic-title">${ICON(icon)} ${t('level_' + l)}</h2><p class="muted small">${t(sub)}</p>
      <div class="certlist">${COURSES.filter(c => c.level === l).map(c => pathCard(c, next)).join('')}</div></section>`;
    return shell(`<h1 class="section-title">${t('path_title')}</h1><p class="muted" style="margin-bottom:18px">${t('path_sub')}</p>
      ${level('Foundational', 'sprout', 'path_found_sub')}<div class="patharrow" aria-hidden="true">↓</div>${level('Associate', 'award', 'path_assoc_sub')}
      <p class="muted small" style="margin-top:18px">${t('path_note')}</p>`);
  }

  function certOption(c, on, act) {
    const total = c.units.length * LESSONS_PER_UNIT;
    const done = c.units.reduce((s, u) => s + unitDone(u), 0);
    return `<button class="certopt ${on ? 'on' : ''}" data-act="${act}" data-c="${c.id}">
      ${certBadge(c)}
      <div class="grow"><h3>${c.name} · ${t('level_' + c.level)}</h3><p>${blurb(c)}</p>
      ${done ? `<div class="progress blue" style="height:8px;margin-top:8px"><div style="width:${Math.round(100 * done / total)}%"></div></div>` : ''}</div>
    </button>`;
  }

  // ---------- Onboarding ----------
  function onboardView() {
    return `<div class="onboard">
      <div class="row ob-top">${authState === 'out' || authState === 'loading' ? `<div class="card ob-signin grow"><span>${t('studied_before')}</span><button class="signin-btn" data-act="signin">${t('signin')}</button></div>` : '<div class="grow"></div>'}${langSwitch()}</div>
      <div class="hero">${mascot(110, 'hero', 'bounce')}<div class="speech">${t('nimbus_hi')}<span class="speech-sub">${t('nimbus_who')}</span></div></div>
      ${CH ? `<div class="card challenge ob-challenge">${ICON('trophy')} <span>${challengeLine()}. ${t('ch_beat')}</span></div>` : ''}
      <div class="certlist">${COURSES.map(c => certOption(c, OB.cert === c.id, 'obcert')).join('')}</div>
      <h2 class="section-title" style="font-size:20px;margin-top:30px">${t('pick_goal')}</h2>
      <p class="section-sub">${t('pick_goal_sub')}</p>
      <div class="seg">${GOALS.map(g => `<button class="${OB.goal === g.xp ? 'on' : ''}" data-act="obgoal" data-g="${g.xp}">${t(g.key)}<small>${t('xp_per_day', { n: g.xp })}</small></button>`).join('')}</div>
    </div>
    <div class="fixed-foot ob-foot"><button class="btn" data-act="obstart" ${OB.cert ? '' : 'disabled'}>${t('start_learning')}</button><button class="linkbtn" data-act="obplace" ${OB.cert ? '' : 'disabled'}>${t('place_ob')}</button></div>`;
  }

  // ---------- Learn (path) ----------
  function learnView() {
    const c = course();
    const s = savedSession();
    const resume = s ? `<div class="card resume"><div class="row"><div class="bigicon">${ICON('play')}</div><div class="grow"><h3 style="margin-bottom:2px">${t('resume_title')}</h3>
      <p class="muted small">${modeName(s.mode)}${s.unit ? ` · ${esc(UNITS[s.unit].title)}` : ''} · ${t('resume_done', { d: s.done, t: s.total })}</p></div></div>
      <div class="row" style="margin-top:14px"><button class="btn block grow" data-act="resume">${t('continue')}</button><button class="btn ghost" data-act="discard">${t('discard')}</button></div></div>` : '';
    const firstOpen = c.units.findIndex(u => unitDone(u) < LESSONS_PER_UNIT);
    const placeCard = !s && !(S.placed && S.placed[c.id]) && c.units.every(u => !unitDone(u))
      ? `<div class="card placecard"><div class="row"><div class="bigicon">${ICON('target')}</div><div class="grow"><h3 style="margin-bottom:2px">${t('place_title')}</h3><p class="muted small">${t('place_sub', { n: placeCount(c) })}</p></div><button class="btn ghost" data-act="placement">${t('place_btn')}</button></div></div>` : '';
    const due = dueFor(c.id).length;
    const dueCard = due ? `<div class="card duecard"><div class="row"><div class="bigicon">${ICON('calendar')}</div><div class="grow"><h3 style="margin-bottom:2px">${tn('review_some', due)}</h3><p class="muted small">${t('review_why')}</p></div><button class="btn ghost" data-act="review">${t('review_btn')}</button></div></div>` : '';
    return shell(`${freezeNotice()}${challengeCard()}${installCard(true)}${certificateCard(c)}${examDateCard(c)}${dueCard}<div class="card mobile-only" data-tour="goal" style="margin-bottom:4px">${goalInner()}</div><div class="card mobile-only questcard">${questCard()}</div>${resume}${placeCard}${c.units.map((u, i) => unitBlock(u, i, i === firstOpen)).join('')}
      <div style="margin-top:34px">${readinessCard(c, false)}</div>
      <div class="card" style="margin-top:16px;text-align:center"><h3>${t('ready_title')}</h3><p class="muted" style="margin-bottom:14px">${t('ready_sub', { code: c.code })}</p><button class="btn ghost" data-act="nav" data-v="exam">${t('try_exam')}</button></div>`);
  }

  function unitBlock(u, i, suggested) {
    const done = unitDone(u);
    const offs = [0, 64, 0, -64];
    const nodes = range(LESSONS_PER_UNIT).map(l => {
      const state = l < done ? 'done' : (l === done ? 'current' : 'locked');
      const icon = ICON(state === 'done' ? 'check' : state === 'locked' ? 'lock' : 'star');
      const label = esc(t('node_label', { n: l + 1, unit: u.title }) + (state === 'done' ? t('node_done') : state === 'locked' ? t('node_locked') : ''));
      return `<div style="transform:translateX(${offs[(l + i) % 4]}px)"><button class="node ${state} ${state === 'current' && suggested ? 'suggested' : ''}" data-act="node" data-u="${u.id}" data-l="${l}" ${state === 'locked' ? 'disabled' : ''} aria-label="${label}" title="${label}">${state === 'current' && suggested ? `<span class="bubble">${t('start')}</span>` : ''}${icon}</button></div>`;
    });
    const trophyReady = done >= LESSONS_PER_UNIT;
    nodes.push(`<div style="transform:translateX(${offs[(LESSONS_PER_UNIT + i) % 4]}px)"><button class="node trophy ${trophyReady ? 'done' : 'locked'}" data-act="unitpractice" data-u="${u.id}" ${trophyReady ? '' : 'disabled'} aria-label="${esc(t('unit_review'))}: ${esc(u.title)}" title="${t('unit_review')}">${ICON('trophy')}</button></div>`);
    return `<section class="unit">
      <div class="unithead unitcolor-${i % 5}"${i === 0 ? ' data-tour="path"' : ''}>
        <div><div class="kicker">${t('unit_n', { n: i + 1 })} · ${domainLabel(u.domain)}</div><h2>${u.title}</h2><div class="small" style="opacity:.85;margin-top:3px">${t('lessons_done', { d: done, t: LESSONS_PER_UNIT })}</div></div>
        <div class="uicon">${unitIcon(u)}</div>
      </div>
      <div class="path">${nodes.join('')}</div>
    </section>`;
  }

  // ---------- Lesson engine ----------
  const isLesson = () => L && (L.mode === 'lesson' || L.mode === 'replay');

  function startLesson(uid, mode) {
    const n = mode === 'lesson' && !(S.lessons > 0) ? FIRST_LESSON_Q : Q_PER_LESSON;
    startSession(mode, pickQuestions(UNITS[uid].questions, n), uid);
  }

  function startSession(mode, ids, uid = null) {
    if (!ids.length) return;
    closeModal();
    L = { mode, unit: uid, queue: [...ids], all: [...ids], total: ids.length, done: 0, missed: new Set(), start: Date.now() };
    track('start');
    saveSession();
    prepareQ();
    go('lesson');
  }

  function resumeSession() {
    const s = savedSession();
    if (!s) return;
    L = { mode: s.mode, unit: s.unit, queue: [...s.queue], all: s.all || [...s.queue], total: s.total, done: s.done, missed: new Set(s.missed), start: Date.now() - (s.elapsed || 0) };
    prepareQ();
    go('lesson');
  }

  function prepareQ() {
    const q = QINDEX[L.queue[0]];
    Object.assign(L, { q, checked: false, ok: null, sel: null, multi: [], flash: null, busy: false });
    if (q.t === 'match') {
      Object.assign(L, { lefts: shuffle(range(q.pairs.length)), rights: shuffle(range(q.pairs.length)), matched: [], pickL: null, pickR: null, matchErr: false });
      L.order = null;
    } else {
      L.order = q.tf ? [0, 1] : shuffle(range(q.o.length));
    }
  }

  function lessonView() {
    const q = L.q, pct = Math.round(100 * L.done / L.total);
    return `<div class="lesson">
      <div class="lesson-top"><button class="x" data-act="quit" aria-label="${t('save_exit')}">${ICON('x')}</button>
        <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div style="width:${pct}%"></div></div><span class="muted small" style="font-weight:900">${L.done}/${L.total}</span></div>
      <section class="qwrap">${renderQ(q)}</section>
      ${lessonFoot(q)}
    </div>`;
  }

  function optBtn(q, oi, k, plain) {
    const isMulti = q.t === 'multi';
    const selected = isMulti ? L.multi.includes(oi) : L.sel === oi;
    let cls = '';
    if (L.checked) {
      const correct = isMulti ? q.a.includes(oi) : q.a === oi;
      if (correct) cls = 'right'; else if (selected) cls = 'wrong';
    } else if (selected) cls = 'sel';
    let lead = `<span class="num">${k + 1}</span>`;
    if (isMulti) lead = `<span class="box">${cls === 'wrong' ? ICON('x') : cls === 'right' || selected ? ICON('check') : ''}</span>`;
    return `<button class="opt ${cls}" data-act="${isMulti ? 'toggle' : 'pick'}" data-i="${oi}" ${L.checked ? 'disabled' : ''} aria-pressed="${selected}">${plain ? '' : lead}<span>${esc(optText(q, oi))}</span></button>`;
  }
  // True/false options are shown in the interface language.
  const optText = (q, i) => q.tf ? t(i === 0 ? 'true' : 'false') : q.o[i];

  function renderQ(q) {
    const tag = L.missed.has(q.id) && !L.checked ? `<span class="tag">${t('prev_mistake')}</span>` : '';
    const kick = s => `<div class="kicker2">${s}${tag}</div>`;
    const seen = new Set(), blocked = giveaways(q);
    const H = text => hinted(text, seen, blocked);
    // One-time nudge until the learner has opened a hint.
    const face = !L.checked ? 'think' : L.ok ? 'laugh' : 'shocked';
    const tip = () => !S.hintSeen && seen.size ? `<p class="hint-tip">${ICON('bulb')} ${t('hint_tip')}</p>` : '';
    if (q.t === 'mc' && q.tf) {
      const title = H(q.q);
      return `${kick(t('tf'))}<div class="qhead">${mascot(76, face)}<div class="qtitle">${title}</div></div>${tip()}
        <div class="tfgrid">${L.order.map((oi, k) => optBtn(q, oi, k, true)).join('')}</div>`;
    }
    if (q.t === 'mc' || q.t === 'multi') {
      const title = H(q.q);
      return `${kick(q.t === 'multi' ? t('select_n', { n: q.a.length }) : t('choose_best'))}<div class="qhead">${mascot(76, face)}<div class="qtitle">${title}</div></div>${tip()}
        <div class="opts">${L.order.map((oi, k) => optBtn(q, oi, k)).join('')}</div>`;
    }
    if (q.t === 'fill') {
      const [before, after = ''] = q.q.split('___');
      const cls = L.checked ? (L.ok ? 'right' : 'wrong') : (L.sel != null ? 'filled' : '');
      const blank = `<span class="blank ${cls}">${L.sel != null ? esc(q.o[L.sel]) : '&nbsp;'}</span>`;
      const b = H(before), a = H(after);
      return `${kick(t('fill'))}<div class="sentence">${b}${blank}${a}</div>${tip()}
        <div class="bank">${L.order.map(oi => `<button class="word ${L.sel === oi ? 'used' : ''}" data-act="pick" data-i="${oi}" ${L.checked ? 'disabled' : ''}>${esc(q.o[oi])}</button>`).join('')}</div>`;
    }
    // match
    const tile = (side, i) => {
      const doneT = L.matched.includes(i);
      let cls = doneT ? 'done' : '';
      if ((side === 'l' ? L.pickL : L.pickR) === i) cls = 'sel';
      if (L.flash && L.flash[side] === i) cls = L.flash.ok ? 'flashgood' : 'flashbad';
      const text = q.pairs[i][side === 'l' ? 0 : 1];
      return `<button class="tile ${side === 'l' ? 'left' : ''} ${cls}" data-act="m${side}" data-i="${i}" ${doneT || L.checked ? 'disabled' : ''}>${esc(text)}</button>`;
    };
    const mtitle = H(q.q);
    return `${kick(t('match'))}<div class="qtitle">${mtitle}</div>${tip()}
      <div class="match"><div class="col">${L.lefts.map(i => tile('l', i)).join('')}</div><div class="col">${L.rights.map(i => tile('r', i)).join('')}</div></div>`;
  }

  // ---------- Hints: tap a dotted word to see what it means ----------
  const GLOSS = window.GLOSSARY || [];
  const HINT = (() => {
    const exact = new Map(), lower = new Map(), pats = [];
    const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const forms = [];
    GLOSS.forEach((g, i) => [g.k, ...(g.also || [])].forEach(f => forms.push({ f, i })));
    forms.sort((x, y) => y.f.length - x.f.length); // longest first: "Amazon S3" before "S3"
    forms.forEach(({ f, i }) => {
      if (f === f.toLowerCase()) { // plain words also match with a capital at the start of a sentence
        lower.set(f, i);
        pats.push(`[${f[0]}${f[0].toUpperCase()}]${reEsc(f.slice(1))}`);
      } else { exact.set(f, i); pats.push(reEsc(f)); }
    });
    // Group 1 is the character before the term (no lookbehind, for older Safari).
    return { exact, lower, re: pats.length ? new RegExp(`(^|[^\\w-])(${pats.join('|')})(?![\\w-])`, 'g') : null };
  })();
  function hinted(text, seen, blocked) {
    if (!HINT.re) return esc(text);
    let out = '', last = 0, m;
    HINT.re.lastIndex = 0;
    while ((m = HINT.re.exec(text))) {
      const word = m[2], start = m.index + m[1].length;
      const gi = HINT.exact.has(word) ? HINT.exact.get(word) : HINT.lower.get(word.toLowerCase());
      if (gi == null || seen.has(gi) || blocked.has(gi)) continue;
      seen.add(gi);
      out += esc(text.slice(last, start)) + `<button type="button" class="hint" data-act="hint" data-g="${gi}">${esc(word)}</button>`;
      last = start + word.length;
    }
    return out + esc(text.slice(last));
  }
  // Skip a hint whose definition would basically give away the answer.
  const STOP = new Set('that this with from your their they them into when what which have will each than then also only more most some such used uses using about over like make makes made very much does just been were where there these those other another without within between both'.split(' '));
  const words = s => String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length >= 4 && !STOP.has(w)).map(w => w.replace(/(ies|es|s|ing|ed)$/, ''));
  function giveaways(q) {
    const blocked = new Set();
    let answers = [];
    if (q.t === 'match') return blocked;
    if (q.tf) answers = [q.q]; // a true/false statement is itself the answer
    else if (q.t === 'multi') answers = q.a.map(i => q.o[i]);
    else answers = [q.o[q.a]];
    GLOSS.forEach((g, i) => {
      const def = new Set(words(g.d));
      const own = new Set(words([g.k, ...(g.also || [])].join(' ')));
      answers.forEach(a => {
        const aw = [...new Set(words(a))].filter(w => !own.has(w));
        const shared = aw.filter(w => def.has(w)).length;
        if (shared >= 2 && shared / aw.length >= (q.tf ? 0.3 : 0.4)) blocked.add(i);
      });
    });
    return blocked;
  }
  let hintOpen = null;
  function closeHint() {
    if (!hintOpen) return;
    hintOpen.el.remove(); hintOpen.btn.classList.remove('open'); hintOpen = null;
  }
  function showHint(btn) {
    const same = hintOpen && hintOpen.btn === btn;
    closeHint();
    if (same) return; // tapping the open word again closes it
    const g = GLOSS[+btn.dataset.g];
    if (!g) return;
    // Drop the one-time tip first, so the layout doesn't shift after the bubble is placed.
    if (!S.hintSeen) { S.hintSeen = true; save(); const t = document.querySelector('.hint-tip'); if (t) t.remove(); }
    const el = document.createElement('div');
    el.className = 'hintpop'; el.setAttribute('role', 'tooltip');
    el.innerHTML = `<strong>${esc(g.k)}</strong><span>${esc((lang === 'th' && window.TH_GLOSS && window.TH_GLOSS[g.k]) || g.d)}</span><i class="arrow"></i>`;
    document.body.appendChild(el);
    const z = pageZoom(), br = btn.getBoundingClientRect();
    const r = { left: br.left / z, top: br.top / z, bottom: br.bottom / z, width: br.width / z };
    const vw = innerWidth / z, vh = innerHeight / z, w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.max(12, Math.min(r.left + r.width / 2 - w / 2, vw - w - 12));
    const below = r.bottom + 10 + h <= vh - 8 || r.top - 10 - h < 8;
    el.style.left = left + 'px';
    el.style.top = (below ? r.bottom + 10 : r.top - 10 - h) + 'px';
    el.classList.add(below ? 'below' : 'above');
    el.querySelector('.arrow').style.left = Math.max(14, Math.min(r.left + r.width / 2 - left, w - 14)) + 'px';
    btn.classList.add('open');
    hintOpen = { el, btn };
  }
  window.addEventListener('scroll', closeHint, { passive: true });
  // Phones fire resize when the address bar shows/hides; only a width change moves the word.
  let lastWidth = innerWidth;
  window.addEventListener('resize', () => { if (innerWidth !== lastWidth) { lastWidth = innerWidth; closeHint(); } });

  // A concept diagram for the question, with the right answer highlighted. Lessons and practice
  // only: mock exams (and their review) stay text-only, like the real exam.
  // Which concept diagram (if any) a question gets, from its text and right answer.
  function diagramIdFor(q) {
    if (!window.diagramFor || q.t === 'match') return null;
    const answer = q.tf ? '' : correctText(q);
    // Fill-in questions: put the answer into the blank so "a ___ table" + "route" reads "a route table".
    return window.diagramFor((q.t === 'fill' ? q.q.replace(/_{2,}/, answer) : q.q) + ' ' + answer);
  }
  function lessonDiagram(q) {
    const id = window.renderDiagram && diagramIdFor(q);
    return id ? window.renderDiagram(id, { lang, answer: q.tf ? '' : correctText(q) }) : '';
  }

  function correctText(q) {
    if (q.t === 'multi') return q.a.map(i => q.o[i]).join(' + ');
    if (q.t === 'match') return q.pairs.map(p => `${p[0]} → ${p[1]}`).join(' · ');
    return optText(q, q.a);
  }

  const lessonReady = q => q.t === 'multi' ? L.multi.length === q.a.length : L.sel != null;

  function lessonFoot(q) {
    if (!L.checked) {
      if (q.t === 'match') {
        return `<footer class="lesson-foot"><div class="foot-inner"><span class="muted">${t('match_help')}</span><button class="btn ghost skipbtn" data-act="skip">${t('skip')}</button></div></footer>`;
      }
      return `<footer class="lesson-foot"><div class="foot-inner">
        <button class="btn ghost skipbtn" data-act="skip">${t('skip')}</button>
        <button class="btn good" data-act="check" ${lessonReady(q) ? '' : 'disabled'}>${t('check')}</button>
      </div></footer>`;
    }
    const praise = t('praise');
    return `<footer class="lesson-foot ${L.ok ? 'good' : 'bad'}" aria-live="polite"><div class="foot-inner">
      <div class="feedback"><div class="badge">${ICON(L.ok ? 'check' : 'x')}</div><div>
        <h3>${L.ok ? praise[L.praise % praise.length] : t('not_quite')}${L.ok && L.combo >= 3 ? ` <span class="combo">${ICON('flame')} ${t('combo', { n: L.combo })}</span>` : ''}</h3>
        ${L.ok ? '' : `<div class="ans">${esc(t('correct_is', { a: correctText(q) }))}</div>`}
        <div class="explain">${esc(explain(q))}</div>
        ${lessonDiagram(q)}
        ${whyHTML(q, q.t === 'multi' ? L.multi : L.sel)}
        ${reportBtn(q)}
      </div></div>
      <button class="btn ${L.ok ? 'good' : 'bad'}" data-act="continue">${t('continue')}</button>
    </div></footer>`;
  }

  function check() {
    const q = L.q;
    if (L.checked || !lessonReady(q)) return;
    const ok = q.t === 'multi'
      ? L.multi.length === q.a.length && q.a.every(i => L.multi.includes(i))
      : L.sel === q.a;
    grade(ok);
  }

  function grade(ok) {
    const q = L.q;
    L.checked = true; L.ok = ok;
    const st = S.stats[q.id] || { seen: 0, correct: 0 };
    st.seen++; if (ok) st.correct++;
    S.stats[q.id] = st;
    const placing = L.mode === 'placement';
    if (!placing) srsUpdate(q.id, ok && !L.missed.has(q.id));
    if (!L.missed.has(q.id)) qstat(q.id, ok);
    if (!placing) {
      // Combo: right on the first try in a row; a retry of a missed question neither adds nor breaks it.
      if (ok && !L.missed.has(q.id)) { L.combo = (L.combo || 0) + 1; questAdd('combo', 0, L.combo); }
      else if (!ok) L.combo = 0;
      if (ok) questAdd('right');
    }
    track('answer');
    sfx(ok ? 'right' : 'wrong');
    if (ok) {
      L.done++;
      L.praise = Math.floor(Math.random() * 6);
      // Clears from the review queue in "Fix mistakes", or when answered right on the first try in a later session.
      if (L.mode === 'mistakes' || !L.missed.has(q.id)) {
        if (S.mistakes[q.id]) { S.fixed = (S.fixed || 0) + 1; questAdd('fix'); }
        delete S.mistakes[q.id];
      }
    } else {
      L.missed.add(q.id);
      if (placing) L.done++;
      else S.mistakes[q.id] = { ts: Date.now() };
    }
    // Save as if Continue was pressed, so leaving now never repeats or loses an answer.
    saveSession(L.queue.slice(1).concat(ok || placing ? [] : [q.id]));
    render();
  }

  function next() {
    if (!L || !L.checked) return;
    const id = L.queue.shift();
    if (!L.ok && L.mode !== 'placement') L.queue.push(id); // missed questions come back at the end
    if (!L.queue.length) return finishLesson();
    prepareQ();
    render();
    window.scrollTo(0, 0);
  }

  function matchPick(side, i) {
    if (L.checked || L.busy) return;
    if (side === 'l') L.pickL = L.pickL === i ? null : i;
    else L.pickR = L.pickR === i ? null : i;
    if (L.pickL != null && L.pickR != null) {
      const ok = L.pickL === L.pickR;
      L.flash = { l: L.pickL, r: L.pickR, ok };
      if (ok) L.matched.push(L.pickL); else L.matchErr = true;
      L.pickL = L.pickR = null; L.busy = true;
      render();
      const session = L;
      setTimeout(() => {
        if (L !== session || view !== 'lesson') return;
        L.flash = null; L.busy = false;
        if (L.matched.length === L.q.pairs.length) grade(!L.matchErr); else render();
      }, ok ? 320 : 600);
      return;
    }
    render();
  }

  // ---------- Placement test ----------
  // Two questions from each unit; every unit answered fully right is marked complete.
  const PLACE_PER_UNIT = 2;
  const placeCount = c => c.units.length * PLACE_PER_UNIT;
  function startPlacement() {
    const c = course();
    const ids = c.units.flatMap(u => shuffle(u.questions.filter(q => q.t !== 'match' && live(q))).slice(0, PLACE_PER_UNIT).map(q => q.id));
    startSession('placement', ids);
  }
  function finishPlacement() {
    const c = course(), skipped = [];
    c.units.forEach(u => {
      const ids = L.all.filter(id => QINDEX[id] && QINDEX[id].unit === u.id);
      if (ids.length && ids.every(id => !L.missed.has(id)) && unitDone(u) < LESSONS_PER_UNIT) {
        S.progress[u.id] = LESSONS_PER_UNIT;
        skipped.push(u.title);
      }
    });
    S.placed = Object.assign({}, S.placed, { [c.id]: Date.now() });
    S.session = null;
    const xp = 10;
    const { extended, earnedFreeze } = addXP(xp);
    const badges = checkBadges();
    sfx('complete');
    END = {
      xp, perfect: false, extended, earnedFreeze, badges, streak: S.streak, skipped,
      acc: Math.round(100 * (L.total - L.missed.size) / L.total),
      secs: Math.round((Date.now() - L.start) / 1000), mode: 'placement'
    };
    L = null;
    save();
    track('placement');
    go('lessonEnd');
    if (skipped.length) confetti();
  }

  function finishLesson() {
    flushQStats();
    if (L.mode === 'placement') return finishPlacement();
    const perfect = L.missed.size === 0;
    const boosted = boostOn();
    let xp = ((L.mode === 'replay' ? 5 : 10) + (perfect ? 5 : 0)) * (boosted ? 2 : 1);
    if (L.mode === 'lesson' && L.unit) S.progress[L.unit] = (S.progress[L.unit] || 0) + 1;
    S.lessons = (S.lessons || 0) + 1;
    if (perfect) S.perfects = (S.perfects || 0) + 1;
    S.session = null;
    const xpRes = addXP(xp);
    questAdd('lessons');
    if (perfect) questAdd('perfect');
    const { earnedFreeze } = xpRes, extended = xpRes.extended || takeQuestExt();
    const badges = checkBadges(), questsDone = questNew.splice(0);
    // "Complete", then at most one extra sound for something special.
    sfx('complete');
    const special = badges.length || questsDone.length ? 'badge' : earnedFreeze ? 'freeze' : extended ? 'streak' : null;
    if (special) sfx(special, 950);
    END = {
      xp, perfect, extended, earnedFreeze, badges, streak: S.streak, boosted, quests: questsDone,
      acc: Math.round(100 * (L.total - L.missed.size) / L.total),
      secs: Math.round((Date.now() - L.start) / 1000),
      unitCompleted: L.mode === 'lesson' && L.unit && S.progress[L.unit] === LESSONS_PER_UNIT ? UNITS[L.unit].title : null,
      mode: L.mode
    };
    L = null;
    save();
    if (S.lessons >= 1) track('done1');
    if (S.lessons >= 3) track('done3');
    go('lessonEnd');
    confetti();
  }

  function lessonEndView() {
    const e = END;
    const placed = e.mode === 'placement';
    const title = placed ? t('placement_done') : e.mode === 'cards' ? t('cards_done') : e.unitCompleted ? t('unit_complete') : e.perfect ? t('perfect_lesson') : e.mode === 'lesson' || e.mode === 'replay' ? t('lesson_complete') : t('practice_complete');
    const sub = placed ? (e.skipped.length ? tn('placement_skipped', e.skipped.length) : t('placement_none')) : e.mode === 'cards' ? tn('cards_done_sub', e.cards) : e.unitCompleted ? t('unit_complete_sub', { unit: esc(e.unitCompleted) }) : e.perfect ? t('perfect_sub') : t('missed_saved');
    return `<div class="center-screen">
      ${mascot(150, e.perfect ? 'cool' : e.unitCompleted || e.extended ? 'proud' : 'laugh', 'bounce')}
      <h1>${title}</h1><p class="muted">${sub}</p>
      ${placed && e.skipped.length ? `<div class="placed-list">${e.skipped.map(u => `<span>${ICON('check')} ${esc(u)}</span>`).join('')}</div>` : ''}
      <div class="statrow">
        <div class="stat gold"><div class="lbl">${t('xp_earned_lbl')}</div><div class="val">${ICON('bolt')} ${e.xp}${e.boosted ? '<span class="x2">×2</span>' : ''}</div></div>
        <div class="stat green"><div class="lbl">${t('accuracy')}</div><div class="val">${ICON('target')} ${e.acc}%</div></div>
        <div class="stat blue"><div class="lbl">${t('time')}</div><div class="val">${ICON('clock')} ${fmtTime(e.secs)}</div></div>
      </div>
      ${e.extended ? `<div class="stat flame"><div class="lbl">${t('goal_reached')}</div><div class="val">${ICON('flame')} ${t('streak_days', { n: e.streak })}</div></div>` : ''}
      ${badgeLine(e.badges || [])}
      ${questLine(e.quests)}
      ${e.mode === 'lesson' || e.mode === 'replay' ? `<button class="linkbtn chbtn" data-act="challenge" data-k="l" data-s="${e.acc}" data-c="${S.cert}">${ICON('share')} ${t('ch_btn')}</button>` : ''}
      ${e.earnedFreeze ? `<div class="stat ice"><div class="val">${ICON('snowflake')} ${t('freeze_earned')}</div><div class="lbl">${t('freezes', { n: S.freezes || 0 })}</div></div>` : ''}
    </div>
    <div class="fixed-foot"><button class="btn" data-act="endcontinue">${t('continue')}</button></div>`;
  }

  // ---------- Streak screen ----------
  // Shown once a day, after the first finished lesson (S.streakShown = that day).
  function streakDayView() {
    const st = streakNow(), met = S.lastStreakDay === dayKey(), left = Math.max(0, S.dailyGoal - xpToday());
    // The days the current streak covers, ending today (goal met) or yesterday.
    const covered = new Set(); for (let i = 0; i < st; i++) covered.add(dayAgo(i + (met ? 0 : 1)));
    const loc = lang === 'th' ? 'th-TH' : 'en-US';
    const week = [6, 5, 4, 3, 2, 1, 0].map(j => {
      const d = new Date(); d.setDate(d.getDate() - j);
      const on = covered.has(dayKey(d));
      return `<div class="sd-day ${on ? 'on' : ''} ${j === 0 ? 'today' : ''}"><span class="sd-dot">${on ? ICON('flame') : ''}</span><span class="sd-lbl">${esc(d.toLocaleDateString(loc, { weekday: 'narrow' }))}</span></div>`;
    }).join('');
    const title = met ? t('sd_met', { n: st }) : st ? t('sd_keep', { n: st }) : t('sd_start');
    const sub = met ? t('sd_met_sub', { n: st + 1 }) : st ? t('sd_left', { xp: left }) : t('sd_left_start', { xp: left });
    return `<div class="center-screen streakday">
      ${mascot(130, met ? 'proud' : 'hero', 'bounce')}
      <div class="sd-flame ${met ? 'lit' : ''}">${ICON('flame')}<span>${st}</span></div>
      <h1>${title}</h1><p class="muted">${sub}</p>
      <div class="sd-week">${week}</div>
      ${S.freezes ? `<p class="small freeze-line">${ICON('snowflake')} ${t('freezes', { n: S.freezes })}</p>` : ''}
    </div>
    <div class="fixed-foot"><button class="btn" data-act="nav" data-v="learn">${t('continue')}</button></div>`;
  }

  // ---------- Practice ----------
  function practiceView() {
    const c = course(), mist = mistakesFor(c.id), due = dueFor(c.id);
    const rows = c.units.map(u => {
      const acc = accuracyOf(u.questions);
      return `<div class="card"><div class="row">
        <div class="bigicon" style="font-size:26px;width:52px;height:52px">${unitIcon(u)}</div>
        <div class="grow"><strong>${u.title}</strong>
          <div class="progress ${acc.pct == null ? '' : acc.pct >= 80 ? 'green' : 'blue'}" style="height:8px;margin:7px 0 4px"><div style="width:${acc.pct || 0}%"></div></div>
          <span class="muted small">${acc.pct == null ? t('not_practiced') : tn('acc_answers', acc.seen, { p: acc.pct })}</span></div>
        <button class="btn ghost btn-inline" data-act="unitpractice" data-u="${u.id}">${t('go')}</button>
      </div></div>`;
    }).join('');
    return shell(`<h1 class="section-title">${t('practice_title')}</h1>
      <p class="section-sub">${t('practice_sub')}</p>
      <div class="stack">
        <div class="card pcard"><div class="row"><div class="bigicon">${ICON('repeat')}</div><div class="grow"><h3>${t('fix_title')}</h3><p>${mist.length ? tn('fix_some', mist.length) : t('fix_none')}</p></div></div>
          <button class="btn block" style="margin-top:14px" data-act="mistakes" ${mist.length ? '' : 'disabled'}>${t('review_mistakes')}</button></div>
        <div class="card pcard"><div class="row"><div class="bigicon">${ICON('calendar')}</div><div class="grow"><h3>${t('review_title')}</h3><p>${due.length ? tn('review_some', due.length) : t('review_none')}</p></div></div>
          <button class="btn ghost block" style="margin-top:14px" data-act="review" ${due.length ? '' : 'disabled'}>${t('review_btn')}</button></div>
        <div class="card pcard"><div class="row"><div class="bigicon">${ICON('book')}</div><div class="grow"><h3>${t('cards_title')}</h3><p>${t('cards_sub')}</p></div></div>
          <button class="btn ghost block" style="margin-top:14px" data-act="cards">${t('start_btn')}</button></div>
        <div class="card pcard"><div class="row"><div class="bigicon">${ICON('bolt')}</div><div class="grow"><h3>${t('quick_title')}</h3><p>${t('quick_sub')}</p></div></div>
          <button class="btn ghost block" style="margin-top:14px" data-act="quick">${t('start_btn')}</button></div>
        <div class="card pcard"><div class="row"><div class="bigicon">${ICON('book')}</div><div class="grow"><h3>${t('words_title')}</h3><p>${t('words_card_sub', { n: GLOSS.length })}</p></div></div>
          <button class="btn ghost block" style="margin-top:14px" data-act="nav" data-v="words">${t('words_open')}</button></div>
        ${window.renderDiagram && courseDiagrams(c).length ? `<div class="card pcard"><div class="row"><div class="bigicon">${ICON('layers')}</div><div class="grow"><h3>${t('dg_title')}</h3><p>${t('dg_card_sub', { n: courseDiagrams(c).length })}</p></div></div>
          <button class="btn ghost block" style="margin-top:14px" data-act="nav" data-v="diagrams">${t('dg_open')}</button></div>` : ''}
        <h2 class="section-title" style="font-size:20px;margin-top:12px">${t('by_topic')}</h2>
        ${rows}
      </div>`);
  }

  // ---------- Diagrams page (Practice) ----------
  // Every diagram used by this course's questions, each under the unit that uses it most,
  // with a button to practice the questions that show it.
  const diagCache = {};
  function courseDiagrams(c) {
    if (diagCache[c.id]) return diagCache[c.id];
    const by = new Map();
    c.units.forEach(u => u.questions.forEach(q => {
      const id = live(q) && diagramIdFor(q);
      if (!id) return;
      if (!by.has(id)) by.set(id, { id, qs: [], units: {} });
      const d = by.get(id); d.qs.push(q); d.units[u.id] = (d.units[u.id] || 0) + 1;
    }));
    // Page order: by unit, then the most-used diagrams first.
    const list = [...by.values()].map(d => Object.assign(d, { unit: Object.keys(d.units).sort((a, b) => d.units[b] - d.units[a])[0] }))
      .sort((a, b) => UNITS[a.unit].index - UNITS[b.unit].index || b.qs.length - a.qs.length);
    return (diagCache[c.id] = list);
  }
  function diagramsView() {
    const c = course(), all = courseDiagrams(c);
    const jump = all.map(d => `<button class="dg-chip" data-act="dgjump" data-d="${d.id}">${esc(window.diagramTitle(d.id, lang))}</button>`).join('');
    const units = c.units.map(u => {
      const ds = all.filter(d => d.unit === u.id);
      if (!ds.length) return '';
      return `<h2 class="section-title" style="font-size:20px;margin-top:14px">${u.title}</h2>` + ds.map(d => `<div class="card dgcard" id="dg-${d.id}">
          <h3>${esc(window.diagramTitle(d.id, lang))}</h3>${window.renderDiagram(d.id, { lang })}
          <button class="btn ghost block" style="margin-top:12px" data-act="diagpractice" data-d="${d.id}">${tn('dg_practice', Math.min(d.qs.length, 10))}</button></div>`).join('');
    }).join('');
    return shell(`<h1 class="section-title">${t('dg_title')}</h1>
      <p class="section-sub">${t('dg_sub', { n: all.length })}</p>
      <div class="dg-jump">${jump}</div>
      <div class="stack">${units}</div>`);
  }
  function startDiagramPractice(id) {
    const d = courseDiagrams(course()).find(x => x.id === id);
    if (d) startSession('practice', pickQuestions(d.qs, 10), Object.keys(d.units).length === 1 ? d.unit : null);
  }

  function startQuick() {
    const c = course();
    // Mix from units the learner has started, or everything if they haven't started any.
    const started = c.units.filter(u => (S.progress[u.id] || 0) > 0);
    const pool = (started.length ? started : c.units).flatMap(u => u.questions);
    startSession('practice', pickQuestions(pool, 10));
  }
  function startReview() {
    const ids = dueFor(course().id).slice(0, 10);
    startSession('review', shuffle(ids));
  }
  function startMistakes() {
    const ids = mistakesFor(course().id).sort((a, b) => S.mistakes[a].ts - S.mistakes[b].ts).slice(0, 10);
    startSession('mistakes', shuffle(ids));
  }

  // ---------- Mock exam ----------
  // Real exam length: 65 questions; 90 minutes for the foundational exams, 130 for associate.
  const examSpec = (c, mode) => mode === 'full'
    ? { questions: 65, minutes: c.level === 'Foundational' ? 90 : 130, pass: c.exam.pass }
    : c.exam;
  const examPool = c => c.units.reduce((n, u) => n + u.questions.filter(q => q.t !== 'match' && live(q)).length, 0);

  function examView() {
    const c = course(), pool = examPool(c);
    const past = S.exams.filter(e => e.cert === c.id).slice(-5).reverse();
    const card = (mode, title, note) => {
      const sp = examSpec(c, mode), short = pool < sp.questions;
      return `<div class="card examcard">
        <div class="row">${certBadge(c)}
          <div class="grow"><h3 style="margin-bottom:2px">${title}</h3><p class="muted">${t('exam_meta', { q: sp.questions, m: sp.minutes, p: sp.pass })}</p></div></div>
        <p class="muted small" style="margin:12px 0 14px;line-height:1.45">${note}${short ? ' ' + t('exam_short_pool', { n: pool, code: c.code }) : ''}</p>
        <button class="btn block ${mode === 'full' ? 'ghost' : ''}" data-act="startexam" data-mode="${mode}">${t('start_exam')}</button>
      </div>`;
    };
    return shell(`<div class="row pagehead">${mascot(72, 'laptop')}<h1 class="section-title" style="margin:0">${t('exam_title')}</h1></div>
      <p class="section-sub">${t('exam_sub')}</p>
      <div class="stack">
        ${card('quick', t('exam_quick'), t('exam_quick_note'))}
        ${card('full', t('exam_full'), t('exam_full_note', { code: c.code, m: examSpec(c, 'full').minutes }))}
      </div>
      ${past.length ? `<h2 class="section-title" style="font-size:20px;margin-top:24px">${t('recent')}</h2><div class="stack">${past.map(e => `
        <div class="card row" style="padding:14px 18px"><div class="grow"><strong>${e.score}%</strong>${e.mode === 'full' ? ` <span class="pill full">${t('full_tag')}</span>` : ''} <span class="muted small">· ${new Date(e.ts).toLocaleDateString(locale(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div>
        <span class="pill ${e.pass ? 'pass' : 'fail'}">${e.pass ? t('pass_pill') : t('notyet_pill')}</span></div>`).join('')}</div>` : ''}`);
  }

  function startExam(mode = 'quick') {
    const c = course(), sp = examSpec(c, mode);
    const byUnit = c.units.map(u => shuffle(u.questions.filter(q => q.t !== 'match' && live(q))));
    const ids = [];
    for (let k = 0; ids.length < sp.questions && byUnit.some(a => a.length); k++) {
      const a = byUnit[k % byUnit.length];
      if (a.length) ids.push(a.pop().id);
    }
    E = { cert: c.id, mode, pass: sp.pass, ids: shuffle(ids), ans: {}, flags: [], cur: 0, start: Date.now(), end: Date.now() + sp.minutes * 60000, orders: {} };
    E.ids.forEach(id => { const q = QINDEX[id]; E.orders[id] = q.tf ? [0, 1] : shuffle(range(q.o.length)); });
    clearInterval(examTimer);
    examTimer = setInterval(tickExam, 1000);
    go('examRun');
  }

  function tickExam() {
    if (!E || view !== 'examRun') { clearInterval(examTimer); return; }
    const left = E.end - Date.now();
    if (left <= 0) { submitExam(); return; }
    const el = document.getElementById('timer');
    if (el) { el.textContent = fmtTime(left / 1000); el.classList.toggle('low', left < 120000); }
  }

  const isAnswered = i => { const a = E.ans[i]; return Array.isArray(a) ? a.length > 0 : a != null; };

  function examRunView() {
    const c = COURSES.find(x => x.id === E.cert), n = E.ids.length, i = E.cur;
    const q = QINDEX[E.ids[i]], a = E.ans[i], flagged = E.flags.includes(i);
    const left = E.end - Date.now();
    const opts = E.orders[q.id].map((oi, k) => {
      const sel = q.t === 'multi' ? (a || []).includes(oi) : a === oi;
      const lead = q.t === 'multi' ? `<span class="box">${sel ? ICON('check') : ''}</span>` : `<span class="num">${String.fromCharCode(65 + k)}</span>`;
      return `<button class="opt ${sel ? 'sel' : ''}" data-act="eopt" data-i="${oi}" aria-pressed="${sel}">${lead}<span>${esc(optText(q, oi))}</span></button>`;
    }).join('');
    const qtext = q.t === 'fill' ? esc(q.q).replace('___', '<span class="blank">&nbsp;</span>') : esc(q.q);
    return `<div class="examtop"><div class="inner">
        <button class="linkbtn ic-title" data-act="quitexam">${ICON('x')} ${t('exit')}</button>
        <strong>${c.code} · ${i + 1} / ${n}</strong>
        <span class="timer ${left < 120000 ? 'low' : ''}" id="timer">${fmtTime(left / 1000)}</span>
      </div></div>
      <div class="exambody">
        <div class="palette">${E.ids.map((_, k) => `<button class="${isAnswered(k) ? 'ans' : ''} ${k === i ? 'cur' : ''} ${E.flags.includes(k) ? 'flag' : ''}" data-act="goto" data-i="${k}" aria-label="${t('question_n', { n: k + 1 })}">${k + 1}</button>`).join('')}</div>
        <div class="kicker2">${q.t === 'multi' ? t('select_n', { n: q.a.length }) : q.tf ? t('tf') : t('choose_one')}${flagged ? `<span class="tag" style="background:#fff1e0;color:var(--flame)">${t('flagged')}</span>` : ''}</div>
        <div class="qtitle">${qtext}</div>
        <div class="opts">${opts}</div>
      </div>
      <div class="fixed-foot">
        <button class="btn ghost" data-act="eprev" ${i === 0 ? 'disabled' : ''}>${t('back')}</button>
        <button class="btn ghost" data-act="eflag">${flagged ? t('unflag') : t('flag')}</button>
        ${i < n - 1 ? `<button class="btn" data-act="enext">${t('next')}</button>` : `<button class="btn good" data-act="esubmit">${t('submit')}</button>`}
      </div>`;
  }

  function examAnswer(oi) {
    const q = QINDEX[E.ids[E.cur]];
    if (q.t === 'multi') {
      const cur = E.ans[E.cur] || [];
      if (cur.includes(oi)) E.ans[E.cur] = cur.filter(x => x !== oi);
      else E.ans[E.cur] = (cur.length >= q.a.length ? cur.slice(1) : cur).concat(oi);
    } else {
      E.ans[E.cur] = oi;
    }
    render();
  }

  function askSubmit() {
    const unanswered = E.ids.filter((_, i) => !isAnswered(i)).length;
    modal(`${mascot(80, 'laptop')}<h2>${t('submit_q')}</h2>
      <p>${unanswered ? tn('unanswered', unanswered) : t('all_answered')}</p>
      <div class="stack"><button class="btn good" data-act="confirmsubmit">${t('submit')}</button><button class="btn ghost" data-act="closemodal">${t('keep_working')}</button></div>`);
  }

  const answerText = (q, a) => {
    if (a == null || (Array.isArray(a) && !a.length)) return t('no_answer');
    return Array.isArray(a) ? a.map(i => q.o[i]).join(' + ') : optText(q, a);
  };

  function submitExam() {
    clearInterval(examTimer);
    closeModal();
    if (!E) return;
    const c = COURSES.find(x => x.id === E.cert);
    const items = E.ids.map((id, i) => {
      const q = QINDEX[id], a = E.ans[i];
      const ok = q.t === 'multi' ? Array.isArray(a) && a.length === q.a.length && q.a.every(x => a.includes(x)) : a === q.a;
      const st = S.stats[id] || { seen: 0, correct: 0 };
      st.seen++; if (ok) st.correct++; S.stats[id] = st;
      if (!ok) S.mistakes[id] = { ts: Date.now() };
      srsUpdate(id, ok);
      if (a != null && !(Array.isArray(a) && !a.length)) qstat(id, ok);
      return { id, a, ok };
    });
    flushQStats();
    const correct = items.filter(x => x.ok).length;
    questAdd('right', correct);
    const score = Math.round(100 * correct / items.length);
    const passAt = E.pass || c.exam.pass;
    const pass = score >= passAt;
    const doms = new Map();
    c.units.forEach(u => {
      const its = items.filter(x => QINDEX[x.id].unit === u.id);
      if (!its.length) return;
      const d = doms.get(u.domain) || { label: u.domain, units: [], titles: [], n: 0, ok: 0 };
      d.units.push(u.id); d.titles.push(u.title); d.n += its.length; d.ok += its.filter(x => x.ok).length;
      doms.set(u.domain, d);
    });
    const byDomain = [...doms.values()];
    S.exams.push({ cert: c.id, ts: Date.now(), score, pass, mode: E.mode || 'quick' });
    // XP scales with exam length: about 1 XP per 5% on the quick exam, 3x on the full one.
    const xp = Math.max(5, Math.round(score / 5 * (E.mode === 'full' ? 3 : 1)));
    addXP(xp);
    const badges = checkBadges();
    sfx(pass ? 'pass' : 'tryagain');
    if (badges.length) sfx('badge', 1500);
    R = { badges, cert: c.id, mode: E.mode || 'quick', passAt, items, correct, score, pass, byDomain, secs: Math.round((Date.now() - E.start) / 1000), xp, showAll: false };
    E = null;
    track('exam');
    go('examResult');
    if (pass) confetti();
  }

  function examResultView() {
    const c = COURSES.find(x => x.id === R.cert);
    const list = R.items.filter(x => R.showAll || !x.ok);
    return `<div class="exambody" style="padding-bottom:140px">
      <div style="text-align:center;margin:20px 0 26px">
        ${mascot(130, R.pass ? 'cool' : 'tired', R.pass ? 'bounce' : '')}
        <h1 style="font-size:30px;font-weight:900;margin:12px 0 6px">${R.pass ? t('passed') : t('not_yet')}</h1>
        <p class="muted">${t('exam_result_sub', { code: c.code, p: R.passAt })}</p>
        <button class="linkbtn chbtn" style="margin-top:8px" data-act="challenge" data-k="e" data-s="${R.score}" data-c="${R.cert}">${ICON('share')} ${t('ch_btn')}</button>
      </div>
      <div class="statrow" style="margin-bottom:24px">
        <div class="stat ${R.pass ? 'green' : 'flame'}"><div class="lbl">${t('score')}</div><div class="val">${R.score}%</div></div>
        <div class="stat blue"><div class="lbl">${t('correct_lbl')}</div><div class="val">${R.correct} / ${R.items.length}</div></div>
        <div class="stat gold"><div class="lbl">${t('xp_earned')}</div><div class="val">${ICON('bolt')} ${R.xp}</div></div>
      </div>
      ${(R.badges || []).length ? `<div class="statrow" style="margin-bottom:18px">${badgeLine(R.badges)}</div>` : ''}
      ${R.pass ? `<div style="text-align:center;margin-bottom:18px"><button class="btn ghost" data-act="share">${ICON('share')} ${t('share_btn')}</button></div>` : ''}
      <div class="card" style="margin-bottom:18px"><h3>${t('by_domain')}</h3>
        ${R.byDomain.map(d => { const p = Math.round(100 * d.ok / d.n); return `<div class="domainbar"><div class="top"><span><b>${esc(domainLabel(d.label))}</b><span class="muted small domain-units">${d.titles.map(esc).join(' · ')}</span></span><span class="muted">${d.ok}/${d.n}</span></div><div class="progress ${p >= R.passAt ? 'green' : ''}" style="height:10px"><div style="width:${p}%"></div></div></div>`; }).join('')}
      </div>
      ${(() => {
        const weak = R.byDomain.filter(d => d.ok < d.n).sort((a, b) => a.ok / a.n - b.ok / b.n)[0];
        return weak ? `<div class="card focuscard" style="margin-bottom:18px"><div class="row"><div class="bigicon">${ICON('target')}</div><div class="grow"><h3 style="margin-bottom:2px">${t('focus_next', { d: esc(domainLabel(weak.label)) })}</h3><p class="muted small">${t('focus_sub')} ${weak.titles.map(esc).join(' · ')}</p></div><button class="btn" data-act="domainpractice" data-us="${weak.units.join(',')}">${t('focus_btn')}</button></div></div>` : '';
      })()}
      <div class="row" style="justify-content:space-between;margin:22px 0 12px"><h2 style="font-size:20px;font-weight:900">${R.showAll ? t('all_qs') : t('review_misses')}</h2>
        <button class="linkbtn" data-act="toggleall">${R.showAll ? t('show_misses') : t('show_all')}</button></div>
      <div class="stack">${list.length ? list.map(x => { const q = QINDEX[x.id]; return `
        <div class="card reviewitem ${x.ok ? 'ok' : ''}"><div class="q">${esc(q.q)}</div>
          ${x.ok ? '' : `<div class="a" style="color:var(--bad)">${esc(t('your_answer', { a: answerText(q, x.a) }))}</div>`}
          <div class="a" style="color:var(--good)">${esc(t('correct_is', { a: correctText(q) }))}</div>
          <div class="e">${esc(explain(q))}</div>${x.ok ? '' : whyHTML(q, x.a)}${reportBtn(q)}</div>`; }).join('') : `<div class="card muted">${t('flawless')}</div>`}</div>
    </div>
    <div class="fixed-foot"><button class="btn ghost" data-act="nav" data-v="exam">${t('done')}</button><button class="btn" data-act="startexam" data-mode="${R.mode}">${t('retake')}</button></div>`;
  }

  // ---------- Weekly leaderboard ----------
  // Weeks start on Monday in the learner's own calendar. Scores live at
  // cloudlingoWeeks/{monday}/scores/{uid}: first name + this week's XP only.
  function weekStart(d = new Date()) {
    const x = new Date(d); x.setHours(12, 0, 0, 0);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }
  const weekId = () => dayKey(weekStart());
  function weekXp() {
    const s = weekStart(); let n = 0;
    for (let i = 0; i < 7; i++) { const d = new Date(s); d.setDate(s.getDate() + i); n += S.xpByDay[dayKey(d)] || 0; }
    return n;
  }
  const boardName = () => ((account && account.first) || 'Learner').replace(/[<>]/g, '').slice(0, 24);
  const scoreRef = () => fb.fs.doc(fb.db, 'cloudlingoWeeks', weekId(), 'scores', account.uid);
  let BOARD = { state: 'idle', rows: [], week: null }; // idle | loading | ready | error
  let boardSent = null, boardTimer = null;
  function scheduleBoard() {
    if (!fb || authState !== 'in') return;
    clearTimeout(boardTimer);
    boardTimer = setTimeout(pushBoard, 2000);
  }
  async function pushBoard() {
    if (!fb || authState !== 'in' || !account || S.board === false) return;
    const xp = weekXp(), key = `${weekId()}:${xp}:${boardName()}`;
    if (xp <= 0 || boardSent === key) return;
    try { await fb.fs.setDoc(scoreRef(), { name: boardName(), xp, updatedAt: Date.now() }); boardSent = key; }
    catch { /* the leaderboard is best-effort */ }
  }
  async function loadBoard() {
    if (!fb || authState !== 'in') return;
    BOARD = { state: 'loading', rows: BOARD.week === weekId() ? BOARD.rows : [], week: weekId() };
    if (view === 'board') render();
    try {
      await pushBoard();
      const q = fb.fs.query(fb.fs.collection(fb.db, 'cloudlingoWeeks', weekId(), 'scores'), fb.fs.orderBy('xp', 'desc'), fb.fs.limit(50));
      const snap = await fb.fs.getDocs(q);
      BOARD = { state: 'ready', week: weekId(), rows: snap.docs.map(d => ({ uid: d.id, ...d.data() })) };
    } catch { BOARD.state = 'error'; }
    if (view === 'board') render();
  }
  async function setBoardVisible(on) {
    S.board = on; save();
    boardSent = null;
    if (fb && authState === 'in' && account) {
      try { if (on) await pushBoard(); else await fb.fs.deleteDoc(scoreRef()); } catch { /* ignore */ }
      loadBoard();
    } else render();
  }

  function boardView() {
    const head = `<h1 class="section-title ic-title">${ICON('trophy')} ${t('board_title')}</h1><p class="section-sub">${t('board_sub')}</p>`;
    if (authState !== 'in' || !account) {
      return shell(`${head}<div class="card" style="text-align:center">${mascot(100, 'idea', 'center')}<p style="margin:10px 0 16px">${t('board_signin')}</p>
        ${authState === 'out' || authState === 'loading' ? `<button class="btn" data-act="signin">${t('signin')}</button>` : ''}</div>`);
    }
    const left = 6 - ((new Date().getDay() + 6) % 7);
    const resets = left === 0 ? t('board_resets_today') : tn('board_resets', left);
    const mine = weekXp(), hidden = S.board === false;
    let rows = BOARD.rows.slice();
    // Show my latest XP right away, even before the next write lands.
    if (!hidden && mine > 0) {
      const me = rows.find(r => r.uid === account.uid);
      if (me) me.xp = Math.max(me.xp, mine); else rows.push({ uid: account.uid, name: boardName(), xp: mine });
      rows.sort((a, b) => b.xp - a.xp);
    }
    const body = BOARD.state === 'error' ? `<div class="card" style="text-align:center"><p class="muted" style="margin-bottom:12px">${t('board_error')}</p><button class="btn ghost" data-act="loadboard">${t('board_retry')}</button></div>`
      : BOARD.state === 'loading' && !rows.length ? `<div class="card muted">${t('board_loading')}</div>`
      : !rows.length ? `<div class="card muted" style="text-align:center">${mascot(90, 'sleep', 'center')}<p style="margin-top:8px">${t('board_empty')}</p></div>`
      : `<div class="card board">${rows.map((r, i) => {
          const me = r.uid === account.uid, medal = i < 3 ? `<span class="medal m${i + 1}">${i + 1}</span>` : i + 1;
          const initial = esc(((r.name || '?').trim()[0] || '?').toUpperCase());
          return `<div class="brow ${me ? 'me' : ''}"><span class="rank">${medal}</span><span class="avatar" style="width:34px;height:34px">${initial}</span>
            <span class="grow bname">${esc(r.name || 'Learner')}${me ? ` <span class="pill you">${t('board_you')}</span>` : ''}</span><strong class="bxp">${ICON('bolt')} ${r.xp}</strong></div>`;
        }).join('')}</div>`;
    return shell(`${head}<p class="muted small" style="margin:-8px 0 14px">${ICON('hourglass')} ${resets}</p>
      ${hidden ? `<div class="card notice"><p>${t('board_hidden')}</p></div>` : ''}${body}
      <div class="card" style="margin-top:16px"><div class="row"><div class="grow"><strong>${t('board_show')}</strong><p class="muted small">${t('board_show_sub')}</p></div>
        <div class="seg seg2"><button class="${hidden ? '' : 'on'}" data-act="boardvis" data-on="1">${t('board_on')}</button><button class="${hidden ? 'on' : ''}" data-act="boardvis" data-on="0">${t('board_off')}</button></div></div></div>`);
  }

  // ---------- Install as an app (PWA) ----------
  // Android / desktop Chrome and Edge fire beforeinstallprompt, so we show our own
  // Install button. iPhone and iPad have no prompt: we explain Share → Add to Home Screen.
  const pwaReady = !!document.querySelector('link[rel="manifest"]'); // not in the single-file claude.ai copy
  let installPrompt = null;
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; refresh(); });
  window.addEventListener('appinstalled', () => { installPrompt = null; refresh(); });
  // Not on localhost: there every file is ?v=dev, so a cache-first worker would keep serving stale code.
  if (pwaReady && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !/^(localhost|127.0.0.1)$/.test(location.hostname)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ }));
  }
  // ---------- Auto-update ----------
  // Each deploy writes version.json. When it names a newer build than the one
  // running, reload so everyone is on the latest version. Never mid-lesson or
  // mid-exam: then it waits until the learner leaves that screen.
  function applyUpdate() {
    if (busyView()) { updatePending = true; return; }
    updatePending = false;
    const bar = document.createElement('div');
    bar.className = 'update-bar';
    bar.textContent = t('updating');
    document.body.appendChild(bar);
    setTimeout(() => location.reload(), 1200);
  }
  async function checkForUpdate() {
    if (APP_VERSION === 'dev' || !navigator.onLine) return;
    try {
      const res = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      const v = (await res.json()).v;
      if (!v || v === APP_VERSION) return;
      // Reload at most once per new version, in case a stale cache serves the old page again.
      let tried = null; try { tried = sessionStorage.getItem('cl-update'); } catch { /* ignore */ }
      if (tried === v) return;
      try { sessionStorage.setItem('cl-update', v); } catch { /* ignore */ }
      applyUpdate();
    } catch { /* offline: try again later */ }
  }
  if (pwaReady) {
    window.addEventListener('load', () => setTimeout(checkForUpdate, 3000));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate(); });
    setInterval(checkForUpdate, 15 * 60 * 1000);
  }

  // ---------- Usage funnel + error reports (admin page) ----------
  // Anonymous and per device: which first steps someone has reached
  // (cloudlingoFunnel/{device id}) and script errors (cloudlingoErrors).
  // No answers, names or emails; the account id only once someone signs in.
  // Off on localhost unless ?telemetry=1, so testing never adds fake data.
  const TELEMETRY = pwaReady && (APP_VERSION !== 'dev' || /[?&]telemetry=1\b/.test(location.search));
  const FUNNEL_KEY = 'cloudlingo:funnel';
  let FN = null;
  try { FN = JSON.parse(localStorage.getItem(FUNNEL_KEY)); } catch { /* new device */ }
  if (!FN || !/^[a-z0-9]{20}$/.test(FN.id || '')) {
    const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
    FN = { id: Array.from(crypto.getRandomValues(new Uint8Array(20)), b => abc[b % 36]).join(''), steps: {}, sent: '' };
  }
  const saveFN = () => { try { localStorage.setItem(FUNNEL_KEY, JSON.stringify(FN)); } catch { /* ignore */ } };
  let fnTimer = null;
  function track(step) {
    if (FN.steps[step]) return;
    FN.steps[step] = Date.now(); saveFN();
    clearTimeout(fnTimer); fnTimer = setTimeout(sendFunnel, 1500);
  }
  async function sendFunnel() {
    if (!TELEMETRY) return;
    if (!fb && fbLoading) { try { await fbLoading; } catch { return; } }
    if (!fb) return;
    const uid = account ? account.uid : null;
    const key = JSON.stringify([FN.steps, S.cert, uid, dayKey(new Date())]);
    if (FN.sent === key) return;
    try {
      await fb.fs.setDoc(fb.fs.doc(fb.db, 'cloudlingoFunnel', FN.id), {
        first: FN.steps.open || Date.now(), last: Date.now(), steps: FN.steps, cert: S.cert || '', lang,
        mobile: matchMedia('(pointer: coarse)').matches, standalone: isStandalone(), uid, v: APP_VERSION
      });
      FN.sent = key; saveFN();
    } catch { /* best effort */ }
  }
  // Devices that used the app before tracking started: fill in what they've clearly done.
  if (!FN.steps.open) {
    FN.steps.open = Date.now();
    if (S.cert) FN.steps.cert = Date.now();
    if (S.lessons >= 1) Object.assign(FN.steps, { start: Date.now(), answer: Date.now(), done1: Date.now() });
    if (S.lessons >= 3) FN.steps.done3 = Date.now();
    if ((S.exams || []).length) FN.steps.exam = Date.now();
    saveFN();
  }
  setTimeout(sendFunnel, 4000); // also refreshes "last seen" once a day

  let errCount = 0;
  const errSeen = new Set();
  async function reportError(msg, src, line, col, stack) {
    msg = String(msg || '').slice(0, 300);
    if (!TELEMETRY || !msg || errCount >= 5 || /ResizeObserver loop|^Script error\.?$/.test(msg)) return;
    const k = msg + '|' + src + '|' + line;
    if (errSeen.has(k)) return;
    errSeen.add(k); errCount++;
    if (!fb && fbLoading) { try { await fbLoading; } catch { return; } }
    if (!fb) return;
    try {
      await fb.fs.addDoc(fb.fs.collection(fb.db, 'cloudlingoErrors'), {
        msg, src: String(src || '').split('?')[0].slice(0, 200), line: +line || 0, col: +col || 0,
        stack: String(stack || '').slice(0, 2000), v: APP_VERSION, view: String(view || '').slice(0, 20),
        ua: navigator.userAgent.slice(0, 200), dev: FN.id, uid: account ? account.uid : null, ts: fb.fs.serverTimestamp()
      });
    } catch { /* best effort */ }
  }
  window.addEventListener('error', e => reportError(e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack));
  window.addEventListener('unhandledrejection', e => {
    const r = e.reason;
    reportError('Unhandled promise: ' + (r && r.message ? r.message : String(r)), '', 0, 0, r && r.stack);
  });

  // ---------- Answer counts per question (admin "Most-missed questions") ----------
  // First-try answers from everyone, signed in or not: cloudlingoQStats/{question id}
  // holds totals of right (r) and wrong (w) answers. Nothing about who answered.
  const QS = new Map();
  function qstat(id, ok) { if (TELEMETRY && !QS.has(id)) QS.set(id, ok); }
  async function flushQStats() {
    if (!QS.size) return;
    if (!fb && fbLoading) { try { await fbLoading; } catch { return; } }
    if (!fb) return;
    const items = [...QS]; QS.clear();
    try {
      const batch = fb.fs.writeBatch(fb.db);
      items.forEach(([id, ok]) => batch.set(fb.fs.doc(fb.db, 'cloudlingoQStats', id),
        { r: fb.fs.increment(ok ? 1 : 0), w: fb.fs.increment(ok ? 0 : 1), cert: id.split('-')[0] }, { merge: true }));
      await batch.commit();
    } catch { /* best effort */ }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushQStats(); });

  // ---------- Daily reminder (push notification) ----------
  // Saved per account in Firestore (cloudlingoPush/{uid}): this device's push
  // subscription, the local hour to remind at, and the time zone. An hourly job
  // (cloudlingo/reminders/send.mjs) sends one reminder on days the goal isn't met.
  const VAPID_PUBLIC = '__VAPID_PUBLIC__'; // filled in at deploy (deploy.yml)
  const pushSupported = () => pwaReady && !VAPID_PUBLIC.startsWith('__') && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  let remind = { loaded: false, on: false, hour: 19, busy: false };
  const b64ToBytes = b64 => { const p = '='.repeat((4 - b64.length % 4) % 4); const raw = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw, c => c.charCodeAt(0)); };
  const remindRef = () => fb.fs.doc(fb.db, 'cloudlingoPush', account.uid);
  async function loadReminder() {
    if (!fb || !account || remind.loaded) return;
    try { const snap = await fb.fs.getDoc(remindRef()); const d = snap.exists() ? snap.data() : {}; remind = { loaded: true, on: !!d.on, hour: d.hour != null ? d.hour : 19, busy: false }; }
    catch { remind.loaded = true; }
    if (view === 'profile') render();
  }
  async function setReminder(on, hour) {
    if (!fb || !account || remind.busy) return;
    remind.busy = true; render();
    try {
      const data = { on, hour, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', lang, updatedAt: Date.now() };
      if (on) {
        if (Notification.permission !== 'granted' && await Notification.requestPermission() !== 'granted') throw new Error('denied');
        const reg = await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC) });
        const snap = await fb.fs.getDoc(remindRef());
        const subs = ((snap.exists() && snap.data().subs) || []).filter(x => x.endpoint !== sub.endpoint);
        data.subs = subs.concat(sub.toJSON()).slice(-5); // up to 5 devices per account
      }
      await fb.fs.setDoc(remindRef(), data, { merge: true });
      remind = { loaded: true, on, hour, busy: false };
    } catch (e) {
      remind.busy = false;
      infoModal(t('remind_failed'), e && e.message === 'denied' ? t('remind_denied') : t('remind_failed_sub'));
    }
    render();
  }
  function reminderCard() {
    if (!pwaReady || VAPID_PUBLIC.startsWith('__')) return '';
    let body;
    if (authState !== 'in' || !account) body = `<p class="muted small">${t('remind_signin')}</p>`;
    else if (isIOS() && !isStandalone()) body = `<p class="muted small">${t('remind_install')}</p>`;
    else if (!pushSupported()) body = `<p class="muted small">${t('remind_unsupported')}</p>`;
    else {
      loadReminder();
      const hours = [7, 8, 9, 12, 17, 18, 19, 20, 21, 22];
      const label = h => new Date(2000, 0, 1, h).toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
      body = `<div class="row" style="flex-wrap:wrap;gap:10px;margin-top:6px">
        <div class="seg seg2" style="width:132px"><button class="${remind.on ? 'on' : ''}" data-act="remindon" ${remind.busy ? 'disabled' : ''}>${t('board_on')}</button><button class="${remind.on ? '' : 'on'}" data-act="remindoff" ${remind.busy ? 'disabled' : ''}>${t('board_off')}</button></div>
        <label class="muted small remind-time">${t('remind_at')} <select id="remind-hour" ${remind.busy ? 'disabled' : ''}>${hours.map(h => `<option value="${h}" ${h === remind.hour ? 'selected' : ''}>${label(h)}</option>`).join('')}</select></label></div>
        ${Notification.permission === 'denied' ? `<p class="muted small" style="margin-top:8px">${t('remind_denied')}</p>` : ''}`;
    }
    return `<div class="card" style="margin-top:16px"><h3 class="ic-title" style="margin-bottom:2px">${ICON('bell')} ${t('remind_title')}</h3><p class="muted small" style="margin-bottom:6px">${t('remind_sub')}</p>${body}</div>`;
  }

  function installCard(dismissable) {
    if (!pwaReady || isStandalone() || (dismissable && S.installHidden)) return '';
    const later = dismissable ? `<button class="linkbtn" data-act="installlater">${t('install_later')}</button>` : '';
    if (installPrompt) return `<div class="card installcard"><div class="row"><img src="img/icons/icon-192.png" alt="" class="appicon"><div class="grow">
      <h3 style="margin-bottom:2px">${t('install_title')}</h3><p class="muted small">${t('install_sub')}</p></div></div>
      <div class="row" style="margin-top:12px"><button class="btn grow" data-act="install">${t('install_btn')}</button>${later}</div></div>`;
    if (isIOS()) return `<div class="card installcard"><div class="row"><img src="img/icons/icon-192.png" alt="" class="appicon"><div class="grow">
      <h3 style="margin-bottom:2px">${t('install_title')}</h3><p class="muted small">${t('install_ios')}</p></div></div>
      ${later ? `<div style="text-align:right;margin-top:6px">${later}</div>` : ''}</div>`;
    return '';
  }

  // ---------- Guided tour ----------
  // The same spotlight tour the site's other apps use (/shared/tour.js): dims the
  // page and explains one real element at a time (data-tour attributes). Runs
  // once on the first visit to the Learn page; the ? button replays it.
  const TOUR_KEY = 'cloudlingo:tour';
  const TOUR_STEPS = [
    { key: 'welcome' },
    { key: 'path', target: 'path' },
    { key: 'cert', target: 'cert' },
    { key: 'goal', target: 'goal', alt: { key: 'goal', target: 'goal-side' } },
    { key: 'streak', target: 'streak' },
    { key: 'practice', target: 'nav-practice' },
    { key: 'exam', target: 'nav-exam' },
    { key: 'board', target: 'nav-board' },
    { key: 'account', target: 'account' },
    { key: 'help', target: 'help' },
    { key: 'done' }
  ];
  let touring = false;
  const tourSeen = () => { try { return localStorage.getItem(TOUR_KEY) === '1'; } catch { return true; } };
  async function startTour() {
    if (touring || !pwaReady) return;
    touring = true;
    try {
      closeModal(); closeHint();
      if (view !== 'learn') go('learn');
      window.scrollTo(0, 0);
      const mod = await import(new URL('../shared/tour.js', document.baseURI).href);
      mod.startTour({
        steps: TOUR_STEPS,
        text: key => ({ title: t('tour_' + key + '_t'), body: t('tour_' + key + '_b') }),
        labels: { title: t('tour_title'), next: t('tour_next'), back: t('tour_back'), skip: t('tour_skip'), start: t('tour_start') },
        doneKey: TOUR_KEY,
        accent: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#1f8ef1',
        onFinish: () => { touring = false; window.scrollTo(0, 0); }
      });
    } catch { touring = false; /* the tour is optional (e.g. offline) */ }
  }
  // First visit: wait until the Learn page has settled (sign-in loaded, no dialog open).
  // After the first lesson, the learn page offers the tour once (Take the tour / Not now).
  function maybeAutoTour(tries = 6) {
    if (tourSeen() || touring || !pwaReady || !(S.lessons > 0)) return;
    setTimeout(() => {
      if (tourSeen() || touring || view !== 'learn') return;
      if (modalRoot.innerHTML || authState === 'loading') { if (tries > 1) maybeAutoTour(tries - 1); return; }
      modal(`<div style="text-align:center">${mascot(110, 'laugh', 'bounce')}<h2 style="margin-top:10px">${t('tour_offer_t')}</h2><p class="muted" style="margin:8px 0 18px">${t('tour_offer_b')}</p>
        <div class="stack"><button class="btn" data-act="tourgo">${t('tour_btn')}</button><button class="btn ghost" data-act="tourno">${t('tour_later')}</button></div></div>`);
    }, 900);
  }

  function langSwitch() {
    return `<div class="seg seg2 langseg" role="group" aria-label="${t('language')}"><button class="${lang === 'en' ? 'on' : ''}" data-act="setlang" data-l="en">EN</button><button class="${lang === 'th' ? 'on' : ''}" data-act="setlang" data-l="th">ไทย</button></div>`;
  }

  // ---------- Profile ----------
  function profileView() {
    const c = course();
    let seen = 0, correct = 0;
    Object.values(S.stats).forEach(s => { seen += s.seen; correct += s.correct; });
    const days = range(7).map(k => dayAgo(6 - k));
    const vals = days.map(d => S.xpByDay[d] || 0);
    const max = Math.max(S.dailyGoal, ...vals);
    const domains = c.units.map(u => ({ u, acc: accuracyOf(u.questions) })).filter(x => x.acc.seen);
    return shell(`${accountCard()}<div class="row" style="margin:6px 0 20px">${mascot(84, 'proud')}<div><h1 class="section-title" style="margin:0">${t('your_progress')}</h1><p class="muted">${t('studying', { code: c.code, name: c.name })}</p></div></div>
      <div class="tiles">
        <div class="tile-stat"><span class="i">${ICON('flame')}</span><div><div class="v">${streakNow()}</div><div class="l">${t('day_streak')}</div></div></div>
        <div class="tile-stat"><span class="i">${ICON('bolt')}</span><div><div class="v">${S.xp}</div><div class="l">${t('total_xp')}</div></div></div>
        <div class="tile-stat"><span class="i">${ICON('book')}</span><div><div class="v">${S.lessons || 0}</div><div class="l">${t('sessions_done')}</div></div></div>
        <div class="tile-stat"><span class="i">${ICON('target')}</span><div><div class="v">${seen ? Math.round(100 * correct / seen) + '%' : '–'}</div><div class="l">${t('accuracy')}</div></div></div>
      </div>
      <div style="margin-top:16px">${readinessCard(c, false)}</div>
      <div class="card" style="margin-top:16px"><h3 class="ic-title">${ICON('compass')} ${t('path_title')}</h3><p class="muted small" style="margin:4px 0 12px">${t('path_card_b')}</p><button class="btn ghost block" data-act="nav" data-v="path">${t('path_open')}</button></div>
      <div class="card" style="margin-top:16px"><div class="row" style="justify-content:space-between"><h3 style="margin:0">${t('badges')}</h3><span class="muted small">${Object.keys(S.badges || {}).length} / ${BADGES.length}</span></div>
        <div class="badges">${BADGES.map(b => `<div class="badge-item ${S.badges && S.badges[b.id] ? 'on' : ''}" title="${esc(t('badge_' + b.id + '_d'))}"><span class="bi">${ICON(b.icon)}</span><span class="bn">${t('badge_' + b.id)}</span></div>`).join('')}</div>
        <button class="btn ghost block" style="margin-top:14px" data-act="share">${ICON('share')} ${t('share_btn')}</button></div>
      <div class="card" style="margin-top:16px">${streakCard()}<p class="muted small" style="margin-top:4px">${t('freezes_how')}</p></div>
      <div class="card" style="margin-top:16px"><h3>${t('this_week')}</h3>
        <div class="week">${days.map((d, k) => { const dt = new Date(d + 'T12:00:00'); return `<div class="bar ${k === 6 ? 'today' : ''}"><span class="n">${vals[k] || ''}</span><div class="fill" style="height:${Math.round(85 * vals[k] / max)}%"></div><span class="d">${dt.toLocaleDateString(locale(), { weekday: 'short' })}</span></div>`; }).join('')}</div>
      </div>
      <div class="card" style="margin-top:16px"><h3>${t('strengths', { code: c.code })}</h3>
        ${domains.length ? domains.map(({ u, acc }) => `<div class="domainbar"><div class="top"><span class="ic-title">${unitIcon(u)} ${u.title}</span><span class="muted">${acc.pct}%</span></div><div class="progress ${acc.pct >= 80 ? 'green' : 'blue'}" style="height:10px"><div style="width:${acc.pct}%"></div></div></div>`).join('') : `<p class="muted">${t('strengths_none')}</p>`}
      </div>
      <div class="card" style="margin-top:16px"><h3>${t('certifications')}</h3><div class="certlist">${COURSES.map(x => certOption(x, x.id === c.id, 'setcert')).join('')}</div></div>
      <div class="card" style="margin-top:16px"><h3>${t('daily_goal')}</h3>
        <div class="seg">${GOALS.map(g => `<button class="${S.dailyGoal === g.xp ? 'on' : ''}" data-act="setgoal" data-g="${g.xp}">${t(g.key)}<small>${g.xp} XP</small></button>`).join('')}</div>
      </div>
      ${reminderCard()}${installCard(false) ? `<div style="margin-top:16px">${installCard(false)}</div>` : ''}<div class="card" style="margin-top:16px"><h3>${t('language')}</h3>${langSwitch()}</div>
      <div class="card" style="margin-top:16px"><div class="row"><div class="grow"><h3 style="margin:0">${t('sound')}</h3><p class="muted small">${t('sound_sub')}</p></div>
        <div class="seg seg2" style="width:132px"><button class="${S.sound !== false ? 'on' : ''}" data-act="setsound" data-on="1">${t('board_on')}</button><button class="${S.sound === false ? 'on' : ''}" data-act="setsound" data-on="0">${t('board_off')}</button></div></div></div>
      <div class="card" style="margin-top:16px"><h3>${t('text_size')}</h3>
        <div class="seg" style="grid-template-columns:repeat(3,1fr)">${TEXT_SIZES.map((z, i) => `<button class="${(S.textSize || 1) === z ? 'on' : ''}" data-act="settext" data-z="${z}" style="font-size:${[14, 16, 18][i]}px">${t(['text_normal', 'text_large', 'text_larger'][i])}</button>`).join('')}</div>
      </div>
      <div class="card" style="margin-top:16px"><h3>${t('appearance')}</h3>
        <div class="seg" style="grid-template-columns:repeat(3,1fr)">${['auto', 'light', 'dark'].map(th => `<button class="${S.theme === th ? 'on' : ''}" data-act="settheme" data-t="${th}">${t('theme_' + th)}</button>`).join('')}</div>
      </div>
      <div style="text-align:center;margin-top:22px"><button class="linkbtn" style="color:var(--bad)" data-act="reset">${t('reset_all')}</button></div>`);
  }

  // ---------- Events ----------
  const actions = {
    nav: d => { go(d.v); if (d.v === 'board') loadBoard(); },
    loadboard: () => loadBoard(),
    boardvis: d => setBoardVisible(d.on === '1'),
    setlang: d => { setLang(d.l); render(); },
    tour: () => startTour(),
    remindon: () => setReminder(true, remind.hour),
    remindoff: () => setReminder(false, remind.hour),
    report: d => openReport(d.q),
    sendreport: () => sendReport(modalRoot.querySelector('[data-act=sendreport]')),
    review: () => startReview(),
    share: () => shareCard(),
    setsound: d => { S.sound = d.on === '1'; save(); if (S.sound) { loadSfx(); sfx('correct'); } render(); },
    install: async () => { if (!installPrompt) return; const p = installPrompt; installPrompt = null; p.prompt(); try { await p.userChoice; } catch { /* ignore */ } render(); },
    installlater: () => { S.installHidden = true; save(); render(); },
    dismissfreeze: () => { S.freezeNotice = null; save(); render(); },
    pickcert: () => modal(`<h2>${t('choose_cert')}</h2><p>${t('choose_cert_sub')}</p><div class="certlist">${COURSES.map(c => certOption(c, c.id === S.cert, 'setcert')).join('')}</div><button class="linkbtn block" style="margin-top:14px" data-act="openpath">${ICON('compass')} ${t('path_open')}</button>`, 'wide'),
    openpath: () => { closeModal(); go('path'); },
    challenge: d => shareChallenge(d.k, +d.s, d.c),
    chgo: () => { const ch = CH; CH = null; if (S.cert !== ch.c) { S.cert = ch.c; save(); } go(ch.k === 'e' ? 'exam' : 'learn'); },
    chno: () => { CH = null; render(); },
    pathpick: d => { S.cert = d.c; save(); go('learn'); },
    setcert: d => { S.cert = d.c; save(); closeModal(); go(view === 'profile' ? 'profile' : 'learn'); },
    closemodal: () => closeModal(),
    node: d => { const u = UNITS[d.u]; startLesson(d.u, +d.l < unitDone(u) ? 'replay' : 'lesson'); },
    unitpractice: d => startSession('practice', pickQuestions(UNITS[d.u].questions, 8), d.u),
    quick: () => startQuick(),
    diagpractice: d => startDiagramPractice(d.d),
    // Wait a frame: focusing the chip scrolls its row, which would cancel a page scroll started now.
    dgjump: d => requestAnimationFrame(() => {
      const el = document.getElementById('dg-' + d.d), bar = document.querySelector('.topbar');
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (bar ? bar.offsetHeight : 0) - 12, behavior: reducedMotion() ? 'auto' : 'smooth' }); }),
    mistakes: () => startMistakes(),
    pick: d => { if (!L.checked) { L.sel = +d.i; render(); } },
    toggle: d => toggleMulti(+d.i),
    check: () => check(),
    skip: () => { if (!L.checked) grade(false); },
    continue: () => next(),
    ml: d => matchPick('l', +d.i),
    mr: d => matchPick('r', +d.i),
    // Progress is saved after every answer, so leaving is always safe.
    quit: () => { L = null; go('learn'); },
    resume: () => resumeSession(),
    discard: () => { S.session = null; save(); render(); },
    startexam: d => startExam(d.mode === 'full' ? 'full' : 'quick'),
    eopt: d => examAnswer(+d.i),
    eprev: () => { if (E.cur > 0) { E.cur--; render(); } },
    enext: () => { if (E.cur < E.ids.length - 1) { E.cur++; render(); } },
    goto: d => { E.cur = +d.i; render(); },
    eflag: () => { E.flags = E.flags.includes(E.cur) ? E.flags.filter(x => x !== E.cur) : E.flags.concat(E.cur); render(); },
    esubmit: () => askSubmit(),
    confirmsubmit: () => submitExam(),
    quitexam: () => modal(`${mascot(80, 'tired')}<h2>${t('exit_exam_q')}</h2><p>${t('exit_exam_sub')}</p>
      <div class="stack"><button class="btn" data-act="closemodal">${t('keep_going')}</button><button class="btn ghost" style="color:var(--bad)" data-act="confirmquitexam">${t('exit_exam')}</button></div>`),
    confirmquitexam: () => { clearInterval(examTimer); E = null; closeModal(); go('exam'); },
    toggleall: () => { R.showAll = !R.showAll; render(); },
    // Lesson end → the day's streak screen the first time each day, otherwise back to learning.
    endcontinue: () => {
      if (S.streakShown === dayKey()) return go('learn');
      S.streakShown = dayKey(); save();
      go('streakDay');
      if (S.lastStreakDay === dayKey()) sfx('streak');
    },
    setgoal: d => { S.dailyGoal = +d.g; addXP(0); render(); questToasts(); },
    settheme: d => { S.theme = d.t; save(); applyTheme(); render(); },
    settext: d => { S.textSize = +d.z; save(); applyTheme(); render(); },
    examdate: () => examDateModal(),
    saveexamdate: () => { const v = (modalRoot.querySelector('#exam-date') || {}).value; if (!v || daysUntil(v) < 0) return; S.examDates = Object.assign({}, S.examDates, { [S.cert]: v }); save(); closeModal(); render(); },
    clearexamdate: () => { if (S.examDates) delete S.examDates[S.cert]; save(); closeModal(); render(); },
    usegoal: d => { S.dailyGoal = +d.g; addXP(0); render(); questToasts(); },
    certificate: () => certificateModal(),
    makecert: () => { const v = ((modalRoot.querySelector('#cert-name') || {}).value || '').trim().slice(0, 40); if (!v) return; S.certName = v; save(); closeModal(); makeCertificate(v); },
    cards: () => startCards(),
    flip: () => { if (FC) { FC.flipped = !FC.flipped; render(); } },
    cardgot: () => cardAnswer(true),
    cardagain: () => cardAnswer(false),
    quitcards: () => { FC = null; save(); go('practice'); },
    reset: () => modal(`${mascot(80, 'shocked')}<h2>${t('reset_q')}</h2><p>${syncRef && account ? t('reset_sub_account') : t('reset_sub_device')}</p>
      <div class="stack"><button class="btn bad" data-act="confirmreset">${t('reset_btn')}</button><button class="btn ghost" data-act="closemodal">${t('cancel')}</button></div>`),
    confirmreset: () => { try { localStorage.removeItem(STORE); } catch { /* ignore */ } S = DEFAULTS(); save(); OB = { cert: null, goal: 20 }; applyTheme(); closeModal(); go('onboard'); },
    signin: () => signInSheet(),
    signinwith: d => signIn(d.p),
    signout: () => modal(`${mascot(80, 'sleep')}<h2>${t('signout_q')}</h2><p>${t('signout_sub')}</p>
      <div class="stack"><button class="btn" data-act="confirmsignout">${t('signout')}</button><button class="btn ghost" data-act="closemodal">${t('cancel')}</button></div>`),
    confirmsignout: () => { closeModal(); if (fb) fb.au.signOut(fb.auth); },
    keepcloud: () => { const c = choice; choice = null; closeModal(); adopt(c.remote); linkSync(c.ref, c.uid, false); },
    // save() stamps this copy as the newest, so other devices pick it up too.
    keepdevice: () => { const c = choice; choice = null; closeModal(); linkSync(c.ref, c.uid, false); save(); },
    obcert: d => { OB.cert = d.c; render(); },
    obgoal: d => { OB.goal = +d.g; render(); },
    // New learners start answering right away: lesson 1 of the first unit.
    obstart: () => { if (!OB.cert) return; CH = null; S.cert = OB.cert; S.dailyGoal = OB.goal; save(); track('cert'); startLesson(course().units[0].id, 'lesson'); },
    tourgo: () => { closeModal(); startTour(); },
    tourno: () => { try { localStorage.setItem(TOUR_KEY, '1'); } catch { /* ignore */ } closeModal(); },
    obplace: () => { if (!OB.cert) return; S.cert = OB.cert; S.dailyGoal = OB.goal; save(); track('cert'); startPlacement(); },
    placement: () => startPlacement(),
    domainpractice: d => { const us = String(d.us || '').split(',').filter(u => UNITS[u]); if (us.length) startSession('practice', pickQuestions(us.flatMap(u => UNITS[u].questions), 10), us.length === 1 ? us[0] : null); },
  };

  function toggleMulti(oi) {
    if (L.checked) return;
    const need = L.q.a.length;
    if (L.multi.includes(oi)) L.multi = L.multi.filter(x => x !== oi);
    else L.multi = (L.multi.length >= need ? L.multi.slice(1) : L.multi).concat(oi);
    render();
  }

  document.addEventListener('click', e => {
    if (hintOpen && !e.target.closest('.hint, .hintpop')) closeHint();
    if (e.target.matches('[data-overlay]')) { if (!modalRoot.querySelector('.modal.sticky')) closeModal(); return; }
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    if (el.dataset.act === 'hint') { showHint(el); return; }
    const fn = actions[el.dataset.act];
    if (fn) fn(el.dataset);
  });

  document.addEventListener('change', e => {
    if (e.target && e.target.id === 'remind-hour') setReminder(remind.on, +e.target.value);
  });

  document.addEventListener('keydown', e => {
    if (modalRoot.innerHTML) { if (e.key === 'Escape' && !modalRoot.querySelector('.modal.sticky')) closeModal(); return; }
    if (hintOpen && e.key === 'Escape') { closeHint(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('.hint')) return; // let the hint button open
    if (view === 'cards' && FC) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!FC.flipped) actions.flip(); else cardAnswer(true); }
      else if (FC.flipped && e.key === '1') cardAnswer(false);
      else if (FC.flipped && e.key === '2') cardAnswer(true);
      else if (e.key === 'Escape') actions.quitcards();
      return;
    }
    if (view === 'lesson' && L) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (L.checked) next(); else check();
        return;
      }
      const n = parseInt(e.key, 10);
      if (!L.checked && L.order && n >= 1 && n <= L.order.length) {
        const oi = L.order[n - 1];
        if (L.q.t === 'multi') toggleMulti(oi); else { L.sel = oi; render(); }
      }
    } else if (view === 'examRun' && E) {
      const q = QINDEX[E.ids[E.cur]];
      const k = e.key.toUpperCase().charCodeAt(0) - 65;
      if (e.key.length === 1 && k >= 0 && k < E.orders[q.id].length) examAnswer(E.orders[q.id][k]);
      else if (e.key === 'ArrowRight') actions.enext();
      else if (e.key === 'ArrowLeft') actions.eprev();
    }
  });

  // Refresh streak/goal display when the tab regains focus (e.g. after midnight).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    collectLineHandoff();
    applyFreezes();
    if (['learn', 'practice', 'profile', 'exam', 'board'].includes(view)) render();
  });

  applyFreezes();
  applyTheme();
  if (lang === 'th') loadThai();
  render();
  initSync();
  if (view === 'learn') maybeAutoTour();
})();
