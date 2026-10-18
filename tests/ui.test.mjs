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
  t.check('menu: 6 animal cards, 5 locked on a fresh profile', (await ev(`document.querySelectorAll('.pick').length`)) === 6 && (await ev(`document.querySelectorAll('.pick.locked').length`)) === 5);
  t.check('menu: next unlock hint', (await ev(`document.getElementById('tag').textContent`)).includes('1000'));
  t.check('menu: pixel font loaded', await ev(`document.fonts.check('10px "Press Start 2P"')`));
  t.check('menu: play / speed / sound / ranking / achievements / help buttons', await ev(`['play','pace','mute','music','vol','rank-btn','ach-btn','help-btn'].every(id => document.getElementById(id))`));
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
  t.check('help: animals tab lists the 6 animals', (await ev(`document.querySelectorAll('#help-body .row').length`)) === 6);
  await esc(); await sleep(100);
  t.check('Esc closes help', await hidden('help'));
  await click('ach-btn'); await sleep(200);
  t.check('achievements screen: 0/21 on a fresh profile', (await ev(`document.getElementById('ach-count').textContent`)) === '0/21' && (await ev(`document.querySelectorAll('.ach').length`)) === 21);
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

  await fresh(ALL); await startRun('peng'); await noObstacles(); await grounded();
  const rate = async (duck) => { await ev(`__dp.setDuck(${duck})`); const a = await ev('__dp.score'); await sleep(1200); const b = await ev('__dp.score'); await ev('__dp.setDuck(false)'); return (b - a) / 1.2; };
  const rNormal = await rate(false), rSlide = await rate(true);
  t.check('penguin: sliding doubles the points', rSlide > rNormal * 1.7 && rSlide < rNormal * 2.3, [rSlide, rNormal]);

  await fresh(ALL); await startRun('dog');
  t.check('dog: starts with a shield', (await ev('__dp.P.shield')) === 1);
  await chrome.waitFor(`__dp.P.shield === 0`, 20000);
  t.check('dog: the first hit is survived', (await ev('__dp.state')) === 'running' && (await ev('__dp.stats.shields')) === 1);
  t.check('dog: an obstacle walked through while invulnerable is not a dodge', (await ev('__dp.stats.dodged')) === 0);
  t.check('dog: the second hit ends the run', await chrome.waitFor(`__dp.state === 'over'`, 25000));

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
  await ev('__dp.setScore(2500)'); await sleep(700);
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
  await fresh(); await startRun('dino');
  t.check('music: stops on game over', (await chrome.waitFor(`__dp.state === 'over'`, 25000)) && (await ev('__dp.music.playing')) === false);
  await fresh(`localStorage.setItem('dp-music', '0')`); await startRun('dino');
  t.check('music: a saved "off" is respected (no music, button says so)', (await ev('__dp.music.playing')) === false && (await ev(`document.querySelector('#music span').textContent`)) === 'Sin música');

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
