// DinoPixel - iconos, volumen, velocidad, bucle, pantallas, pausa y entrada.
// Classic script: shares the page's global scope with the other js/ files, loaded in order by index.html.
'use strict';

/* ---------- pixel icons ---------- */
// '1' = filled cell. Rendered as inline SVG (crisp edges, colored with currentColor).
const ICONS = {
  play: ['10000000', '11000000', '11100000', '11110000', '11110000', '11100000', '11000000', '10000000'],
  pause: ['01100110', '01100110', '01100110', '01100110', '01100110', '01100110', '01100110', '01100110'],
  sound: ['00001000', '00011010', '11111001', '11111001', '11111001', '00011010', '00001000', '00000000'],
  mute: ['00001000', '00011000', '11111101', '11111010', '11111101', '00011000', '00001000', '00000000'],
  bolt: ['00001100', '00011000', '00110000', '01111110', '00001100', '00011000', '00110000', '00100000'],
  fullscreen: ['11100111', '10000001', '10000001', '00000000', '00000000', '10000001', '10000001', '11100111'],
  home: ['00011000', '00111100', '01111110', '11111111', '01111110', '01100110', '01100110', '01100110'],
  download: ['00011000', '00011000', '00011000', '01111110', '00111100', '00011000', '00000000', '11111111'],
  star: ['00011000', '00011000', '11111111', '01111110', '00111100', '00111100', '01100110', '01000010'],
  close: ['10000001', '01000010', '00100100', '00011000', '00011000', '00100100', '01000010', '10000001'],
  up: ['00011000', '00111100', '01111110', '11111111', '00011000', '00011000', '00011000', '00011000'],
  down: ['00011000', '00011000', '00011000', '00011000', '11111111', '01111110', '00111100', '00011000'],
  lock: ['00111100', '01000010', '01000010', '11111111', '11111111', '11110111', '11110111', '11111111'],
  vibrate: ['00011000', '10011001', '10011001', '10011001', '10011001', '10011001', '00011000', '00000000'],
  help: ['00111100', '01100110', '00000110', '00001100', '00011000', '00000000', '00011000', '00011000'],
  trophy: ['11111111', '10111101', '10111101', '01111110', '00111100', '00011000', '00011000', '00111100'],
  share: ['00010000', '00111000', '01010100', '00010000', '00010000', '10010001', '10000001', '11111111'],
  trash: ['00111100', '11111111', '01000010', '01011010', '01011010', '01011010', '01000010', '01111110'],
  medal: ['01100110', '00111100', '00011000', '00111100', '01111110', '01111110', '01111110', '00111100'],
  note: ['00001100', '00001110', '00001011', '00001001', '00001000', '01111000', '11111000', '01110000'],
  volume: ['00000010', '00000010', '00001010', '00001010', '00101010', '00101010', '10101010', '10101010'],
  coin: ['00111100', '01111110', '11011111', '11011111', '11011111', '11011111', '01111110', '00111100'],
  cart: ['11000000', '01111111', '01000001', '01000001', '01111111', '01000000', '00100100', '00100100'],
  target: ['00111100', '01000010', '10011001', '10111101', '10111101', '10011001', '01000010', '00111100'],
  check: ['00000000', '00000001', '00000011', '10000110', '11001100', '01111000', '00110000', '00000000'],
  globe: ['00111100', '01011010', '10011001', '11111111', '10011001', '10011001', '01011010', '00111100'],
  gear: ['00011000', '01111110', '01100110', '11000011', '11000011', '01100110', '01111110', '00011000'],
  cloud: ['00000000', '00111000', '01111100', '01111110', '11111111', '11111111', '01111110', '00000000'],
  phone: [                                       // a phone: thin bezel, big screen, speaker slit, home button
    '011111110', '111111111', '111000111', '111111111', '100000001', '100000001', '100000001', '100000001',
    '100000001', '100000001', '100000001', '111111111', '111101111', '111111111', '011111110',
  ],
};
function iconSvg(name) {
  const rows = ICONS[name];
  const w = rows[0].length, h = rows.length;
  let d = '';
  rows.forEach((r, y) => { for (let x = 0; x < w; x++) if (r[x] === '1') d += `M${x} ${y}h1v1h-1z`; });
  return `<svg class="ic" style="--w:${w};--h:${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}"/></svg>`;
}
const setIcon = (el, name) => { el.innerHTML = iconSvg(name); };
document.querySelectorAll('i[data-icon]').forEach((el) => setIcon(el, el.dataset.icon));

/* ---------- volume ---------- */
const VOLS = [0.25, 0.5, 0.75, 1];
let vol = Number(store.get('dp-vol', '1'));
if (!VOLS.includes(vol)) vol = 1;
function showVol() { ['vol', 'vol2'].forEach((id) => { $(id).querySelector('span').textContent = L('Volumen ', 'Volume ') + Math.round(vol * 100) + '%'; }); }
function cycleVol(e) {
  vol = VOLS[(VOLS.indexOf(vol) + 1) % VOLS.length];
  store.set('dp-vol', String(vol));
  const a = getAudio();
  if (a && master) master.gain.setTargetAtTime(vol * vol, a.currentTime, 0.02);   // squared: a gentler, more natural taper
  beep(660, 660, 0.09, 'square', 0.07, true);                                   // a blip so you can hear the new level, even in the menu
  showVol();
  e.currentTarget.blur();
}
['vol', 'vol2'].forEach((id) => $(id).addEventListener('click', cycleVol));
showVol();

/* ---------- game speed ---------- */
const simPace = () => pace;                                     // (the turtle used to play 15% slower: too easy with its shell)
const PACES = [0.6, 0.7, 0.8, 0.9, 1];
const fine = !window.matchMedia('(pointer: coarse)').matches;   // mouse/keyboard devices default to 80%
let pace = Number(store.get('dp-pace', fine ? '0.8' : '1'));
if (!PACES.includes(pace)) pace = fine ? 0.8 : 1;
function showPace() {
  ['pace', 'pace2'].forEach((id) => { $(id).querySelector('span').textContent = L('Velocidad ', 'Speed ') + Math.round(pace * 100) + '%'; });
}
function cyclePace(e) {
  pace = PACES[(PACES.indexOf(pace) + 1) % PACES.length];
  store.set('dp-pace', String(pace));
  showPace();
  e.currentTarget.blur();
}
['pace', 'pace2'].forEach((id) => $(id).addEventListener('click', cyclePace));
showPace();

/* ---------- loop ---------- */
let inGame = false;
let last = performance.now();
function frame(t) {
  const dt = Math.min((t - last) / 16.667, 3) * simPace();   // pace < 1 slows the whole simulation evenly
  last = t;
  if (inGame) {
    if (!paused) update(dt);
    draw();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- screens, fullscreen, pause ---------- */
const menu = $('menu'), stage = $('stage'), pauseEl = $('pause');
// Installed PWA (standalone / fullscreen): already chrome-less, so never ask for fullscreen again.
// On Android every fullscreen request shows a system "swipe to exit" notice.
const installed = ['fullscreen', 'standalone', 'minimal-ui'].some((m) => window.matchMedia('(display-mode: ' + m + ')').matches)
  || navigator.standalone === true;
const inFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
async function goFs() {
  const el = document.documentElement;
  try {
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req && !installed && !inFs()) await req.call(el, { navigationUI: 'hide' });
  } catch { /* not allowed or unsupported (iOS Safari): the stage still fills the window */ }
  try { await screen.orientation.lock('landscape'); } catch { /* only works in fullscreen / installed PWA on Android */ }
}
function leaveFs() {
  try { if (inFs()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch { /* ignore */ }
  try { screen.orientation.unlock(); } catch { /* ignore */ }
}
function renderMissions() {                                  // the pause menu lists this run's missions with their progress
  const ul = $('missions');
  ul.replaceChildren(...missions.map((x) => {
    const li = document.createElement('li'); li.className = x.done ? 'done' : '';
    li.textContent = missionText(x) + ' - ' + (x.done ? L('hecho', 'done') : missionProgress(x) + ' / ' + x.m.n) + ' (+' + x.m.reward + ')';
    return li;
  }));
  ul.hidden = !missions.length || state !== 'running';
}
function setPaused(v) {
  paused = v && inGame;
  jumpHeld = false;
  pauseEl.hidden = !paused;
  if (paused) renderMissions();
  refreshShare();
  if (paused) stopMusic(0.12); else if (inGame && state === 'running') startMusic(false);
  $('fs').hidden = inFs() || installed;
}
function enterGame() {
  inGame = true;
  menu.hidden = true;
  stage.hidden = false;
  goFs().then(resize);
  resize();
  reset();
  state = 'ready';
  setPaused(false);
  if (isPortraitTouch()) setPaused(true);
}
function exitGame() {
  inGame = false;
  endZen();
  runMode = 'normal';
  setPaused(false);
  stage.hidden = true;
  menu.hidden = false;
  showShare(false);
  stopMusic(0.2);
  refreshPicker();
  $('play').focus();
}
const portraitTouch = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
const isPortraitTouch = () => portraitTouch.matches;
portraitTouch.addEventListener('change', () => { if (inGame && portraitTouch.matches) setPaused(true); });
window.addEventListener('resize', resize);
document.addEventListener('fullscreenchange', () => { resize(); if (inGame && !inFs()) setPaused(true); });
document.addEventListener('webkitfullscreenchange', () => { resize(); if (inGame && !inFs()) setPaused(true); });
stage.addEventListener('contextmenu', (e) => e.preventDefault());
$('play').addEventListener('click', enterGame);
$('pause-btn').addEventListener('click', () => setPaused(true));
$('resume').addEventListener('click', () => setPaused(false));
$('fs').addEventListener('click', async () => { await goFs(); setPaused(true); });
$('home').addEventListener('click', exitGame);

/* ---------- input ---------- */
function press() {
  if (state === 'ready') { start(); jump(); }
  else if (state === 'over') { if (performance.now() - diedAt > 350) start(); }
  else jump();
}

document.addEventListener('keydown', (e) => {
  if (!cloudEl.hidden) { if (e.code === 'Escape') { e.preventDefault(); closeCloud(); } return; }
  if (!dailyEl.hidden) { if (e.code === 'Escape') { e.preventDefault(); closeDaily(); } return; }
  if (!shopEl.hidden) { if (e.code === 'Escape') { e.preventDefault(); closeShop(); } return; }
  if (!achEl.hidden) { if (e.code === 'Escape') { e.preventDefault(); closeAch(); } return; }
  if (!rankEl.hidden) { if (e.code === 'Escape') { e.preventDefault(); closeRank(); } return; }
  if (!settingsEl.hidden) { if (e.code === 'Escape') { e.preventDefault(); closeSettings(); } return; }
  if (!help.hidden) { if (e.code === 'Escape' || e.code === 'KeyH') { e.preventDefault(); closeHelp(); } return; }
  if (e.code === 'KeyH') { e.preventDefault(); if (inGame) setPaused(true); openHelp(); return; }
  if (!inGame) {
    if (e.code === 'KeyM') setMuted(!muted);
    if (e.code === 'KeyN') setMusic(!music.on);
    if (e.code === 'KeyF') { if (inFs()) leaveFs(); else goFs(); }
    return;
  }
  if (e.repeat) { if (e.code === 'Space' || e.code === 'ArrowUp') e.preventDefault(); return; }
  switch (e.code) {
    case 'Space': case 'ArrowUp': case 'KeyW':
      e.preventDefault();
      if (paused) { if (e.code === 'Space') setPaused(false); } else { jumpHeld = true; press(); }
      break;
    case 'ArrowDown': case 'KeyS': e.preventDefault(); if (!paused) fastFall(); break;
    case 'KeyP': case 'Escape': setPaused(!paused); break;
    case 'KeyF': if (inFs()) leaveFs(); else goFs(); break;
    case 'KeyM': setMuted(!muted); break;
    case 'KeyN': setMusic(!music.on); break;
  }
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') jumpHeld = false;
  if (inGame && e.code === 'Space') e.preventDefault();
});

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (paused) return;
  jumpHeld = true; press();                                  // tap anywhere: jump (hold for a higher jump)
  swipeY = e.clientY;
});
let swipeY = null;                                           // swipe down in the air: fast fall
canvas.addEventListener('pointermove', (e) => { if (swipeY !== null && e.clientY - swipeY > 40) { swipeY = null; jumpHeld = false; fastFall(); } });
canvas.addEventListener('pointerup', () => { swipeY = null; });
['pointerup', 'pointercancel', 'pointerleave'].forEach((n) => canvas.addEventListener(n, () => { jumpHeld = false; }));
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'running') setPaused(true); });
window.addEventListener('blur', () => { jumpHeld = false; if (state === 'running') setPaused(true); });
