// DinoPixel - estado de la partida, obstáculos, física y colisiones.
// Classic script: shares the page's global scope with the other js/ files, loaded in order by index.html.
'use strict';

/* ---------- state ---------- */
let animal = ANIMALS.find((a) => a.id === store.get('dp-animal', 'dino')) || ANIMALS[0];
if (!unlocked(animal)) animal = ANIMALS[0];
let state = 'ready';                                    // ready | running | over
let paused = false;
let score, speed, hi, night = 0, nightTarget = 0, worldX, distSince, gap, mile, flash, diedAt;
let obstacles, dust, animT, flapT = 0, jumpHeld = false, runTime = 0;
let items = [], coinsRun = 0, magnetT = 0;                // pickups (see addItems)
let banner = { text: '', t: 0 }, newlyUnlocked = [];
let runToken = null, lastRank = null, pendingRun = null;
let biome = 0, biomePrev = 0, biomeT = 1, gear = 'none';   // gear: the accessory worn this run (fixed at the start)   // online ranking (see the ranking section below)
let bufT = 0, shakeT = 0, popups = [], combo = 0, patternQ = [];
let missions = [], runBest = {}, boss = null, bossZone = -1;
// Modes: normal; hard (faster, more birds, marked in the ranking); zen (you can't lose, nothing is saved or ranked,
// and it can start in any zone you have reached). runMode is fixed when a run starts.
const MODES = ['normal', 'hard', 'zen'];
let mode = MODES.includes(store.get('dp-mode', 'normal')) ? store.get('dp-mode', 'normal') : 'normal', runMode = 'normal', zenZone = 0, zenStats = null;
const HARD = { start: 7.5, max: 15, birds: 0.45, birdsFrom: 150 };   // this run's mini-missions; the zone boss (end-of-zone wave)   // combo: obstacles dodged in a row without a hit                // jump buffer, screen shake, floating texts ("Cerca! +20")
const MIN_H = 75, CUT_V = 4;                           // variable jump: released early => cut once above MIN_H
const P = { h: 0, vy: 0, doubled: false, shield: 0, ownShield: 0, inv: 0, charge: 0, dodge: 0 };

const specks = Array.from({ length: 110 }, () => ({ x: rnd(0, 1400), y: rnd(GROUND + 10, H - 4), w: Math.floor(rnd(1, 4)) * 2 }));
const clouds = Array.from({ length: 7 }, (_, i) => ({ x: i * 170 + rnd(0, 60), y: rnd(20, Math.max(40, GROUND - 110)), s: rnd(3, 5) | 0 }));
const stars = Array.from({ length: 70 }, () => ({ x: rnd(0, 1400), y: rnd(4, 220), p: rnd(0, 6) }));

function reset() {
  score = 0; speed = START_SPEED; worldX = 0; distSince = 0; gap = 320; mile = 0; flash = 0;
  night = 0; nightTarget = 0; animT = 0; flapT = 0;
  obstacles = []; dust = [];
  items = []; coinsRun = 0; magnetT = 0;
  bufT = 0; shakeT = 0; popups = []; patternQ = []; combo = 0; boss = null; bossZone = -1;
  P.h = 0; P.vy = 0; P.doubled = false; P.inv = 0; P.charge = 0; P.dodge = 0; P.foxCd = 0;
  P.shield = animal.id === 'dog' ? 1 : 0;
  P.ownShield = P.shield;   // the dog's own shield (used first); only it counts for the achievement
  banner = { text: '', t: 0 }; newlyUnlocked = [];
  newAch = []; achQ = []; achShow = { text: '', t: 0 }; runTime = 0;
  biome = 0; biomePrev = 0; biomeT = 1;
  gear = gearOf(animal.id);
  hi = Number(store.get('dp-hi-' + animal.id, '0'));
}
reset();

function endZen() {                                     // back from a zen run: forget everything it counted
  if (!zenStats) return;
  const old = JSON.parse(zenStats);
  Object.keys(stats).forEach((k) => { if (!(k in old)) delete stats[k]; });
  Object.assign(stats, old); zenStats = null; persist.on = true;
}
function start() {
  endZen();
  dailyStart();
  reset();
  runMode = mode;
  if (runMode === 'zen') {
    zenStats = JSON.stringify(stats); persist.on = false;   // nothing written while it runs (see saveStats / cloudSave)
    score = zenZone * BIOME_LEN; biome = biomePrev = zenZone % BIOMES.length; mile = Math.floor(score / 100); bossZone = zenZone;
    missions = [];
    banner = { text: L('Modo zen', 'Zen mode'), t: 150 };
  } else startMissions();
  if (runMode === 'hard') banner = { text: L('Modo difícil', 'Hard mode'), t: 150 };
  else if (HALLOWEEN && runMode === 'normal') banner = { text: L('Feliz Halloween!', 'Happy Halloween!'), t: 150 };
  state = 'running';
  stopMusic(0.05); startMusic(true);
  lastRank = null;
  runToken = null;
  showShare(false);
  api('/api/start').then((r) => { if (r.ok && r.data.t) runToken = r.data.t; });   // signed token: lets the server check run time vs score
}

function die() {
  state = 'over';
  shakeT = 16;
  diedAt = performance.now();
  sfx.die();
  stopMusic(0.2);
  haptic([70, 40, 140]);
  if (score > hi) { hi = Math.floor(score); store.set('dp-hi-' + animal.id, String(hi)); animalBest[animal.id] = hi; }
  if (score > best) { best = Math.floor(score); store.set('dp-best', String(best)); }
  dailyEnd();
  stats.runs++;
  cloudSaveSoon();                                      // cloud copy (if enabled) a moment after each run
  checkAch();
  saveStats();
  submitRun();
  showShare(score >= 20);
}

const JUMP_BUFFER = 9;                                   // frames (~150 ms) a press in the air is remembered
const FAST_FALL = 10;                                   // down / swipe down in the air: drop at least this fast
function fastFall() {
  if (state !== 'running' || P.h <= 0) return;
  P.vy = Math.min(P.vy, -FAST_FALL); bufT = 0; P.fast = true;
}
const COMBO_X2 = 10, COMBO_X3 = 25;                     // combo needed for double / triple points
const comboMult = () => (combo >= COMBO_X3 ? 3 : combo >= COMBO_X2 ? 2 : 1);
const NEAR_PAD = 14, NEAR_POINTS = 20;                  // passing this close to an obstacle without touching it: bonus
function popup(text, color) { popups.push({ text, color, t: 50 }); }
const BOOTS = () => (gear === 'boots' ? 1.07 : 1);       // spring boots: +7% take-off speed = ~15% higher
function jump() {
  if (P.h > 0) {
    // cat: one extra jump in mid-air
    if (animal.id === 'cat' && !P.doubled) { P.doubled = true; P.vy = JUMP_V * 0.8 * BOOTS(); sfx.jump(); puff(4); stats.jumps++; stats.doubles++; checkAch(); }
    else bufT = JUMP_BUFFER;                            // pressed a moment too early: jump as soon as it lands
    return;
  }
  stats.jumps++;
  checkAch();
  const charged = animal.id === 'frog' && P.charge >= FROG_READY;          // frog: ~3/4 s on the ground since the last jump -> super jump
  P.vy = (charged ? JUMP_V * 1.22 : animal.id === 'bunny' ? JUMP_V * 1.1 : JUMP_V) * BOOTS();
  P.charge = 0;
  sfx.jump();
  puff(8);
}

function puff(n) {
  for (let i = 0; i < n; i++) {
    dust.push({ x: PX + rnd(4, 20), y: GROUND - rnd(0, 4), vx: rnd(-2.5, -0.5), vy: rnd(-1.5, -0.2), life: rnd(14, 26) });
  }
}

/* ---------- obstacles ---------- */
// Pickups. Coins (+10 points) come in an arc over a cactus (collected by jumping it) or in a row after an obstacle
// (low: just run through; high: jump). Rarely, a shield or a magnet floats at jump height.
const COIN_POINTS = 10, RISKY_FROM = 500;
const MAGNET_TIME = () => (gear === 'scarf' ? 600 : 360), MAGNET_REACH = () => (gear === 'scarf' ? 260 : 170);   // magnet scarf: 10 s and a longer reach
const BIRD_LEAD = () => (gear === 'goggles' ? speed * 50 : 0);   // aviator goggles: birds start further out, announced at the edge
function addItems(o) {
  const r = Math.random();
  if (score > 400 && r < 0.07) {
    items.push({ kind: Math.random() < 0.5 ? 'shield' : 'magnet', x: o.x + o.w + 120, dy: -80, w: 18, h: 18 });
    return;
  }
  if (score < 50 || r > (gear === 'collar' ? 0.85 : 0.5)) return;   // lucky collar: coins after most obstacles
  // risky spots (from 500 points): gold coins worth 2, right above a low/mid bird or high over a cactus (a full jump)
  if (score > RISKY_FROM && Math.random() < 0.3 && !(o.type === 'bird' && o.dy === BIRD_HIGH)) {
    const top = o.type === 'bird' ? o.dy - 22 : -(o.h + 78);
    for (let i = 0; i < 3; i++) items.push({ kind: 'coin', v: 2, x: o.x + o.w / 2 - 27 + i * 18, dy: top - 18, w: 18, h: 18 });
    return;
  }
  if (o.type === 'cactus' && Math.random() < 0.6) {
    const n = 5, cx = o.x + o.w / 2, span = 150;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5;
      items.push({ kind: 'coin', x: cx + u * span - 7, dy: -(o.h + 30 + 50 * (1 - 4 * u * u)), w: 14, h: 14 });
    }
  } else {
    const high = Math.random() < 0.5, n = 3 + ((Math.random() * 3) | 0), x0 = o.x + o.w + 60;
    for (let i = 0; i < n; i++) items.push({ kind: 'coin', x: x0 + i * 24, dy: high ? -95 : -36, w: 14, h: 14 });
  }
}
function collect(it) {
  if (it.kind === 'coin') {
    const v = it.v || 1;                                // gold coins in risky spots are worth 2
    if (v > 1) runBest.gold = (runBest.gold || 0) + 1;
    score += COIN_POINTS * v * comboMult(); coinsRun += v; stats.coins += v;
    if (HALLOWEEN) stats.candy += v;                       // coins are candies at Halloween ("Truco o trato")
    sfx.coin(); checkAch();
  } else if (it.kind === 'shield') {
    P.shield++; sfx.power(); banner = { text: (P.shield > 1 ? L('Escudo x', 'Shield x') + P.shield : L('Escudo', 'Shield')) + '!', t: 90 };   // shields stack
  } else {
    magnetT += MAGNET_TIME(); sfx.power(); banner = { text: L('Imán!', 'Magnet!') + ' ' + Math.ceil(magnetT / 60) + ' s', t: 90 };   // magnet time stacks
  }
  for (let i = 0; i < 6; i++) dust.push({ x: it.x + it.w / 2, y: GROUND + it.dy + it.h / 2, vx: rnd(-1.5, 1.5), vy: rnd(-1.5, 1), life: rnd(10, 18) });
}
// A moving obstacle for the current zone, or null when it would catch up with the previous obstacle too much
// (it moves faster than the ground, so the gap to the one in front shrinks until that one passes the player).
const MOVER_FROM = 800;
function makeMover() {
  const kind = ZONE_MOVER[BIOMES[biome].id], spec = MOVERS[kind];
  let extra = rnd(spec.extra[0], spec.extra[1]);
  const prev = obstacles[obstacles.length - 1];
  if (prev && prev.x > PX) {
    const pe = prev.extra || 0, safe = speed * 30 + 80;
    const room = (W + 20) - (prev.x + prev.w) - safe;              // gap we can afford to lose
    extra = Math.min(extra, pe + room * (1 + pe) / (prev.x - PX));
  }
  if (extra < 0.12) return null;
  const dy = 2 - spec.h;
  return { type: 'mover', kind, x: W + 20, dy, base: dy, w: spec.w, h: spec.h, extra, phase: 0, zone: BIOMES[biome].id };
}
function spawnBird(top) {
  const lead = BIRD_LEAD();                      // goggles: the bird is placed further out and everything after it shifts too
  obstacles.push({ type: 'bird', x: W + 20 + lead, dy: top, w: 14 * S, h: 9 * S });
  addItems(obstacles[obstacles.length - 1]);
  return lead;
}
function spawnCactus(n, bigOK = true) {
  const parts = [];
  let w = 0, h = 0;
  for (let i = 0; i < n; i++) {
    const big = bigOK && n < 3 && Math.random() < 0.4;   // 3-cactus groups stay small so they remain jumpable
    const k = big ? 4 : 3;
    const kinds = BIOMES[biome].obs;
    const kind = HALLOWEEN && Math.random() < 0.2 ? 'pumpkin' : kinds[(Math.random() * kinds.length) | 0];   // Halloween: pumpkins among the cacti
    parts.push({ k, dx: w, kind });
    w += 10 * k + 6;
    h = Math.max(h, 13 * k);
  }
  obstacles.push({ type: 'cactus', x: W + 20, dy: 2 - h, w: w - 6, h, parts, zone: BIOMES[biome].id });
  addItems(obstacles[obstacles.length - 1]);
  return 0;
}
// Hand-made sequences (from PATTERN_FROM points): tight gaps inside, then a long breather. Each step spawns one obstacle.
const BIRD_HIGH = -100, BIRD_MID = -58, BIRD_LOW = -34;   // high: run under it; mid and low: jump over it (there is no crouching)
const PATTERN_FROM = 600, PATTERN_CHANCE = 0.18;
const PATTERNS = {
  stairs: [() => spawnCactus(1), () => spawnCactus(2), () => spawnCactus(1, false)],
  sandwich: [() => spawnCactus(1, false), () => spawnBird(BIRD_LOW), () => spawnCactus(1, false)],
  underpass: [() => spawnBird(BIRD_HIGH), () => spawnBird(BIRD_HIGH), () => spawnCactus(2)],
  triple: [() => spawnCactus(1, false), () => spawnCactus(1, false), () => spawnCactus(1, false)],
};
const tightGap = () => speed * 30 + 130;
function spawn() {
  let lead = 0;
  if (boss) {                                           // zone boss: a wave of the zone's moving obstacle
    const m = makeMover();
    if (m) obstacles.push(m); else spawnCactus(1, false);
    gap = speed * 30 + 170 + rnd(0, 80); distSince = 0;
    return;
  }
  if (!patternQ.length && score > PATTERN_FROM && Math.random() < PATTERN_CHANCE) {
    const names = Object.keys(PATTERNS);
    patternQ = PATTERNS[names[(Math.random() * names.length) | 0]].slice();
  }
  if (patternQ.length) {
    lead = patternQ.shift()();
    gap = patternQ.length ? tightGap() : tightGap() * 2.4;   // the last step is followed by a breather
    distSince = -lead;
    return;
  }
  const birdOK = runMode === 'hard' ? score > HARD.birdsFrom && Math.random() < HARD.birds : score > 300 && Math.random() < 0.3;
  const mover = !birdOK && score > MOVER_FROM && Math.random() < 0.25 ? makeMover() : null;
  if (mover) obstacles.push(mover);
  else if (birdOK) lead = spawnBird([BIRD_HIGH, BIRD_MID, BIRD_LOW][(Math.random() * 3) | 0]);
  else spawnCactus(1 + ((Math.random() * (score > 150 ? 3 : 2)) | 0));
  gap = speed * 30 + 120 + rnd(0, 260);
  distSince = -lead;
}

/* ---------- zone bosses and mini-missions ---------- */
const BOSS_LEN = 250, BOSS_POINTS = 100;
const BOSS_NAME = {
  desert: L('Tormenta de arena', 'Sandstorm'), snow: L('Avalancha', 'Avalanche'), city: L('Hora punta', 'Rush hour'),
  jungle: L('Lluvia de cocos', 'Coconut rain'), volcano: L('Erupción', 'Eruption'), graveyard: L('Noche de fantasmas', 'Ghost night'),
};
// Three per run, picked at random; each pays coins (like the daily challenge prize: spendable, not for coin achievements)
const MISSIONS = [
  { id: 'birds', n: 5, reward: 20, text: (n) => L('Esquiva ' + n + ' pájaros', 'Dodge ' + n + ' birds'), val: () => stats.birds - runBest.birds0 },
  { id: 'coins', n: 20, reward: 20, text: (n) => L('Recoge ' + n + ' monedas', 'Collect ' + n + ' coins'), val: () => coinsRun },
  { id: 'close', n: 3, reward: 25, text: (n) => L(n + ' esquivas por los pelos', n + ' near misses'), val: () => (stats.close || 0) - runBest.close0 },
  { id: 'combo', n: 15, reward: 25, text: (n) => L('Combo de ' + n, 'A ' + n + ' combo'), val: () => runBest.combo || 0 },
  { id: 'zone', n: 1500, reward: 20, text: () => L('Llega a la segunda zona', 'Reach the second zone'), val: () => score },
  { id: 'gold', n: 3, reward: 25, text: (n) => L('Coge ' + n + ' monedas doradas', 'Grab ' + n + ' gold coins'), val: () => runBest.gold || 0 },
  { id: 'boss', n: 1, reward: 30, text: () => L('Supera un jefe de zona', 'Beat a zone boss'), val: () => (stats.bosses || 0) - runBest.bosses0 },
];
function startMissions() {
  runBest = { birds0: stats.birds, close0: stats.close || 0, bosses0: stats.bosses || 0 };
  missions = MISSIONS.slice().sort(() => Math.random() - 0.5).slice(0, 3).map((m) => ({ m, done: false }));
}
const missionText = (x) => x.m.text(x.m.n);
const missionProgress = (x) => Math.min(x.m.n, Math.floor(x.m.val()));
function checkMissions() {
  for (const x of missions) {
    if (x.done || x.m.val() < x.m.n) continue;
    x.done = true; stats.bonus += x.m.reward; stats.missions = (stats.missions || 0) + 1;
    popup(L('Misión +', 'Mission +') + x.m.reward, '#9be564'); sfx.ach(); saveStats();
  }
}

/* ---------- update ---------- */
function hitbox(o) {
  const y = GROUND + o.dy;
  return o.type === 'bird'
    ? { x: o.x + 6, y: y + 6, w: o.w - 12, h: o.h - 12 }
    : { x: o.x + 4, y: y + 4, w: o.w - 8, h: o.h - 4 };
}
function playerBox() {
  return { x: PX + 10, y: GROUND - P.h - 48 + 6, w: 28, h: 40 };
}
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function update(dt) {
  nightTarget = Math.floor((score + (HALLOWEEN ? 350 : 0)) / 700) % 2;   // Halloween: night comes sooner
  night += Math.sign(nightTarget - night) * Math.min(Math.abs(nightTarget - night), 0.006 * dt);
  dust.forEach((d) => { d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt; });
  dust = dust.filter((d) => d.life > 0);
  if (flash > 0) flash -= dt;
  if (banner.t > 0) banner.t -= dt;
  if (achShow.t > 0) achShow.t -= dt;
  else if (achQ.length) achShow = { text: achQ.shift(), t: 170 };
  if (P.inv > 0) P.inv -= dt;
  if (state !== 'running') return;
  stats.timeSec += dt / 60 / simPace();                       // real seconds played (dt is scaled by the pace)

  // speed rises fast at first and then more and more slowly towards the maximum (it used to hit it at 2100 points)
  const s0 = runMode === 'hard' ? HARD.start : START_SPEED, s1 = runMode === 'hard' ? HARD.max : MAX_SPEED;   // hard: faster from the start
  speed = s0 + (s1 - s0) * (1 - Math.exp(-score / SPEED_RAMP));
  const pts = speed * dt * 0.12;
  score += pts * (animal.id === 'peng' ? 1.5 : 1) * comboMult();   // penguin: +50% points; combos: x2 / x3
  if (animal.id === 'peng') stats.slidePts += pts * 0.5;
  runTime += dt / 60 / simPace();                             // real seconds survived in this run
  stats.longestRun = Math.max(stats.longestRun || 0, runTime);
  worldX += speed * dt;
  animT += speed * dt;
  flapT += dt;

  // physics
  if (animal.id === 'frog' && P.h === 0) P.charge = Math.min(60, P.charge + dt);   // frog: charges by itself while running on the ground
  if (P.dodge > 0) P.dodge -= dt;
  if (P.foxCd > 0) P.foxCd -= dt;
  if (P.h > 0 || P.vy > 0) {
    if (!jumpHeld && P.vy > CUT_V && P.h >= MIN_H) P.vy = CUT_V;   // released early: shorter jump
    const glide = animal.id === 'chick' && jumpHeld && P.vy < 0;   // chicken: hold while falling to glide
    if (glide) stats.glideSec += dt / 60;
    P.vy -= GRAV * (glide ? 0.3 : 1) * dt;
    P.h += P.vy * dt;
    if (P.h <= 0) { P.h = 0; P.vy = 0; P.doubled = false; P.fast = false; puff(5); if (bufT > 0) { bufT = 0; jump(); } }
  } else if (Math.floor(animT) % 18 === 0 && Math.random() < 0.15) puff(1);
  if (bufT > 0) bufT -= dt;
  if (shakeT > 0) shakeT -= dt;
  popups.forEach((p) => { p.t -= dt; }); popups = popups.filter((p) => p.t > 0);

  // unlocks
  for (const a of ANIMALS) {
    if (runMode !== 'zen' && a.unlock > best && score >= a.unlock && !bought.includes(a.id)) {
      best = Math.floor(score);
      store.set('dp-best', String(best));
      newlyUnlocked.push(a.name);
      banner = { text: a.name + L(' desbloqueado!', ' unlocked!'), t: 200 };
      sfx.unlock();
      haptic([40, 60, 40, 60, 90]);
    }
  }

  if (runMode !== 'zen') dailyCheck();

  checkMissions();
  // zone boss: the last BOSS_LEN points of every zone are a wave of its moving obstacle; reach the next zone to beat it
  const zn = Math.floor(score / BIOME_LEN);
  if (!boss && bossZone < zn && score >= MOVER_FROM && score % BIOME_LEN >= BIOME_LEN - BOSS_LEN) {
    bossZone = zn; boss = { zone: BIOMES[biome].id };
    patternQ = [];
    banner = { text: BOSS_NAME[boss.zone] + '!', t: 150 }; sfx.power(); shakeT = 8;
  }
  if (boss && score % BIOME_LEN < BIOME_LEN - BOSS_LEN) {
    boss = null; score += BOSS_POINTS; stats.bosses = (stats.bosses || 0) + 1;
    popup(L('Superado! +', 'Beaten! +') + BOSS_POINTS, '#9be564'); sfx.ach(); checkAch();
  }
  // zones
  const bi = Math.floor(score / BIOME_LEN) % BIOMES.length;
  if (bi !== biome) { biomePrev = biome; biome = bi; biomeT = 0; banner = { text: L('Zona: ', 'Zone: ') + BIOMES[bi].name, t: 150 }; }
  if (biomeT < 1) biomeT = Math.min(1, biomeT + dt / 120);

  // milestone
  const m = Math.floor(score / 100);
  if (m > mile) {
    mile = m;
    if (m > 0) { if (m % 5 === 0) { sfx.mile(); flash = 60; } checkAch(); }   // tick + score blink only every 500 points
  }

  // obstacles
  distSince += speed * dt;
  if (distSince >= gap) spawn();
  const pb = playerBox();
  for (const o of obstacles) {
    o.x -= speed * dt * (1 + (o.extra || 0));                     // movers go faster than the ground
    if (o.type === 'mover' && MOVERS[o.kind].bounce) { o.phase += dt * 0.12; o.dy = o.base - Math.abs(Math.sin(o.phase)) * MOVERS[o.kind].bounce; }
    if (o.type === 'bird') o.f = ((animT / 14) | 0) % 2;
    if (P.inv > 0 && overlap(pb, hitbox(o))) o.hit = true;   // walking through an obstacle while invulnerable is not a dodge
    else if (!o.close) { const hb = hitbox(o); if (overlap(pb, { x: hb.x - NEAR_PAD, y: hb.y - NEAR_PAD, w: hb.w + 2 * NEAR_PAD, h: hb.h + 2 * NEAR_PAD })) o.close = true; }
    if (!o.counted && o.x + o.w < PX) {               // passed the player without touching: dodged
      o.counted = true;
      if (!o.hit) {
        stats.dodged++; if (o.type === 'bird') stats.birds++;
        const m0 = comboMult(); combo++; stats.bestCombo = Math.max(stats.bestCombo || 0, combo); runBest.combo = Math.max(runBest.combo || 0, combo);
        if (comboMult() > m0) { popup('Combo x' + comboMult() + '!', '#ffd23f'); sfx.mile(); }
        if (o.close) { score += NEAR_POINTS * comboMult(); stats.close = (stats.close || 0) + 1; popup(L('Cerca! +', 'Close! +') + NEAR_POINTS, '#7fd0ff'); haptic(12); }   // near miss
        checkAch();
      }
    }
    if (o.type === 'bird' && overlap(pb, hitbox(o))) {
      // turtle: birds never hurt it. fox: the first bird passes through, then the dodge recharges (FOX_CD)
      if (animal.id === 'fox' && P.dodge <= 0 && P.foxCd <= 0) { P.foxCd = FOX_CD; P.dodge = 20; }
      if (animal.id === 'turtle' || (animal.id === 'fox' && P.dodge > 0)) { o.hit = true; continue; }
    }
    if (P.inv <= 0 && overlap(pb, hitbox(o))) {
      if (P.shield > 0) {
        P.shield--; P.inv = INVULN; o.hit = true;
        if (P.ownShield) { P.ownShield = 0; stats.shields++; checkAch(); }   // the achievement is about the dog's own shield
        banner = { text: L('Escudo roto!', 'Shield broken!'), t: 90 };
        combo = 0;                                     // a hit breaks the combo
        shakeT = 12;
        sfx.die();
        haptic(60);
      } else if (runMode === 'zen') {                 // zen: a hit only blinks and breaks the combo
        P.inv = INVULN; o.hit = true; combo = 0; shakeT = 10; popup(L('Ay!', 'Ouch!'), '#ff6b6b'); haptic(40);
      } else { die(); break; }
    }
  }
  obstacles = obstacles.filter((o) => o.x + o.w > -20);

  // pickups: scroll with the world; the magnet pulls nearby coins towards the player
  if (magnetT > 0) magnetT -= dt;
  const pcx = PX + 24, pcy = -(P.h + 24);
  for (const it of items) {
    it.x -= speed * dt;
    if (magnetT > 0 && it.kind === 'coin' && Math.abs(it.x + 7 - pcx) < MAGNET_REACH()) {
      const k = Math.min(1, 0.15 * dt);
      it.x += (pcx - 7 - it.x) * k; it.dy += (pcy - 7 - it.dy) * k;
    }
    if (!it.got && state === 'running' && overlap(pb, { x: it.x, y: GROUND + it.dy, w: it.w, h: it.h })) { it.got = true; collect(it); }
  }
  items = items.filter((it) => !it.got && it.x + it.w > -20);
}
