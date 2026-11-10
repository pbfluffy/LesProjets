// Cloudlingo's line icons: one family, 24px grid, 2px rounded strokes, drawn in
// currentColor so they follow the text colour (and dark mode). Used instead of emoji.
// ICON(name, extraClass?) returns an inline <svg>; size comes from CSS (1em by default).
(function () {
  const P = {
    // navigation
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5"/><path d="M9 11h6M9 15h4"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5.5a2 2 0 0 0 0 4H8M16 6h2.5a2 2 0 0 1 0 4H16"/><path d="M12 13v4M8.5 21h7M9.5 17h5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    // stats & actions
    flame: '<path d="M12 3c.8 3 5 5 5 10.2a5 5 0 0 1-10 0c0-2.4 1.3-3.9 2.3-4.9.3 1.8 1.2 2.9 2.3 3.4C11.2 9.2 11 6 12 3z"/>',
    bolt: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/>',
    bolts: '<path d="M9.5 2 3.5 11H8l-1 6 6-9H8.5z"/><path d="M17 8.5 13 15h3l-.8 5L20 13h-3z"/>',
    book: '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z"/><path d="M5 20.5A2.5 2.5 0 0 1 7.5 18H19v3H7.5A2.5 2.5 0 0 1 5 20.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    snowflake: '<path d="M12 2v20M3.4 7l17.2 10M3.4 17 20.6 7"/><path d="m9.5 3.5 2.5 2 2.5-2M9.5 20.5l2.5-2 2.5 2"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4.5L17 13H5"/>',
    share: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1"/>',
    install: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M12 7v7M9 11l3 3 3-3"/><path d="M10.5 18.5h3"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    bulb: '<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 14h3"/>',
    repeat: '<path d="M4 11a8 8 0 0 1 14.1-4.9L20 8"/><path d="M20 3.5V8h-4.5"/><path d="M20 13a8 8 0 0 1-14.1 4.9L4 16"/><path d="M4 20.5V16h4.5"/>',
    play: '<path d="M8 5v14l11-7z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
    star: '<path fill="currentColor" stroke-width="1.5" d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.6l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
    cloud: '<path d="M7 18.5h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.7 1.6A3.3 3.3 0 0 0 7 18.5z"/>',
    hourglass: '<path d="M6 3h12M6 21h12"/><path d="M7.5 3v2.5a4.5 4.5 0 0 0 9 0V3M7.5 21v-2.5a4.5 4.5 0 0 1 9 0V21"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    award: '<circle cx="12" cy="9" r="5.5"/><path d="m8.6 13.4-1.6 7.6 5-2.7 5 2.7-1.6-7.6"/>',
    sprout: '<path d="M12 21v-8.5"/><path d="M12 12.5C12 8 8.5 5 4 5c0 4.5 3.5 7.5 8 7.5z"/><path d="M12 10.5c0-4 3-7 8-7 0 4.2-3.2 7-8 7z"/>',
    checkcircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.8L16.5 9"/>',
    wrench: '<path d="M14.7 6.3a4.2 4.2 0 0 1 5.3-.7l-3 3 .4 2 2 .4 3-3a4.2 4.2 0 0 1-5.4 5.4l-7.3 7.3a2.1 2.1 0 0 1-3-3l7.3-7.3a4.2 4.2 0 0 1 .7-4.1z"/>',
    cap: '<path d="M2 9.5 12 5l10 4.5L12 14z"/><path d="M6 11.5v4.5c3.3 2.6 8.7 2.6 12 0v-4.5"/><path d="M22 9.5v5.5"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    // unit topics
    shield: '<path d="M12 3 5 6v5.5c0 4.6 3 7.8 7 9.5 4-1.7 7-4.9 7-9.5V6z"/>',
    shieldlock: '<path d="M12 3 5 6v5.5c0 4.6 3 7.8 7 9.5 4-1.7 7-4.9 7-9.5V6z"/><rect x="9.3" y="11" width="5.4" height="4.2" rx="1"/><path d="M10.4 11V9.6a1.6 1.6 0 0 1 3.2 0V11"/>',
    server: '<rect x="4" y="4" width="16" height="7" rx="1.5"/><rect x="4" y="13" width="16" height="7" rx="1.5"/><path d="M8 7.5h.01M8 16.5h.01"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.8 3.5 6 3.5 9s-.9 6.2-3.5 9c-2.6-2.8-3.5-6-3.5-9s.9-6.2 3.5-9z"/>',
    card: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
    chip: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 3.5V7M14 3.5V7M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5"/>',
    puzzle: '<path d="M5 8.5h3.2a2.3 2.3 0 1 1 4.6 0H16v3.2a2.3 2.3 0 1 1 0 4.6V20H5v-3.7a2.3 2.3 0 1 0 0-4.6z"/>',
    scale: '<path d="M12 4v16M7.5 20h9M5 7.5h14"/><path d="M5 7.5 2.5 13a2.5 2.5 0 0 0 5 0zM19 7.5 16.5 13a2.5 2.5 0 0 0 5 0z"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4.5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M15 10.2c3.4.2 6 1.4 6 2.8v4.5c0 1.7-2.7 3-6 3-2.4 0-4.4-.7-5.4-1.7"/>',
    code: '<path d="m8 7.5-5 4.5 5 4.5M16 7.5l5 4.5-5 4.5M13.5 4.5l-3 15"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8.5-8.5M16.5 6.5l2.5 2.5M14 9l2 2"/>',
    rocket: '<path d="M13.5 15.5c-2.3-.8-4.2-2.7-5-5C10 6.6 13.6 3.5 20.5 3.5c0 6.9-3.1 10.5-7 12z"/><path d="M8.5 10.5H5l2.5-3.5h3.6M13.5 15.5V19l3.5-2.5v-3.6"/><path d="M6.5 17.5c-1 1-1.5 3-1.5 3s2-.5 3-1.5"/>',
    activity: '<path d="M3 12h4l3-7.5 4 15 3-7.5h4"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    inbox: '<path d="M3 13.5h5l1.2 3h5.6l1.2-3h5"/><path d="M5.5 5h13l2.5 8.5V19H3v-5.5z"/>',
    database: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>'
  };
  window.ICONS = P;
  window.ICON = (name, cls = '') =>
    `<svg class="ic ic-${name} ${cls}" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || P.cloud}</svg>`;
})();
