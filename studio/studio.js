/* ============================================================================
   Pum's Office — Studio UI kit logic (command-console edition)
   Faithful ambient scene + telemetry, day-phase dial, dust motes, a real
   audio-spectrum music visualizer, and a live work-log (Claude when available,
   expanded scripted fallback otherwise).
   ============================================================================ */

const DATA = { pumba:'./assets/corgi.png', gigi:'./assets/floof.png' };
const IMG_W = 1402, IMG_H = 1122;
const pct = (v,t) => v/t*100;

const DOGS = {
  Pumba: { role:'Project Manager', color:'#ffae42', box:[408,418,642,700],
    tasks:['grooming the backlog','planning the sprint','reviewing pull requests','sniffing out requirements','updating the roadmap','triaging issues'] },
  Gigi: { role:'Systems Analyst', color:'#8fe388', box:[893,415,1132,702],
    tasks:['profiling slow queries','tracing the logs','analyzing metrics','debugging the build','optimizing indexes','chasing a memory leak'] }
};
const SCRIPTED_POOL = {
  Pumba: ['herding stray tickets','fetching the changelog','burying tech debt','wagging through standup','rescoping the milestone','sniff-testing the demo','rounding up reviewers','marking the release'],
  Gigi: ['paws-deep in a stack trace','retracing a flaky test','digging up an index','gnawing on a regex','cache-sniffing the API','untangling a dependency','treeing a null pointer','fetching fresh metrics']
};
const AMBIENT = {
  lamps: [ {x:20.3, y:39.7, w:13}, {x:87.7, y:41.7, w:12} ],
  screens: [ {x:20.0, y:48.6, w:16, h:13, c:'rgba(150,200,255,0.9)'},
             {x:77.7, y:54.5, w:13, h:10, c:'rgba(150,200,255,0.9)'} ],
  window: {x:1.7, y:4, w:15.3, h:26}
};

const $ = id => document.getElementById(id);
const stage = $('stage'), feed = $('feed'), crewEl = $('crew'), meta = $('meta'), logsrc = $('logsrc');
let running = true, liveTasks = false, taskCount = 0;
const startTime = Date.now();
const state = { task:{}, timers:[] };
const AMB_SEL = '.lamp,.screen,.glow,.window-fx,.window-warm,.mote';

/* ── ambient layers ── */
const win = AMBIENT.window;
for (const cls of ['window-fx','window-warm']) {
  const el = document.createElement('div'); el.className = cls+' run';
  el.style.left = win.x+'%'; el.style.top = win.y+'%'; el.style.width = win.w+'%'; el.style.height = win.h+'%';
  stage.appendChild(el);
}
AMBIENT.lamps.forEach((l,i) => {
  const el = document.createElement('div'); el.className = 'lamp run'; el.id = 'lamp-'+i;
  el.style.left = l.x+'%'; el.style.top = l.y+'%'; el.style.width = l.w+'%'; el.style.aspectRatio = '1/1';
  el.style.animationDelay = (i*-2.2)+'s';
  stage.appendChild(el);
});
AMBIENT.screens.forEach((s,i) => {
  const el = document.createElement('div'); el.className = 'screen run'; el.id = 'screen-'+i;
  el.style.left = s.x+'%'; el.style.top = s.y+'%'; el.style.width = s.w+'%'; el.style.height = s.h+'%';
  el.style.background = 'radial-gradient(circle, '+s.c+', transparent 65%)';
  el.style.animationDelay = (i*-0.4)+'s';
  stage.appendChild(el);
});

/* ── dogs (two motion layers) ── */
for (const [name,d] of Object.entries(DOGS)) {
  const [x0,y0,x1,y1] = d.box;
  const wrap = document.createElement('div'); wrap.className = 'dog breathe'; wrap.id = 'dog-'+name;
  wrap.style.left = pct(x0,IMG_W)+'%'; wrap.style.top = pct(y0,IMG_H)+'%'; wrap.style.width = pct(x1-x0,IMG_W)+'%';
  wrap.style.animationDelay = (name==='Gigi'?'-1.6s':'0s');
  wrap.innerHTML = `<div class="dog-fx" id="fx-${name}"><img src="${DATA[name.toLowerCase()]}" alt="${name}"></div>`;
  stage.appendChild(wrap);
  const g = document.createElement('div'); g.className = 'glow run'; g.id = 'glow-'+name;
  const gw = (x1-x0)*0.7, gx = x0+(x1-x0)*0.15, gy = y0+(y1-y0)*0.05;
  g.style.left = pct(gx,IMG_W)+'%'; g.style.top = pct(gy,IMG_H)+'%'; g.style.width = pct(gw,IMG_W)+'%'; g.style.height = pct(gw*0.8,IMG_H)+'%';
  g.style.background = 'radial-gradient(circle, '+d.color+', transparent 65%)';
  stage.appendChild(g);
  const chip = document.createElement('div'); chip.className = 'chip'; chip.id = 'chip-'+name; chip.style.setProperty('--c',d.color);
  chip.style.left = pct(x0+(x1-x0)*0.5,IMG_W)+'%'; chip.style.top = pct(y0-6,IMG_H)+'%';
  chip.innerHTML = '<span class="blink"></span><span id="chiptxt-'+name+'">working</span>';
  stage.appendChild(chip);
}

/* ── dust motes ── */
for (let i=0;i<16;i++){
  const m = document.createElement('div'); m.className = 'mote run';
  const size = 1.4 + Math.random()*2.2;
  m.style.width = size+'px'; m.style.height = size+'px';
  m.style.left = (4 + Math.random()*92)+'%';
  m.style.top = (30 + Math.random()*65)+'%';
  m.style.animationDuration = (7 + Math.random()*9)+'s';
  m.style.animationDelay = (-Math.random()*12)+'s';
  if (Math.random()<0.4) m.style.background = 'rgba(143,227,136,.6)';
  stage.appendChild(m);
}

/* ── crew panel (with avatars) ── */
for (const [name,d] of Object.entries(DOGS)) {
  const row = document.createElement('div'); row.className = 'crew';
  row.innerHTML = `<div class="crew-av"><img src="${DATA[name.toLowerCase()]}" alt=""></div>
    <div class="crew-info">
      <div class="crew-top"><span class="crew-dot" style="color:${d.color}"></span><span class="crew-name" style="color:${d.color}">${name}</span></div>
      <div class="crew-role">${d.role}</div>
      <div class="crew-task" id="task-${name}" style="color:${d.color}">booting up…</div>
    </div>`;
  crewEl.appendChild(row);
}

function now(){ return new Date().toTimeString().slice(0,5); }
function logEv(name,text){
  const c = name && DOGS[name] ? DOGS[name].color : '';
  const el = document.createElement('div'); el.className = 'ev';
  el.innerHTML = `<div class="ev-time">${now()}</div><div class="ev-mark" style="${c?`background:${c};box-shadow:0 0 4px ${c}`:''}"></div><div class="ev-body" style="${c?`color:${c}`:''}">${text}</div>`;
  feed.appendChild(el); feed.scrollTop = feed.scrollHeight;
  while (feed.children.length>60) feed.removeChild(feed.firstChild);
}
function bumpTasks(){ taskCount++; const v=$('tasksVal'); if(v) v.textContent = taskCount; }
function tween(name,cls,dur){ const d = $('fx-'+name); d.classList.add(cls); const t = setTimeout(()=>d.classList.remove(cls),dur); state.timers.push(t); }

function setTask(name,task){
  state.task[name] = task;
  $('task-'+name).textContent = task;
  $('chiptxt-'+name).textContent = task.split(' ').slice(0,2).join(' ');
  logEv(name,`<b>${name}</b> — ${task}`); bumpTasks();
  const fx = $('fx-'+name); fx.classList.add('type');
  const t = setTimeout(()=>{ fx.classList.remove('type'); },2200+Math.random()*1500);
  state.timers.push(t);
}
function cycle(name){
  if(!running) return;
  const d = DOGS[name];
  const task = d.tasks[Math.floor(Math.random()*d.tasks.length)];
  if(task!==state.task[name]) setTask(name,task);
  const t = setTimeout(()=>cycle(name),4500+Math.random()*4000); state.timers.push(t);
}
function flourish(){
  if(!running) return;
  const names = Object.keys(DOGS); const n = names[Math.floor(Math.random()*names.length)];
  const fx = $('fx-'+n);
  if(!fx.classList.contains('type')){ if(Math.random()<0.5) tween(n,'tilt',2400); else tween(n,'perk',1100); }
  const t = setTimeout(flourish, 3500+Math.random()*4000); state.timers.push(t);
}

/* ── clock + date + weather ── */
const WDAY=['SUN','MON','TUE','WED','THU','FRI','SAT'];
const MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
let wx='';
function dateStr(){ const d=new Date(); return 'BKK · '+WDAY[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()]+wx; }
async function loadWeather(){
  try{
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m');
    const j = await r.json(); const t = j && j.current && j.current.temperature_2m;
    if(typeof t==='number'){ wx=' · '+Math.round(t)+'°C'; $('date').textContent=dateStr(); }
  }catch(e){}
}
loadWeather(); setInterval(loadWeather,600000);
function pad2(n){ return (n<10?'0':'')+n; }
function tick(){
  $('clock').textContent = now(); $('date').textContent = dateStr();
  const s = Math.floor((Date.now()-startTime)/1000);
  const hh=Math.floor(s/3600), mm=Math.floor((s%3600)/60), ss=s%60;
  const txt = hh>0 ? hh+':'+pad2(mm)+':'+pad2(ss) : pad2(mm)+':'+pad2(ss);
  const sv=$('sessionVal'); if(sv) sv.innerHTML = txt+'<span class="u">elapsed</span>';
}
setInterval(tick,1000); tick();

/* ── live work-log ── */
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function scriptedFresh(){ return { Pumba: shuffle(SCRIPTED_POOL.Pumba).slice(0,6), Gigi: shuffle(SCRIPTED_POOL.Gigi).slice(0,6) }; }
function applyFreshTasks(parsed, src){
  DOGS.Pumba.tasks = parsed.Pumba; DOGS.Gigi.tasks = parsed.Gigi; liveTasks = true;
  logsrc.textContent = src; logsrc.classList.toggle('live', src.indexOf('AI')>-1);
  if(src.indexOf('AI')>-1){ logsrc.innerHTML = '<i></i>live · AI'; }
  const fresh = [];
  for(let i=0;i<6;i++){ if(parsed.Pumba[i]) fresh.push({name:'Pumba',task:parsed.Pumba[i]}); if(parsed.Gigi[i]) fresh.push({name:'Gigi',task:parsed.Gigi[i]}); }
  fresh.forEach((e,idx)=>{ const t = setTimeout(()=>{ logEv(e.name,`<b>${e.name}</b> — ${e.task}`); bumpTasks(); }, 600+idx*1100); state.timers.push(t); });
}
async function generateLiveLog(){
  logEv(null,'Asking the AI for fresh tasks…');
  const prompt = 'Two dog coworkers at a cozy late-night software studio. Pumba (a corgi) is the Project Manager, Gigi (a Thai Bangkaew) is the Systems Analyst. Return ONLY valid JSON (no markdown) shaped exactly as {"Pumba":[...],"Gigi":[...]} where each array has 6 short present-tense work activities, 3-6 words each, playful and a little dog-themed but about real software work.';
  if (window.claude && typeof window.claude.complete === 'function') {
    try {
      let text = await window.claude.complete(prompt);
      text = String(text).replace(/```json|```/g,'').trim();
      const m = text.match(/\{[\s\S]*\}/); const parsed = JSON.parse(m ? m[0] : text);
      if (parsed.Pumba && parsed.Gigi) { applyFreshTasks(parsed, 'live · AI'); logEv(null,'Live tasks loaded ✦'); return true; }
    } catch (err) { /* fall through */ }
  }
  applyFreshTasks(scriptedFresh(), 'fresh · scripted');
  logEv(null,'Live AI unavailable here — shuffled in fresh scripted tasks.');
  return false;
}

/* ── run / pause ── */
function setStatus(label, sub){ const a=$('statusVal'); if(a) a.textContent=label; if(sub!==undefined){ const b=$('statusSub'); if(b) b.textContent=sub; } meta.textContent = label.toLowerCase(); }
function start(){
  running = true; setStatus('Working','2 of 2 on shift');
  document.querySelectorAll(AMB_SEL).forEach(e=>e.classList.add('run'));
  Object.keys(DOGS).forEach((n,i)=>{ const t=setTimeout(()=>cycle(n),i*900); state.timers.push(t); $('dog-'+n).classList.add('breathe'); $('chip-'+n).style.opacity='1'; });
  const f = setTimeout(flourish,3000); state.timers.push(f);
}
function stop(){
  running = false; setStatus('Paused','scene frozen');
  state.timers.forEach(t=>clearTimeout(t)); state.timers=[];
  document.querySelectorAll(AMB_SEL).forEach(e=>e.classList.remove('run'));
  Object.keys(DOGS).forEach(n=>{ $('dog-'+n).classList.remove('breathe'); $('fx-'+n).classList.remove('type','tilt','perk'); $('chip-'+n).style.opacity='.4'; });
}
$('toggleBtn').addEventListener('click',()=>{ if(running){ stop(); $('toggleBtn').innerHTML='<span class="ic">▶</span> Resume'; } else { start(); $('toggleBtn').innerHTML='<span class="ic">⏸</span> Pause'; } });
$('aiBtn').addEventListener('click',generateLiveLog);
document.addEventListener('visibilitychange',()=>{
  const amb = document.querySelectorAll(AMB_SEL);
  if(document.hidden){ amb.forEach(e=>e.classList.remove('run')); Object.keys(DOGS).forEach(n=>{ $('dog-'+n).classList.remove('breathe'); $('fx-'+n).classList.remove('type','tilt','perk'); }); }
  else if(running){ amb.forEach(e=>e.classList.add('run')); Object.keys(DOGS).forEach(n=>$('dog-'+n).classList.add('breathe')); }
});

/* ── day-phase dial (synced to the 48s wash; advances only while running) ── */
let dayPhase = 0, lastTs = performance.now();
const DIAL_R = 18;
function phaseGlyph(p){ if(p<0.12) return '🌇'; if(p<0.50) return '🌙'; if(p<0.66) return '🌌'; if(p<0.86) return '🌅'; return '🌇'; }
function dialLoop(t){
  const dt = t - lastTs; lastTs = t;
  if(running){ dayPhase = (dayPhase + dt/48000) % 1; }
  const theta = dayPhase*2*Math.PI - Math.PI/2;
  const dot = $('dialDot');
  if(dot) dot.style.transform = `translate(${Math.cos(theta)*DIAL_R}px, ${Math.sin(theta)*DIAL_R}px)`;
  const gl = $('dialGlyph'); const g = phaseGlyph(dayPhase);
  if(gl && gl.textContent !== g) gl.textContent = g;
  requestAnimationFrame(dialLoop);
}
requestAnimationFrame(dialLoop);

/* ── EQ bars ── */
const EQ_N = 16; const eqEl = $('eq'); const eqBars = [];
for(let i=0;i<EQ_N;i++){ const b=document.createElement('div'); b.className='eq-bar'; eqEl.appendChild(b); eqBars.push(b); }
const eqData = new Uint8Array(64);
function eqLoop(){
  const an = Music.getAnalyser && Music.getAnalyser();
  const playing = Music.isPlaying();
  $('npCell').classList.toggle('idle', !playing);
  if(playing && an){
    an.getByteFrequencyData(eqData);
    for(let i=0;i<EQ_N;i++){ const v=eqData[i*2]/255; eqBars[i].style.height = Math.max(8, v*100)+'%'; }
  } else {
    const tm = performance.now()/600;
    for(let i=0;i<EQ_N;i++){ eqBars[i].style.height = (10 + (Math.sin(tm+i*0.5)+1)*7)+'%'; }
  }
  requestAnimationFrame(eqLoop);
}

/* ── procedural café-music engine (pure Web Audio) ── */
const Music = (function(){
  let actx=null, master=null, warmF=null, chordBus=null, drySum=null, reverbGain=null, conv=null, crackleGain=null, rainGain=null, analyser=null;
  let playing=false, lookahead=null, nextNote=0, step=0;
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  let noiseBuf=null;
  function noise(){ if(noiseBuf) return noiseBuf; const n=actx.sampleRate*2; noiseBuf=actx.createBuffer(1,n,actx.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<n;i++) d[i]=Math.random()*2-1; return noiseBuf; }
  function makeReverb(sec,decay){ const len=Math.floor(actx.sampleRate*sec); const buf=actx.createBuffer(2,len,actx.sampleRate); for(let c=0;c<2;c++){ const d=buf.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay); } const cv=actx.createConvolver(); cv.buffer=buf; return cv; }
  const STYLES = {
    'Rainy day': { bpm:64, swing:0, inst:'pad', reverb:0.45, warm:2800, crackle:0, rain:0.05, chords:[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,65]], bass:[36,33,29,31], comp:[{s:0,d:16,v:0.6}], bassHits:[{s:0,o:0}], drums:{} },
    'Café Jazz': { bpm:70, swing:0.20, inst:'rhodes', reverb:0.32, warm:3400, crackle:0,
      chords:[[62,65,69,72,76],[55,59,65,69,64],[60,64,67,71,74],[57,61,64,67,70]], bass:[38,43,36,45],
      comp:[{s:0,d:7,v:0.9},{s:6,d:4,v:0.5},{s:10,d:5,v:0.6}], bassHits:[{s:0,o:0},{s:10,o:7}], drums:{kick:[0,8],brush:[4,12],ride:'swing8'} },
    'Lo-fi': { bpm:74, swing:0.12, inst:'pad', reverb:0.18, warm:3000, crackle:0.012,
      chords:[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,65]], bass:[36,33,29,31],
      comp:[{s:0,d:16,v:0.9}], bassHits:[{s:0,o:0},{s:8,o:0}], drums:{kick:[0,10],snare:[4,12],hat:'8'} },
    'Bossa': { bpm:96, swing:0.0, inst:'pluck', reverb:0.22, warm:4200, crackle:0,
      chords:[[60,64,67,71,74],[57,60,64,67,71],[58,62,65,69],[55,59,62,65,69]], bass:[36,45,34,43],
      comp:[{s:0,d:6,v:0.7},{s:3,d:3,v:0.45},{s:6,d:4,v:0.6},{s:11,d:4,v:0.5}], bassHits:[{s:0,o:0},{s:6,o:7}], drums:{rim:[0,3,6,10,12],shaker:'16'} },
    'Late Night': { bpm:60, swing:0.0, inst:'pad', reverb:0.5, warm:2500, crackle:0.006,
      chords:[[60,64,67,71,74],[57,60,64,67,71],[53,57,60,64,67],[55,58,62,65,69]], bass:[36,33,29,31],
      comp:[{s:0,d:16,v:0.7}], bassHits:[{s:0,o:0}], drums:{} }
  };
  const ORDER = ['Café Jazz','Lo-fi','Bossa','Late Night','Rainy day'];
  let cur = STYLES['Café Jazz'];
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
  function schedule(s,t){
    const bar=Math.floor(s/16)%4, st=s%16, sd=60/cur.bpm/4;
    cur.comp.forEach(c=>{ if(c.s===st) playChord(cur.chords[bar],t,sd*c.d,c.v); });
    cur.bassHits.forEach(b=>{ if(b.s===st) bassNote(cur.bass[bar]+(b.o||0),t,sd*4); });
    const D=cur.drums;
    if(D.kick&&D.kick.includes(st)) kick(t);
    if(D.brush&&D.brush.includes(st)) brush(t);
    if(D.snare&&D.snare.includes(st)) snare(t);
    if(D.rim&&D.rim.includes(st)) rim(t);
    if(D.hat==='8'&&st%2===0){ const sw=(st%4===2)?sd*cur.swing:0; hat(t+sw); }
    if(D.ride==='swing8'&&st%2===0){ const sw=(st%4===2)?sd*cur.swing:0; ride(t+sw, st%4===0?0.9:0.6); }
    if(D.shaker==='16'){ shaker(t, st%2===0?0.9:0.5); }
  }
  function loop(){ while(nextNote<actx.currentTime+0.25){ schedule(step,nextNote); nextNote+=60/cur.bpm/4; step=(step+1)%(16*4); } }
  function applyStyle(){ if(!actx) return; reverbGain.gain.setTargetAtTime(cur.reverb,actx.currentTime,0.3); warmF.frequency.setTargetAtTime(cur.warm,actx.currentTime,0.3); crackleGain.gain.setTargetAtTime(cur.crackle,actx.currentTime,0.3); if(rainGain) rainGain.gain.setTargetAtTime(cur.rain||0,actx.currentTime,0.4); }
  function init(){
    actx=new (window.AudioContext||window.webkitAudioContext)();
    master=actx.createGain(); master.gain.value=0.0;
    warmF=actx.createBiquadFilter(); warmF.type='lowpass'; warmF.frequency.value=cur.warm;
    master.connect(warmF).connect(actx.destination);
    analyser=actx.createAnalyser(); analyser.fftSize=64; analyser.smoothingTimeConstant=0.78; master.connect(analyser);
    drySum=actx.createGain(); drySum.connect(master);
    conv=makeReverb(2.6,2.2); reverbGain=actx.createGain(); reverbGain.gain.value=cur.reverb; conv.connect(reverbGain).connect(master);
    chordBus=actx.createGain(); chordBus.gain.value=0.9; chordBus.connect(drySum); chordBus.connect(conv);
    const lfo=actx.createOscillator(); lfo.type='sine'; lfo.frequency.value=4.5; const lg=actx.createGain(); lg.gain.value=0.05; lfo.connect(lg).connect(chordBus.gain); lfo.start();
    const src=actx.createBufferSource(); src.buffer=noise(); src.loop=true; const hp=actx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=2000; crackleGain=actx.createGain(); crackleGain.gain.value=cur.crackle; src.connect(hp).connect(crackleGain).connect(master); src.start();
    const rsrc=actx.createBufferSource(); rsrc.buffer=noise(); rsrc.loop=true; const rlp=actx.createBiquadFilter(); rlp.type='lowpass'; rlp.frequency.value=2200; rainGain=actx.createGain(); rainGain.gain.value=cur.rain||0; rsrc.connect(rlp).connect(rainGain).connect(master); rsrc.start();
  }
  return {
    styles(){ return ORDER; },
    current(){ return ORDER.find(n=>STYLES[n]===cur); },
    setStyle(name){ if(STYLES[name]){ cur=STYLES[name]; applyStyle(); } },
    isPlaying(){ return playing; },
    getAnalyser(){ return analyser; },
    toggle(){
      if(!actx) init();
      if(!playing){ actx.resume(); playing=true; nextNote=actx.currentTime+0.15; step=0; lookahead=setInterval(loop,40); master.gain.cancelScheduledValues(actx.currentTime); master.gain.linearRampToValueAtTime(0.85,actx.currentTime+1.3); }
      else { playing=false; clearInterval(lookahead); master.gain.linearRampToValueAtTime(0.0,actx.currentTime+0.7); }
      return playing;
    }
  };
})();

function syncNowPlaying(){ const on=Music.isPlaying(); $('npVal').textContent = on ? Music.current() : '— silent —'; }
$('musicBtn').addEventListener('click',()=>{
  const on=Music.toggle();
  $('musicBtn').innerHTML = '<span class="ic">♪</span> Music: '+(on?'on':'off');
  $('musicBtn').classList.toggle('on', on);
  syncNowPlaying();
});
$('styleBtn').addEventListener('click',()=>{
  const order=Music.styles(); const i=order.indexOf(Music.current());
  const next=order[(i+1)%order.length];
  Music.setStyle(next);
  $('styleBtn').innerHTML='<span class="ic">⤮</span> '+next;
  syncNowPlaying();
  logEv(null,'Music style → '+next);
});

eqLoop();
logEv(null,'Studio opened. Good code, good dogs.');
(function(){ var h=new Date().getHours(); var st=(h>=18||h<6)?'Late Night':'Café Jazz'; Music.setStyle(st); $('styleBtn').innerHTML='<span class="ic">⤮</span> '+st; logEv(null,'Music set to '+st+' for the time of day'); })();
start();
