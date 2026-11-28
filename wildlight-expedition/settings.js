/* Settings sheet (gear button in the header): sound volumes, how to play again, credits, reset.
   Reuses the sound engine (sfx.js: getVolume / setVolume / setMuted / isMuted) and the reset dialog in game.js. */
(function () {
  'use strict';
  const MUSIC = [
    ['Medieval: The Bard\'s Tale', 'RandomMind', 'https://opengameart.org/content/medieval-the-bards-tale', 'village and map'],
    ['Medieval: The Old Tower Inn', 'RandomMind', 'https://opengameart.org/content/medieval-the-old-tower-inn', 'village and map'],
    ['Medieval: Battle', 'RandomMind', 'https://opengameart.org/content/medieval-battle', 'fights'],
    ['Battle Theme A', 'cynicmusic', 'https://opengameart.org/content/battle-theme-a', 'boss fights'],
  ];
  const SFX = [
    ['RPG Sound Pack', 'https://opengameart.org/content/rpg-sound-pack'],
    ['Swishes Sound Pack', 'https://opengameart.org/content/swishes-sound-pack'],
    ['80 CC0 RPG SFX', 'https://opengameart.org/content/80-cc0-rpg-sfx'],
    ['20 Sword Sound Effects (Attacks and Clashes)', 'https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes'],
    ['10 Impact/Shield Blocks', 'https://opengameart.org/content/10-impactshield-blocks'],
    ['Fantasy Weapons and Apparel SFX Library (Jan Schupke)', 'https://opengameart.org/content/fantasy-weapons-and-apparel-sfx-library'],
    ['Fantasy Sound Effects, Tinysized SFX (Jan Schupke)', 'https://opengameart.org/content/fantasy-sound-effects-tinysized-sfx'],
    ['Monster Sound Pack, Volume 1', 'https://opengameart.org/content/monster-sound-pack-volume-1'],
    ['75 CC0 breaking / falling / hit sfx', 'https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx'],
    ['Cure Magic', 'https://opengameart.org/content/cure-magic'],
    ['Freeze Spell', 'https://opengameart.org/content/freeze-spell-0'],
    ['Teleport Spell', 'https://opengameart.org/content/teleport-spell'],
    ['Fantasy Magic Spell', 'https://opengameart.org/content/fantasy-magic-spell'],
  ];
  const ROWS = [['music', 'Music'], ['fx', 'Battle sounds'], ['ui', 'Menu sounds']];
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let dlg = null;

  function close() { if (dlg) { dlg.remove(); dlg = null; } const b = document.getElementById('set-btn'); if (b) b.setAttribute('aria-expanded', 'false'); }

  function open() {
    close();
    const s = window.sfx;
    dlg = document.createElement('div');
    dlg.className = 'result dialog setdlg'; dlg.id = 'settings-dialog';
    dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-label', 'Settings');
    const sound = s ? `<section class="setsec"><h3>Sound</h3>${ROWS.map(([k, n]) =>
      `<label class="sp-row" for="set-vol-${k}"><span>${n}</span><input id="set-vol-${k}" data-vol="${k}" type="range" min="0" max="100" step="5" value="${Math.round((s.getVolume(k) ?? 1) * 100)}"></label>`).join('')}
      <button type="button" class="btn alt small" data-set="mute">${s.isMuted() ? 'Turn sound on' : 'Mute all'}</button></section>` : '';
    dlg.innerHTML = `<div class="box setbox"><div class="sethead"><h2>Settings</h2><button type="button" class="setx" data-set="close" aria-label="Close settings">×</button></div>
      <div class="setbody">${sound}
      <section class="setsec"><h3>Help</h3><button type="button" class="btn alt small" data-set="tutorial">How to play</button><button type="button" class="btn alt small" data-set="ach" style="margin-top:8px">Achievements and stats</button></section>
      <section class="setsec"><h3>Credits</h3>
        <p class="note">Wildlight Expedition is an independent game. The painted pictures (heroes, monsters, maps, items) were made with AI image generation tools and checked and edited by the developer. The music and sound effects are free CC0 recordings from OpenGameArt.org, listed here with thanks (no credit is required, it is given anyway).</p>
        <details><summary>Music</summary><ul class="credit">${MUSIC.map(m => `<li><b>${esc(m[0])}</b> by ${esc(m[1])}<small>${esc(m[3])} · <a href="${m[2]}" target="_blank" rel="noopener noreferrer">${m[2].replace('https://', '')}</a></small></li>`).join('')}</ul></details>
        <details><summary>Sound effects</summary><ul class="credit">${SFX.map(m => `<li><b>${esc(m[0])}</b><small><a href="${m[1]}" target="_blank" rel="noopener noreferrer">${m[1].replace('https://', '')}</a></small></li>`).join('')}</ul></details>
      </section>
      <section class="setsec dangerzone"><h3>Save data</h3><p class="note">Start over with a brand-new game. This erases your progress.</p><button type="button" class="btn danger small" data-set="reset">Reset game data</button></section></div></div>`;
    dlg.addEventListener('click', e => {
      if (e.target === dlg) return close();                                   // tap outside
      const b = e.target.closest('[data-set]'); if (!b) return;
      const a = b.dataset.set;
      if (a === 'close') close();
      else if (a === 'mute' && s) { s.setMuted(!s.isMuted()); b.textContent = s.isMuted() ? 'Turn sound on' : 'Mute all'; }
      else if (a === 'tutorial') { close(); if (window.tutorial) window.tutorial.start(true); }
      else if (a === 'ach') { close(); if (window.ach) window.ach.open(); }
      else if (a === 'reset') { if (typeof showResetDialog === 'function') showResetDialog(); }
    });
    dlg.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.vol; if (k && s) s.setVolume(k, e.target.value / 100); });
    dlg.addEventListener('change', e => {                                     // let go of a slider: hear what it controls
      const k = e.target.dataset && e.target.dataset.vol;
      if (k === 'fx') s.play('wimpact', { w: 'sword', m: 'beast' }); else if (k === 'ui') s.play('tab');
    });
    document.body.appendChild(dlg);
    const b = document.getElementById('set-btn'); if (b) b.setAttribute('aria-expanded', 'true');
    const first = dlg.querySelector('input,button'); if (first) first.focus({ preventScroll: true });
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && dlg) close(); });
  document.addEventListener('click', e => { if (e.target.closest('#set-btn')) { e.stopPropagation(); dlg ? close() : open(); } });
  window.settings = { open, close };
})();
