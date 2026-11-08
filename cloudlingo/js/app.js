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
    { xp: 10, name: 'Casual' }, { xp: 20, name: 'Regular' },
    { xp: 30, name: 'Serious' }, { xp: 50, name: 'Intense' }
  ];
  const PRAISE = ['Nice!', 'Great job!', 'Correct!', 'You got it!', 'Excellent!', 'Spot on!'];

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
      account = { uid: user.uid, name: user.displayName || user.email || 'Signed in', email: user.email || '', photo: user.photoURL || '', synced: false };
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
    refresh();
  }
  function askChoice() {
    const r = JSON.parse(choice.remote.state);
    const sessions = n => `${n || 0} session${n === 1 ? '' : 's'}`;
    modal(`${mascot(70)}<h2>Which progress should we keep?</h2>
      <p>Your account and this device both have Cloudlingo progress. Pick one; the other is replaced.</p>
      <div class="stack">
        <button class="btn" data-act="keepcloud">☁️ Account · ⚡ ${r.xp || 0} XP · ${sessions(r.lessons)}</button>
        <button class="btn ghost" data-act="keepdevice">📱 This device · ⚡ ${S.xp} XP · ${sessions(S.lessons)}</button>
      </div>`, 'sticky');
  }
  async function signIn() {
    if (!fb && fbLoading) { try { await fbLoading; } catch { /* handled below */ } }
    if (!fb) {
      modal(`${mascot(70, 'sad')}<h2>Sign-in can't load</h2><p>Check your connection and try again. Your progress is still saved on this device.</p><button class="btn block" data-act="closemodal">OK</button>`);
      return;
    }
    const provider = new fb.au.GoogleAuthProvider();
    fb.au.signInWithPopup(fb.auth, provider).catch(e => {
      const code = e && e.code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-environment') fb.au.signInWithRedirect(fb.auth, provider);
      else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request')
        modal(`${mascot(70, 'sad')}<h2>Sign-in didn't work</h2><p>Please try again. Your progress is still saved on this device.</p><button class="btn block" data-act="closemodal">OK</button>`);
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
  const MODE_NAMES = { lesson: 'Lesson', replay: 'Lesson replay', practice: 'Practice', mistakes: 'Mistake review' };

  function addXP(n) {
    const k = dayKey();
    S.xp += n; S.xpByDay[k] = (S.xpByDay[k] || 0) + n;
    let extended = false;
    if (S.xpByDay[k] >= S.dailyGoal && S.lastStreakDay !== k) {
      S.streak = S.lastStreakDay === dayAgo(1) ? S.streak + 1 : 1;
      S.lastStreakDay = k; extended = true;
    }
    save();
    return extended;
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
    const views = { onboard: onboardView, learn: learnView, practice: practiceView, exam: examView, profile: profileView, lesson: lessonView, lessonEnd: lessonEndView, examRun: examRunView, examResult: examResultView };
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
        ${navItem('learn', '🏠', 'Learn')}${navItem('practice', '🎯', 'Practice')}${navItem('exam', '📝', 'Mock exam')}${navItem('profile', '👤', 'Profile')}
      </nav>
      <main class="main">${topbar()}${main}</main>
      <aside class="rightcol">${rightCol()}</aside>
    </div>`;
  }

  function topbar() {
    const c = course(), st = streakNow();
    return `<div class="topbar">
      <button class="chip certchip" data-act="pickcert" title="Switch certification"><span class="code">${c.code}</span><span class="muted small">▾</span></button>
      <div class="topstats">
        <button class="chip flame ${st ? '' : 'cold'}" data-act="nav" data-v="profile" title="Day streak">🔥 ${st}</button>
        <button class="chip xp" data-act="nav" data-v="profile" title="Total XP">⚡ ${S.xp}</button>${accountChip()}</div>
    </div>`;
  }

  function avatar(size) {
    const initial = esc(((account.name || '?').trim()[0] || '?').toUpperCase());
    return account.photo
      ? `<img class="avatar" src="${esc(account.photo)}" alt="" width="${size}" height="${size}" style="width:${size}px;height:${size}px" referrerpolicy="no-referrer">`
      : `<span class="avatar" style="width:${size}px;height:${size}px">${initial}</span>`;
  }
  function accountChip() {
    if (authState === 'out' || authState === 'loading') return `<button class="signin-btn" data-act="signin" title="Sign in to save progress across devices">Sign in</button>`;
    if (authState === 'in' && account) return `<button class="chip" data-act="nav" data-v="profile" title="${esc(account.name)}">${avatar(26)}</button>`;
    return '';
  }
  function accountCard() {
    if (authState === 'out' || authState === 'unavailable') return `<div class="card account" style="margin-bottom:16px"><div class="row"><div class="bigicon">☁️</div><div class="grow">
      <h3 style="margin-bottom:2px">Save your progress</h3><p class="muted small">${authState === 'unavailable' ? "Sign-in can't load right now. Your progress is saved on this device." : 'Sign in to keep your progress safe and continue on any device.'}</p></div></div>
      ${authState === 'out' ? '<button class="btn block" style="margin-top:14px" data-act="signin">Continue with Google</button>' : ''}</div>`;
    if (authState === 'in' && account) return `<div class="card account" style="margin-bottom:16px"><div class="row">${avatar(44)}<div class="grow">
      <h3 style="margin-bottom:2px">${esc(account.name)}</h3><p class="muted small">${account.error ? "⚠️ Couldn't reach your account. Progress is saved on this device." : account.synced ? '✓ Progress saved to your account' : 'Connecting…'}</p></div>
      <button class="linkbtn" data-act="signout">Sign out</button></div></div>`;
    return '';
  }

  function goalInner() {
    const t = xpToday(), g = S.dailyGoal, pct = Math.min(100, Math.round(100 * t / g));
    return `<div class="goalrow"><div class="big">🎯</div><div class="grow">
      <div class="row" style="justify-content:space-between;margin-bottom:7px"><strong>Daily goal</strong><span class="muted small">${t} / ${g} XP</span></div>
      <div class="progress"><div style="width:${pct}%"></div></div></div></div>`;
  }

  function rightCol() {
    const st = streakNow(), mist = mistakesFor(course().id).length;
    return `<div class="card">${goalInner()}</div>
      <div class="card"><h3>🔥 ${st} day streak</h3><p class="muted small">${st ? (S.lastStreakDay === dayKey() ? 'Goal met today. See you tomorrow!' : 'Reach your daily goal today to keep it going.') : 'Reach your daily goal to start a streak.'}</p></div>
      ${mist ? `<div class="card"><h3>🧠 ${mist} to review</h3><p class="muted small" style="margin-bottom:12px">Questions you missed come back until you get them right.</p><button class="btn ghost block" data-act="mistakes">Fix mistakes</button></div>` : ''}`;
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
      <div class="grow"><h3>${c.name} · ${c.level}</h3><p>${c.blurb}</p>
      ${done ? `<div class="progress blue" style="height:8px;margin-top:8px"><div style="width:${Math.round(100 * done / total)}%"></div></div>` : ''}</div>
    </button>`;
  }

  // ---------- Onboarding ----------
  function onboardView() {
    return `<div class="onboard">
      ${authState === 'out' || authState === 'loading' ? '<div class="card ob-signin"><span>☁️ Studied here before?</span><button class="signin-btn" data-act="signin">Sign in</button></div>' : ''}
      <div class="hero">${mascot(96, 'happy', 'bounce')}<div class="speech">Hi, I'm Nimbus! Which AWS certification are we studying for?</div></div>
      <div class="certlist">${COURSES.map(c => certOption(c, OB.cert === c.id, 'obcert')).join('')}</div>
      <h2 class="section-title" style="font-size:20px;margin-top:30px">Pick a daily goal</h2>
      <p class="section-sub">You can change this anytime in your profile.</p>
      <div class="seg">${GOALS.map(g => `<button class="${OB.goal === g.xp ? 'on' : ''}" data-act="obgoal" data-g="${g.xp}">${g.name}<small>${g.xp} XP/day</small></button>`).join('')}</div>
    </div>
    <div class="fixed-foot"><button class="btn" data-act="obstart" ${OB.cert ? '' : 'disabled'}>Start learning</button></div>`;
  }

  // ---------- Learn (path) ----------
  function learnView() {
    const c = course();
    const s = savedSession();
    const resume = s ? `<div class="card resume"><div class="row"><div class="bigicon">⏯️</div><div class="grow"><h3 style="margin-bottom:2px">Pick up where you left off</h3>
      <p class="muted small">${MODE_NAMES[s.mode] || 'Session'}${s.unit ? ` · ${esc(UNITS[s.unit].title)}` : ''} · ${s.done} of ${s.total} done</p></div></div>
      <div class="row" style="margin-top:14px"><button class="btn block grow" data-act="resume">Continue</button><button class="btn ghost" data-act="discard">Discard</button></div></div>` : '';
    const firstOpen = c.units.findIndex(u => unitDone(u) < LESSONS_PER_UNIT);
    return shell(`<div class="card mobile-only" style="margin-bottom:4px">${goalInner()}</div>${resume}${c.units.map((u, i) => unitBlock(u, i, i === firstOpen)).join('')}
      <div class="card" style="margin-top:34px;text-align:center"><h3>Ready for the real thing?</h3><p class="muted" style="margin-bottom:14px">Take a timed mock exam across every domain of ${c.code}.</p><button class="btn ghost" data-act="nav" data-v="exam">Try a mock exam</button></div>`);
  }

  function unitBlock(u, i, suggested) {
    const done = unitDone(u);
    const offs = [0, 64, 0, -64];
    const nodes = range(LESSONS_PER_UNIT).map(l => {
      const state = l < done ? 'done' : (l === done ? 'current' : 'locked');
      const icon = state === 'done' ? '✓' : state === 'locked' ? '🔒' : '★';
      const label = `Lesson ${l + 1} of ${u.title}${state === 'done' ? ' (completed, replay)' : state === 'locked' ? ' (finish the previous lesson first)' : ''}`;
      return `<div style="transform:translateX(${offs[(l + i) % 4]}px)"><button class="node ${state} ${state === 'current' && suggested ? 'suggested' : ''}" data-act="node" data-u="${u.id}" data-l="${l}" ${state === 'locked' ? 'disabled' : ''} aria-label="${label}" title="${label}">${state === 'current' && suggested ? '<span class="bubble">START</span>' : ''}${icon}</button></div>`;
    });
    const trophyReady = done >= LESSONS_PER_UNIT;
    nodes.push(`<div style="transform:translateX(${offs[(LESSONS_PER_UNIT + i) % 4]}px)"><button class="node trophy ${trophyReady ? 'done' : 'locked'}" data-act="unitpractice" data-u="${u.id}" ${trophyReady ? '' : 'disabled'} aria-label="Unit review: ${u.title}" title="Unit review">🏆</button></div>`);
    return `<section class="unit">
      <div class="unithead unitcolor-${i % 5}">
        <div><div class="kicker">Unit ${i + 1} · ${u.domain}</div><h2>${u.title}</h2><div class="small" style="opacity:.85;margin-top:3px">${done} / ${LESSONS_PER_UNIT} lessons</div></div>
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
      <div class="lesson-top"><button class="x" data-act="quit" aria-label="Save and exit">✕</button>
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
    return `<button class="opt ${cls}" data-act="${isMulti ? 'toggle' : 'pick'}" data-i="${oi}" ${L.checked ? 'disabled' : ''} aria-pressed="${selected}">${plain ? '' : lead}<span>${esc(q.o[oi])}</span></button>`;
  }

  function renderQ(q) {
    const tag = L.missed.has(q.id) && !L.checked ?'<span class="tag">Previous mistake</span>' : '';
    const kick = t => `<div class="kicker2">${t}${tag}</div>`;
    if (q.t === 'mc' && q.tf) {
      return `${kick('True or false?')}<div class="qhead">${mascot(44)}<div class="qtitle">${esc(q.q)}</div></div>
        <div class="tfgrid">${L.order.map((oi, k) => optBtn(q, oi, k, true)).join('')}</div>`;
    }
    if (q.t === 'mc' || q.t === 'multi') {
      return `${kick(q.t === 'multi' ? `Select ${q.a.length}` : 'Choose the best answer')}<div class="qhead">${mascot(44)}<div class="qtitle">${esc(q.q)}</div></div>
        <div class="opts">${L.order.map((oi, k) => optBtn(q, oi, k)).join('')}</div>`;
    }
    if (q.t === 'fill') {
      const [before, after = ''] = q.q.split('___');
      const cls = L.checked ? (L.ok ? 'right' : 'wrong') : (L.sel != null ? 'filled' : '');
      const blank = `<span class="blank ${cls}">${L.sel != null ? esc(q.o[L.sel]) : '&nbsp;'}</span>`;
      return `${kick('Fill in the blank')}<div class="sentence">${esc(before)}${blank}${esc(after)}</div>
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
    return `${kick('Tap the matching pairs')}<div class="qtitle">${esc(q.q)}</div>
      <div class="match"><div class="col">${L.lefts.map(i => tile('l', i)).join('')}</div><div class="col">${L.rights.map(i => tile('r', i)).join('')}</div></div>`;
  }

  function correctText(q) {
    if (q.t === 'multi') return q.a.map(i => q.o[i]).join(' + ');
    if (q.t === 'match') return q.pairs.map(p => `${p[0]} → ${p[1]}`).join(' · ');
    return q.o[q.a];
  }

  const lessonReady = q => q.t === 'multi' ? L.multi.length === q.a.length : L.sel != null;

  function lessonFoot(q) {
    if (!L.checked) {
      if (q.t === 'match') {
        return `<footer class="lesson-foot"><div class="foot-inner"><span class="muted">Tap a term on the left, then its match on the right.</span><button class="btn ghost skipbtn" data-act="skip">Skip</button></div></footer>`;
      }
      return `<footer class="lesson-foot"><div class="foot-inner">
        <button class="btn ghost skipbtn" data-act="skip">Skip</button>
        <button class="btn good" data-act="check" ${lessonReady(q) ? '' : 'disabled'}>Check</button>
      </div></footer>`;
    }
    return `<footer class="lesson-foot ${L.ok ? 'good' : 'bad'}" aria-live="polite"><div class="foot-inner">
      <div class="feedback"><div class="badge">${L.ok ? '✅' : '❌'}</div><div>
        <h3>${L.ok ? L.praise : 'Not quite'}</h3>
        ${L.ok ? '' : `<div class="ans">Correct: ${esc(correctText(q))}</div>`}
        <div class="explain">${esc(q.e)}</div>
      </div></div>
      <button class="btn ${L.ok ? 'good' : 'bad'}" data-act="continue">Continue</button>
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
      L.praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
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
    const extended = addXP(xp);
    END = {
      xp, perfect, extended, streak: S.streak,
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
    const title = e.unitCompleted ? 'Unit complete!' : e.perfect ? 'Perfect lesson!' : e.mode === 'lesson' || e.mode === 'replay' ? 'Lesson complete!' : 'Practice complete!';
    const sub = e.unitCompleted ? `You finished “${esc(e.unitCompleted)}”. Its 🏆 review is now open.` : e.perfect ? 'No mistakes. Bonus XP earned.' : 'Missed questions are saved to Practice so you can review them.';
    return `<div class="center-screen">
      ${mascot(130, 'happy', 'bounce')}
      <h1>${title}</h1><p class="muted">${sub}</p>
      <div class="statrow">
        <div class="stat gold"><div class="lbl">Total XP</div><div class="val">⚡ ${e.xp}</div></div>
        <div class="stat green"><div class="lbl">Accuracy</div><div class="val">🎯 ${e.acc}%</div></div>
        <div class="stat blue"><div class="lbl">Time</div><div class="val">⏱ ${fmtTime(e.secs)}</div></div>
      </div>
      ${e.extended ? `<div class="stat flame"><div class="lbl">Daily goal reached</div><div class="val">🔥 ${e.streak} day streak</div></div>` : ''}
    </div>
    <div class="fixed-foot"><button class="btn" data-act="nav" data-v="learn">Continue</button></div>`;
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
          <span class="muted small">${acc.pct == null ? 'Not practiced yet' : `${acc.pct}% accuracy · ${acc.seen} answers`}</span></div>
        <button class="btn ghost" data-act="unitpractice" data-u="${u.id}">Go</button>
      </div></div>`;
    }).join('');
    return shell(`<h1 class="section-title">Practice</h1>
      <p class="section-sub">Practice as much as you like. Missed questions come back here until you get them right.</p>
      <div class="stack">
        <div class="card pcard"><div class="row"><div class="bigicon">🧠</div><div class="grow"><h3>Fix your mistakes</h3><p>${mist.length ? `${mist.length} question${mist.length > 1 ? 's' : ''} you missed. Get each one right to clear it.` : 'Nothing to fix right now. Nice work!'}</p></div></div>
          <button class="btn block" style="margin-top:14px" data-act="mistakes" ${mist.length ? '' : 'disabled'}>Review mistakes</button></div>
        <div class="card pcard"><div class="row"><div class="bigicon">⚡</div><div class="grow"><h3>Quick practice</h3><p>10 mixed questions from the units you've started.</p></div></div>
          <button class="btn ghost block" style="margin-top:14px" data-act="quick">Start</button></div>
        <h2 class="section-title" style="font-size:20px;margin-top:12px">Practice by topic</h2>
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
  function examView() {
    const c = course();
    const past = S.exams.filter(e => e.cert === c.id).slice(-5).reverse();
    return shell(`<h1 class="section-title">Mock exam</h1>
      <p class="section-sub">Timed questions across every domain. You won't see answers until you submit.</p>
      <div class="card">
        <div class="row">${certBadge(c)}
          <div class="grow"><h3 style="margin-bottom:2px">${c.name} · ${c.level}</h3><p class="muted">${c.exam.questions} questions · ${c.exam.minutes} minutes · pass at ${c.exam.pass}%</p></div></div>
        <p class="muted small" style="margin:14px 0 16px;line-height:1.45">The real ${c.code} exam has 65 questions and is scored from 100 to 1000. This shorter version fits a daily routine. Missed questions go to your Practice queue.</p>
        <button class="btn block" data-act="startexam">Start exam</button>
      </div>
      ${past.length ? `<h2 class="section-title" style="font-size:20px;margin-top:24px">Recent attempts</h2><div class="stack">${past.map(e => `
        <div class="card row" style="padding:14px 18px"><div class="grow"><strong>${e.score}%</strong> <span class="muted small">· ${new Date(e.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div>
        <span class="pill ${e.pass ? 'pass' : 'fail'}">${e.pass ? 'PASS' : 'NOT YET'}</span></div>`).join('')}</div>` : ''}`);
  }

  function startExam() {
    const c = course();
    const byUnit = c.units.map(u => shuffle(u.questions.filter(q => q.t !== 'match')));
    const ids = [];
    for (let k = 0; ids.length < c.exam.questions && byUnit.some(a => a.length); k++) {
      const a = byUnit[k % byUnit.length];
      if (a.length) ids.push(a.pop().id);
    }
    E = { cert: c.id, ids: shuffle(ids), ans: {}, flags: [], cur: 0, start: Date.now(), end: Date.now() + c.exam.minutes * 60000, orders: {} };
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
      return `<button class="opt ${sel ? 'sel' : ''}" data-act="eopt" data-i="${oi}" aria-pressed="${sel}">${lead}<span>${esc(q.o[oi])}</span></button>`;
    }).join('');
    const qtext = q.t === 'fill' ? esc(q.q).replace('___', '<span class="blank">&nbsp;</span>') : esc(q.q);
    return `<div class="examtop"><div class="inner">
        <button class="linkbtn" data-act="quitexam">✕ Exit</button>
        <strong>${c.code} · ${i + 1} / ${n}</strong>
        <span class="timer ${left < 120000 ? 'low' : ''}" id="timer">${fmtTime(left / 1000)}</span>
      </div></div>
      <div class="exambody">
        <div class="palette">${E.ids.map((_, k) => `<button class="${isAnswered(k) ? 'ans' : ''} ${k === i ? 'cur' : ''} ${E.flags.includes(k) ? 'flag' : ''}" data-act="goto" data-i="${k}" aria-label="Question ${k + 1}">${k + 1}</button>`).join('')}</div>
        <div class="kicker2">${q.t === 'multi' ? `Select ${q.a.length}` : q.tf ? 'True or false?' : 'Choose one'}${flagged ? '<span class="tag" style="background:#fff1e0;color:var(--flame)">Flagged</span>' : ''}</div>
        <div class="qtitle">${qtext}</div>
        <div class="opts">${opts}</div>
      </div>
      <div class="fixed-foot">
        <button class="btn ghost" data-act="eprev" ${i === 0 ? 'disabled' : ''}>Back</button>
        <button class="btn ghost" data-act="eflag">${flagged ? 'Unflag' : 'Flag'}</button>
        ${i < n - 1 ? '<button class="btn" data-act="enext">Next</button>' : '<button class="btn good" data-act="esubmit">Submit</button>'}
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
    modal(`${mascot(70)}<h2>Submit exam?</h2>
      <p>${unanswered ? `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. They'll be marked wrong.` : 'You answered every question. Ready to see your score?'}</p>
      <div class="stack"><button class="btn good" data-act="confirmsubmit">Submit</button><button class="btn ghost" data-act="closemodal">Keep working</button></div>`);
  }

  const answerText = (q, a) => {
    if (a == null || (Array.isArray(a) && !a.length)) return 'No answer';
    return Array.isArray(a) ? a.map(i => q.o[i]).join(' + ') : q.o[a];
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
    const pass = score >= c.exam.pass;
    const byUnit = c.units.map(u => {
      const its = items.filter(x => QINDEX[x.id].unit === u.id);
      return { title: u.title, icon: u.icon, n: its.length, ok: its.filter(x => x.ok).length };
    }).filter(x => x.n);
    S.exams.push({ cert: c.id, ts: Date.now(), score, pass });
    const xp = Math.max(5, Math.round(score / 5));
    addXP(xp);
    R = { cert: c.id, items, correct, score, pass, byUnit, secs: Math.round((Date.now() - E.start) / 1000), xp, showAll: false };
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
        <h1 style="font-size:30px;font-weight:900;margin:12px 0 6px">${R.pass ? 'You passed!' : 'Not quite there yet'}</h1>
        <p class="muted">${c.code} mock exam · passing score ${c.exam.pass}%</p>
      </div>
      <div class="statrow" style="margin-bottom:24px">
        <div class="stat ${R.pass ? 'green' : 'flame'}"><div class="lbl">Score</div><div class="val">${R.score}%</div></div>
        <div class="stat blue"><div class="lbl">Correct</div><div class="val">${R.correct} / ${R.items.length}</div></div>
        <div class="stat gold"><div class="lbl">XP earned</div><div class="val">⚡ ${R.xp}</div></div>
      </div>
      <div class="card" style="margin-bottom:18px"><h3>By domain</h3>
        ${R.byUnit.map(u => { const p = Math.round(100 * u.ok / u.n); return `<div class="domainbar"><div class="top"><span>${u.icon} ${u.title}</span><span class="muted">${u.ok}/${u.n}</span></div><div class="progress ${p >= c.exam.pass ? 'green' : ''}" style="height:10px"><div style="width:${p}%"></div></div></div>`; }).join('')}
      </div>
      <div class="row" style="justify-content:space-between;margin:22px 0 12px"><h2 style="font-size:20px;font-weight:900">${R.showAll ? 'All questions' : 'Review your misses'}</h2>
        <button class="linkbtn" data-act="toggleall">${R.showAll ? 'Show misses only' : 'Show all'}</button></div>
      <div class="stack">${list.length ? list.map(x => { const q = QINDEX[x.id]; return `
        <div class="card reviewitem ${x.ok ? 'ok' : ''}"><div class="q">${esc(q.q)}</div>
          ${x.ok ? '' : `<div class="a" style="color:var(--bad)">Your answer: ${esc(answerText(q, x.a))}</div>`}
          <div class="a" style="color:var(--good)">Correct: ${esc(correctText(q))}</div>
          <div class="e">${esc(q.e)}</div></div>`; }).join('') : '<div class="card muted">No misses. Flawless!</div>'}</div>
    </div>
    <div class="fixed-foot"><button class="btn ghost" data-act="nav" data-v="exam">Done</button><button class="btn" data-act="startexam">Retake</button></div>`;
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
    return shell(`${accountCard()}<div class="row" style="margin:6px 0 20px">${mascot(76)}<div><h1 class="section-title" style="margin:0">Your progress</h1><p class="muted">Studying ${c.code} · ${c.name}</p></div></div>
      <div class="tiles">
        <div class="tile-stat"><span class="i">🔥</span><div><div class="v">${streakNow()}</div><div class="l">Day streak</div></div></div>
        <div class="tile-stat"><span class="i">⚡</span><div><div class="v">${S.xp}</div><div class="l">Total XP</div></div></div>
        <div class="tile-stat"><span class="i">📚</span><div><div class="v">${S.lessons || 0}</div><div class="l">Sessions done</div></div></div>
        <div class="tile-stat"><span class="i">🎯</span><div><div class="v">${seen ? Math.round(100 * correct / seen) + '%' : '–'}</div><div class="l">Accuracy</div></div></div>
      </div>
      <div class="card" style="margin-top:16px"><h3>This week</h3>
        <div class="week">${days.map((d, k) => { const dt = new Date(d + 'T12:00:00'); return `<div class="bar ${k === 6 ? 'today' : ''}"><span class="n">${vals[k] || ''}</span><div class="fill" style="height:${Math.round(85 * vals[k] / max)}%"></div><span class="d">${dt.toLocaleDateString(undefined, { weekday: 'short' })}</span></div>`; }).join('')}</div>
      </div>
      <div class="card" style="margin-top:16px"><h3>Strengths in ${c.code}</h3>
        ${domains.length ? domains.map(({ u, acc }) => `<div class="domainbar"><div class="top"><span>${u.icon} ${u.title}</span><span class="muted">${acc.pct}%</span></div><div class="progress ${acc.pct >= 80 ? 'green' : 'blue'}" style="height:10px"><div style="width:${acc.pct}%"></div></div></div>`).join('') : '<p class="muted">Answer a few questions to see which domains you\'ve mastered.</p>'}
      </div>
      <div class="card" style="margin-top:16px"><h3>Certifications</h3><div class="certlist">${COURSES.map(x => certOption(x, x.id === c.id, 'setcert')).join('')}</div></div>
      <div class="card" style="margin-top:16px"><h3>Daily goal</h3>
        <div class="seg">${GOALS.map(g => `<button class="${S.dailyGoal === g.xp ? 'on' : ''}" data-act="setgoal" data-g="${g.xp}">${g.name}<small>${g.xp} XP</small></button>`).join('')}</div>
      </div>
      <div class="card" style="margin-top:16px"><h3>Appearance</h3>
        <div class="seg" style="grid-template-columns:repeat(3,1fr)">${['auto', 'light', 'dark'].map(t => `<button class="${S.theme === t ? 'on' : ''}" data-act="settheme" data-t="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
      </div>
      <div style="text-align:center;margin-top:22px"><button class="linkbtn" style="color:var(--bad)" data-act="reset">Reset all progress</button></div>`);
  }

  // ---------- Events ----------
  const actions = {
    nav: d => go(d.v),
    pickcert: () => modal(`<h2>Choose a certification</h2><p>Progress is saved for each one.</p><div class="certlist">${COURSES.map(c => certOption(c, c.id === S.cert, 'setcert')).join('')}</div>`, 'wide'),
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
    startexam: () => startExam(),
    eopt: d => examAnswer(+d.i),
    eprev: () => { if (E.cur > 0) { E.cur--; render(); } },
    enext: () => { if (E.cur < E.ids.length - 1) { E.cur++; render(); } },
    goto: d => { E.cur = +d.i; render(); },
    eflag: () => { E.flags = E.flags.includes(E.cur) ? E.flags.filter(x => x !== E.cur) : E.flags.concat(E.cur); render(); },
    esubmit: () => askSubmit(),
    confirmsubmit: () => submitExam(),
    quitexam: () => modal(`${mascot(70, 'sad')}<h2>Exit the exam?</h2><p>This attempt won't be scored.</p>
      <div class="stack"><button class="btn" data-act="closemodal">Keep going</button><button class="btn ghost" style="color:var(--bad)" data-act="confirmquitexam">Exit exam</button></div>`),
    confirmquitexam: () => { clearInterval(examTimer); E = null; closeModal(); go('exam'); },
    toggleall: () => { R.showAll = !R.showAll; render(); },
    setgoal: d => { S.dailyGoal = +d.g; addXP(0); render(); },
    settheme: d => { S.theme = d.t; save(); applyTheme(); render(); },
    reset: () => modal(`${mascot(70, 'sad')}<h2>Reset all progress?</h2><p>This clears your XP, streak, lessons, and exam history ${syncRef && account ? 'on this device and in your account' : 'on this device'}. It can't be undone.</p>
      <div class="stack"><button class="btn bad" data-act="confirmreset">Reset everything</button><button class="btn ghost" data-act="closemodal">Cancel</button></div>`),
    confirmreset: () => { try { localStorage.removeItem(STORE); } catch { /* ignore */ } S = DEFAULTS(); save(); OB = { cert: null, goal: 20 }; applyTheme(); closeModal(); go('onboard'); },
    signin: () => signIn(),
    signout: () => modal(`${mascot(70)}<h2>Sign out?</h2><p>Your progress stays on this device and in your account. This also signs you out of the other apps on this site.</p>
      <div class="stack"><button class="btn" data-act="confirmsignout">Sign out</button><button class="btn ghost" data-act="closemodal">Cancel</button></div>`),
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
    if (e.target.matches('[data-overlay]')) { if (!modalRoot.querySelector('.modal.sticky')) closeModal(); return; }
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.act];
    if (fn) fn(el.dataset);
  });

  document.addEventListener('keydown', e => {
    if (modalRoot.innerHTML) { if (e.key === 'Escape' && !modalRoot.querySelector('.modal.sticky')) closeModal(); return; }
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
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ['learn', 'practice', 'profile', 'exam'].includes(view)) render(); });

  applyTheme();
  render();
  initSync();
})();
