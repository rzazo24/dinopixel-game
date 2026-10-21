// UI tests: drives the real game in headless Chrome (menu, overlays, a run, abilities, achievements, ranking, PWA files).
// The game exposes window.__dp only when the URL has ?test=1.
import { sleep, freePort, suite, startMockRedis, startSite, launchChrome } from './lib.mjs';

const t = suite('UI');
const redisPort = await freePort(), sitePort = await freePort();
const redis = await startMockRedis(redisPort);
const site = await startSite(sitePort, redisPort);
const chrome = await launchChrome({ width: 1000, height: 560 });
const base = site.base, url = base + '/index.html?test=1';
const ev = chrome.ev;

async function fresh(seed = '') {                // clean storage (seeded before the game loads, so pagehide cannot overwrite it)
  await chrome.goto(base + '/manifest.json', 300);
  await ev(`localStorage.clear(); ${seed}`);
  await chrome.goto(url, 1400);
}
const click = (id) => ev(`document.getElementById('${id}').click()`);
const tap = () => ev(`document.getElementById('game').dispatchEvent(new PointerEvent('pointerdown',{clientX:300,clientY:50,bubbles:true}))`);
const esc = () => ev(`document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true}))`);
const hidden = (id) => ev(`document.getElementById('${id}').hidden`);
const startRun = async (animalId) => {
  if (animalId) await ev(`document.querySelector('[data-id=${animalId}]').click()`);
  await click('play'); await sleep(300); await tap(); await sleep(150);
};
const noObstacles = () => ev(`window.__clr = setInterval(() => { __dp.o.length = 0; }, 3)`);   // physics tests: nothing in the way
const grounded = () => chrome.waitFor(`__dp.state === 'running' && __dp.P.h === 0`, 8000, 30);   // the run starts with a jump: wait for the landing
const maxHeight = async (script, ms) => {
  await ev(`window.__max = 0; window.__t = setInterval(() => { window.__max = Math.max(window.__max, __dp.P.h); }, 3)`);
  await ev(script); await sleep(ms);
  return ev(`clearInterval(window.__t); window.__max`);
};
const airTime = async (script) => {
  await ev(`window.__air = 0; window.__a = setInterval(() => { if (__dp.P.h > 0) window.__air += 3; }, 3)`);
  await ev(script); await sleep(2800);
  return ev(`clearInterval(window.__a); window.__air`);
};

try {
  /* ---- static / PWA files ---- */
  const man = await (await fetch(base + '/manifest.json')).json();
  t.check('manifest is valid: standalone + landscape + start_url', man.display === 'standalone' && man.orientation === 'landscape' && man.start_url === './');
  const files = [...man.icons.map((i) => i.src), ...man.screenshots.map((i) => i.src), 'sw.js', 'og-image.png', 'fonts/press-start-2p.woff2'];
  const statuses = await Promise.all(files.map(async (f) => [f, (await fetch(`${base}/${f}`)).status]));
  t.check('icons, screenshots, service worker, preview image and font all exist', statuses.every(([, s]) => s === 200), statuses.filter(([, s]) => s !== 200));

  /* ---- menu ---- */
  await fresh();
  t.check('menu: 9 animal cards, 8 locked on a fresh profile', (await ev(`document.querySelectorAll('.pick').length`)) === 9 && (await ev(`document.querySelectorAll('.pick.locked').length`)) === 8);
  t.check('menu: next unlock hint', (await ev(`document.getElementById('tag').textContent`)).includes('1000'));
  t.check('menu: pixel font loaded', await ev(`document.fonts.check('10px "Press Start 2P"')`));
  t.check('menu: play / speed / sound / ranking / achievements / help buttons', await ev(`['play','pace','mute','music','vol','shop-btn','rank-btn','ach-btn','help-btn'].every(id => document.getElementById(id))`));
  t.check('menu: install errors from Chrome = none', JSON.stringify((await chrome.send('Page.getInstallabilityErrors')).result.installabilityErrors) === '[]');
  const overflow = await (async () => {                       // phone in landscape (short screen): the menu must fit without scrolling
    await chrome.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 340, deviceScaleFactor: 2, mobile: true });
    await sleep(400);
    const r = await ev(`document.documentElement.scrollHeight - innerHeight`);
    await chrome.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 560, deviceScaleFactor: 1, mobile: false });
    return r;
  })();
  t.check('menu fits a 844x340 landscape phone without scrolling', overflow <= 0, overflow);

  /* ---- overlays ---- */
  await click('help-btn'); await sleep(200);
  t.check('help opens with 3 tabs', !(await hidden('help')) && (await ev(`document.querySelectorAll('#help .tab').length`)) === 3);
  await ev(`document.querySelector('[data-tab=animals]').click()`); await sleep(100);
  t.check('help: animals tab lists the 9 animals', (await ev(`document.querySelectorAll('#help-body .row').length`)) === 9);
  await esc(); await sleep(100);
  t.check('Esc closes help', await hidden('help'));
  await click('ach-btn'); await sleep(200);
  t.check('achievements screen: 0/24 on a fresh profile', (await ev(`document.getElementById('ach-count').textContent`)) === '0/24' && (await ev(`document.querySelectorAll('.ach').length`)) === 24);
  await esc(); await sleep(100);
  t.check('Esc closes achievements', await hidden('ach'));

  /* ---- a real run: start, die, game over, share, pause ---- */
  await startRun();
  t.check('run starts', (await ev('__dp.state')) === 'running');
  t.check('game over after hitting a cactus', await chrome.waitFor(`__dp.state === 'over'`, 20000));
  t.check('run is counted and "Primeros pasos" is earned', (await ev('__dp.stats.runs')) === 1 && (await ev('!!__dp.ach.first')));
  await sleep(300);
  t.check('share button appears after a run', (await hidden('share-btn')) === false);
  await ev(`window.__shared = null; navigator.share = (d) => { window.__shared = d; return Promise.resolve(); }`);
  await click('share-btn'); await sleep(200);
  const shared = await ev('window.__shared');
  t.check('share sends score, animal and link', /puntos con Dino en DinoPixel/.test(shared?.text || '') && /\/$/.test(shared?.url || ''), shared);
  t.check('sharing earns "Embajador"', await ev(`!!__dp.ach.share`));
  await click('pause-btn'); await sleep(150);
  t.check('pause menu hides the share button', !(await hidden('pause')) && (await hidden('share-btn')));
  await click('resume'); await sleep(150);
  t.check('share button is back after resuming', (await hidden('share-btn')) === false);
  await click('pause-btn'); await click('home'); await sleep(200);
  t.check('menu button returns to the menu', !(await hidden('menu')) && (await hidden('stage')));

  /* ---- abilities (everything unlocked) ---- */
  const ALL = `localStorage.setItem('dp-best','20000')`;
  await fresh(ALL); await startRun('dino'); await noObstacles(); await grounded();
  const hDino = await maxHeight(`__dp.setJump(true); __dp.press()`, 1100);
  t.check('dino: full jump is about 115px', hDino > 100 && hDino < 130, hDino);

  await fresh(ALL + `;localStorage.setItem('dp-stats', JSON.stringify({doubles:49}))`); await startRun('cat'); await noObstacles(); await grounded();
  const hCat = await maxHeight(`__dp.setJump(true); __dp.press(); setTimeout(() => __dp.press(), 330)`, 1500);
  t.check('cat: a second jump in the air goes much higher than a single jump', hCat > hDino * 1.3, [hCat, hDino]);
  t.check('cat: 50th double jump earns "Rebote"', await ev(`!!__dp.ach.double50`));

  await fresh(ALL); await startRun('bunny'); await noObstacles(); await grounded();
  const hBun = await maxHeight(`__dp.setJump(true); __dp.press()`, 1200);
  t.check('bunny jumps higher than the dino', hBun > hDino * 1.1, [hBun, hDino]);

  await fresh(ALL); await startRun('chick'); await noObstacles(); await grounded();
  const airShort = await airTime(`__dp.setJump(true); __dp.press(); setTimeout(() => __dp.setJump(false), 180)`);
  await sleep(400);
  const airGlide = await airTime(`__dp.setJump(true); __dp.press()`);
  t.check('chicken: holding while falling glides (longer in the air)', airGlide > airShort * 1.2, [airGlide, airShort]);

  // penguin: +50% points, always (compare points per second with the dino)
  const pps = async (id) => { await fresh(ALL); await startRun(id); await noObstacles(); await grounded(); const a = await ev('__dp.score'); await sleep(1500); return ((await ev('__dp.score')) - a) / 1.5; };
  const rPeng = await pps('peng'), rDinoPts = await pps('dino');
  t.check('penguin: earns about 50% more points than the dino', rPeng / rDinoPts > 1.35 && rPeng / rDinoPts < 1.65, [rPeng, rDinoPts]);

  await fresh(ALL); await startRun('dog');
  t.check('dog: starts with a shield', (await ev('__dp.P.shield')) === 1);
  await chrome.waitFor(`__dp.P.shield === 0`, 20000);
  t.check('dog: the first hit is survived', (await ev('__dp.state')) === 'running' && (await ev('__dp.stats.shields')) === 1);
  t.check('dog: an obstacle walked through while invulnerable is not a dodge', (await ev('__dp.stats.dodged')) === 0);
  await ev('__dp.P.shield = 1');   // as if a shield had been picked up
  await chrome.waitFor(`__dp.P.shield === 0`, 20000);
  t.check('dog: a picked-up shield does not count for "Escudo de hierro"', (await ev('__dp.stats.shields')) === 1);
  t.check('dog: the second hit ends the run', await chrome.waitFor(`__dp.state === 'over'`, 25000));

  /* ---- the three newer animals ---- */
  // a mid-height bird right on top of the player: kills a normal animal standing up
  const birdOnPlayer = `__dp.o.push({ type: 'bird', x: 52, dy: -58, w: 42, h: 27, f: 0 })`;
  // frog: charges by itself while on the ground (~3/4 s), shown by a yellow bar (#ffd23f) above it
  const yellowAbove = () => ev(`(() => { const c = document.getElementById('game'), k = __dp.K, g = c.getContext('2d');
    const d = g.getImageData(40 * k, (__dp.GROUND - 70) * k, 70 * k, 40 * k).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 255) < 4 && Math.abs(d[i + 1] - 210) < 4 && Math.abs(d[i + 2] - 63) < 4) n++;
    return n; })()`);
  await fresh(ALL); await startRun('frog'); await noObstacles(); await grounded();
  t.check('frog: no indicator right after landing', (await yellowAbove()) === 0);
  const hFrogPlain = await maxHeight(`__dp.setJump(true); __dp.press()`, 1100);       // jumps straight away: normal jump
  await ev('__dp.setJump(false)'); await grounded();
  t.check('frog: a jump right after landing is a normal one', Math.abs(hFrogPlain - hDino) < 15, [hFrogPlain, hDino]);
  await sleep(1100);                                                                     // stay on the ground: charges by itself
  t.check('frog: after a moment on the ground the yellow "ready" bar shows', (await ev('__dp.P.charge')) >= 45 && (await yellowAbove()) > 0);
  const hFrog = await maxHeight(`__dp.setJump(true); __dp.press()`, 1400);
  t.check('frog: that jump is a super jump (one tap, no crouching)', hFrog > hDino * 1.3, [hFrog, hDino]);
  t.check('frog: the charge is spent by the jump', (await ev('__dp.P.charge')) < 45);

  await fresh(ALL); await startRun('dino'); await ev(`window.__clr = setInterval(() => { __dp.o.splice(0, __dp.o.length, ...__dp.o.filter(o => o.injected)); }, 3)`); await grounded();
  await ev(birdOnPlayer.replace("f: 0 }", "f: 0, injected: true }")); await sleep(300);
  t.check('control: the dino dies to a bird on top of it', (await ev('__dp.state')) === 'over');

  // fox: the first bird passes through, then the dodge recharges (~8 s); orange bar (#ff8a2a) above it when ready
  const orangeAbove = () => ev(`(() => { const c = document.getElementById('game'), k = __dp.K, g = c.getContext('2d');
    const d = g.getImageData(40 * k, (__dp.GROUND - 70) * k, 70 * k, 40 * k).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 255) < 4 && Math.abs(d[i + 1] - 138) < 4 && Math.abs(d[i + 2] - 42) < 4) n++;
    return n; })()`);
  await fresh(ALL); await startRun('fox'); await noObstacles(); await grounded();
  t.check('fox: starts with the dodge ready (orange bar)', (await ev('__dp.P.foxCd')) <= 0 && (await orangeAbove()) > 0);
  await ev(`clearInterval(window.__clr); __dp.o.length = 0; ${birdOnPlayer}`); await sleep(400);
  t.check('fox: the first bird passes through, no input needed', (await ev('__dp.state')) === 'running' && (await ev('__dp.P.foxCd')) > 0);
  t.check('fox: while recharging the bar is not orange', (await orangeAbove()) === 0);
  await ev(`__dp.o.length = 0`); await sleep(300);
  await ev(`__dp.P.foxCd = 0`); await sleep(100);                    // skip the 8 s wait: recharged
  await ev(birdOnPlayer); await sleep(400);
  t.check('fox: once recharged, it dodges again', (await ev('__dp.state')) === 'running');
  await ev(`__dp.o.length = 0`); await sleep(400);
  await ev(birdOnPlayer); await sleep(300);
  t.check('fox: a bird during the recharge hits', (await ev('__dp.state')) === 'over');

  await fresh(ALL); await startRun('turtle'); await noObstacles(); await grounded();
  await ev(`clearInterval(window.__clr); __dp.o.length = 0; ${birdOnPlayer}`); await sleep(800);
  t.check('turtle: birds do not hurt it', (await ev('__dp.state')) === 'running');
  t.check('turtle: walking through a bird is not counted as a dodge', (await ev('__dp.stats.birds')) === 0);
  await ev(`window.__clr = setInterval(() => { __dp.o.length = 0; }, 3)`);
  const rt = async () => { const a = await ev('__dp.score'); await sleep(1500); return ((await ev('__dp.score')) - a) / 1.5; };
  const rTurtle = await rt();
  await fresh(ALL); await startRun('dino'); await noObstacles(); await grounded();
  const rDino = await rt();
  t.check('turtle: the game runs about 15% slower (points per second)', rTurtle / rDino > 0.75 && rTurtle / rDino < 0.95, [rTurtle, rDino]);

  /* ---- no crouching: one action only ---- */
  await fresh(); await startRun(); await noObstacles(); await grounded();
  await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }))`); await sleep(200);
  t.check('controls: the down arrow does nothing (no crouching)', (await ev('__dp.P.h')) === 0 && (await ev('__dp.state')) === 'running');
  const r0 = await ev(`(() => { const r = document.getElementById('game').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.9]; })()`);
  await ev(`document.getElementById('game').dispatchEvent(new PointerEvent('pointerdown', { clientX: ${r0[0]}, clientY: ${r0[1]}, bubbles: true }))`); await sleep(150);
  t.check('controls: tapping the lower part of the screen jumps too', (await ev('__dp.P.h')) > 0);
  await ev('__dp.setScore(400)'); await sleep(100);
  const tops = await ev(`(() => { const s = new Set(); for (let i = 0; i < 600; i++) { __dp.o.length = 0; __dp.spawn(); __dp.o.filter(o => o.type === 'bird').forEach(o => s.add(o.dy)); } __dp.o.length = 0; return [...s].sort((a, b) => a - b); })()`);   // the real spawner
  t.check('birds: three heights (high: run under; mid and low: jump), all valid', JSON.stringify(tops) === '[-100,-58,-34]', tops);
  await ev('__dp.o.length = 0');
  // a mid-height bird can be jumped: hold the jump as it arrives and stay alive
  await fresh(); await startRun(); await noObstacles(); await grounded();
  await ev(`clearInterval(window.__clr); __dp.o.length = 0; __dp.o.push({ type: 'bird', x: 300, dy: -58, w: 42, h: 27, f: 0 })`);
  await ev(`window.__jb = setInterval(() => { const b = __dp.o[0]; if (b && b.x < 50 + 48 + __dp.speed * 9 && __dp.P.h === 0) { __dp.setJump(true); __dp.press(); } }, 5)`);
  await sleep(1500);
  t.check('birds: a mid-height bird can be jumped over', (await ev('__dp.state')) === 'running');
  await ev('clearInterval(window.__jb)');

  /* ---- iPhone haptics: a switch toggled through its label, one tick per "on" step ---- */
  await ev(`window.__ticks = 0; document.addEventListener('click', (e) => { if (e.target.tagName === 'LABEL' && e.target.querySelector('input[switch]')) __ticks++; }, true); __dp.iosPattern([40, 60, 40, 60, 90])`);
  await sleep(400);
  t.check('haptics (iOS): a 3-pulse pattern gives 3 ticks on a hidden switch', (await ev('__ticks')) === 3, await ev('__ticks'));

  /* ---- moving obstacles ---- */
  await fresh(); await startRun();
  await ev(`window.__inv = setInterval(() => { __dp.P.inv = 2; }, 5)`);
  const cactusAt = (x) => `__dp.o.push({ type: 'cactus', x: ${x}, dy: -37, w: 30, h: 39, parts: [{ k: 3, dx: 0, kind: 'cactus' }], zone: 'desert' })`;
  // they show up by themselves from 800 points
  await ev('__dp.setScore(850)');
  t.check('movers: they appear by themselves after 800 points', await chrome.waitFor(`__dp.o.some(o => o.type === 'mover')`, 60000));
  const zoneMover = {};
  for (const [sc, zone] of [[900, 'desert'], [1600, 'snow'], [3100, 'city'], [4600, 'jungle'], [6100, 'volcano']]) {
    await ev(`__dp.setScore(${sc})`); await sleep(400);
    zoneMover[zone] = (await ev('(() => { __dp.o.length = 0; return __dp.spawnMover(); })()'))?.kind;   // clear + make in one step (no spawn in between)
  }
  t.check('movers: one per zone (tumbleweed / snowball / car)', zoneMover.desert === 'tumbleweed' && zoneMover.snow === 'snowball' && zoneMover.city === 'car' && zoneMover.jungle === 'coconut' && zoneMover.volcano === 'boulder', zoneMover);
  // they go faster than the ground: compare with a cactus placed at the same time
  await ev('__dp.setScore(900)'); await sleep(400);
  await ev(`window.__keep = setInterval(() => { for (let i = __dp.o.length - 1; i >= 0; i--) if (!__dp.o[i].keep) __dp.o.splice(i, 1); }, 3)`);
  await ev(`{ __dp.o.length = 0; const m = __dp.makeMover(); m.keep = 1; m.x = 800; ${cactusAt(800)}; __dp.o[0].keep = 1; __dp.o.push(m); }`);   // mover made first: nothing in front of it
  const p0 = await ev('__dp.o.map(o => o.x)'); await sleep(350); const p1 = await ev('__dp.o.map(o => o.x)');
  const ratio = (p0[1] - p1[1]) / (p0[0] - p1[0]), ext = await ev('__dp.o[1].extra');
  t.check('movers: they move faster than the ground (by their "extra")', Math.abs(ratio - (1 + ext)) < 0.08, [ratio, ext]);
  const dys = new Set(); for (let i = 0; i < 10; i++) { dys.add(Math.round(await ev('__dp.o[1].dy'))); await sleep(40); }
  t.check('movers: the tumbleweed bounces', dys.size > 3, [...dys]);
  // fairness: a mover never closes in on the obstacle in front more than the safe gap
  await ev(`{ __dp.o.length = 0; ${cactusAt(300)}; __dp.o[0].keep = 1; window.__safe = __dp.speed * 30 + 80; const m = __dp.makeMover(); if (m) { m.keep = 1; __dp.o.push(m); } }`);
  const minGap = await ev(`new Promise((res) => { let g = 1e9; const t = setInterval(() => { const [a, b] = __dp.o; if (!b || a.x <= 50) { clearInterval(t); res(g); return; } g = Math.min(g, b.x - (a.x + a.w)); }, 4); })`);
  t.check('movers: they never get closer than the safe gap to the obstacle in front', minGap >= (await ev('window.__safe')) * 0.9, [minGap, await ev('window.__safe')]);
  await ev(`__dp.o.length = 0; ${cactusAt('__dp.W - 20')}; __dp.o[0].keep = 1`);   // right next to where new obstacles appear
  t.check('movers: with no room (obstacle just ahead) no mover is made', (await ev('__dp.makeMover()')) === null);
  await ev('clearInterval(window.__keep); clearInterval(window.__inv); __dp.P.inv = 0');
  await sleep(100);
  await ev(`{ __dp.o.length = 0; const m = __dp.makeMover(); m.x = 54; __dp.o.push(m); }`); await sleep(300);
  t.check('movers: touching one ends the run', (await ev('__dp.state')) === 'over');

  /* ---- pickups: coins, shield, magnet ---- */
  await fresh(`localStorage.setItem('dp-stats', JSON.stringify({coins:99}))`); await startRun(); await noObstacles(); await grounded();
  await ev(`clearInterval(window.__clr); window.__clr = setInterval(() => { __dp.o.length = 0; }, 3)`);
  // obstacles keep spawning (and bring their own random coins): keep only the items this test places (tagged)
  await ev(`window.__onlyTagged = setInterval(() => { for (let i = __dp.items.length - 1; i >= 0; i--) if (!__dp.items[i].tag) __dp.items.splice(i, 1); }, 3)`);
  const coinAt = (x, dy) => ev(`__dp.items.push({ kind: 'coin', x: ${x}, dy: ${dy}, w: 14, h: 14, tag: 1 })`);
  const s0 = await ev('__dp.score');
  await coinAt(56, -30); await sleep(250);
  t.check('coin: running into a low coin collects it', (await ev('__dp.coinsRun')) === 1 && (await ev('__dp.items.length')) === 0);
  t.check('coin: it is worth 10 points', (await ev('__dp.score')) - s0 >= 10);
  t.check('coin: the 100th coin earns "Hucha"', await ev('!!__dp.ach.coins100'));
  await coinAt(56, -140); await sleep(300);
  t.check('coin: a coin high in the air is not collected while running', (await ev('__dp.coinsRun')) === 1);
  await ev('__dp.items.length = 0');
  await ev(`__dp.items.push({ kind: 'shield', x: 56, dy: -30, w: 18, h: 18, tag: 1 })`); await sleep(250);
  t.check('shield pickup: gives a shield to any animal', (await ev('__dp.P.shield')) === 1);
  await ev(`__dp.items.push({ kind: 'shield', x: 56, dy: -30, w: 18, h: 18, tag: 1 })`); await sleep(250);
  t.check('shield pickup: shields stack', (await ev('__dp.P.shield')) === 2);
  await ev(`clearInterval(window.__clr); __dp.o.length = 0; __dp.o.push({ type: 'bird', x: 52, dy: -58, w: 42, h: 27, f: 0 })`); await sleep(300);
  t.check('shield pickup: a hit uses only one stacked shield', (await ev('__dp.state')) === 'running' && (await ev('__dp.P.shield')) === 1);
  await ev(`__dp.P.shield = 0`);
  await ev(`window.__clr = setInterval(() => { __dp.o.length = 0; }, 3)`); await sleep(1700);
  await ev(`__dp.items.push({ kind: 'magnet', x: 56, dy: -30, w: 18, h: 18, tag: 1 })`); await sleep(250);
  t.check('magnet pickup: starts a 6 s magnet', (await ev('__dp.magnetT')) > 300);
  const c1 = await ev('__dp.coinsRun');
  await coinAt(150, -140); await sleep(1200);
  t.check('magnet: pulls in a coin that would be out of reach', (await ev('__dp.coinsRun')) === c1 + 1);
  await ev('clearInterval(window.__onlyTagged)');
  // the menu wallet shows the total of coins ever collected
  await click('pause-btn'); await click('home'); await sleep(200);
  t.check('wallet: the menu shows the total coins (99 seeded + the ones collected)', (await ev(`document.getElementById('coins-total').textContent`)) === String(await ev('__dp.stats.coins')) && (await ev('__dp.stats.coins')) >= 101);
  await fresh(`localStorage.setItem('dp-stats', JSON.stringify({coins:12345}))`);
  t.check('wallet: big totals are grouped (12.345)', (await ev(`document.getElementById('coins-total').textContent`)) === '12.345');
  await chrome.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 340, deviceScaleFactor: 2, mobile: true }); await sleep(400);
  const wal = await ev(`(() => { const a = document.getElementById('wallet').getBoundingClientRect(), b = document.querySelector('#menu h1').getBoundingClientRect();
    return { overlap: a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top, inside: a.right <= innerWidth && a.top >= 0 }; })()`);
  t.check('wallet: on a landscape phone it does not cover the title and stays on screen', !wal.overlap && wal.inside, wal);
  { const m = await ev(`(() => { const w = document.getElementById('wallet').getBoundingClientRect(), c = document.querySelector('.corner-left').getBoundingClientRect();
      return { right: innerWidth - w.right, left: c.left, top: Math.min(w.top, c.top) }; })()`);
    t.check('corners: wallet and Reto keep clear of rounded screen corners with no safe-area inset (Android)', m.right >= 30 && m.left >= 30 && m.top >= 22, m); }
  await chrome.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 560, deviceScaleFactor: 1, mobile: false });
  await click('play'); await sleep(300);
  t.check('wallet: hidden during the game', (await ev(`document.getElementById('wallet').offsetParent`)) === null);

  /* ---- daily challenge ---- */
  const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const today = ymd(new Date()), yesterday = ymd(new Date(Date.now() - 864e5));
  await fresh();
  const d1 = await ev('JSON.stringify(__dp.daily)');
  t.check('daily: a challenge for today is created', JSON.parse(d1).date === today && ['animal', 'coins', 'birds', 'dodge', 'time'].includes(JSON.parse(d1).type), d1);
  await chrome.goto(base + '/manifest.json', 300); await chrome.goto(url, 1400);
  t.check('daily: it stays the same all day (after a reload)', (await ev('JSON.stringify(__dp.daily)')) === d1);
  const variety = await ev(`(() => { const s = new Set(); for (let i = 0; i < 60; i++) { const d = new Date(2026, 0, 1 + i); s.add(__dp.makeDaily(d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(), ['dino']).type); } return s.size; })()`);
  t.check('daily: the 5 kinds of challenge come up over two months', variety === 5, variety);
  t.check('daily: same date -> same challenge (deterministic)', (await ev(`JSON.stringify(__dp.makeDaily('2026-12-01', ['dino','cat']))`)) === (await ev(`JSON.stringify(__dp.makeDaily('2026-12-01', ['dino','cat']))`)));
  const coinsDaily = (extra) => `localStorage.setItem('dp-daily', JSON.stringify({ date: '${today}', type: 'coins', n: 1, animal: null, reward: 50, done: false, best: 0 })); ${extra || ''}`;
  await fresh(coinsDaily());
  await click('play'); await sleep(300);
  t.check('daily: the start screen shows the challenge', (await ev(`__dp.textBoxes.map(b => b.t).join('|')`)).includes('Reto: Recoge 1 monedas en una partida'));
  await tap(); await sleep(150); await noObstacles(); await grounded();
  await ev(`window.__onlyTagged = setInterval(() => { for (let i = __dp.items.length - 1; i >= 0; i--) if (!__dp.items[i].tag) __dp.items.splice(i, 1); }, 3)`);
  await ev(`__dp.items.push({ kind: 'coin', x: 56, dy: -30, w: 14, h: 14, tag: 1 })`); await sleep(300);
  t.check('daily: completing it pays the prize (50) on top of the coin', (await ev('__dp.daily.done')) && (await ev('__dp.balance()')) === 51 && (await ev('__dp.stats.bonus')) === 50);
  t.check('daily: a banner announces it, streak starts at 1', (await ev('__dp.banner.text')) === 'Reto del día! +50' && (await ev('__dp.stats.dailyStreak')) === 1 && (await ev('__dp.stats.dailyDone')) === 1);
  t.check('daily: prize coins do not count for the coin achievements', (await ev('__dp.stats.coins')) === 1);
  await ev(`__dp.items.push({ kind: 'coin', x: 56, dy: -30, w: 14, h: 14, tag: 1 })`); await sleep(300);
  t.check('daily: it pays only once a day', (await ev('__dp.stats.bonus')) === 50);
  await ev('clearInterval(window.__onlyTagged)');
  await click('pause-btn'); await click('home'); await sleep(150);
  t.check('daily: the menu chip shows it as done', await ev(`document.getElementById('daily-chip').classList.contains('done')`));
  await ev(`document.getElementById('daily-chip').click()`); await sleep(150);
  t.check('daily: the detail screen says it is completed', /Completado/.test(await ev(`document.getElementById('daily-body').textContent`)));
  await esc(); await sleep(100);
  // streak: yesterday's challenge was done, with a 2-day streak -> today is day 3, prize 50 + 2x10
  await fresh(coinsDaily(`localStorage.setItem('dp-stats', JSON.stringify({ dailyLast: '${yesterday}', dailyStreak: 2, dailyDone: 6 }))`));
  await startRun(); await noObstacles(); await grounded();
  await ev(`window.__onlyTagged = setInterval(() => { for (let i = __dp.items.length - 1; i >= 0; i--) if (!__dp.items[i].tag) __dp.items.splice(i, 1); }, 3)`);
  await ev(`__dp.items.push({ kind: 'coin', x: 56, dy: -30, w: 14, h: 14, tag: 1 })`); await sleep(300);
  t.check('daily: a streak adds +10 per day (day 3 -> 70)', (await ev('__dp.stats.dailyStreak')) === 3 && (await ev('__dp.stats.bonus')) === 70, [await ev('__dp.stats.dailyStreak'), await ev('__dp.stats.bonus')]);
  t.check('daily: the 7th completed challenge earns "Constancia"', await ev('!!__dp.ach.daily7'));
  await ev('clearInterval(window.__onlyTagged)');

  /* ---- cloud save: activate, autosave after a run, restore on a clean device, delete ---- */
  const load = async (code) => (await fetch(base + '/api/load', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })).json();
  await fresh(`localStorage.setItem('dp-best', '3333'); localStorage.setItem('dp-stats', JSON.stringify({ coins: 77, runs: 5 })); localStorage.setItem('dp-skin-dino', 'gold'); localStorage.setItem('dp-vol', '0.5')`);
  await ev(`document.getElementById('cloud-chip').click()`); await sleep(150);
  t.check('cloud: off by default, with an "activate" button', !(await hidden('cloud')) && !(await hidden('cloud-off')) && (await hidden('cloud-active')));
  await click('cloud-on'); await chrome.waitFor(`!!__dp.cloudCode`, 5000);
  const ccode = await ev('__dp.cloudCode');
  t.check('cloud: activating shows a recovery code and remembers it', /^[A-Z2-9]{5}-[A-Z2-9]{5}$/.test(ccode) && (await ev(`document.getElementById('cloud-code').textContent`)) === ccode && (await ev(`localStorage.getItem('dp-cloud')`)) === ccode);
  let saved = await load(ccode);
  t.check('cloud: the server copy has the progress (best, coins, skin)', saved.data.keys['dp-best'] === '3333' && JSON.parse(saved.data.keys['dp-stats']).coins === 77 && saved.data.keys['dp-skin-dino'] === 'gold');
  t.check('cloud: device settings are not uploaded (volume)', !('dp-vol' in saved.data.keys) && !('dp-cloud' in saved.data.keys));
  await esc(); await sleep(100);
  await startRun();
  await chrome.waitFor(`__dp.state === 'over'`, 25000);
  await sleep(3000);                                         // autosave runs 2 s after the run ends
  saved = await load(ccode);
  t.check('cloud: a finished run is saved automatically', JSON.parse(saved.data.keys['dp-stats']).runs === 6, JSON.parse(saved.data.keys['dp-stats']).runs);
  // a "new phone": clean storage, different local progress and its own volume setting
  await fresh(`localStorage.setItem('dp-best', '10'); localStorage.setItem('dp-vol', '0.25')`);
  await ev(`document.getElementById('cloud-chip').click()`); await sleep(150);
  await ev(`document.getElementById('cloud-input').value = '${ccode.toLowerCase()}'`);
  await click('cloud-restore');
  t.check('cloud: restoring asks for confirmation first', await chrome.waitFor(`/Pulsa otra vez/.test(document.getElementById('cloud-restore').textContent)`, 5000));
  await click('cloud-restore'); await sleep(1800);           // replaces local data and reloads the page
  t.check('cloud: after restoring, the progress is back (best, coins, runs, skin)', (await ev('__dp.best')) === 3333 && (await ev('__dp.stats.coins')) === 77 && (await ev('__dp.stats.runs')) === 6 && (await ev(`localStorage.getItem('dp-skin-dino')`)) === 'gold');
  t.check('cloud: the device keeps saving to the same code', (await ev('__dp.cloudCode')) === ccode);
  t.check('cloud: device settings stay as they were on this device', (await ev(`localStorage.getItem('dp-vol')`)) === '0.25');
  t.check('cloud: the wallet shows the restored coins', (await ev(`document.getElementById('coins-total').textContent`)) === '77');
  await ev(`document.getElementById('cloud-chip').click()`); await sleep(150);
  await click('cloud-del'); await click('cloud-del');
  t.check('cloud: delete (two clicks) removes the server copy and forgets the code here', (await chrome.waitFor(`!__dp.cloudCode`, 5000)) && (await load(ccode)).error === 'not_found' && (await ev('__dp.best')) === 3333);
  await esc(); await sleep(100);
  await chrome.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 340, deviceScaleFactor: 2, mobile: true }); await sleep(400);
  const corner = await ev(`(() => { const a = document.querySelector('.corner-left').getBoundingClientRect(), b = document.querySelector('#menu h1').getBoundingClientRect();
    return !(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) && a.left >= 0; })()`);
  t.check('cloud: the Reto/Guardado buttons do not cover the title on a landscape phone', corner);
  await chrome.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 560, deviceScaleFactor: 1, mobile: false });

  /* ---- statistics + shop ---- */
  await fresh(`localStorage.setItem('dp-stats', JSON.stringify({coins:1500, runs:42, timeSec:5430, jumps:812}))`);
  await click('ach-btn'); await ev(`document.querySelector('[data-atab=stats]').click()`); await sleep(150);
  const stx = await ev(`document.getElementById('ach-body').textContent`);
  t.check('stats: the statistics tab shows runs, play time and jumps', /Partidas jugadas42/.test(stx) && /1 h 30 min/.test(stx) && /Saltos812/.test(stx), stx.slice(0, 160));
  t.check('stats: it lists a record for each of the 9 animals', (await ev(`document.querySelectorAll('#ach-body .rec').length`)) === 9);
  await esc(); await sleep(100);
  await ev(`document.getElementById('wallet').click()`); await sleep(200);
  t.check('shop: tapping the wallet opens the shop with the balance', !(await hidden('shop')) && (await ev(`document.getElementById('shop-balance').textContent`)) === '1500');
  const buyFor = (name) => ev(`(() => { const row = [...document.querySelectorAll('#shop-body .item')].find(r => r.querySelector('em').textContent === '${name}'); row.querySelector('.buy').click(); })()`);
  await buyFor('Gato'); await sleep(150);
  t.check('shop: buying the cat (100) unlocks it and lowers the balance', (await ev(`document.getElementById('shop-balance').textContent`)) === '1400' && (await ev(`!document.querySelector('[data-id=cat]').classList.contains('locked')`)));
  t.check('shop: spending does not lower the coins collected (achievements keep counting)', (await ev('__dp.stats.coins')) === 1500 && (await ev('__dp.stats.spent')) === 100);
  await buyFor('Tortuga'); await sleep(150);
  t.check('shop: buying the turtle (800) leaves 600', (await ev(`document.getElementById('shop-balance').textContent`)) === '600');
  await buyFor('Zorro'); await sleep(150);
  t.check('shop: not enough coins -> nothing bought, says how many are missing', (await ev(`document.getElementById('shop-balance').textContent`)) === '600' && /Te faltan 100/.test(await ev(`document.getElementById('shop-msg').textContent`)) && (await ev(`document.querySelector('[data-id=fox]').classList.contains('locked')`)));
  await esc(); await sleep(100);
  t.check('shop: the menu wallet shows what is left to spend', (await ev(`document.getElementById('coins-total').textContent`)) === '600');
  await chrome.goto(base + '/manifest.json', 300); await chrome.goto(url, 1400);
  t.check('shop: purchases survive a reload', (await ev(`!document.querySelector('[data-id=turtle]').classList.contains('locked')`)) && (await ev(`document.getElementById('coins-total').textContent`)) === '600');
  // colour skin: the dino's green (#4caf50) disappears from the player once the gold skin is on
  const greenOnPlayer = () => ev(`(() => { const c = document.getElementById('game'), k = __dp.K, g = c.getContext('2d');
    const d = g.getImageData(50 * k, (__dp.GROUND - 50) * k, 50 * k, 50 * k).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 76) < 4 && Math.abs(d[i + 1] - 175) < 4 && Math.abs(d[i + 2] - 80) < 4) n++;
    return n; })()`);
  await fresh(`localStorage.setItem('dp-stats', JSON.stringify({coins:400}))`);
  await click('play'); await sleep(400);
  const greenBefore = await greenOnPlayer();
  await click('pause-btn'); await click('home'); await sleep(150);
  await click('shop-btn'); await ev(`document.querySelector('[data-stab=skins]').click()`); await sleep(150);
  await buyFor('Dorado'); await sleep(150);
  t.check('skins: buying "Dorado" (300) equips it on the selected animal', (await ev(`localStorage.getItem('dp-skin-dino')`)) === 'gold' && (await ev(`document.getElementById('shop-balance').textContent`)) === '100');
  await esc(); await click('play'); await sleep(400);
  const greenAfter = await greenOnPlayer();
  t.check('skins: the game draws the dino in gold (its green is gone)', greenBefore > 0 && greenAfter === 0, [greenBefore, greenAfter]);
  await click('pause-btn'); await click('home'); await sleep(150);
  await click('shop-btn'); await ev(`document.querySelector('[data-stab=skins]').click()`); await sleep(150);
  await buyFor('Original'); await sleep(150);
  t.check('skins: switching back to "Original" is free', (await ev(`localStorage.getItem('dp-skin-dino')`)) === 'base' && (await ev(`document.getElementById('shop-balance').textContent`)) === '100');
  await esc(); await sleep(100);
  // hats: the cap's red (#e53935) shows above the player once it is bought
  const capRed = () => ev(`(() => { const c = document.getElementById('game'), k = __dp.K, g = c.getContext('2d');
    const d = g.getImageData(40 * k, (__dp.GROUND - 200) * k, 80 * k, 200 * k).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 229) < 4 && Math.abs(d[i + 1] - 57) < 4 && Math.abs(d[i + 2] - 53) < 4) n++;
    return n; })()`);
  await fresh(`localStorage.setItem('dp-stats', JSON.stringify({coins:400}))`);
  await click('play'); await sleep(400);
  const capBefore = await capRed();
  await click('pause-btn'); await click('home'); await sleep(150);
  await click('shop-btn'); await ev(`document.querySelector('[data-stab=hats]').click()`); await sleep(150);
  t.check('hats: the shop has a hats tab with 5 hats plus "Sin sombrero"', (await ev(`document.querySelectorAll('#shop-body .item').length`)) === 6);
  await buyFor('Gorra'); await sleep(150);
  t.check('hats: buying "Gorra" (150) puts it on the selected animal', (await ev(`localStorage.getItem('dp-hat-dino')`)) === 'cap' && (await ev(`document.getElementById('shop-balance').textContent`)) === '250');
  await esc(); await click('play'); await sleep(400);
  const capAfter = await capRed();
  t.check('hats: the game draws the cap on the dino', capBefore === 0 && capAfter > 20, [capBefore, capAfter]);
  await click('pause-btn'); await click('home'); await sleep(150);
  t.check('hats: the menu card is drawn with the hat (taller image fitted in)', await ev(`(() => { const c = document.querySelector('[data-id=dino] canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 229) < 4 && Math.abs(d[i + 1] - 57) < 4 && Math.abs(d[i + 2] - 53) < 4) return true; return false; })()`));
  await click('shop-btn'); await ev(`document.querySelector('[data-stab=hats]').click()`); await sleep(150);
  await buyFor('Sin sombrero'); await sleep(150);
  t.check('hats: taking it off is free and it stays bought', (await ev(`localStorage.getItem('dp-hat-dino')`)) === 'none' && (await ev(`document.getElementById('shop-balance').textContent`)) === '250' && (await ev(`localStorage.getItem('dp-hats')`)) === '["cap"]');
  await esc(); await sleep(100);

  // pickups appear by themselves during a run
  await fresh(); await startRun();
  await ev(`setInterval(() => { __dp.P.inv = 2; }, 5); window.__kinds = {}; setInterval(() => __dp.items.forEach(i => { __kinds[i.kind] = 1; }), 30)`);
  await ev('__dp.setScore(600)');
  t.check('pickups: coins (and power-ups) show up during a run', await chrome.waitFor(`!!window.__kinds.coin`, 15000), await ev('window.__kinds'));

  /* ---- achievements: silent on load, banner in game ---- */
  await fresh(`localStorage.setItem('dp-best','600'); localStorage.setItem('dp-stats', JSON.stringify({jumps:199}))`);
  t.check('already-earned achievements are marked silently on load', (await ev(`!!__dp.ach.s500`)) && (await ev('__dp.achShow.t')) === 0 && (await ev('__dp.newAch.length')) === 0);
  await startRun();
  t.check('the 200th jump earns "Saltarín" with an on-screen banner', (await ev(`!!__dp.ach.jumps200`)) && (await ev('__dp.achShow.text')) === 'Saltarín');

  /* ---- music (procedural chiptune; autoplay is allowed by the test browser flags) ---- */
  await fresh();
  t.check('music: on by default, silent in the menu', (await ev('__dp.music.on')) === true && (await ev('__dp.music.playing')) === false);
  await startRun('dino'); await noObstacles(); await grounded();
  t.check('music: starts with the run', (await ev('__dp.music.playing')) === true);
  await ev(`(() => { const a = __dp.music.gain.context; window.__an = a.createAnalyser(); window.__an.fftSize = 2048; __dp.music.gain.connect(window.__an); })()`);
  const rms = () => ev(`(() => { const d = new Float32Array(window.__an.fftSize); window.__an.getFloatTimeDomainData(d); return Math.sqrt(d.reduce((s, x) => s + x * x, 0) / d.length); })()`);
  const peakOf = async (n = 20) => { let p = 0; for (let i = 0; i < n; i++) { p = Math.max(p, await rms()); await sleep(60); } return p; };
  const peak = await peakOf();
  t.check('music: audible output on the music bus while playing', peak > 0.003, peak);
  const n0 = await ev('__dp.music.notes'); await sleep(1000);
  t.check('music: notes keep being scheduled', (await ev('__dp.music.notes')) - n0 > 8);
  const bpmSlow = await ev('__dp.music.bpm');
  await ev('__dp.setScore(15000)'); await sleep(700);
  const bpmFast = await ev('__dp.music.bpm');
  t.check('music: tempo rises with the game speed', bpmFast > bpmSlow * 1.3, [bpmSlow, bpmFast]);
  await click('pause-btn'); await sleep(600);
  t.check('music: stops when the game is paused (and goes silent)', (await ev('__dp.music.playing')) === false && (await peakOf(8)) < 0.001);
  await click('resume'); await sleep(400);
  t.check('music: resumes after the pause', (await ev('__dp.music.playing')) === true);
  await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyN', bubbles: true }))`); await sleep(500);
  t.check('music: N turns it off (button label follows)', (await ev('__dp.music.playing')) === false && (await ev(`document.querySelector('#music span').textContent`)) === 'Sin música' && (await ev(`localStorage.getItem('dp-music')`)) === '0');
  await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyN', bubbles: true }))`); await sleep(400);
  t.check('music: N turns it back on and it restarts mid-run', (await ev('__dp.music.playing')) === true);
  /* music follows the zone (desert -> snow -> city), switching on the next bar line */
  await fresh(); await startRun('dino'); await ev(`setInterval(() => { __dp.P.inv = 2; }, 5)`); await sleep(1200);
  t.check('music: the desert song plays first (square lead)', (await ev('__dp.music.zone')) === 'desert' && (await ev('__dp.music.lastLead')) === 'square', [await ev('__dp.music.zone'), await ev('__dp.music.lastLead')]);
  await ev('__dp.setScore(1495)');
  t.check('music: entering the snow switches to the snow song (bell-like triangle lead)', (await chrome.waitFor(`__dp.music.zone === 'snow'`, 6000)) && (await chrome.waitFor(`__dp.music.lastLead === 'triangle'`, 4000)));
  await ev('__dp.setScore(2995)');
  t.check('music: entering the city switches to the city song (sawtooth lead)', (await chrome.waitFor(`__dp.music.zone === 'city'`, 6000)) && (await chrome.waitFor(`__dp.music.lastLead === 'sawtooth'`, 4000)));
  await ev('__dp.setScore(4495)');
  t.check('music: entering the jungle switches to the jungle song (sine lead)', (await chrome.waitFor(`__dp.music.zone === 'jungle'`, 6000)) && (await chrome.waitFor(`__dp.music.lastLead === 'sine'`, 4000)));
  await ev('__dp.setScore(5995)');
  t.check('music: entering the volcano switches to the volcano song', await chrome.waitFor(`__dp.music.zone === 'volcano'`, 6000));

  await fresh(); await startRun('dino');
  t.check('music: stops on game over', (await chrome.waitFor(`__dp.state === 'over'`, 25000)) && (await ev('__dp.music.playing')) === false);
  await fresh(`localStorage.setItem('dp-music', '0')`); await startRun('dino');
  t.check('music: a saved "off" is respected (no music, button says so)', (await ev('__dp.music.playing')) === false && (await ev(`document.querySelector('#music span').textContent`)) === 'Sin música');

  /* ---- sounds: soft tick every 500 points, own sounds for achievements and new animals ---- */
  await fresh(); await startRun(); await noObstacles(); await grounded();
  await ev(`window.__calls = { mile: 0, ach: 0, unlock: 0 }; for (const k of Object.keys(__calls)) { const f = __dp.sfx[k]; __dp.sfx[k] = (...a) => { __calls[k]++; return f(...a); }; }`);
  for (const sc of [95, 195, 295, 395]) { await ev(`__dp.setScore(${sc})`); await sleep(450); }
  t.check('sound: no tick when crossing 100, 200, 300, 400', (await ev('__calls.mile')) === 0, await ev('__calls'));
  await ev('__dp.setScore(495)'); await sleep(450);
  t.check('sound: one tick when crossing 500', (await ev('__calls.mile')) === 1, await ev('__calls'));
  await ev('__dp.setScore(995)'); await sleep(450);
  t.check('sound: animal unlock (1000) plays the unlock fanfare, once', (await ev('__calls.unlock')) === 1, await ev('__calls'));
  // the score must stay visible after crossing a plain hundred (it only blinks on the 500s)
  await sleep(1500);                                   // let the (legit) blink of crossing 1000 end
  await ev('__dp.setScore(1295)'); await sleep(200);
  let shown = 0;
  for (let i = 0; i < 12; i++) { if (await ev(`__dp.textBoxes.some(b => /^\\d{5}$/.test(b.t) && b.t !== String(__dp.best).padStart(5, '0'))`)) shown++; await sleep(40); }
  t.check('score: no blinking after crossing 1300 (only on multiples of 500)', shown === 12, shown);
  await fresh(`localStorage.setItem('dp-stats', JSON.stringify({jumps:1999}))`);
  await ev(`window.__calls = { mile: 0, ach: 0, unlock: 0 }; for (const k of Object.keys(__calls)) { const f = __dp.sfx[k]; __dp.sfx[k] = (...a) => { __calls[k]++; return f(...a); }; }`);
  await startRun();                                           // the first jump is the 2000th -> "Resorte"
  t.check('sound: earning "Resorte" plays the achievement sound once and never the tick', (await ev('__calls.ach')) === 1 && (await ev('__calls.mile')) === 0, await ev('__calls'));

  /* ---- an achievement banner must not overlap the game over screen ---- */
  await fresh(`localStorage.setItem('dp-stats', JSON.stringify({jumps:199}))`);
  await startRun();                                           // the first jump is the 200th -> "Saltarín" banner
  t.check('banner: achievement banner is up while running', (await ev('__dp.achShow.t')) > 0);
  await chrome.waitFor(`__dp.state === 'over'`, 25000);
  await sleep(250);
  const bannerStillActive = (await ev('__dp.achShow.t')) > 0;
  // the banner lives at y=68..82 (logical px) in light green; the game over title is yellow, so any such green pixel there is the banner
  const green = await ev(`(() => { const c = document.getElementById('game'), k = __dp.K, g = c.getContext('2d');
    const d = g.getImageData(0, 64 * k, c.width, 22 * k).data; let n = 0;
    // the game over screen dims everything by 25% after the banner is drawn, so look for both shades of the green
    const near = (i, r, gr, b) => Math.abs(d[i] - r) < 4 && Math.abs(d[i + 1] - gr) < 4 && Math.abs(d[i + 2] - b) < 4;
    for (let i = 0; i < d.length; i += 4) if (near(i, 155, 229, 100) || near(i, 116, 172, 75)) n++;
    return n; })()`);
  t.check('banner: it is not drawn on top of the game over screen (the "Logros:" line lists it instead)', bannerStillActive && green === 0, { bannerStillActive, green });
  t.check('game over lists the achievement of the run', (await ev('JSON.stringify(__dp.newAch)')).includes('Saltarín'));

  /* ---- zones: desert -> snow -> city every 1500 points, each with its own obstacles ---- */
  await fresh(); await startRun();
  await ev(`setInterval(() => { __dp.P.inv = 2; }, 5); window.__seen = {}; setInterval(() => __dp.o.forEach(o => (o.parts || []).forEach(p => { __seen[o.zone + ':' + p.kind] = 1; })), 30)`);
  t.check('zones: a run starts in the desert', (await ev('__dp.biome')) === 'desert');
  await ev('__dp.setScore(3000)'); await sleep(200);
  { const sp = await ev('__dp.speed'); t.check('speed: gradual ramp, at 3000 points still well under halfway to the max', sp > 6.5 && sp < 9, sp); }
  await ev('__dp.setScore(1495)'); await sleep(500);
  t.check('zones: snow from 1500, with a "Zona: Nieve" notice', (await ev('__dp.biome')) === 'snow' && (await ev('__dp.banner.text')) === 'Zona: Nieve');
  await sleep(9000);   // ~0.7 obstacles/s, some of them birds or movers
  await ev('__dp.setScore(2995)'); await sleep(500);
  t.check('zones: city from 3000', (await ev('__dp.biome')) === 'city');
  await sleep(9000);   // ~0.7 obstacles/s, some of them birds or movers
  await ev('__dp.setScore(4495)'); await sleep(500);
  t.check('zones: jungle from 4500, with a "Zona: Selva" notice', (await ev('__dp.biome')) === 'jungle' && (await ev('__dp.banner.text')) === 'Zona: Selva');
  await sleep(9000);   // ~0.7 obstacles/s, some of them birds or movers
  await ev('__dp.setScore(5995)'); await sleep(500);
  t.check('zones: volcano from 6000', (await ev('__dp.biome')) === 'volcano' && (await ev('__dp.banner.text')) === 'Zona: Volcán');
  await sleep(9000);   // ~0.7 obstacles/s, some of them birds or movers
  await ev('__dp.setScore(7495)'); await sleep(500);
  t.check('zones: back to the desert at 7500 (it loops)', (await ev('__dp.biome')) === 'desert');
  const seen = Object.keys(await ev('window.__seen'));
  const allowed = { desert: ['cactus'], snow: ['snowman', 'pine'], city: ['cone', 'hydrant'], jungle: ['bush', 'stump'], volcano: ['rock', 'lava'] };
  t.check('zones: every zone spawned its own obstacles', ['snow', 'city', 'jungle', 'volcano'].every((z) => seen.some((k) => k.startsWith(z + ':'))), seen);
  // obstacles already on screen keep scrolling into the next zone; what matters is the zone they were spawned in
  t.check('zones: every obstacle uses the sprites of the zone it was spawned in', seen.every((k) => { const [z, kind] = k.split(':'); return allowed[z].includes(kind); }), seen);

  /* ---- iPhone in landscape with a notch: no canvas text may go under it ---- */
  await chrome.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 3, mobile: true });
  await chrome.send('Emulation.setSafeAreaInsetsOverride', { insets: { left: 47, right: 47, top: 0, bottom: 21 } });
  await fresh(ALL);
  const ins = await ev('__dp.insets');
  t.check('notch: the game reads both safe-area insets', ins[0] > 0 && ins[1] > 0, ins);
  const spill = [];
  for (const a of await ev('__dp.ANIMALS.map(a => a.id)')) {
    await ev(`document.querySelector('[data-id=${a}]').click()`); await click('play'); await sleep(250);
    const bad = await ev(`(() => { const [l, r] = __dp.insets; return __dp.textBoxes.filter(b => b.x < l || b.x + b.w > __dp.W - r).map(b => b.t); })()`);
    if (bad.length) spill.push(a + ': ' + bad.join(' | '));
    await click('pause-btn'); await click('home'); await sleep(150);
  }
  t.check('notch: every animal\'s start screen text fits between the notches (long ones wrap)', spill.length === 0, spill);
  await ev(`document.querySelector('[data-id=frog]').click()`); await click('play'); await sleep(250);
  t.check('notch: the frog ability text is wrapped onto two lines', (await ev(`__dp.textBoxes.filter(b => /ESPERA|SUPERSALTO|SALTA|SUELO/i.test(b.t)).length`)) === 2, await ev('__dp.textBoxes.map(b => b.t)'));
  await click('pause-btn'); await click('home'); await sleep(150);
  await chrome.send('Emulation.setSafeAreaInsetsOverride', { insets: { left: 0, right: 0, top: 0, bottom: 0 } });
  await chrome.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 560, deviceScaleFactor: 1, mobile: false });

  /* ---- volume + pause menu ---- */
  await fresh();
  const volLabel = () => ev(`document.querySelector('#vol span').textContent`);
  t.check('volume: starts at 100%', (await volLabel()) === 'Volumen 100%');
  await click('vol'); await sleep(150);
  t.check('volume: one click goes to 25% and the master gain follows (squared taper)', (await volLabel()) === 'Volumen 25%' && Math.abs((await ev('__dp.master.gain.value')) - 0.0625) < 0.01, await ev('__dp.master && __dp.master.gain.value'));
  await click('vol'); await sleep(150);
  t.check('volume: 50% -> gain 0.25', (await volLabel()) === 'Volumen 50%' && Math.abs((await ev('__dp.master.gain.value')) - 0.25) < 0.02);
  await click('vol'); await click('vol'); await sleep(150);
  t.check('volume: wraps back to 100% -> gain 1', (await volLabel()) === 'Volumen 100%' && Math.abs((await ev('__dp.master.gain.value')) - 1) < 0.02);
  await click('vol'); await sleep(100);
  await chrome.goto(base + '/manifest.json', 300); await chrome.goto(url, 1400);
  t.check('volume: the level is remembered after a reload', (await volLabel()) === 'Volumen 25%' && (await ev(`localStorage.getItem('dp-vol')`)) === '0.25');
  await click('play'); await sleep(300); await tap(); await sleep(300);
  await click('pause-btn'); await sleep(150);
  t.check('pause menu has its own volume button that stays in sync', (await ev(`document.querySelector('#vol2 span').textContent`)) === 'Volumen 25%');
  await click('vol2'); await sleep(100);
  t.check('changing volume from the pause menu updates the gain', (await ev(`document.querySelector('#vol2 span').textContent`)) === 'Volumen 50%' && Math.abs((await ev('__dp.master.gain.value')) - 0.25) < 0.02);
  await click('ach-btn2'); await sleep(200);
  t.check('pause menu: Logros opens the achievements screen over the pause', !(await hidden('ach')) && !(await hidden('pause')));
  await esc(); await sleep(150);
  t.check('closing Logros returns to the pause menu (game still paused)', (await hidden('ach')) && !(await hidden('pause')));
  await chrome.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 340, deviceScaleFactor: 2, mobile: true });
  await sleep(500);
  const pauseFits = await ev(`(() => { const h = innerHeight, b = [...document.querySelectorAll('#pause button')].filter(x => x.offsetParent); const r = b.map(x => x.getBoundingClientRect()); return { buttons: b.length, top: Math.min(...r.map(x => x.top)), bottom: Math.max(...r.map(x => x.bottom)), h }; })()`);
  t.check('pause menu (all buttons) fits a 844x340 landscape phone', pauseFits.top >= 0 && pauseFits.bottom <= pauseFits.h, pauseFits);
  await chrome.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 560, deviceScaleFactor: 1, mobile: false });

  /* ---- ranking end to end (real API + mock Redis) ---- */
  await fresh(); await startRun();
  t.check('nickname prompt opens after the first real run', await chrome.waitFor(`!document.getElementById('rank').hidden`, 25000));
  await ev(`document.getElementById('nick-input').focus()`);
  await chrome.send('Input.insertText', { text: 'ana lópez' });
  await sleep(150);
  t.check('nickname is forced to capitals while typing', (await ev(`document.getElementById('nick-input').value`)) === 'ANA LÓPEZ');
  await click('nick-save');
  t.check('score is saved with the nickname', await chrome.waitFor(`/Guardado/.test(document.getElementById('rank-msg').textContent)`, 8000));
  await chrome.waitFor(`document.querySelectorAll('#rank-body .lb tr').length > 0`, 8000);
  t.check('ranking opens on "Semana" and lists the player in capitals', (await ev(`document.querySelector('#rank-period .tab.on').dataset.period`)) === 'week' && /ANA LÓPEZ/.test(await ev(`document.getElementById('rank-body').textContent`)));
  t.check('row shows the animal icon and the weekly reset countdown', (await ev(`document.querySelectorAll('#rank-body .lb td.ico canvas').length`)) === 1 && /Se reinicia en/.test(await ev(`document.getElementById('rank-body').textContent`)));
  await ev(`document.querySelector('[data-period=all]').click()`); await sleep(700);
  t.check('"Histórico" lists the player too (no countdown)', /ANA LÓPEZ/.test(await ev(`document.getElementById('rank-body').textContent`)) && !/Se reinicia/.test(await ev(`document.getElementById('rank-body').textContent`)));
  await ev(`document.querySelector('[data-board=dino]').click()`); await sleep(700);
  t.check('dino tab lists the player', /ANA LÓPEZ/.test(await ev(`document.getElementById('rank-body').textContent`)));
  await ev(`document.querySelector('[data-board=cat]').click()`); await sleep(700);
  t.check('cat tab is empty', /Aún no hay/.test(await ev(`document.getElementById('rank-body').textContent`)));
  t.check('#1 weekly and top 3 earn "Campeón semanal" and "Podio"', (await ev(`!!__dp.ach.weekwin`)) && (await ev(`!!__dp.ach.podium`)));
  const api = await (await fetch(`${base}/api/ranking?board=all&period=week`)).json();
  t.check('API confirms the weekly entry', api.rows.length === 1 && api.rows[0].n === 'ANA LÓPEZ' && api.rows[0].a === 'dino', api.rows);
  await click('rank-del');
  t.check('delete asks for confirmation first', /Seguro/.test(await ev(`document.querySelector('#rank-del span').textContent`)));
  await click('rank-del');
  t.check('second click deletes the player data', await chrome.waitFor(`/borrado/.test(document.getElementById('rank-msg').textContent)`, 8000));
  await sleep(500);
  t.check('ranking is empty again, local nickname cleared', /Aún no hay|Esta semana aún no hay/.test(await ev(`document.getElementById('rank-body').textContent`)) && (await ev(`localStorage.getItem('dp-nick')`)) === '');
  const gone = await (await fetch(`${base}/api/ranking?board=all&period=week`)).json();
  t.check('API confirms the data is gone', gone.rows.length === 0 && gone.total === 0);

  t.check('no JavaScript errors anywhere', chrome.errors.length === 0, chrome.errors.slice(0, 3));
} catch (e) {
  t.check('suite crashed: ' + e.message, false);
}
await chrome.close(); site.close(); redis.close();
process.exit(t.done() ? 1 : 0);
