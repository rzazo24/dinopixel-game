// DinoPixel - menú: selector de animales, ajustes, instalación, PWA y gancho de tests.
// Classic script: shares the page's global scope with the other js/ files, loaded in order by index.html.
'use strict';

/* ---------- UI: animal picker, sound, install ---------- */
const picker = $('picker');
function showAbility() {
  const [n, d] = ABILITY[animal.id];
  $('ability').textContent = animal.name + ': ' + n + ' - ' + d;
}
function showCoins() {                                   // total coins ever collected (kept with the other stats)
  $('coins-total').textContent = balance().toLocaleString(LOCALE);
  $('wallet').setAttribute('aria-label', balance() + L(' monedas. Toca para ir a la tienda', ' coins. Tap to open the shop'));
}
function drawCard(b, a) {
  const c = b.querySelector('canvas'), g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = false;
  const img = lookOf(a).frames[0], k = Math.min(c.width / img.width, c.height / img.height);   // a hat makes it taller: fit it
  g.drawImage(img, (c.width - img.width * k) / 2, c.height - img.height * k, img.width * k, img.height * k);
}
function refreshPicker() {
  showCoins();
  showDaily();
  [...picker.children].forEach((b) => {
    const a = ANIMALS.find((x) => x.id === b.dataset.id);
    const open = unlocked(a);
    b.classList.toggle('locked', !open);
    drawCard(b, a);
    b.setAttribute('aria-disabled', String(!open));
    b.querySelector('span').textContent = open ? a.name : '???';
    b.querySelector('small').innerHTML = open
      ? iconSvg('star') + store.get('dp-hi-' + a.id, '0')
      : iconSvg('lock') + a.unlock;
  });
  showAbility();
  const next = ANIMALS.filter((a) => !unlocked(a)).sort((x, y) => x.unlock - y.unlock)[0];
  $('tag').textContent = next ? L('Próximo animal a los ', 'Next animal at ') + next.unlock : L('Todos desbloqueados!', 'All unlocked!');
}
function selectAnimal(id) {
  const a = ANIMALS.find((x) => x.id === id) || ANIMALS[0];
  if (!unlocked(a)) return;
  animal = a;
  store.set('dp-animal', animal.id);
  [...picker.children].forEach((b) => b.classList.toggle('on', b.dataset.id === animal.id));
  hi = Number(store.get('dp-hi-' + animal.id, '0'));
  showAbility();
}
ANIMALS.forEach((a) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pick';
  b.dataset.id = a.id;
  const c = document.createElement('canvas');
  c.width = c.height = (SP + 2) * S;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(a.frames[0], 0, 0, (SP + 2) * S, (SP + 2) * S);
  const s = document.createElement('span');
  s.textContent = a.name;
  const best = document.createElement('small');
  b.append(c, s, best);
  b.addEventListener('click', () => selectAnimal(a.id));
  picker.appendChild(b);
});
selectAnimal(animal.id);
refreshPicker();

function setMuted(m) {
  muted = m;
  store.set('dp-muted', m ? '1' : '0');
  setIcon($('mute').querySelector('i'), m ? 'mute' : 'sound');
  $('mute').querySelector('span').textContent = m ? L('Sin efectos', 'No sounds') : L('Efectos', 'Sounds');
}
function setVibe(v) {
  vibeOn = v;
  store.set('dp-vibe', v ? '1' : '0');
  $('vibe').querySelector('span').textContent = v ? L('Vibración', 'Vibration') : L('Sin vibración', 'No vibration');
  $('vibe').classList.toggle('off', !v);
}
if (canVibrate) $('vibe').hidden = false;      // hide the button on devices without vibration (iOS, desktop)
$('vibe').addEventListener('click', (e) => { setVibe(!vibeOn); if (vibeOn) haptic(25); e.currentTarget.blur(); });
setVibe(vibeOn);
$('mute').addEventListener('click', (e) => { setMuted(!muted); e.currentTarget.blur(); });
function setMusic(on) {
  music.on = on;
  store.set('dp-music', on ? '1' : '0');
  $('music').querySelector('span').textContent = on ? L('Música', 'Music') : L('Sin música', 'No music');
  $('music').classList.toggle('off', !on);
  if (!on) stopMusic(0.15);
  else if (inGame && state === 'running' && !paused) startMusic(false);
}
$('music').addEventListener('click', (e) => { setMusic(!music.on); e.currentTarget.blur(); });
setMusic(music.on);
setMuted(muted);
$('lang').querySelector('span').textContent = L('English', 'Español');   // shows the language you switch to
$('lang').addEventListener('click', () => { store.set('dp-lang', L('en', 'es')); location.reload(); });

let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvt = e;
  $('install').hidden = false;
});
$('install').addEventListener('click', async () => {
  if (!installEvt) return;
  installEvt.prompt();
  await installEvt.userChoice;
  installEvt = null;
  $('install').hidden = true;
});
window.addEventListener('appinstalled', () => { $('install').hidden = true; });

/* ---------- PWA: service worker + "new version" notice ---------- */
if ('serviceWorker' in navigator) {
  const toast = $('update');
  let reloading = false;

  const offer = (worker) => {
    toast.hidden = false;
    $('update-now').onclick = () => worker.postMessage({ type: 'SKIP_WAITING' });
    $('update-later').onclick = () => { toast.hidden = true; };
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });

  window.addEventListener('load', async () => {
    let reg;
    try { reg = await navigator.serviceWorker.register('sw.js'); } catch { return; }

    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener('statechange', () => {
        // "installed" with an existing controller = an update, not the first install
        if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w);
      });
    });

    // look for updates when the app comes back to the foreground and hourly
    const check = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    setInterval(check, 60 * 60 * 1000);
  });
}

/* ---------- test hook: only when the URL has ?test=1 (used by tests/, harmless otherwise) ---------- */
if (/[?&]test=1/.test(location.search)) {
  window.__dp = {
    ANIMALS, ACH, stats, ach, music, sfx, get master() { return master; }, press, setScore: (v) => { score = v; },
     setJump: (v) => { jumpHeld = v; },
    get P() { return P; }, get o() { return obstacles; }, get state() { return state; }, get score() { return score; },
    get biome() { return BIOMES[biome].id; }, BIOMES, SONGS, get night() { return night; }, get banner() { return banner; }, get K() { return K; }, spawn, makeMover, spawnMover: () => { const m = makeMover(); if (m) obstacles.push(m); return m; }, get cloudCode() { return cloudCode; }, cloudSave, snapshot, persist, get daily() { return daily; }, makeDaily, todayStr, yesterdayStr, get dailyDoneRun() { return dailyDoneRun; }, balance, get items() { return items; }, get coinsRun() { return coinsRun; }, get magnetT() { return magnetT; }, get GROUND() { return GROUND; }, get W() { return W; }, get insets() { return [insetL, insetR]; }, textBoxes, get speed() { return speed; }, get best() { return best; }, get newAch() { return newAch; }, get achShow() { return achShow; },
  };
}
