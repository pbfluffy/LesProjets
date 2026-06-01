/* ============================================================================
   Pumba & Co. — Pixel Virtual Office · logic
   Forked from Pum's Office (studio). Adds: day/night theme toggle, bilingual
   TH/EN, click-to-assign tasks, layout switcher, plus the ambient scene,
   telemetry, day-phase dial, EQ visualizer, live work-log & Web-Audio music.
   ============================================================================ */

const ASSET = { pumba:'assets/corgi.png', gigi:'assets/floof.png' };
const IMG_W = 1402, IMG_H = 1122;
const pct = (v,t) => v/t*100;

/* ── Crew config (bilingual roles + task pools) ──────────────────────────── */
const DOGS = {
  Pumba: { roleKey:'roleP', cv:'--pumba', box:[408,418,642,700], plate:{x:36.3,y:63.7},
    tasks:[
      {en:'reviewing pull requests', th:'รีวิว pull request'},
      {en:'grooming the backlog',     th:'จัดระเบียบ backlog'},
      {en:'planning the sprint',      th:'วางแผน sprint'},
      {en:'unblocking the team',      th:'ปลดบล็อกให้ทีม'},
      {en:'sniffing out the root cause', th:'ดมหาต้นตอของบั๊ก'},
      {en:'shipping the release',     th:'ปล่อยรีลีส'} ] },
  Gigi:  { roleKey:'roleG', cv:'--gigi', box:[893,415,1132,702], plate:{x:76.0,y:63.6},
    tasks:[
      {en:'writing test cases',   th:'เขียนเคสทดสอบ'},
      {en:'chasing a flaky test', th:'ไล่จับเทสต์ที่ไม่นิ่ง'},
      {en:'filing a bug report',  th:'แจ้งบั๊ก'},
      {en:'running regression',   th:'รัน regression'},
      {en:'sniffing out edge cases', th:'ดมหาเคสขอบ'},
      {en:'verifying the fix',    th:'ยืนยันการแก้บั๊ก'} ] }
};
const SCRIPTED_POOL = {
  Pumba: [{en:'herding stray tickets',th:'ไล่ต้อนทิคเก็ตหลง'},{en:'burying tech debt',th:'ฝังหนี้ทางเทคนิค'},{en:'wagging through standup',th:'กระดิกหางใน standup'},{en:'rescoping the milestone',th:'ปรับขอบเขต milestone'},{en:'rounding up reviewers',th:'รวบรวมคนรีวิว'},{en:'marking the release',th:'ทำเครื่องหมายรีลีส'}],
  Gigi:  [{en:'retracing a flaky test',th:'ไล่ดูเทสต์ที่ไม่นิ่ง'},{en:'gnawing on a regex',th:'แทะ regex'},{en:'cache-sniffing the API',th:'ดมแคชของ API'},{en:'treeing a null pointer',th:'ไล่จับ null pointer'},{en:'fetching fresh metrics',th:'คาบ metric ใหม่มา'},{en:'reproducing the crash',th:'ทำให้แครชซ้ำ'}]
};
const AMBIENT = {
  lamps:[ {x:20.3,y:39.7,w:13},{x:87.7,y:41.7,w:12} ],
  screens:[ {x:20.0,y:48.6,w:16,h:13,c:'rgba(150,200,255,0.9)'},{x:77.7,y:54.5,w:13,h:10,c:'rgba(150,200,255,0.9)'} ],
  window:{x:1.7,y:4,w:15.3,h:26}
};

/* ── i18n ────────────────────────────────────────────────────────────────── */
const T = {
  en:{ sub:"the office is open · everyone's working", lbl_status:"Status", lbl_session:"Session", lbl_tasks:"Tasks logged", lbl_np:"Now playing",
    working:"Working", paused:"Paused", onshift:"2 of 2 on shift", napping:"napping", sessionSub:"since the office opened", elapsed:"elapsed",
    tasksSub:"work-log entries today", silent:"— silent —", stageTitle:"The Office", crew:"Crew", worklog:"Work Log", onShiftMeta:"2 on shift",
    src_scripted:"scripted", src_live:"live · AI", src_fresh:"fresh · scripted", pause:"Pause", resume:"Resume", music:"Music", on:"on", off:"off",
    livelog:"Live log", lay_console:"Console", lay_theater:"Stage", lay_den:"Den", tm_assign:"Assign a task", tm_custom:"Custom task…",
    tm_treat:"Give a treat 🦴", tm_promptCustom:"What should they work on?", boot:"booting up…",
    footnote:"your art, untouched · click a dog to assign work · pumba & co.",
    roleP:"Technical Lead", roleG:"QA Engineer", metaWorking:"working", metaPaused:"paused",
    logOpened:"Office opened. Good code, good dogs.", logPaused:"Scene paused — everyone takes a nap.", logResumed:"Back to work.",
    logAskAI:"Asking the AI for fresh tasks…", logAIok:"Live tasks loaded ✦", logAIfail:"Live AI unavailable here — shuffled in fresh scripted tasks.", logTreat:"got a treat",
    logLiveOff:"Live log off — back to the house tasks.", lang_en:"EN", lang_th:"TH", t_auto:"Auto", t_day:"Day", t_night:"Night" },
  th:{ sub:"ออฟฟิศเปิดแล้ว · ทุกคนกำลังทำงาน", lbl_status:"สถานะ", lbl_session:"เซสชัน", lbl_tasks:"งานที่บันทึก", lbl_np:"กำลังเล่น",
    working:"กำลังทำงาน", paused:"หยุดชั่วคราว", onshift:"เข้าเวร 2 จาก 2", napping:"กำลังงีบ", sessionSub:"ตั้งแต่เปิดออฟฟิศ", elapsed:"ผ่านไป",
    tasksSub:"รายการงานวันนี้", silent:"— เงียบ —", stageTitle:"ออฟฟิศ", crew:"ทีมงาน", worklog:"บันทึกงาน", onShiftMeta:"เข้าเวร 2",
    src_scripted:"สคริปต์", src_live:"สด · AI", src_fresh:"ใหม่ · สคริปต์", pause:"หยุด", resume:"ทำต่อ", music:"เพลง", on:"เปิด", off:"ปิด",
    livelog:"บันทึกสด", lay_console:"คอนโซล", lay_theater:"เวที", lay_den:"มุมทำงาน", tm_assign:"มอบหมายงาน", tm_custom:"กำหนดเอง…",
    tm_treat:"ให้ขนม 🦴", tm_promptCustom:"ให้ทำงานอะไรดี?", boot:"กำลังบูต…",
    footnote:"ภาพของคุณ ไม่ถูกแตะต้อง · คลิกที่หมาเพื่อมอบงาน · pumba & co.",
    roleP:"หัวหน้าทีมเทคนิค", roleG:"วิศวกร QA", metaWorking:"กำลังทำงาน", metaPaused:"หยุด",
    logOpened:"เปิดออฟฟิศแล้ว โค้ดดี หมาดี", logPaused:"หยุดฉาก — ทุกคนงีบสักครู่", logResumed:"กลับมาทำงาน",
    logAskAI:"กำลังขอ AI หางานใหม่…", logAIok:"โหลดงานสดแล้ว ✦", logAIfail:"AI สดใช้ไม่ได้ที่นี่ — สุ่มงานสคริปต์ใหม่แทน", logTreat:"ได้ขนม",
    logLiveOff:"ปิดบันทึกสด — กลับไปงานประจำ", lang_en:"EN", lang_th:"TH", t_auto:"อัตโนมัติ", t_day:"กลางวัน", t_night:"กลางคืน" }
};
const LS = { lang:'pco.lang', time:'pco.time', layout:'pco.layout' };
let lang = localStorage.getItem(LS.lang) || 'th';
function tr(k){ return (T[lang] && T[lang][k]!==undefined) ? T[lang][k] : (T.en[k]||k); }
function taskText(t){ return typeof t==='string' ? t : (t[lang]||t.en); }

/* ── refs ────────────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const stage=$('stage'), feed=$('feed'), crewEl=$('crew'), meta=$('meta'), logsrc=$('logsrc');
let running=true, taskCount=0, liveOn=false;
const ORIGINAL_TASKS = { Pumba:DOGS.Pumba.tasks.slice(), Gigi:DOGS.Gigi.tasks.slice() };
const startTime = Date.now();
const state = { task:{}, timers:[] };
const AMB_SEL = '.lamp,.screen,.glow,.window-fx,.mote';

/* ── build ambient layers ────────────────────────────────────────────────── */
const win = AMBIENT.window;
const wfx = document.createElement('div'); wfx.className='window-fx run';
wfx.style.left=win.x+'%'; wfx.style.top=win.y+'%'; wfx.style.width=win.w+'%'; wfx.style.height=win.h+'%';
stage.appendChild(wfx);
AMBIENT.lamps.forEach((l,i)=>{ const el=document.createElement('div'); el.className='lamp run';
  el.style.left=l.x+'%'; el.style.top=l.y+'%'; el.style.width=l.w+'%'; el.style.aspectRatio='1/1'; el.style.animationDelay=(i*-2.2)+'s'; stage.appendChild(el); });
AMBIENT.screens.forEach((s,i)=>{ const el=document.createElement('div'); el.className='screen run';
  el.style.left=s.x+'%'; el.style.top=s.y+'%'; el.style.width=s.w+'%'; el.style.height=s.h+'%';
  el.style.background='radial-gradient(circle, '+s.c+', transparent 65%)'; el.style.animationDelay=(i*-0.4)+'s'; stage.appendChild(el); });

/* ── build dogs (clickable) ──────────────────────────────────────────────── */
for (const [name,d] of Object.entries(DOGS)) {
  const [x0,y0,x1,y1]=d.box;
  const wrap=document.createElement('div'); wrap.className='dog breathe'; wrap.id='dog-'+name;
  wrap.style.setProperty('--c','var('+d.cv+')');
  wrap.style.left=pct(x0,IMG_W)+'%'; wrap.style.top=pct(y0,IMG_H)+'%'; wrap.style.width=pct(x1-x0,IMG_W)+'%';
  wrap.style.animationDelay=(name==='Gigi'?'-1.6s':'0s');
  wrap.innerHTML=`<div class="dog-fx" id="fx-${name}"><img src="${ASSET[name.toLowerCase()]}" alt="${name}"><div class="dog-paws"><img src="${ASSET[name.toLowerCase()]}" alt=""></div></div><div class="dog-hit"></div>`;
  wrap.addEventListener('click',e=>{ e.stopPropagation(); openMenu(name); });
  stage.appendChild(wrap);
  const g=document.createElement('div'); g.className='glow run'; g.id='glow-'+name;
  const gw=(x1-x0)*0.7, gx=x0+(x1-x0)*0.15, gy=y0+(y1-y0)*0.05;
  g.style.left=pct(gx,IMG_W)+'%'; g.style.top=pct(gy,IMG_H)+'%'; g.style.width=pct(gw,IMG_W)+'%'; g.style.height=pct(gw*0.8,IMG_H)+'%';
  g.style.background='radial-gradient(circle, var('+d.cv+'), transparent 65%)'; stage.appendChild(g);
  const chip=document.createElement('div'); chip.className='chip'; chip.id='chip-'+name; chip.style.setProperty('--c','var('+d.cv+')');
  chip.style.left=pct(x0+(x1-x0)*0.5,IMG_W)+'%'; chip.style.top=pct(y0-6,IMG_H)+'%';
  chip.innerHTML='<span class="blink"></span><span id="chiptxt-'+name+'"></span>'; stage.appendChild(chip);
  const plate=document.createElement('div'); plate.className='deskplate'; plate.id='plate-'+name;
  plate.style.left=d.plate.x+'%'; plate.style.top=d.plate.y+'%';
  plate.innerHTML=`<div class="dp-name">${name} <span class="dp-paw">🐾</span></div><div class="dp-role" id="prole-${name}">${tr(d.roleKey)}</div>`;
  stage.appendChild(plate);
}

/* ── dust motes ──────────────────────────────────────────────────────────── */
for (let i=0;i<16;i++){ const m=document.createElement('div'); m.className='mote run';
  const size=1.4+Math.random()*2.2; m.style.width=size+'px'; m.style.height=size+'px';
  m.style.left=(4+Math.random()*92)+'%'; m.style.top=(30+Math.random()*65)+'%';
  m.style.animationDuration=(7+Math.random()*9)+'s'; m.style.animationDelay=(-Math.random()*12)+'s';
  if (Math.random()<0.4) m.style.background='rgba(143,227,136,.6)'; stage.appendChild(m); }

/* ── crew rows ───────────────────────────────────────────────────────────── */
for (const [name,d] of Object.entries(DOGS)) {
  const row=document.createElement('div'); row.className='crew'; row.id='crew-'+name; row.style.setProperty('--c','var('+d.cv+')');
  row.innerHTML=`<div class="crew-av"><img src="${ASSET[name.toLowerCase()]}" alt=""></div>
    <div class="crew-info">
      <div class="crew-top"><span class="crew-dot" style="color:var(${d.cv})"></span><span class="crew-name" style="color:var(${d.cv})">${name}</span><span class="crew-assign" id="cassign-${name}">${tr('tm_assign')}</span></div>
      <div class="crew-role" id="crole-${name}">${tr(d.roleKey)}</div>
      <div class="crew-task" id="task-${name}" style="color:var(${d.cv})">${tr('boot')}</div>
    </div>`;
  row.addEventListener('click',e=>{ e.stopPropagation(); openMenu(name); });
  crewEl.appendChild(row);
}

/* ── work-log ────────────────────────────────────────────────────────────── */
function now(){ return new Date().toTimeString().slice(0,5); }
function esc(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); } // BUG-22: escape dynamic text injected via innerHTML
function logEv(cv,text){
  const c = cv ? 'var('+cv+')' : '';
  const el=document.createElement('div'); el.className='ev';
  el.innerHTML=`<div class="ev-time">${now()}</div><div class="ev-mark" style="${c?`background:${c}`:''}"></div><div class="ev-body" style="${c?`color:${c}`:''}">${text}</div>`;
  feed.appendChild(el); feed.scrollTop=feed.scrollHeight;
  while(feed.children.length>60) feed.removeChild(feed.firstChild);
}
function bumpTasks(){ taskCount++; const v=$('tasksVal'); if(v) v.textContent=taskCount; }

/* ── task rendering + cycle ──────────────────────────────────────────────── */
function renderDog(name){
  const t=state.task[name]; if(!t) return;
  $('task-'+name).textContent=taskText(t);
  $('chiptxt-'+name).textContent=taskText(t).split(' ').slice(0,2).join(' ');
}
function setTask(name,taskObj,silent){
  state.task[name]=taskObj; renderDog(name);
  if(!silent){ logEv(DOGS[name].cv, `<b>${name}</b> — ${esc(taskText(taskObj))}`); bumpTasks(); }
  const fx=$('fx-'+name); fx.classList.add('type');
  const t=setTimeout(()=>fx.classList.remove('type'), 2200+Math.random()*1500); state.timers.push(t);
}
function cycle(name){
  if(!running) return;
  const d=DOGS[name]; const task=d.tasks[Math.floor(Math.random()*d.tasks.length)];
  if(task!==state.task[name]) setTask(name,task);
  const t=setTimeout(()=>cycle(name), 4500+Math.random()*4000); state.timers.push(t);
}
function tween(name,cls,dur){ const d=$('fx-'+name); d.classList.add(cls); const t=setTimeout(()=>d.classList.remove(cls),dur); state.timers.push(t); }
function flourish(){
  if(!running) return;
  const names=Object.keys(DOGS); const n=names[Math.floor(Math.random()*names.length)]; const fx=$('fx-'+n);
  if(!fx.classList.contains('type')){ if(Math.random()<0.5) tween(n,'tilt',2400); else tween(n,'perk',1100); }
  const t=setTimeout(flourish, 3500+Math.random()*4000); state.timers.push(t);
}

/* ── task-assign popover ─────────────────────────────────────────────────── */
let menuEl=null, menuFor=null;
function closeMenu(){ if(menuEl){ menuEl.classList.remove('open'); const m=menuEl; setTimeout(()=>{ if(m&&m.parentNode) m.remove(); },180); menuEl=null; } if(menuFor){ const s=$('dog-'+menuFor); if(s) s.classList.remove('sel'); menuFor=null; } }
function openMenu(name){
  if(menuFor===name){ closeMenu(); return; }
  closeMenu(); menuFor=name; $('dog-'+name).classList.add('sel');
  const d=DOGS[name];
  const m=document.createElement('div'); m.className='taskmenu'; m.style.setProperty('--c','var('+d.cv+')');
  const items=d.tasks.map((t,i)=>`<button class="tm-item" data-i="${i}">${taskText(t)}</button>`).join('');
  m.innerHTML=`<div class="tm-head"><div class="tm-av"><img src="${ASSET[name.toLowerCase()]}" alt=""></div>
      <div><div class="tm-name" style="color:var(${d.cv})">${name}</div><div class="tm-role">${tr(d.roleKey)}</div></div></div>
    <div class="tm-list">${items}</div>
    <div class="tm-foot"><button class="tm-btn" id="tmCustom">${tr('tm_custom')}</button><button class="tm-btn treat" id="tmTreat">${tr('tm_treat')}</button></div>`;
  stage.appendChild(m);
  // position near the dog
  const [x0,y0,x1,y1]=d.box;
  const cx=pct(x0+(x1-x0)*0.5,IMG_W); let left=cx; const top=pct(y0,IMG_H);
  m.style.left=Math.min(Math.max(left,16),84)+'%'; m.style.top=top+'%'; m.style.transform='translate(-50%,0)';
  requestAnimationFrame(()=>{ m.classList.add('open'); });
  menuEl=m;
  m.querySelectorAll('.tm-item').forEach(b=>b.addEventListener('click',e=>{ e.stopPropagation(); setTask(name, d.tasks[+b.dataset.i]); closeMenu(); }));
  m.querySelector('#tmCustom').addEventListener('click',e=>{ e.stopPropagation(); const v=prompt(tr('tm_promptCustom')); if(v&&v.trim()){ setTask(name,{en:v.trim(),th:v.trim()}); } closeMenu(); });
  m.querySelector('#tmTreat').addEventListener('click',e=>{ e.stopPropagation(); giveTreat(name); closeMenu(); });
}
document.addEventListener('click',()=>closeMenu());
function giveTreat(name){
  const fx=$('fx-'+name); fx.classList.remove('type'); tween(name,'perk',1100);
  const d=DOGS[name]; const [x0,y0,x1,y1]=d.box;
  const t=document.createElement('div'); t.className='treat'; t.textContent='🦴';
  t.style.left=pct(x0+(x1-x0)*0.5,IMG_W)+'%'; t.style.top=pct(y0+8,IMG_H)+'%';
  stage.appendChild(t); setTimeout(()=>t.remove(),1300);
  logEv(d.cv, `<b>${name}</b> ${tr('logTreat')} 🦴`); bumpTasks();
}

/* ── clock · date · weather · session ────────────────────────────────────── */
const WDAY=['SUN','MON','TUE','WED','THU','FRI','SAT'];
const MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
let wx='';
function dateStr(){ const d=new Date(); return 'BKK · '+WDAY[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()]+wx; }
async function loadWeather(){
  try{ const r=await fetch('https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m');
    const j=await r.json(); const t=j&&j.current&&j.current.temperature_2m;
    if(typeof t==='number'){ wx=' · '+Math.round(t)+'°C'; $('date').textContent=dateStr(); } }catch(e){}
}
loadWeather(); setInterval(loadWeather,600000);
function pad2(n){ return (n<10?'0':'')+n; }
function tick(){
  $('clock').textContent=now(); $('date').textContent=dateStr();
  if(timeMode==='auto'){ const _w=resolveTime(); if(document.body.getAttribute('data-time')!==_w) document.body.setAttribute('data-time',_w); } // BUG-21: Auto follows the clock
  const s=Math.floor((Date.now()-startTime)/1000);
  const hh=Math.floor(s/3600), mm=Math.floor((s%3600)/60), ss=s%60;
  const txt=hh>0 ? hh+':'+pad2(mm)+':'+pad2(ss) : pad2(mm)+':'+pad2(ss);
  const sv=$('sessionVal'); if(sv) sv.innerHTML=txt+'<span class="u">'+tr('elapsed')+'</span>';
}
setInterval(tick,1000);

/* ── run / pause ─────────────────────────────────────────────────────────── */
function setStatus(){ const w=running; $('statusVal').textContent=w?tr('working'):tr('paused');
  $('statusSub').textContent=w?tr('onshift'):tr('napping'); meta.textContent=w?tr('metaWorking'):tr('metaPaused'); }
function start(){
  running=true; setStatus();
  document.querySelectorAll(AMB_SEL).forEach(e=>e.classList.add('run'));
  Object.keys(DOGS).forEach((n,i)=>{ const t=setTimeout(()=>cycle(n),i*900); state.timers.push(t); $('dog-'+n).classList.add('breathe'); $('chip-'+n).style.opacity='1'; });
  const f=setTimeout(flourish,3000); state.timers.push(f);
}
function stop(){
  running=false; setStatus();
  state.timers.forEach(t=>clearTimeout(t)); state.timers=[];
  document.querySelectorAll(AMB_SEL).forEach(e=>e.classList.remove('run'));
  Object.keys(DOGS).forEach(n=>{ $('dog-'+n).classList.remove('breathe'); $('fx-'+n).classList.remove('type','tilt','perk'); $('chip-'+n).style.opacity='.4'; });
}
$('toggleBtn').addEventListener('click',()=>{
  if(running){ stop(); $('toggleBtn').innerHTML=`<span class="ic">▶</span> <span class="lbl">${tr('resume')}</span>`; logEv(null,tr('logPaused')); }
  else { start(); $('toggleBtn').innerHTML=`<span class="ic">⏸</span> <span class="lbl">${tr('pause')}</span>`; logEv(null,tr('logResumed')); }
});
document.addEventListener('visibilitychange',()=>{
  const amb=document.querySelectorAll(AMB_SEL);
  if(document.hidden){ amb.forEach(e=>e.classList.remove('run')); Object.keys(DOGS).forEach(n=>{ $('dog-'+n).classList.remove('breathe'); $('fx-'+n).classList.remove('type','tilt','perk'); }); }
  else if(running){ amb.forEach(e=>e.classList.add('run')); Object.keys(DOGS).forEach(n=>$('dog-'+n).classList.add('breathe')); }
});

/* ── live work-log (Claude when available) ───────────────────────────────── */
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function scriptedFresh(){ return { Pumba:shuffle(SCRIPTED_POOL.Pumba).slice(0,6), Gigi:shuffle(SCRIPTED_POOL.Gigi).slice(0,6) }; }
function applyFreshTasks(parsed,srcKey){
  DOGS.Pumba.tasks=parsed.Pumba; DOGS.Gigi.tasks=parsed.Gigi;
  logsrc.textContent=tr(srcKey); logsrc.classList.toggle('live', srcKey==='src_live');
  if(srcKey==='src_live') logsrc.innerHTML='<i></i>'+tr('src_live');
  const fresh=[];
  for(let i=0;i<6;i++){ if(parsed.Pumba[i]) fresh.push({name:'Pumba',task:parsed.Pumba[i]}); if(parsed.Gigi[i]) fresh.push({name:'Gigi',task:parsed.Gigi[i]}); }
  fresh.forEach((e,idx)=>{ const t=setTimeout(()=>{ logEv(DOGS[e.name].cv,`<b>${e.name}</b> — ${esc(taskText(e.task))}`); bumpTasks(); }, 600+idx*1100); state.timers.push(t); });
}
async function generateLiveLog(){
  logEv(null,tr('logAskAI'));
  const prompt='Two dog coworkers at a cozy late-night software studio. Pumba (a corgi) is the Technical Lead, Gigi (a Thai Bangkaew) is the QA Engineer. Return ONLY valid JSON (no markdown) shaped exactly as {"Pumba":[...],"Gigi":[...]} where each array has 6 short present-tense work activities, 3-6 words each, playful and a little dog-themed but about real software work.';
  if(window.claude && typeof window.claude.complete==='function'){
    try{ let text=await window.claude.complete(prompt); text=String(text).replace(/```json|```/g,'').trim();
      const m=text.match(/\{[\s\S]*\}/); const parsed=JSON.parse(m?m[0]:text);
      if(Array.isArray(parsed.Pumba)&&parsed.Pumba.length&&Array.isArray(parsed.Gigi)&&parsed.Gigi.length){ parsed.Pumba=parsed.Pumba.map(s=>({en:s,th:s})); parsed.Gigi=parsed.Gigi.map(s=>({en:s,th:s})); applyFreshTasks(parsed,'src_live'); logEv(null,tr('logAIok')); return true; }
    }catch(err){}
  }
  applyFreshTasks(scriptedFresh(),'src_fresh'); logEv(null,tr('logAIfail')); return false;
}
async function toggleLiveLog(){
  liveOn=!liveOn; const btn=$('aiBtn');
  if(liveOn){ btn.classList.add('on'); btn.innerHTML=`<span class="ic">✦</span> <span class="lbl">${tr('livelog')}: ${tr('on')}</span>`; await generateLiveLog(); }
  else { DOGS.Pumba.tasks=ORIGINAL_TASKS.Pumba.slice(); DOGS.Gigi.tasks=ORIGINAL_TASKS.Gigi.slice();
    btn.classList.remove('on'); btn.innerHTML=`<span class="ic">✦</span> <span class="lbl">${tr('livelog')}: ${tr('off')}</span>`;
    logsrc.textContent=tr('src_scripted'); logsrc.classList.remove('live'); logEv(null,tr('logLiveOff')); }
}
$('aiBtn').addEventListener('click',toggleLiveLog);

/* ── day-phase dial (decorative; advances while running) ──────────────────── */
let dayPhase=0, lastTs=performance.now(); const DIAL_R=17;
function phaseGlyph(p){ if(p<0.12) return '🌇'; if(p<0.50) return '🌙'; if(p<0.66) return '🌌'; if(p<0.86) return '🌅'; return '🌇'; }
function dialLoop(t){
  const dt=t-lastTs; lastTs=t; if(running) dayPhase=(dayPhase+dt/48000)%1;
  const theta=dayPhase*2*Math.PI-Math.PI/2; const dot=$('dialDot');
  if(dot) dot.style.transform=`translate(${Math.cos(theta)*DIAL_R}px, ${Math.sin(theta)*DIAL_R}px)`;
  const gl=$('dialGlyph'); const g=phaseGlyph(dayPhase); if(gl&&gl.textContent!==g) gl.textContent=g;
  requestAnimationFrame(dialLoop);
}
requestAnimationFrame(dialLoop);

/* ── EQ bars ─────────────────────────────────────────────────────────────── */
const EQ_N=16; const eqEl=$('eq'); const eqBars=[];
for(let i=0;i<EQ_N;i++){ const b=document.createElement('div'); b.className='eq-bar'; eqEl.appendChild(b); eqBars.push(b); }
const eqData=new Uint8Array(64);
function eqLoop(){
  const an=Music.getAnalyser&&Music.getAnalyser(); const playing=Music.isPlaying();
  $('npCell').classList.toggle('idle',!playing);
  if(playing&&an){ an.getByteFrequencyData(eqData); for(let i=0;i<EQ_N;i++){ const v=eqData[i*2]/255; eqBars[i].style.height=Math.max(8,v*100)+'%'; } }
  else { const tm=performance.now()/600; for(let i=0;i<EQ_N;i++){ eqBars[i].style.height=(10+(Math.sin(tm+i*0.5)+1)*7)+'%'; } }
  requestAnimationFrame(eqLoop);
}

/* ── procedural café-music engine (pure Web Audio) ───────────────────────── */
const Music = (function(){
  let actx=null,master=null,warmF=null,chordBus=null,drySum=null,reverbGain=null,conv=null,crackleGain=null,rainGain=null,analyser=null;
  let playing=false,lookahead=null,nextNote=0,step=0; const mtof=m=>440*Math.pow(2,(m-69)/12); let noiseBuf=null;
  function noise(){ if(noiseBuf) return noiseBuf; const n=actx.sampleRate*2; noiseBuf=actx.createBuffer(1,n,actx.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<n;i++) d[i]=Math.random()*2-1; return noiseBuf; }
  function makeReverb(sec,decay){ const len=Math.floor(actx.sampleRate*sec); const buf=actx.createBuffer(2,len,actx.sampleRate); for(let c=0;c<2;c++){ const d=buf.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay); } const cv=actx.createConvolver(); cv.buffer=buf; return cv; }
  const STYLES={
    'Rainy day':{ bpm:64,swing:0,inst:'pad',reverb:0.45,warm:2800,crackle:0,rain:0.05, chords:[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,65]], bass:[36,33,29,31], comp:[{s:0,d:16,v:0.6}], bassHits:[{s:0,o:0}], drums:{} },
    'Café Jazz':{ bpm:70,swing:0.20,inst:'rhodes',reverb:0.32,warm:3400,crackle:0, chords:[[62,65,69,72,76],[55,59,65,69,64],[60,64,67,71,74],[57,61,64,67,70]], bass:[38,43,36,45], comp:[{s:0,d:7,v:0.9},{s:6,d:4,v:0.5},{s:10,d:5,v:0.6}], bassHits:[{s:0,o:0},{s:10,o:7}], drums:{kick:[0,8],brush:[4,12],ride:'swing8'} },
    'Lo-fi':{ bpm:74,swing:0.12,inst:'pad',reverb:0.18,warm:3000,crackle:0.012, chords:[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,65]], bass:[36,33,29,31], comp:[{s:0,d:16,v:0.9}], bassHits:[{s:0,o:0},{s:8,o:0}], drums:{kick:[0,10],snare:[4,12],hat:'8'} },
    'Bossa':{ bpm:96,swing:0.0,inst:'pluck',reverb:0.22,warm:4200,crackle:0, chords:[[60,64,67,71,74],[57,60,64,67,71],[58,62,65,69],[55,59,62,65,69]], bass:[36,45,34,43], comp:[{s:0,d:6,v:0.7},{s:3,d:3,v:0.45},{s:6,d:4,v:0.6},{s:11,d:4,v:0.5}], bassHits:[{s:0,o:0},{s:6,o:7}], drums:{rim:[0,3,6,10,12],shaker:'16'} },
    'Late Night':{ bpm:60,swing:0.0,inst:'pad',reverb:0.5,warm:2500,crackle:0.006, chords:[[60,64,67,71,74],[57,60,64,67,71],[53,57,60,64,67],[55,58,62,65,69]], bass:[36,33,29,31], comp:[{s:0,d:16,v:0.7}], bassHits:[{s:0,o:0}], drums:{} }
  };
  const ORDER=['Café Jazz','Lo-fi','Bossa','Late Night','Rainy day']; let cur=STYLES['Café Jazz'];
  function rhodes(midi,t,dur,vel){ const f=mtof(midi); const car=actx.createOscillator(); car.type='sine'; car.frequency.value=f; const mod=actx.createOscillator(); mod.type='sine'; mod.frequency.value=f; const mg=actx.createGain(); mg.gain.setValueAtTime(f*2.2*vel,t); mg.gain.exponentialRampToValueAtTime(f*0.15,t+0.45); mod.connect(mg).connect(car.frequency); const g=actx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.16*vel,t+0.008); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); car.connect(g).connect(chordBus); car.start(t); mod.start(t); car.stop(t+dur+0.1); mod.stop(t+dur+0.1); }
  function pad(midi,t,dur){ const o=actx.createOscillator(),o2=actx.createOscillator(); o.type='triangle'; o2.type='sine'; o.frequency.value=mtof(midi); o2.frequency.value=mtof(midi)*1.005; const f=actx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=1100; const g=actx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.045,t+0.5); g.gain.linearRampToValueAtTime(0.038,t+dur*0.6); g.gain.linearRampToValueAtTime(0,t+dur); o.connect(f); o2.connect(f); f.connect(g).connect(chordBus); o.start(t); o2.start(t); o.stop(t+dur); o2.stop(t+dur); }
  function pluck(midi,t,vel){ const o=actx.createOscillator(),o2=actx.createOscillator(); o.type='triangle'; o2.type='sine'; o.frequency.value=mtof(midi); o2.frequency.value=mtof(midi)*2; const f=actx.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(3200,t); f.frequency.exponentialRampToValueAtTime(800,t+0.3); const g=actx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.12*vel,t+0.005); g.gain.exponentialRampToValueAtTime(0.0001,t+0.6); o.connect(f); o2.connect(f); f.connect(g).connect(chordBus); o.start(t); o2.start(t); o.stop(t+0.65); o2.stop(t+0.65); }
  function playChord(ch,t,dur,vel){ if(cur.inst==='rhodes') ch.forEach((n,i)=>rhodes(n,t+i*0.012,dur,vel*(i?0.85:1))); else if(cur.inst==='pluck') ch.forEach((n,i)=>pluck(n,t+i*0.02,vel*(i?0.8:1))); else ch.forEach(n=>pad(n,t,dur)); }
  function bassNote(midi,t,dur){ const o=actx.createOscillator(); o.type='triangle'; o.frequency.value=mtof(midi); const f=actx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=420; const g=actx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.13,t+0.03); g.gain.exponentialRampToValueAtTime(0.001,t+dur); o.connect(f).connect(g).connect(drySum); o.start(t); o.stop(t+dur); }
  function kick(t){ const o=actx.createOscillator(),g=actx.createGain(); o.frequency.setValueAtTime(95,t); o.frequency.exponentialRampToValueAtTime(42,t+0.13); g.gain.setValueAtTime(0.13,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.2); o.connect(g).connect(drySum); o.start(t); o.stop(t+0.22); }
  function brush(t){ const s=actx.createBufferSource(); s.buffer=noise(); const bp=actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=2600; bp.Q.value=0.6; const g=actx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.045,t+0.02); g.gain.exponentialRampToValueAtTime(0.0008,t+0.18); s.connect(bp).connect(g); g.connect(drySum); g.connect(conv); s.start(t); s.stop(t+0.2); }
  function snare(t){ const s=actx.createBufferSource(); s.buffer=noise(); const bp=actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1800; const g=actx.createGain(); g.gain.setValueAtTime(0.09,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.14); s.connect(bp).connect(g).connect(drySum); s.start(t); s.stop(t+0.16); }
  function hat(t){ const s=actx.createBufferSource(); s.buffer=noise(); const hp=actx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=7000; const g=actx.createGain(); g.gain.setValueAtTime(0.04,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.05); s.connect(hp).connect(g).connect(drySum); s.start(t); s.stop(t+0.06); }
  function ride(t,vel){ const s=actx.createBufferSource(); s.buffer=noise(); const hp=actx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=6500; const g=actx.createGain(); g.gain.setValueAtTime(0.03*vel,t); g.gain.exponentialRampToValueAtTime(0.0006,t+0.08); s.connect(hp).connect(g).connect(drySum); s.start(t); s.stop(t+0.09); }
  function rim(t){ const o=actx.createOscillator(); o.type='square'; o.frequency.value=410; const g=actx.createGain(); g.gain.setValueAtTime(0.05,t); g.gain.exponentialRampToValueAtTime(0.0005,t+0.04); o.connect(g).connect(drySum); o.start(t); o.stop(t+0.05); }
  function shaker(t,vel){ const s=actx.createBufferSource(); s.buffer=noise(); const hp=actx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=8200; const g=actx.createGain(); g.gain.setValueAtTime(0.02*vel,t); g.gain.exponentialRampToValueAtTime(0.0004,t+0.05); s.connect(hp).connect(g).connect(drySum); s.start(t); s.stop(t+0.06); }
  function schedule(s,t){ const bar=Math.floor(s/16)%4, st=s%16, sd=60/cur.bpm/4;
    cur.comp.forEach(c=>{ if(c.s===st) playChord(cur.chords[bar],t,sd*c.d,c.v); });
    cur.bassHits.forEach(b=>{ if(b.s===st) bassNote(cur.bass[bar]+(b.o||0),t,sd*4); });
    const D=cur.drums;
    if(D.kick&&D.kick.includes(st)) kick(t); if(D.brush&&D.brush.includes(st)) brush(t); if(D.snare&&D.snare.includes(st)) snare(t); if(D.rim&&D.rim.includes(st)) rim(t);
    if(D.hat==='8'&&st%2===0){ const sw=(st%4===2)?sd*cur.swing:0; hat(t+sw); }
    if(D.ride==='swing8'&&st%2===0){ const sw=(st%4===2)?sd*cur.swing:0; ride(t+sw, st%4===0?0.9:0.6); }
    if(D.shaker==='16'){ shaker(t, st%2===0?0.9:0.5); }
  }
  function loop(){ while(nextNote<actx.currentTime+0.25){ schedule(step,nextNote); nextNote+=60/cur.bpm/4; step=(step+1)%(16*4); } }
  function applyStyle(){ if(!actx) return; reverbGain.gain.setTargetAtTime(cur.reverb,actx.currentTime,0.3); warmF.frequency.setTargetAtTime(cur.warm,actx.currentTime,0.3); crackleGain.gain.setTargetAtTime(cur.crackle,actx.currentTime,0.3); if(rainGain) rainGain.gain.setTargetAtTime(cur.rain||0,actx.currentTime,0.4); }
  function init(){
    actx=new (window.AudioContext||window.webkitAudioContext)(); master=actx.createGain(); master.gain.value=0.0;
    warmF=actx.createBiquadFilter(); warmF.type='lowpass'; warmF.frequency.value=cur.warm; master.connect(warmF).connect(actx.destination);
    analyser=actx.createAnalyser(); analyser.fftSize=64; analyser.smoothingTimeConstant=0.78; master.connect(analyser);
    drySum=actx.createGain(); drySum.connect(master);
    conv=makeReverb(2.6,2.2); reverbGain=actx.createGain(); reverbGain.gain.value=cur.reverb; conv.connect(reverbGain).connect(master);
    chordBus=actx.createGain(); chordBus.gain.value=0.9; chordBus.connect(drySum); chordBus.connect(conv);
    const lfo=actx.createOscillator(); lfo.type='sine'; lfo.frequency.value=4.5; const lg=actx.createGain(); lg.gain.value=0.05; lfo.connect(lg).connect(chordBus.gain); lfo.start();
    const src=actx.createBufferSource(); src.buffer=noise(); src.loop=true; const hp=actx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=2000; crackleGain=actx.createGain(); crackleGain.gain.value=cur.crackle; src.connect(hp).connect(crackleGain).connect(master); src.start();
    const rsrc=actx.createBufferSource(); rsrc.buffer=noise(); rsrc.loop=true; const rlp=actx.createBiquadFilter(); rlp.type='lowpass'; rlp.frequency.value=2200; rainGain=actx.createGain(); rainGain.gain.value=cur.rain||0; rsrc.connect(rlp).connect(rainGain).connect(master); rsrc.start();
  }
  return {
    styles(){ return ORDER; }, current(){ return ORDER.find(n=>STYLES[n]===cur); },
    setStyle(name){ if(STYLES[name]){ cur=STYLES[name]; applyStyle(); } },
    isPlaying(){ return playing; }, getAnalyser(){ return analyser; },
    toggle(){ if(!actx) init();
      if(!playing){ actx.resume(); playing=true; nextNote=actx.currentTime+0.15; step=0; lookahead=setInterval(loop,40); master.gain.cancelScheduledValues(actx.currentTime); master.gain.linearRampToValueAtTime(0.85,actx.currentTime+1.3); }
      else { playing=false; clearInterval(lookahead); master.gain.linearRampToValueAtTime(0.0,actx.currentTime+0.7); }
      return playing; }
  };
})();
function syncNowPlaying(){ const on=Music.isPlaying(); $('npVal').textContent= on ? Music.current() : tr('silent'); }
$('musicBtn').addEventListener('click',()=>{ const on=Music.toggle(); $('musicBtn').innerHTML=`<span class="ic">♪</span> <span class="lbl">${tr('music')}: ${on?tr('on'):tr('off')}</span>`; $('musicBtn').classList.toggle('on',on); syncNowPlaying(); });
$('styleBtn').addEventListener('click',()=>{ const order=Music.styles(); const i=order.indexOf(Music.current()); const next=order[(i+1)%order.length]; Music.setStyle(next); $('styleBtn').innerHTML=`<span class="ic">⤮</span> <span class="lbl">${next}</span>`; syncNowPlaying(); });

/* ── day / night toggle (Auto · Day · Night) ─────────────────────────────── */
let timeMode = localStorage.getItem(LS.time) || 'auto';
function resolveTime(){ if(timeMode==='day') return 'day'; if(timeMode==='night') return 'night'; const h=new Date().getHours(); return (h>=6&&h<18)?'day':'night'; }
function applyTime(){ document.body.setAttribute('data-time', resolveTime());
  $('timeSeg').querySelectorAll('button').forEach(b=>b.classList.toggle('sel', b.dataset.t===timeMode)); localStorage.setItem(LS.time,timeMode); }
$('timeSeg').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ timeMode=b.dataset.t; applyTime(); }));

/* ── layout switcher ─────────────────────────────────────────────────────── */
let layout = localStorage.getItem(LS.layout) || 'console';
function applyLayout(){ document.body.classList.remove('layout-console','layout-theater','layout-den'); document.body.classList.add('layout-'+layout);
  $('layoutSeg').querySelectorAll('button').forEach(b=>b.classList.toggle('sel', b.dataset.l===layout)); localStorage.setItem(LS.layout,layout); }
$('layoutSeg').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ layout=b.dataset.l; applyLayout(); }));

/* ── language toggle ─────────────────────────────────────────────────────── */
function applyLang(){
  document.documentElement.lang = lang==='th' ? 'th' : 'en';
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent = tr(el.dataset.i18n); });
  $('langSeg').querySelectorAll('button').forEach(b=>b.classList.toggle('sel', b.dataset.lang===lang));
  // dynamic bits
  setStatus();
  Object.keys(DOGS).forEach(n=>{ renderDog(n); $('crole-'+n).textContent=tr(DOGS[n].roleKey); $('cassign-'+n).textContent=tr('tm_assign'); const pr=$('prole-'+n); if(pr) pr.textContent=tr(DOGS[n].roleKey); });
  $('toggleBtn').innerHTML = running ? `<span class="ic">⏸</span> <span class="lbl">${tr('pause')}</span>` : `<span class="ic">▶</span> <span class="lbl">${tr('resume')}</span>`;
  const mOn=Music.isPlaying(); $('musicBtn').innerHTML=`<span class="ic">♪</span> <span class="lbl">${tr('music')}: ${mOn?tr('on'):tr('off')}</span>`;
  $('aiBtn').innerHTML=`<span class="ic">✦</span> <span class="lbl">${tr('livelog')}: ${liveOn?tr('on'):tr('off')}</span>`;
  if(!liveOn){ logsrc.textContent=tr('src_scripted'); }
  $('npVal').textContent = Music.isPlaying() ? Music.current() : tr('silent');
  $('sessionSub') && ($('sessionSub').textContent=tr('sessionSub'));
  $('tasksSub') && ($('tasksSub').textContent=tr('tasksSub'));
  tick();
}
$('langSeg').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ lang=b.dataset.lang; localStorage.setItem(LS.lang,lang); applyLang(); }));

/* ── boot ────────────────────────────────────────────────────────────────── */
applyTime(); applyLayout(); applyLang(); tick();
eqLoop();
logEv(null, tr('logOpened'));
(function(){ const h=new Date().getHours(); const st=(h>=18||h<6)?'Late Night':'Café Jazz'; Music.setStyle(st); $('styleBtn').innerHTML=`<span class="ic">⤮</span> <span class="lbl">${st}</span>`; })();
start();
