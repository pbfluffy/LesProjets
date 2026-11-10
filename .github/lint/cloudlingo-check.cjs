// Checks Cloudlingo's question banks, Thai text and UI strings for mistakes.
// Usage: node .github/lint/cloudlingo-check.cjs <Cloudlingo folder>   (exits 1 when anything is wrong)
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = process.argv[2];
const ctx = { window: {}, console };
ctx.window.window = ctx.window;
vm.createContext(ctx);
const run = f => vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^\(\(\) => \{/, '(() => {'), ctx, { filename: f });
// data.js defines addQuestions on window; expose it globally for the bank files.
run('js/data.js');
ctx.addQuestions = ctx.window.addQuestions || vm.runInContext('typeof addQuestions === "function" ? addQuestions : null', ctx);
for (const f of fs.readdirSync(path.join(dir, 'js/bank'))) run('js/bank/' + f);
if (fs.existsSync(path.join(dir, 'js/why'))) for (const f of fs.readdirSync(path.join(dir, 'js/why'))) run('js/why/' + f);
run('js/glossary.js');
for (const f of fs.readdirSync(path.join(dir, 'js/th'))) run('js/th/' + f);
run('js/i18n.js');
const W = ctx.window;
const issues = [];
const bad = (id, msg) => issues.push(id + ': ' + msg);
const TYPES = ['mc', 'tf', 'multi', 'fill', 'match'];
let total = 0;
const texts = new Map();
for (const c of W.COURSES) {
  let n = 0;
  for (const u of c.units) {
    if (!u.domain || !/^Domains? /.test(u.domain)) bad(u.id, 'odd domain label ' + u.domain);
    u.questions.forEach((q, i) => {
      const id = u.id + '-' + i; n++; total++;
      if (!TYPES.includes(q.t)) bad(id, 'unknown type ' + q.t);
      if (!q.q || q.q.trim().length < 8) bad(id, 'question text missing/short');
      if (!q.e || q.e.trim().length < 10) bad(id, 'explanation missing/short');
      const key = q.q.trim().toLowerCase();
      if (texts.has(key)) bad(id, 'duplicate question text of ' + texts.get(key)); else texts.set(key, id);
      if (q.t === 'mc' || q.t === 'fill' || q.t === 'multi') {
        if (!Array.isArray(q.o) || q.o.length < 2) bad(id, 'needs options');
        else {
          const low = q.o.map(o => String(o).trim().toLowerCase());
          if (new Set(low).size !== low.length) bad(id, 'duplicate options ' + JSON.stringify(q.o));
          if (q.o.some(o => !String(o).trim())) bad(id, 'empty option');
        }
      }
      if (q.t === 'mc' || q.t === 'fill') { if (!Number.isInteger(q.a) || q.a < 0 || q.a >= (q.o || []).length) bad(id, 'answer index out of range ' + q.a); }
      if (q.t === 'fill' && !/_{3,}/.test(q.q)) bad(id, 'fill question has no ___ blank');
      if (q.t === 'multi') {
        if (!Array.isArray(q.a) || q.a.length < 2) bad(id, 'multi needs 2+ answers');
        else if (q.a.some(a => !Number.isInteger(a) || a < 0 || a >= q.o.length) || new Set(q.a).size !== q.a.length) bad(id, 'multi answers invalid ' + JSON.stringify(q.a));
        const m = q.q.match(/\b(TWO|THREE|FOUR)\b/);
        const want = m ? { TWO: 2, THREE: 3, FOUR: 4 }[m[1]] : null;
        if (want && Array.isArray(q.a) && q.a.length !== want) bad(id, `says ${m[1]} but has ${q.a.length} answers`);
        if (!want) bad(id, 'multi question does not say how many to pick');
      }
      if (q.t === 'tf') { if (typeof q.a !== 'boolean' && q.a !== 0 && q.a !== 1) bad(id, 'tf answer not boolean ' + q.a); }
      if (q.t === 'match') {
        if (!Array.isArray(q.pairs) || q.pairs.length < 3) bad(id, 'match needs 3+ pairs');
        else {
          if (q.pairs.some(p => !Array.isArray(p) || p.length !== 2 || !p[0] || !p[1])) bad(id, 'bad pair');
          const L = q.pairs.map(p => String(p[0]).toLowerCase()), R = q.pairs.map(p => String(p[1]).toLowerCase());
          if (new Set(L).size !== L.length || new Set(R).size !== R.length) bad(id, 'duplicate match sides');
        }
      }
      if (/\s{2,}/.test(q.q.replace(/\n/g, ' '))) bad(id, 'double space in question');
      if (/\bundefined\b|\bTODO\b|\bFIXME\b/i.test(JSON.stringify(q))) bad(id, 'placeholder text');
      // Thai explanation
      if (!(W.TH_EXPLAIN && W.TH_EXPLAIN[id])) bad(id, 'no Thai explanation');
    });
  }
  console.log(`${c.code} ${c.name}: ${n} questions in ${c.units.length} units`);
  if (n < 100) bad(c.id, 'fewer than 100 questions: ' + n);
  if (!c.exam || !c.exam.pass) bad(c.id, 'exam settings missing');
}
// Thai explanations that point at questions that no longer exist
const ids = new Set(W.COURSES.flatMap(c => c.units.flatMap(u => u.questions.map((q, i) => u.id + '-' + i))));
for (const k of Object.keys(W.TH_EXPLAIN || {})) if (!ids.has(k)) bad(k, 'Thai explanation for a missing question');
// "Why not" notes: one per option in bank order, empty for right answers, Thai matching English
const QBY = new Map(W.COURSES.flatMap(c => c.units.flatMap(u => u.questions.map((q, i) => [u.id + '-' + i, q]))));
const right = (q, i) => Array.isArray(q.a) ? q.a.includes(i) : q.a === i;
for (const [k, arr] of Object.entries(W.WHY_NOT || {})) {
  const q = QBY.get(k);
  if (!q) { bad(k, 'why-not notes for a missing question'); continue; }
  if (!q.o || !Array.isArray(arr) || arr.length !== q.o.length) { bad(k, 'why-not notes do not match the options'); continue; }
  arr.forEach((n, i) => {
    if (right(q, i) && n) bad(k, 'why-not note on a right answer: ' + q.o[i]);
    if (!right(q, i) && !String(n).trim()) bad(k, 'no why-not note for ' + q.o[i]);
  });
  const th = (W.TH_WHY || {})[k];
  if (!th) bad(k, 'no Thai why-not notes');
  else if (th.length !== arr.length || th.some((n, i) => !!n !== !!arr[i])) bad(k, 'Thai why-not notes do not line up with English');
}
for (const k of Object.keys(W.TH_WHY || {})) if (!(W.WHY_NOT || {})[k]) bad(k, 'Thai why-not notes without English');
// Glossary
const G = W.GLOSSARY || [];
const gk = new Set();
G.forEach(g => { if (!g.k || !g.d) bad('gloss', 'empty entry ' + JSON.stringify(g)); if (gk.has(g.k)) bad('gloss', 'duplicate ' + g.k); gk.add(g.k); if (!(W.TH_GLOSS && W.TH_GLOSS[g.k])) bad('gloss', 'no Thai for ' + g.k); });
// UI strings: every key in English has Thai and vice versa; {placeholders} match
const I = W.I18N;
const en = I.en, th = I.th;
for (const k of Object.keys(en)) {
  if (th[k] == null) { if (!k.endsWith('_one')) bad('i18n', 'missing Thai: ' + k); } // Thai has no singular forms
  else {
    const ph = s => (String(s).match(/\{\w+\}/g) || []).sort().join();
    if (ph(en[k]) !== ph(th[k])) bad('i18n', `placeholders differ for ${k}: ${ph(en[k])} vs ${ph(th[k])}`);
  }
}
for (const k of Object.keys(th)) if (en[k] == null) bad('i18n', 'Thai-only key: ' + k);
// Keys used in app.js that don't exist
const app = fs.readFileSync(path.join(dir, 'js/app.js'), 'utf8');
const used = new Set([...app.matchAll(/\bt\('([a-z0-9_]*[a-z0-9])'/g)].map(m => m[1])); // 'mode_' + x style keys are built at run time
const usedN = new Set([...app.matchAll(/\btn\('([a-z0-9_]+)'/g)].map(m => m[1]));
for (const k of used) if (en[k] == null) bad('i18n', 'app uses unknown key ' + k);
for (const k of usedN) if (en[k + '_other'] == null) bad('i18n', 'app uses unknown plural key ' + k);
console.log('total questions:', total, '| Thai explanations:', Object.keys(W.TH_EXPLAIN || {}).length, '| glossary:', G.length, '| UI strings:', Object.keys(en).length);
console.log(issues.length ? issues.length + ' issue(s):\n' + issues.join('\n') : 'no issues');
if (issues.length) process.exitCode = 1;
