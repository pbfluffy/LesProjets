(() => {
  'use strict';

  // ---------- Constants & helpers ----------
  const COURSES = window.COURSES;
  const app = document.getElementById('app');
  const modalRoot = document.getElementById('modal-root');
  const STORE = 'cloudlingo:v1';
  const LESSONS_PER_UNIT = 3;
  const Q_PER_LESSON = 7;
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
  }
  document.documentElement.lang = lang;
  const blurb = c => (window.I18N_COURSES && I18N_COURSES[lang] && I18N_COURSES[lang][c.id]) || c.blurb;
  const domainLabel = d => lang === 'en' ? d : d.replace(/^Domains?\b/, m => t(m === 'Domains' ? 'domains' : 'domain'));

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
      const fapp = fa.getApps().length ? fa.getApp() : fa.initializeApp(FIREBASE.config);
      fb = { au, fs, auth: au.getAuth(fapp), db: fs.getFirestore(fapp) };
    } catch { authState = 'unavailable'; refresh(); return; }
    fb.au.getRedirectResult(fb.auth).catch(() => { /* handled by onAuthStateChanged */ });
    fb.au.onAuthStateChanged(fb.auth, user => {
      if (unwatch) { unwatch(); unwatch = null; }
      syncRef = null; choice = null;
      if (!user) {
        account = null; authState = 'out';
        try { localStorage.removeItem(UID_KEY); } catch { /* ignore */ }
        refresh(); return;
      }
      account = { uid: user.uid, name: user.displayName || user.email || t('signed_in'), first: (user.displayName || '').trim().split(/\s+/)[0] || '', email: user.email || '', photo: user.photoURL || '', synced: false };
      authState = 'in';
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
    modal(`${mascot(70)}<h2>${t('keep_q')}</h2>
      <p>${t('keep_sub')}</p>
      <div class="stack">
        <button class="btn" data-act="keepcloud">${t('keep_account', { xp: r.xp || 0, s: sessions(r.lessons) })}</button>
        <button class="btn ghost" data-act="keepdevice">${t('keep_device', { xp: S.xp, s: sessions(S.lessons) })}</button>
      </div>`, 'sticky');
  }
  async function signIn() {
    if (!fb && fbLoading) { try { await fbLoading; } catch { /* handled below */ } }
    if (!fb) {
      modal(`${mascot(70, 'sad')}<h2>${t('signin_cant_load')}</h2><p>${t('signin_cant_load_sub')}</p><button class="btn block" data-act="closemodal">${t('ok')}</button>`);
      return;
    }
    const provider = new fb.au.GoogleAuthProvider();
    fb.au.signInWithPopup(fb.auth, provider).catch(e => {
      const code = e && e.code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-environment') fb.au.signInWithRedirect(fb.auth, provider);
      else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request')
        modal(`${mascot(70, 'sad')}<h2>${t('signin_failed')}</h2><p>${t('signin_failed_sub')}</p><button class="btn block" data-act="closemodal">${t('ok')}</button>`);
    });
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
    S.session = L ? { mode: L.mode, unit: L.unit, cert: S.cert, queue: queue || L.queue, total: L.total, done: L.done, missed: [...L.missed], elapsed: Date.now() - L.start } : null;
    save();
  }
  const savedSession = () => {
    const s = S.session;
    return s && s.cert === S.cert && s.queue && s.queue.length && s.queue.every(id => QINDEX[id]) ? s : null;
  };
  const modeName = m => ['lesson', 'replay', 'practice', 'mistakes'].includes(m) ? t('mode_' + m) : t('mode_session');

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

  function addXP(n) {
    applyFreezes();
    const k = dayKey();
    S.xp += n; S.xpByDay[k] = (S.xpByDay[k] || 0) + n;
    let extended = false, earnedFreeze = false;
    if (S.xpByDay[k] >= S.dailyGoal && S.lastStreakDay !== k) {
      S.streak = S.lastStreakDay === dayAgo(1) ? S.streak + 1 : 1;
      S.lastStreakDay = k; extended = true;
      if (S.streak % FREEZE_EVERY === 0 && (S.freezes || 0) < MAX_FREEZES) { S.freezes = (S.freezes || 0) + 1; earnedFreeze = true; }
    }
    save();
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
    return shuffle(shuffle(pool).sort((a, b) => seen(a) - seen(b)).slice(0, n).map(q => q.id));
  }
  const mistakesFor = cid => Object.keys(S.mistakes).filter(id => QINDEX[id] && QINDEX[id].course === cid);

  // ---------- View state ----------
  let view = S.cert ? 'learn' : 'onboard';
  let L = null;       // active lesson/practice session
  let E = null;       // active exam
  let R = null;       // last exam result
  let END = null;     // lesson-complete summary
  let OB = { cert: null, goal: 20 };
  let examTimer = null;

  function applyTheme() {
    if (S.theme === 'light' || S.theme === 'dark') document.documentElement.dataset.theme = S.theme;
    else delete document.documentElement.dataset.theme;
  }

  function go(v) {
    view = v;
    render();
    window.scrollTo(0, 0);
    if (v === 'learn') {
      const cur = document.querySelector('.node.current');
      if (cur) cur.scrollIntoView({ block: 'center' });
    }
  }

  function render() {
    const views = { onboard: onboardView, learn: learnView, practice: practiceView, exam: examView, board: boardView, profile: profileView, lesson: lessonView, lessonEnd: lessonEndView, examRun: examRunView, examResult: examResultView };
    closeHint();
    app.innerHTML = (views[view] || learnView)();
  }

  // ---------- Shared pieces ----------
  function mascot(size = 48, mood = 'happy', cls = '') {
    const mouth = mood === 'sad'
      ? '<path d="M27 46q6-5 12 0" stroke="#1d2b3a" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
      : '<path d="M27 42q6 6 12 0" stroke="#1d2b3a" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    return `<svg class="mascot ${cls}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M18 50h30a12 12 0 0 0 1-24 16 16 0 0 0-31-3 13 13 0 0 0 0 27z" fill="var(--cloud)" stroke="var(--cloud-stroke)" stroke-width="2.6" stroke-linejoin="round"/>
      <circle cx="26" cy="35" r="3.3" fill="#1d2b3a"/><circle cx="40" cy="35" r="3.3" fill="#1d2b3a"/>
      <circle cx="27.2" cy="33.8" r="1" fill="#fff"/><circle cx="41.2" cy="33.8" r="1" fill="#fff"/>
      ${mouth}
      <circle cx="20.5" cy="41" r="2.6" fill="#ff8fa6" opacity=".75"/><circle cx="45.5" cy="41" r="2.6" fill="#ff8fa6" opacity=".75"/>
    </svg>`;
  }

  const navItem = (v, icon, label) =>
    `<button class="navitem ${view === v ? 'active' : ''}" data-act="nav" data-v="${v}" aria-label="${label}"><span class="ico">${icon}</span><span class="lbl">${label}</span></button>`;

  function shell(main) {
    return `<div class="shell">
      <nav class="sidenav">
        <div class="brand">${mascot(38)}<span>cloudlingo</span></div>
        ${navItem('learn', '🏠', t('nav_learn'))}${navItem('practice', '🎯', t('nav_practice'))}${navItem('exam', '📝', t('nav_exam'))}${authState !== 'off' ? navItem('board', '🏆', t('nav_board')) : ''}${navItem('profile', '👤', t('nav_profile'))}
      </nav>
      <main class="main">${topbar()}${main}</main>
      <aside class="rightcol">${rightCol()}</aside>
    </div>`;
  }

  function topbar() {
    const c = course(), st = streakNow();
    return `<div class="topbar">
      <button class="chip certchip" data-act="pickcert" title="${t('switch_cert')}"><span class="code">${c.code}</span><span class="muted small">▾</span></button>
      <div class="topstats">
        <button class="chip flame ${st ? '' : 'cold'}" data-act="nav" data-v="profile" title="${t('day_streak')}">🔥 ${st}</button>
        <button class="chip xp" data-act="nav" data-v="profile" title="${t('total_xp')}">⚡ ${S.xp}</button>${accountChip()}</div>
    </div>`;
  }

  function avatar(size) {
    const initial = esc(((account.name || '?').trim()[0] || '?').toUpperCase());
    return account.photo
      ? `<img class="avatar" src="${esc(account.photo)}" alt="" width="${size}" height="${size}" style="width:${size}px;height:${size}px" referrerpolicy="no-referrer">`
      : `<span class="avatar" style="width:${size}px;height:${size}px">${initial}</span>`;
  }
  function accountChip() {
    if (authState === 'out' || authState === 'loading') return `<button class="signin-btn" data-act="signin" title="${t('signin_title')}">${t('signin')}</button>`;
    if (authState === 'in' && account) return `<button class="chip" data-act="nav" data-v="profile" title="${esc(account.name)}">${avatar(26)}</button>`;
    return '';
  }
  function accountCard() {
    if (authState === 'out' || authState === 'unavailable') return `<div class="card account" style="margin-bottom:16px"><div class="row"><div class="bigicon">☁️</div><div class="grow">
      <h3 style="margin-bottom:2px">${t('save_progress')}</h3><p class="muted small">${authState === 'unavailable' ? t('signin_unavailable') : t('signin_pitch')}</p></div></div>
      ${authState === 'out' ? `<button class="btn block" style="margin-top:14px" data-act="signin">${t('continue_google')}</button>` : ''}</div>`;
    if (authState === 'in' && account) return `<div class="card account" style="margin-bottom:16px"><div class="row">${avatar(44)}<div class="grow">
      <h3 style="margin-bottom:2px">${esc(account.name)}</h3><p class="muted small">${account.error ? t('acct_error') : account.synced ? t('acct_synced') : t('connecting')}</p></div>
      <button class="linkbtn" data-act="signout">${t('signout')}</button></div></div>`;
    return '';
  }

  function goalInner() {
    const today = xpToday(), g = S.dailyGoal, pct = Math.min(100, Math.round(100 * today / g));
    return `<div class="goalrow"><div class="big">🎯</div><div class="grow">
      <div class="row" style="justify-content:space-between;margin-bottom:7px"><strong>${t('daily_goal')}</strong><span class="muted small">${today} / ${g} XP</span></div>
      <div class="progress"><div style="width:${pct}%"></div></div></div></div>`;
  }

  function streakCard() {
    const st = streakNow();
    return `<h3>🔥 ${t('streak_days', { n: st })}</h3><p class="muted small">${st ? (S.lastStreakDay === dayKey() ? t('streak_met') : t('streak_keep')) : t('streak_start')}</p>
      <p class="small freeze-line" title="${t('freezes_how')}">${t('freezes', { n: S.freezes || 0 })}</p>`;
  }
  function freezeNotice() {
    const f = S.freezeNotice;
    if (!f || f.day !== dayKey()) return '';
    return `<div class="card notice"><p>${tn('freeze_used', f.n, { s: f.streak })}</p><button class="linkbtn" data-act="dismissfreeze">${t('dismiss')}</button></div>`;
  }

  function rightCol() {
    const mist = mistakesFor(course().id).length;
    return `<div class="card">${goalInner()}</div>
      <div class="card">${streakCard()}</div>
      ${mist ? `<div class="card"><h3>🧠 ${t('to_review', { n: mist })}</h3><p class="muted small" style="margin-bottom:12px">${t('to_review_sub')}</p><button class="btn ghost block" data-act="mistakes">${t('fix_mistakes')}</button></div>` : ''}`;
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
      <div class="hero">${mascot(96, 'happy', 'bounce')}<div class="speech">${t('nimbus_hi')}</div></div>
      <div class="certlist">${COURSES.map(c => certOption(c, OB.cert === c.id, 'obcert')).join('')}</div>
      <h2 class="section-title" style="font-size:20px;margin-top:30px">${t('pick_goal')}</h2>
      <p class="section-sub">${t('pick_goal_sub')}</p>
      <div class="seg">${GOALS.map(g => `<button class="${OB.goal === g.xp ? 'on' : ''}" data-act="obgoal" data-g="${g.xp}">${t(g.key)}<small>${t('xp_per_day', { n: g.xp })}</small></button>`).join('')}</div>
    </div>
    <div class="fixed-foot"><button class="btn" data-act="obstart" ${OB.cert ? '' : 'disabled'}>${t('start_learning')}</button></div>`;
  }

  // ---------- Learn (path) ----------
  function learnView() {
    const c = course();
    const s = savedSession();
    const resume = s ? `<div class="card resume"><div class="row"><div class="bigicon">⏯️</div><div class="grow"><h3 style="margin-bottom:2px">${t('resume_title')}</h3>
      <p class="muted small">${modeName(s.mode)}${s.unit ? ` · ${esc(UNITS[s.unit].title)}` : ''} · ${t('resume_done', { d: s.done, t: s.total })}</p></div></div>
      <div class="row" style="margin-top:14px"><button class="btn block grow" data-act="resume">${t('continue')}</button><button class="btn ghost" data-act="discard">${t('discard')}</button></div></div>` : '';
    const firstOpen = c.units.findIndex(u => unitDone(u) < LESSONS_PER_UNIT);
    return shell(`${freezeNotice()}<div class="card mobile-only" style="margin-bottom:4px">${goalInner()}</div>${resume}${c.units.map((u, i) => unitBlock(u, i, i === firstOpen)).join('')}
      <div class="card" style="margin-top:34px;text-align:center"><h3>${t('ready_title')}</h3><p class="muted" style="margin-bottom:14px">${t('ready_sub', { code: c.code })}</p><button class="btn ghost" data-act="nav" data-v="exam">${t('try_exam')}</button></div>`);
  }

  function unitBlock(u, i, suggested) {
    const done = unitDone(u);
    const offs = [0, 64, 0, -64];
    const nodes = range(LESSONS_PER_UNIT).map(l => {
      const state = l < done ? 'done' : (l === done ? 'current' : 'locked');
      const icon = state === 'done' ? '✓' : state === 'locked' ? '🔒' : '★';
      const label = esc(t('node_label', { n: l + 1, unit: u.title }) + (state === 'done' ? t('node_done') : state === 'locked' ? t('node_locked') : ''));
      return `<div style="transform:translateX(${offs[(l + i) % 4]}px)"><button class="node ${state} ${state === 'current' && suggested ? 'suggested' : ''}" data-act="node" data-u="${u.id}" data-l="${l}" ${state === 'locked' ? 'disabled' : ''} aria-label="${label}" title="${label}">${state === 'current' && suggested ? `<span class="bubble">${t('start')}</span>` : ''}${icon}</button></div>`;
    });
    const trophyReady = done >= LESSONS_PER_UNIT;
    nodes.push(`<div style="transform:translateX(${offs[(LESSONS_PER_UNIT + i) % 4]}px)"><button class="node trophy ${trophyReady ? 'done' : 'locked'}" data-act="unitpractice" data-u="${u.id}" ${trophyReady ? '' : 'disabled'} aria-label="${esc(t('unit_review'))}: ${esc(u.title)}" title="${t('unit_review')}">🏆</button></div>`);
    return `<section class="unit">
      <div class="unithead unitcolor-${i % 5}">
        <div><div class="kicker">${t('unit_n', { n: i + 1 })} · ${domainLabel(u.domain)}</div><h2>${u.title}</h2><div class="small" style="opacity:.85;margin-top:3px">${t('lessons_done', { d: done, t: LESSONS_PER_UNIT })}</div></div>
        <div class="uicon">${u.icon}</div>
      </div>
      <div class="path">${nodes.join('')}</div>
    </section>`;
  }

  // ---------- Lesson engine ----------
  const isLesson = () => L && (L.mode === 'lesson' || L.mode === 'replay');

  function startLesson(uid, mode) {
    startSession(mode, pickQuestions(UNITS[uid].questions, Q_PER_LESSON), uid);
  }

  function startSession(mode, ids, uid = null) {
    if (!ids.length) return;
    closeModal();
    L = { mode, unit: uid, queue: [...ids], total: ids.length, done: 0, missed: new Set(), start: Date.now() };
    saveSession();
    prepareQ();
    go('lesson');
  }

  function resumeSession() {
    const s = savedSession();
    if (!s) return;
    L = { mode: s.mode, unit: s.unit, queue: [...s.queue], total: s.total, done: s.done, missed: new Set(s.missed), start: Date.now() - (s.elapsed || 0) };
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
      <div class="lesson-top"><button class="x" data-act="quit" aria-label="${t('save_exit')}">✕</button>
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
    if (isMulti) lead = `<span class="box">${cls === 'right' ? '✓' : cls === 'wrong' ? '✕' : selected ? '✓' : ''}</span>`;
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
    const tip = () => !S.hintSeen && seen.size ? `<p class="hint-tip">${t('hint_tip')}</p>` : '';
    if (q.t === 'mc' && q.tf) {
      const title = H(q.q);
      return `${kick(t('tf'))}<div class="qhead">${mascot(44)}<div class="qtitle">${title}</div></div>${tip()}
        <div class="tfgrid">${L.order.map((oi, k) => optBtn(q, oi, k, true)).join('')}</div>`;
    }
    if (q.t === 'mc' || q.t === 'multi') {
      const title = H(q.q);
      return `${kick(q.t === 'multi' ? t('select_n', { n: q.a.length }) : t('choose_best'))}<div class="qhead">${mascot(44)}<div class="qtitle">${title}</div></div>${tip()}
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
    el.innerHTML = `<strong>${esc(g.k)}</strong><span>${esc(g.d)}</span><i class="arrow"></i>`;
    document.body.appendChild(el);
    const r = btn.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.max(12, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 12));
    const below = r.bottom + 10 + h <= innerHeight - 8 || r.top - 10 - h < 8;
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
      <div class="feedback"><div class="badge">${L.ok ? '✅' : '❌'}</div><div>
        <h3>${L.ok ? praise[L.praise % praise.length] : t('not_quite')}</h3>
        ${L.ok ? '' : `<div class="ans">${esc(t('correct_is', { a: correctText(q) }))}</div>`}
        <div class="explain">${esc(q.e)}</div>
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
    if (ok) {
      L.done++;
      L.praise = Math.floor(Math.random() * 6);
      // Clears from the review queue in "Fix mistakes", or when answered right on the first try in a later session.
      if (L.mode === 'mistakes' || !L.missed.has(q.id)) delete S.mistakes[q.id];
    } else {
      L.missed.add(q.id);
      S.mistakes[q.id] = { ts: Date.now() };
    }
    // Save as if Continue was pressed, so leaving now never repeats or loses an answer.
    saveSession(L.queue.slice(1).concat(ok ? [] : [q.id]));
    render();
  }

  function next() {
    if (!L || !L.checked) return;
    const id = L.queue.shift();
    if (!L.ok) L.queue.push(id); // missed questions come back at the end
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

  function finishLesson() {
    const perfect = L.missed.size === 0;
    let xp = (L.mode === 'replay' ? 5 : 10) + (perfect ? 5 : 0);
    if (L.mode === 'lesson' && L.unit) S.progress[L.unit] = (S.progress[L.unit] || 0) + 1;
    S.lessons = (S.lessons || 0) + 1;
    S.session = null;
    const { extended, earnedFreeze } = addXP(xp);
    END = {
      xp, perfect, extended, earnedFreeze, streak: S.streak,
      acc: Math.round(100 * (L.total - L.missed.size) / L.total),
      secs: Math.round((Date.now() - L.start) / 1000),
      unitCompleted: L.mode === 'lesson' && L.unit && S.progress[L.unit] === LESSONS_PER_UNIT ? UNITS[L.unit].title : null,
      mode: L.mode
    };
    L = null;
    save();
    go('lessonEnd');
    confetti();
  }

  function lessonEndView() {
    const e = END;
    const title = e.unitCompleted ? t('unit_complete') : e.perfect ? t('perfect_lesson') : e.mode === 'lesson' || e.mode === 'replay' ? t('lesson_complete') : t('practice_complete');
    const sub = e.unitCompleted ? t('unit_complete_sub', { unit: esc(e.unitCompleted) }) : e.perfect ? t('perfect_sub') : t('missed_saved');
    return `<div class="center-screen">
      ${mascot(130, 'happy', 'bounce')}
      <h1>${title}</h1><p class="muted">${sub}</p>
      <div class="statrow">
        <div class="stat gold"><div class="lbl">${t('xp_earned_lbl')}</div><div class="val">⚡ ${e.xp}</div></div>
        <div class="stat green"><div class="lbl">${t('accuracy')}</div><div class="val">🎯 ${e.acc}%</div></div>
        <div class="stat blue"><div class="lbl">${t('time')}</div><div class="val">⏱ ${fmtTime(e.secs)}</div></div>
      </div>
      ${e.extended ? `<div class="stat flame"><div class="lbl">${t('goal_reached')}</div><div class="val">🔥 ${t('streak_days', { n: e.streak })}</div></div>` : ''}
      ${e.earnedFreeze ? `<div class="stat ice"><div class="val">${t('freeze_earned')}</div><div class="lbl">${t('freezes', { n: S.freezes || 0 })}</div></div>` : ''}
    </div>
    <div class="fixed-foot"><button class="btn" data-act="nav" data-v="learn">${t('continue')}</button></div>`;
  }

  // ---------- Practice ----------
  function practiceView() {
    const c = course(), mist = mistakesFor(c.id);
    const rows = c.units.map(u => {
      const acc = accuracyOf(u.questions);
      return `<div class="card"><div class="row">
        <div class="bigicon" style="font-size:30px;width:52px;height:52px">${u.icon}</div>
        <div class="grow"><strong>${u.title}</strong>
          <div class="progress ${acc.pct == null ? '' : acc.pct >= 80 ? 'green' : 'blue'}" style="height:8px;margin:7px 0 4px"><div style="width:${acc.pct || 0}%"></div></div>
          <span class="muted small">${acc.pct == null ? t('not_practiced') : t('acc_answers', { p: acc.pct, n: acc.seen })}</span></div>
        <button class="btn ghost" data-act="unitpractice" data-u="${u.id}">${t('go')}</button>
      </div></div>`;
    }).join('');
    return shell(`<h1 class="section-title">${t('practice_title')}</h1>
      <p class="section-sub">${t('practice_sub')}</p>
      <div class="stack">
        <div class="card pcard"><div class="row"><div class="bigicon">🧠</div><div class="grow"><h3>${t('fix_title')}</h3><p>${mist.length ? tn('fix_some', mist.length) : t('fix_none')}</p></div></div>
          <button class="btn block" style="margin-top:14px" data-act="mistakes" ${mist.length ? '' : 'disabled'}>${t('review_mistakes')}</button></div>
        <div class="card pcard"><div class="row"><div class="bigicon">⚡</div><div class="grow"><h3>${t('quick_title')}</h3><p>${t('quick_sub')}</p></div></div>
          <button class="btn ghost block" style="margin-top:14px" data-act="quick">${t('start_btn')}</button></div>
        <h2 class="section-title" style="font-size:20px;margin-top:12px">${t('by_topic')}</h2>
        ${rows}
      </div>`);
  }

  function startQuick() {
    const c = course();
    // Mix from units the learner has started, or everything if they haven't started any.
    const started = c.units.filter(u => (S.progress[u.id] || 0) > 0);
    const pool = (started.length ? started : c.units).flatMap(u => u.questions);
    startSession('practice', pickQuestions(pool, 10));
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
  const examPool = c => c.units.reduce((n, u) => n + u.questions.filter(q => q.t !== 'match').length, 0);

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
    return shell(`<h1 class="section-title">${t('exam_title')}</h1>
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
    const byUnit = c.units.map(u => shuffle(u.questions.filter(q => q.t !== 'match')));
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
      const lead = q.t === 'multi' ? `<span class="box">${sel ? '✓' : ''}</span>` : `<span class="num">${String.fromCharCode(65 + k)}</span>`;
      return `<button class="opt ${sel ? 'sel' : ''}" data-act="eopt" data-i="${oi}" aria-pressed="${sel}">${lead}<span>${esc(optText(q, oi))}</span></button>`;
    }).join('');
    const qtext = q.t === 'fill' ? esc(q.q).replace('___', '<span class="blank">&nbsp;</span>') : esc(q.q);
    return `<div class="examtop"><div class="inner">
        <button class="linkbtn" data-act="quitexam">${t('exit')}</button>
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
    modal(`${mascot(70)}<h2>${t('submit_q')}</h2>
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
      return { id, a, ok };
    });
    const correct = items.filter(x => x.ok).length;
    const score = Math.round(100 * correct / items.length);
    const passAt = E.pass || c.exam.pass;
    const pass = score >= passAt;
    const byUnit = c.units.map(u => {
      const its = items.filter(x => QINDEX[x.id].unit === u.id);
      return { title: u.title, icon: u.icon, n: its.length, ok: its.filter(x => x.ok).length };
    }).filter(x => x.n);
    S.exams.push({ cert: c.id, ts: Date.now(), score, pass, mode: E.mode || 'quick' });
    // XP scales with exam length: about 1 XP per 5% on the quick exam, 3x on the full one.
    const xp = Math.max(5, Math.round(score / 5 * (E.mode === 'full' ? 3 : 1)));
    addXP(xp);
    R = { cert: c.id, mode: E.mode || 'quick', passAt, items, correct, score, pass, byUnit, secs: Math.round((Date.now() - E.start) / 1000), xp, showAll: false };
    E = null;
    go('examResult');
    if (pass) confetti();
  }

  function examResultView() {
    const c = COURSES.find(x => x.id === R.cert);
    const list = R.items.filter(x => R.showAll || !x.ok);
    return `<div class="exambody" style="padding-bottom:140px">
      <div style="text-align:center;margin:20px 0 26px">
        ${mascot(110, R.pass ? 'happy' : 'sad', R.pass ? 'bounce' : '')}
        <h1 style="font-size:30px;font-weight:900;margin:12px 0 6px">${R.pass ? t('passed') : t('not_yet')}</h1>
        <p class="muted">${t('exam_result_sub', { code: c.code, p: R.passAt })}</p>
      </div>
      <div class="statrow" style="margin-bottom:24px">
        <div class="stat ${R.pass ? 'green' : 'flame'}"><div class="lbl">${t('score')}</div><div class="val">${R.score}%</div></div>
        <div class="stat blue"><div class="lbl">${t('correct_lbl')}</div><div class="val">${R.correct} / ${R.items.length}</div></div>
        <div class="stat gold"><div class="lbl">${t('xp_earned')}</div><div class="val">⚡ ${R.xp}</div></div>
      </div>
      <div class="card" style="margin-bottom:18px"><h3>${t('by_domain')}</h3>
        ${R.byUnit.map(u => { const p = Math.round(100 * u.ok / u.n); return `<div class="domainbar"><div class="top"><span>${u.icon} ${u.title}</span><span class="muted">${u.ok}/${u.n}</span></div><div class="progress ${p >= R.passAt ? 'green' : ''}" style="height:10px"><div style="width:${p}%"></div></div></div>`; }).join('')}
      </div>
      <div class="row" style="justify-content:space-between;margin:22px 0 12px"><h2 style="font-size:20px;font-weight:900">${R.showAll ? t('all_qs') : t('review_misses')}</h2>
        <button class="linkbtn" data-act="toggleall">${R.showAll ? t('show_misses') : t('show_all')}</button></div>
      <div class="stack">${list.length ? list.map(x => { const q = QINDEX[x.id]; return `
        <div class="card reviewitem ${x.ok ? 'ok' : ''}"><div class="q">${esc(q.q)}</div>
          ${x.ok ? '' : `<div class="a" style="color:var(--bad)">${esc(t('your_answer', { a: answerText(q, x.a) }))}</div>`}
          <div class="a" style="color:var(--good)">${esc(t('correct_is', { a: correctText(q) }))}</div>
          <div class="e">${esc(q.e)}</div></div>`; }).join('') : `<div class="card muted">${t('flawless')}</div>`}</div>
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
    const head = `<h1 class="section-title">🏆 ${t('board_title')}</h1><p class="section-sub">${t('board_sub')}</p>`;
    if (authState !== 'in' || !account) {
      return shell(`${head}<div class="card" style="text-align:center">${mascot(80)}<p style="margin:10px 0 16px">${t('board_signin')}</p>
        ${authState === 'out' || authState === 'loading' ? `<button class="btn" data-act="signin">${t('continue_google')}</button>` : ''}</div>`);
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
      : !rows.length ? `<div class="card muted">${t('board_empty')}</div>`
      : `<div class="card board">${rows.map((r, i) => {
          const me = r.uid === account.uid, medal = ['🥇', '🥈', '🥉'][i] || i + 1;
          const initial = esc(((r.name || '?').trim()[0] || '?').toUpperCase());
          return `<div class="brow ${me ? 'me' : ''}"><span class="rank">${medal}</span><span class="avatar" style="width:34px;height:34px">${initial}</span>
            <span class="grow bname">${esc(r.name || 'Learner')}${me ? ` <span class="pill you">${t('board_you')}</span>` : ''}</span><strong class="bxp">⚡ ${r.xp}</strong></div>`;
        }).join('')}</div>`;
    return shell(`${head}<p class="muted small" style="margin:-8px 0 14px">⏳ ${resets}</p>
      ${hidden ? `<div class="card notice"><p>${t('board_hidden')}</p></div>` : ''}${body}
      <div class="card" style="margin-top:16px"><div class="row"><div class="grow"><strong>${t('board_show')}</strong><p class="muted small">${t('board_show_sub')}</p></div>
        <div class="seg seg2"><button class="${hidden ? '' : 'on'}" data-act="boardvis" data-on="1">${t('board_on')}</button><button class="${hidden ? 'on' : ''}" data-act="boardvis" data-on="0">${t('board_off')}</button></div></div></div>`);
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
    return shell(`${accountCard()}<div class="row" style="margin:6px 0 20px">${mascot(76)}<div><h1 class="section-title" style="margin:0">${t('your_progress')}</h1><p class="muted">${t('studying', { code: c.code, name: c.name })}</p></div></div>
      <div class="tiles">
        <div class="tile-stat"><span class="i">🔥</span><div><div class="v">${streakNow()}</div><div class="l">${t('day_streak')}</div></div></div>
        <div class="tile-stat"><span class="i">⚡</span><div><div class="v">${S.xp}</div><div class="l">${t('total_xp')}</div></div></div>
        <div class="tile-stat"><span class="i">📚</span><div><div class="v">${S.lessons || 0}</div><div class="l">${t('sessions_done')}</div></div></div>
        <div class="tile-stat"><span class="i">🎯</span><div><div class="v">${seen ? Math.round(100 * correct / seen) + '%' : '–'}</div><div class="l">${t('accuracy')}</div></div></div>
      </div>
      <div class="card" style="margin-top:16px">${streakCard()}<p class="muted small" style="margin-top:4px">${t('freezes_how')}</p></div>
      <div class="card" style="margin-top:16px"><h3>${t('this_week')}</h3>
        <div class="week">${days.map((d, k) => { const dt = new Date(d + 'T12:00:00'); return `<div class="bar ${k === 6 ? 'today' : ''}"><span class="n">${vals[k] || ''}</span><div class="fill" style="height:${Math.round(85 * vals[k] / max)}%"></div><span class="d">${dt.toLocaleDateString(locale(), { weekday: 'short' })}</span></div>`; }).join('')}</div>
      </div>
      <div class="card" style="margin-top:16px"><h3>${t('strengths', { code: c.code })}</h3>
        ${domains.length ? domains.map(({ u, acc }) => `<div class="domainbar"><div class="top"><span>${u.icon} ${u.title}</span><span class="muted">${acc.pct}%</span></div><div class="progress ${acc.pct >= 80 ? 'green' : 'blue'}" style="height:10px"><div style="width:${acc.pct}%"></div></div></div>`).join('') : `<p class="muted">${t('strengths_none')}</p>`}
      </div>
      <div class="card" style="margin-top:16px"><h3>${t('certifications')}</h3><div class="certlist">${COURSES.map(x => certOption(x, x.id === c.id, 'setcert')).join('')}</div></div>
      <div class="card" style="margin-top:16px"><h3>${t('daily_goal')}</h3>
        <div class="seg">${GOALS.map(g => `<button class="${S.dailyGoal === g.xp ? 'on' : ''}" data-act="setgoal" data-g="${g.xp}">${t(g.key)}<small>${g.xp} XP</small></button>`).join('')}</div>
      </div>
      <div class="card" style="margin-top:16px"><h3>${t('language')}</h3>${langSwitch()}</div>
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
    dismissfreeze: () => { S.freezeNotice = null; save(); render(); },
    pickcert: () => modal(`<h2>${t('choose_cert')}</h2><p>${t('choose_cert_sub')}</p><div class="certlist">${COURSES.map(c => certOption(c, c.id === S.cert, 'setcert')).join('')}</div>`, 'wide'),
    setcert: d => { S.cert = d.c; save(); closeModal(); go(view === 'profile' ? 'profile' : 'learn'); },
    closemodal: () => closeModal(),
    node: d => { const u = UNITS[d.u]; startLesson(d.u, +d.l < unitDone(u) ? 'replay' : 'lesson'); },
    unitpractice: d => startSession('practice', pickQuestions(UNITS[d.u].questions, 8), d.u),
    quick: () => startQuick(),
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
    quitexam: () => modal(`${mascot(70, 'sad')}<h2>${t('exit_exam_q')}</h2><p>${t('exit_exam_sub')}</p>
      <div class="stack"><button class="btn" data-act="closemodal">${t('keep_going')}</button><button class="btn ghost" style="color:var(--bad)" data-act="confirmquitexam">${t('exit_exam')}</button></div>`),
    confirmquitexam: () => { clearInterval(examTimer); E = null; closeModal(); go('exam'); },
    toggleall: () => { R.showAll = !R.showAll; render(); },
    setgoal: d => { S.dailyGoal = +d.g; addXP(0); render(); },
    settheme: d => { S.theme = d.t; save(); applyTheme(); render(); },
    reset: () => modal(`${mascot(70, 'sad')}<h2>${t('reset_q')}</h2><p>${syncRef && account ? t('reset_sub_account') : t('reset_sub_device')}</p>
      <div class="stack"><button class="btn bad" data-act="confirmreset">${t('reset_btn')}</button><button class="btn ghost" data-act="closemodal">${t('cancel')}</button></div>`),
    confirmreset: () => { try { localStorage.removeItem(STORE); } catch { /* ignore */ } S = DEFAULTS(); save(); OB = { cert: null, goal: 20 }; applyTheme(); closeModal(); go('onboard'); },
    signin: () => signIn(),
    signout: () => modal(`${mascot(70)}<h2>${t('signout_q')}</h2><p>${t('signout_sub')}</p>
      <div class="stack"><button class="btn" data-act="confirmsignout">${t('signout')}</button><button class="btn ghost" data-act="closemodal">${t('cancel')}</button></div>`),
    confirmsignout: () => { closeModal(); if (fb) fb.au.signOut(fb.auth); },
    keepcloud: () => { const c = choice; choice = null; closeModal(); adopt(c.remote); linkSync(c.ref, c.uid, false); },
    // save() stamps this copy as the newest, so other devices pick it up too.
    keepdevice: () => { const c = choice; choice = null; closeModal(); linkSync(c.ref, c.uid, false); save(); },
    obcert: d => { OB.cert = d.c; render(); },
    obgoal: d => { OB.goal = +d.g; render(); },
    obstart: () => { if (!OB.cert) return; S.cert = OB.cert; S.dailyGoal = OB.goal; save(); go('learn'); }
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

  document.addEventListener('keydown', e => {
    if (modalRoot.innerHTML) { if (e.key === 'Escape' && !modalRoot.querySelector('.modal.sticky')) closeModal(); return; }
    if (hintOpen && e.key === 'Escape') { closeHint(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('.hint')) return; // let the hint button open
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
    applyFreezes();
    if (['learn', 'practice', 'profile', 'exam', 'board'].includes(view)) render();
  });

  applyFreezes();
  applyTheme();
  render();
  initSync();
})();
