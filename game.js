(() => {
'use strict';

/* ---------- constants ---------- */
let W = 600, H = 200, GROUND = 160;                     // logical size (adapts to the screen), ground line
const S = 3;                                            // sprite scale
const GRAV = 0.6, JUMP_V = 12, START_SPEED = 6, MAX_SPEED = 13;
const PX = 50;                                          // player x
const SP = 16;                                          // animal sprite size in cells

/* ---------- pixel sprites ---------- */
const QUAD_LEGS = [
  ['..aa........aa..', '..aa........aa..', '..aaa......aaa..'],
  ['....aa....aa....', '....aa....aa....', '....aaa...aaa...'],
];
const BIPED_LEGS = (ch) => [
  ['......X...X.....', '......X...X.....', '.....XX...XX....'].map((r) => r.replace(/X/g, ch)),
  ['......X....X....', '......X....X....', '......XX..XXX...'].map((r) => r.replace(/X/g, ch)),
];

const ANIMALS = [
  {
    id: 'dino', name: 'Dino',
    crouchDrop: [4, 5, 9, 10],        // shorten neck + belly so the tail stays attached
    pal: { a: '#4caf50', b: '#b6e388', k: '#1a1a1a' },
    body: [
      '........aaaaaa..', '.......aaaaaaaa.', '.......aakaaaaa.', '.......aaaaaaaa.',
      '.......aaaaa....', '.......aaaaaaa..', 'a.....aaaaa.....', 'aa...aaaaaaa.a..',
      'aaa.aaaaaaaaaa..', '.aaaaabbbbbbaa..', '..aaabbbbbbaa...', '...aaaaaaaa.....',
      '....aaaaaa......',
    ],
    legs: [      // a real stride: one leg planted, the other lifted, then swapped
      ['....aa..aa......', '....aa..........', '....aaa.........'],
      ['....aa..aa......', '........aa......', '........aaa.....'],
    ],
  },
  {
    id: 'cat', name: 'Gato',
    pal: { a: '#f0a030', b: '#fcd58a', c: '#e0607e', k: '#1a1a1a' },
    body: [
      '..........a....a', '..........aa..aa', '..........aaaaaa', '..........akaaka',
      'a.........aaccaa', 'a..........aaaa.', 'aa.aaaaaaaaaaa..', '.aaaaabbbbaaaaa.',
      '..aaaaaaaaaaaa..', '..aaaaaaaaaaaa..', '..aabbbbbbbbaa..', '..aaaaaaaaaaaa..',
      '..aaaaaaaaaaaa..',
    ],
    legs: QUAD_LEGS,
  },
  {
    id: 'dog', name: 'Perro',
    pal: { a: '#b9783c', b: '#7a4a20', c: '#1a1a1a', k: '#1a1a1a' },
    body: [
      '..........aaaa..', '.........aaaaaa.', '.........baakaaa', '.........baaaaac',
      '.........bbaaaaa', '..........aaaaa.', 'a.aaaaaaaaaaaa..', 'aaaaaaaaaaaaaa..',
      '.aaaaaaaaaaaaa..', '..aaaaaaaaaaaa..', '..aabbbbbbbbaa..', '..aaaaaaaaaaaa..',
      '..aaaaaaaaaaaa..',
    ],
    legs: QUAD_LEGS,
  },
  {
    id: 'bunny', name: 'Conejo',
    pal: { a: '#d9c7f0', b: '#f4a6b8', c: '#e0607e', w: '#ffffff', k: '#1a1a1a' },
    body: [
      '..........aa.aa.', '..........ab.ab.', '..........ab.ab.', '..........aa.aa.',
      '..........aaaaaa', '..........akaaka', '..........aaacca', '...........aaaa.',
      '..aaaa.aaaaaaa..', '.aaaaaaaaaaaaa..', 'wwaaaaaaaaaaaa..', 'wwaabbbbbbbbaa..',
      '..aaaaaaaaaaaa..',
    ],
    crouchDrop: [1, 2, 9, 10],        // crouching: shorter ears, tighter body
    legs: QUAD_LEGS,
  },
  {
    id: 'chick', name: 'Gallina',
    pal: { a: '#fafafa', w: '#cfcfcf', r: '#e03030', c: '#f5a623', k: '#1a1a1a' },
    body: [
      '..........rrr...', '.........aaaaa..', '.........aakaaac', '.........aaaaac.',
      '.........aar....', '........aaaaa...', '..a....aaaaaaa..', '..aa.aaaaaaaaa..',
      '...aaaaaaaaaaa..', '...aawwwwwwaa...', '....aawwwwaa....', '.....aaaaaa.....',
      '......aaaa......',
    ],
    legs: BIPED_LEGS('c'),
  },
  {
    id: 'peng', name: 'Pingüino',
    pal: { a: '#34548f', w: '#f5f5f5', c: '#f5a623', k: '#ffffff' },
    body: [
      '.......aaaaaa...', '......aaaaaaaa..', '......aaaaakaaac', '......aaaaaaacc.',
      '......aaaaaaaa..', '.....aaawwwaaa..', '....aaawwwwwaaa.', '....aaawwwwwaaa.',
      '....aaawwwwwaaa.', '....aaawwwwwaaa.', '.....aawwwwwaa..', '.....aaawwwaa...',
      '......aaaaaa....',
    ],
    legs: [
      ['......cc.cc.....', '......cc.cc.....', '....ccc..ccc....'],
      ['......cc.cc.....', '......cc.cc.....', '......ccc.ccc...'],
    ],
  },
];

const CACTUS = [
  '....gg....', '...ggGg...', '...ggGg.g.', '.g.ggGg.g.', '.g.ggGg.g.', '.ggggGg.gg',
  '..gggGggg.', '...ggGg...', '...ggGg...', '...ggGg...', '...ggGg...', '...ggGg...', '...ggGg...',
];
const CACTUS_PAL = { g: '#2e8b3d', G: '#1f6b2b' };
const BIRD = [
  [
    '......pp......', '.....pppp.....', 'cc..ppppppp...', 'ccpkpppppppppp', '.cpppppppppp..',
    '..pppppppp....', '....pppp......', '..............', '..............',
  ],
  [
    '..............', '..............', 'cc............', 'ccpkpppppppppp', '.cpppppppppp..',
    '...pppppppp...', '....pppppp....', '.....pppp.....', '......pp......',
  ],
];
const BIRD_PAL = { p: '#7a4fb5', c: '#f5a623', k: '#ffffff' };
const CLOUD = [
  '.....www......', '..wwwwwwww....', 'wwwwwwwwwwww..', 'wwwwwwwwwwwwww',
];

// Sprites get a 1-cell transparent margin that holds an automatic dark outline.
// Always draw them with blit(), which accounts for that margin.
function sprite(rows, pal, outline = '#1b1b2b') {
  const w = rows[0].length, h = rows.length;
  const c = document.createElement('canvas');
  c.width = w + 2;
  c.height = h + 2;
  const g = c.getContext('2d');
  const on = (x, y) => x >= 0 && x < w && y >= 0 && y < h && !!pal[rows[y][x]];
  if (outline) {
    g.fillStyle = outline;
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) g.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (on(x, y)) { g.fillStyle = pal[rows[y][x]]; g.fillRect(x + 1, y + 1, 1, 1); }
  }
  return c;
}
// draw `img` so that its art (without the outline margin) fills x, y, w, h
function blit(img, x, y, w, h) {
  const cx = w / (img.width - 2), cy = h / (img.height - 2);
  ctx.drawImage(img, x - cx, y - cy, img.width * cx, img.height * cy);
}

ANIMALS.forEach((a) => {
  const mk = (body, legs) => sprite([...body, ...legs].map((r) => r.padEnd(SP, '.')), a.pal);
  const drop = a.crouchDrop || [7, 8, 9, 10];                   // squat: drop 4 rows (keeps the sprite 12 rows tall)
  const crouch = a.body.filter((_, i) => !drop.includes(i));
  a.frames = a.legs.map((l) => mk(a.body, l));
  a.duck = a.legs.map((l) => mk(crouch, l));
});
const cactusImg = sprite(CACTUS, CACTUS_PAL);
const birdImgs = BIRD.map((b) => sprite(b, BIRD_PAL));
const cloudImg = sprite(CLOUD, { w: '#ffffff' }, null);

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
const mix = (a, b, t) => {
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join('');
};
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};
const pad = (n) => String(Math.floor(n)).padStart(5, '0');

const DAY = { skyT: '#6ec6f0', skyB: '#d4f1fc', hill1: '#a8dba0', hill2: '#7cc47a', ground: '#e0c48a', lip: '#8a6a3a', speck: '#b89860', cloud: '#ffffff', hud: '#2c2c2c' };
const NIGHT = { skyT: '#0d0f2b', skyB: '#2a2d5c', hill1: '#2d3a63', hill2: '#212b4d', ground: '#3b3452', lip: '#1c1830', speck: '#554c72', cloud: '#4a5080', hud: '#e8e8ff' };

/* ---------- canvas ---------- */
const canvas = $('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// Native-resolution canvas: every logical px is K whole device px, so pixel art stays razor sharp.
// The world is ~560+ logical px wide and ~300 tall, whatever the screen.
let K = 1, insetR = 0;                                  // insetR: right safe-area (notch) in logical px
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-right:env(safe-area-inset-right,0px)';
document.body.appendChild(probe);
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const dw = Math.max(1, Math.round(window.innerWidth * dpr));
  const dh = Math.max(1, Math.round(window.innerHeight * dpr));
  K = Math.max(1, Math.round(dh / 300));
  while (K > 1 && dw / K < 560) K--;
  W = Math.ceil(dw / K); H = Math.ceil(dh / K);
  canvas.width = W * K; canvas.height = H * K;
  canvas.style.width = (W * K / dpr) + 'px';
  canvas.style.height = (H * K / dpr) + 'px';
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.imageSmoothingEnabled = false;
  GROUND = H - 40;
  insetR = Math.ceil((parseFloat(getComputedStyle(probe).paddingRight) || 0) * dpr / K);
}
resize();

/* ---------- audio ---------- */
let audio = null, muted = store.get('dp-muted', '0') === '1';
function beep(f0, f1, dur, type = 'square', vol = 0.08) {
  if (muted) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(audio.destination);
    o.start(t); o.stop(t + dur);
  } catch { /* audio unavailable */ }
}
const sfx = {
  jump: () => beep(300, 650, 0.12),
  die: () => beep(260, 40, 0.4, 'sawtooth', 0.1),
  mile: () => { beep(660, 660, 0.08); setTimeout(() => beep(990, 990, 0.12), 90); },
};

/* ---------- haptics (Android; iOS has no web vibration API) ---------- */
const canVibrate = typeof navigator.vibrate === 'function';
let vibeOn = store.get('dp-vibe', '1') === '1';
const haptic = (pattern) => { if (canVibrate && vibeOn) { try { navigator.vibrate(pattern); } catch { /* ignore */ } } };

/* ---------- unlocks: animals open up as your best score grows ---------- */
const UNLOCK = { dino: 0, cat: 300, dog: 600, bunny: 1000, chick: 1500, peng: 2000 };
ANIMALS.forEach((a) => { a.unlock = UNLOCK[a.id] || 0; });
let best = Number(store.get('dp-best', '0')) || 0;      // best score reached with any animal
const unlocked = (a) => best >= a.unlock;

/* ---------- abilities: [name, how it works] ---------- */
const ABILITY = {
  dino: ['Clásico', 'Sin habilidad'],
  cat: ['Salto doble', 'Toca otra vez en el aire'],
  dog: ['Escudo', 'Sobrevive a un golpe'],
  bunny: ['Salto alto', 'Salta mucho más'],
  chick: ['Planeo', 'Mantén al caer para planear'],
  peng: ['Deslizar', 'Agachado: puntos x2'],
};
const INVULN = 90;                                      // frames of invulnerability after the dog's shield breaks

/* ---------- state ---------- */
let animal = ANIMALS.find((a) => a.id === store.get('dp-animal', 'dino')) || ANIMALS[0];
if (!unlocked(animal)) animal = ANIMALS[0];
let state = 'ready';                                    // ready | running | over
let paused = false;
let score, speed, hi, night = 0, nightTarget = 0, scroll, distSince, gap, mile, flash, diedAt;
let obstacles, dust, animT, duckHeld = false, jumpHeld = false;
let banner = { text: '', t: 0 }, newlyUnlocked = [];
let runToken = null, lastRank = null, pendingRun = null;   // online ranking (see the ranking section below)
const MIN_H = 75, CUT_V = 4;                           // variable jump: released early => cut once above MIN_H
const P = { h: 0, vy: 0, duck: false, doubled: false, shield: 0, inv: 0 };

const specks = Array.from({ length: 110 }, () => ({ x: rnd(0, 1400), y: rnd(GROUND + 10, H - 4), w: Math.floor(rnd(1, 4)) * 2 }));
const clouds = Array.from({ length: 7 }, (_, i) => ({ x: i * 170 + rnd(0, 60), y: rnd(20, Math.max(40, GROUND - 110)), s: rnd(3, 5) | 0 }));
const stars = Array.from({ length: 70 }, () => ({ x: rnd(0, 1400), y: rnd(4, 220), p: rnd(0, 6) }));

function reset() {
  score = 0; speed = START_SPEED; scroll = 0; distSince = 0; gap = 320; mile = 0; flash = 0;
  night = 0; nightTarget = 0; animT = 0;
  obstacles = []; dust = [];
  P.h = 0; P.vy = 0; P.duck = false; P.doubled = false; P.inv = 0;
  P.shield = animal.id === 'dog' ? 1 : 0;
  banner = { text: '', t: 0 }; newlyUnlocked = [];
  hi = Number(store.get('dp-hi-' + animal.id, '0'));
}
reset();

function start() {
  reset();
  state = 'running';
  lastRank = null;
  runToken = null;
  showShare(false);
  api('/api/start').then((r) => { if (r.ok && r.data.t) runToken = r.data.t; });   // signed token: lets the server check run time vs score
}

function die() {
  state = 'over';
  diedAt = performance.now();
  sfx.die();
  haptic([70, 40, 140]);
  if (score > hi) { hi = Math.floor(score); store.set('dp-hi-' + animal.id, String(hi)); }
  if (score > best) { best = Math.floor(score); store.set('dp-best', String(best)); }
  submitRun();
  showShare(score >= 20);
}

function jump() {
  if (P.h > 0) {
    // cat: one extra jump in mid-air
    if (animal.id === 'cat' && !P.doubled) { P.doubled = true; P.vy = JUMP_V * 0.8; sfx.jump(); puff(4); }
    return;
  }
  P.vy = animal.id === 'bunny' ? JUMP_V * 1.1 : JUMP_V;
  sfx.jump();
  puff(8);
}

function puff(n) {
  for (let i = 0; i < n; i++) {
    dust.push({ x: PX + rnd(4, 20), y: GROUND - rnd(0, 4), vx: rnd(-2.5, -0.5), vy: rnd(-1.5, -0.2), life: rnd(14, 26) });
  }
}

/* ---------- obstacles ---------- */
function spawn() {
  const birdOK = score > 300 && Math.random() < 0.3;
  if (birdOK) {
    const tops = [-100, -58, -34];
    obstacles.push({ type: 'bird', x: W + 20, dy: tops[(Math.random() * 3) | 0], w: 14 * S, h: 9 * S });
  } else {
    const n = 1 + ((Math.random() * (score > 150 ? 3 : 2)) | 0);
    const parts = [];
    let w = 0, h = 0;
    for (let i = 0; i < n; i++) {
      const big = n < 3 && Math.random() < 0.4;   // 3-cactus groups stay small so they remain jumpable
      const k = big ? 4 : 3;
      parts.push({ k, dx: w });
      w += 10 * k + 6;
      h = Math.max(h, 13 * k);
    }
    obstacles.push({ type: 'cactus', x: W + 20, dy: 2 - h, w: w - 6, h, parts });
  }
  gap = speed * 30 + 120 + rnd(0, 260);
  distSince = 0;
}

/* ---------- update ---------- */
function hitbox(o) {
  const y = GROUND + o.dy;
  return o.type === 'bird'
    ? { x: o.x + 6, y: y + 6, w: o.w - 12, h: o.h - 12 }
    : { x: o.x + 4, y: y + 4, w: o.w - 8, h: o.h - 4 };
}
function playerBox() {
  return P.duck
    ? { x: PX + 8, y: GROUND - P.h - 36 + 5, w: 34, h: 29 }
    : { x: PX + 10, y: GROUND - P.h - 48 + 6, w: 28, h: 40 };
}
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function update(dt) {
  nightTarget = Math.floor(score / 700) % 2;
  night += Math.sign(nightTarget - night) * Math.min(Math.abs(nightTarget - night), 0.006 * dt);
  dust.forEach((d) => { d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt; });
  dust = dust.filter((d) => d.life > 0);
  if (flash > 0) flash -= dt;
  if (banner.t > 0) banner.t -= dt;
  if (P.inv > 0) P.inv -= dt;
  if (state !== 'running') return;

  speed = Math.min(MAX_SPEED, START_SPEED + score / 300);
  score += speed * dt * 0.12 * (animal.id === 'peng' && P.duck ? 2 : 1);   // penguin: sliding doubles points
  scroll += speed * dt;
  animT += speed * dt;

  // physics
  P.duck = duckHeld && P.h === 0;
  if (P.h > 0 || P.vy > 0) {
    if (!jumpHeld && P.vy > CUT_V && P.h >= MIN_H) P.vy = CUT_V;   // released early: shorter jump
    const glide = animal.id === 'chick' && jumpHeld && P.vy < 0;   // chicken: hold while falling to glide
    P.vy -= GRAV * (duckHeld ? 3 : glide ? 0.3 : 1) * dt;
    P.h += P.vy * dt;
    if (P.h <= 0) { P.h = 0; P.vy = 0; P.doubled = false; puff(5); }
  } else if (Math.floor(animT) % 18 === 0 && Math.random() < 0.15) puff(1);

  // unlocks
  for (const a of ANIMALS) {
    if (a.unlock > best && score >= a.unlock) {
      best = Math.floor(score);
      store.set('dp-best', String(best));
      newlyUnlocked.push(a.name);
      banner = { text: a.name + ' desbloqueado!', t: 200 };
      sfx.mile();
      haptic([40, 60, 40, 60, 90]);
    }
  }

  // milestone
  const m = Math.floor(score / 100);
  if (m > mile) { mile = m; if (m > 0) { sfx.mile(); flash = 60; } }

  // obstacles
  distSince += speed * dt;
  if (distSince >= gap) spawn();
  const pb = playerBox();
  for (const o of obstacles) {
    o.x -= speed * dt;
    if (o.type === 'bird') o.f = ((animT / 14) | 0) % 2;
    if (P.inv <= 0 && overlap(pb, hitbox(o))) {
      if (P.shield > 0) {
        P.shield = 0; P.inv = INVULN;
        banner = { text: 'Escudo roto!', t: 90 };
        sfx.die();
        haptic(60);
      } else { die(); break; }
    }
  }
  obstacles = obstacles.filter((o) => o.x + o.w > -20);
}

/* ---------- draw ---------- */
const col = (k) => mix(DAY[k], NIGHT[k], night);

// pixel disc; with `cut` ([dx, dy, r] in cells) the cut-out disc is skipped, giving a crescent
function pixelDisc(cx, cy, r, c, cut) {
  ctx.fillStyle = c;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r) continue;
    if (cut && (dx - cut[0]) ** 2 + (dy - cut[1]) ** 2 <= cut[2] ** 2) continue;
    ctx.fillRect(cx + dx * 4, cy + dy * 4, 4, 4);
  }
}

function drawHills(base, amp, freq, par, color) {
  ctx.fillStyle = color;
  const off = scroll * par;
  for (let x = 0; x < W; x += 4) {
    const h = base + Math.sin((x + off) * freq) * amp + Math.sin((x + off) * freq * 2.3) * amp * 0.4;
    const top = Math.round((GROUND - h) / 4) * 4;
    ctx.fillRect(x, top, 4, GROUND - top);
  }
}

function drawBackground() {
  // stepped sky bands
  const bands = 10, bh = Math.ceil(GROUND / bands);
  for (let i = 0; i < bands; i++) {
    const f = i / (bands - 1);
    ctx.fillStyle = mix(mix(DAY.skyT, DAY.skyB, f), mix(NIGHT.skyT, NIGHT.skyB, f), night);
    ctx.fillRect(0, i * bh, W, bh + 1);
  }
  // stars
  if (night > 0.05) {
    const t = performance.now() / 400;
    ctx.fillStyle = '#fff';
    stars.forEach((s) => {
      ctx.globalAlpha = night * (0.5 + 0.5 * Math.sin(t + s.p));
      ctx.fillRect(Math.round(s.x), Math.round(s.y), 3, 3);
    });
    ctx.globalAlpha = 1;
  }
  // sun / moon
  ctx.globalAlpha = 1 - night;
  if (night < 1) pixelDisc(W - 100, 44, 5, '#ffd23f');
  ctx.globalAlpha = night;
  if (night > 0) {
    pixelDisc(W - 100, 44, 5, '#f4f1c8', [3, -2, 4]);
  }
  ctx.globalAlpha = 1;
  // clouds
  ctx.fillStyle = col('cloud');
  const cc = col('cloud');
  ctx.globalAlpha = 0.9;
  clouds.forEach((c) => blit(tint(cloudImg, cc), Math.round(c.x), Math.round(c.y), 14 * c.s, 4 * c.s));
  ctx.globalAlpha = 1;
  drawHills(34, 14, 0.012, 0.15, col('hill1'));
  drawHills(18, 10, 0.02, 0.4, col('hill2'));
  // ground
  ctx.fillStyle = col('ground');
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = col('lip');
  ctx.fillRect(0, GROUND, W, 4);
  ctx.fillStyle = col('speck');
  specks.forEach((s) => ctx.fillRect(Math.round(s.x), s.y, s.w, 2));
}

const tintCache = {};
function tint(img, color) {
  let c = tintCache[color];
  if (!c) {
    const keys = Object.keys(tintCache);
    if (keys.length > 40) keys.forEach((k) => delete tintCache[k]);
    c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    tintCache[color] = c;
  }
  return c;
}

function drawPlayer() {
  if (P.inv > 0 && Math.floor(P.inv / 5) % 2 === 0) return;     // blink while invulnerable
  const run = Math.floor(animT / 40) % 2;   // one step every 40 px of travel: ~6 frames at start, ~3 at top speed
  const f = P.h > 0 || state !== 'running' ? 0 : run;
  if (P.duck) blit(animal.duck[f], PX, GROUND - 36, 48, 36);
  else blit(animal.frames[f], PX, GROUND - P.h - SP * S, SP * S, SP * S);
}

function drawObstacles() {
  obstacles.forEach((o) => {
    if (o.type === 'bird') {
      blit(birdImgs[o.f || 0], Math.round(o.x), GROUND + o.dy, o.w, o.h);
    } else {
      o.parts.forEach((p) => {
        const w = 10 * p.k, h = 13 * p.k;
        blit(cactusImg, Math.round(o.x + p.dx), GROUND + 2 - h, w, h);
      });
    }
  });
}

// 5x7 pixel font (A-Z, 0-9 and a little punctuation), drawn with plain fillRects so it stays crisp
const F = (s) => s.split('/').map((r) => parseInt(r, 2));
const FONT = {
  A: F('01110/10001/10001/11111/10001/10001/10001'), B: F('11110/10001/10001/11110/10001/10001/11110'),
  C: F('01110/10001/10000/10000/10000/10001/01110'), D: F('11110/10001/10001/10001/10001/10001/11110'),
  E: F('11111/10000/10000/11110/10000/10000/11111'), F: F('11111/10000/10000/11110/10000/10000/10000'),
  G: F('01110/10001/10000/10111/10001/10001/01111'), H: F('10001/10001/10001/11111/10001/10001/10001'),
  I: F('01110/00100/00100/00100/00100/00100/01110'), J: F('00111/00010/00010/00010/00010/10010/01100'),
  K: F('10001/10010/10100/11000/10100/10010/10001'), L: F('10000/10000/10000/10000/10000/10000/11111'),
  M: F('10001/11011/10101/10101/10001/10001/10001'), N: F('10001/11001/10101/10011/10001/10001/10001'),
  O: F('01110/10001/10001/10001/10001/10001/01110'), P: F('11110/10001/10001/11110/10000/10000/10000'),
  Q: F('01110/10001/10001/10001/10101/10010/01101'), R: F('11110/10001/10001/11110/10100/10010/10001'),
  S: F('01111/10000/10000/01110/00001/00001/11110'), T: F('11111/00100/00100/00100/00100/00100/00100'),
  U: F('10001/10001/10001/10001/10001/10001/01110'), V: F('10001/10001/10001/10001/10001/01010/00100'),
  W: F('10001/10001/10001/10101/10101/11011/10001'), X: F('10001/10001/01010/00100/01010/10001/10001'),
  Y: F('10001/10001/01010/00100/00100/00100/00100'), Z: F('11111/00001/00010/00100/01000/10000/11111'),
  0: F('01110/10001/10011/10101/11001/10001/01110'), 1: F('00100/01100/00100/00100/00100/00100/01110'),
  2: F('01110/10001/00001/00010/00100/01000/11111'), 3: F('11110/00001/00001/01110/00001/00001/11110'),
  4: F('00010/00110/01010/10010/11111/00010/00010'), 5: F('11111/10000/11110/00001/00001/10001/01110'),
  6: F('00110/01000/10000/11110/10001/10001/01110'), 7: F('11111/00001/00010/00100/01000/01000/01000'),
  8: F('01110/10001/10001/01110/10001/10001/01110'), 9: F('01110/10001/10001/01111/00001/00010/01100'),
  '.': F('00000/00000/00000/00000/00000/01100/01100'), ':': F('00000/01100/01100/00000/01100/01100/00000'),
  '!': F('00100/00100/00100/00100/00100/00000/00100'), '-': F('00000/00000/00000/11111/00000/00000/00000'),
  '#': F('01010/01010/11111/01010/11111/01010/01010'),
  ',': F('00000/00000/00000/00000/00110/00100/01000'), '?': F('01110/10001/00001/00110/00100/00000/00100'),
};
// Accents are drawn as extra cells above a base letter (acute, tilde, diaeresis), so á é í ó ú ñ ü all work.
const MARKS = {
  '\u0301': [[3, -2], [2, -1]],                       // acute
  '\u0303': [[1, -1], [2, -2], [3, -2], [4, -1]],     // tilde
  '\u0308': [[1, -2], [3, -2]],                       // diaeresis
};
function glyphs(str) {
  const out = [];
  for (const c of str.toUpperCase().normalize('NFD')) {
    if (c >= '\u0300' && c <= '\u036f') { if (out.length) out[out.length - 1].m = c; }
    else out.push({ c, m: null });
  }
  return out;
}
// y is the top of the text (accents rise 2 cells above it); s is the pixel size in logical px
function pixText(str, x, y, s, align = 'left', color = '#fff', shadow = true) {
  const gl = glyphs(str);
  const w = gl.length * 6 * s - s;
  const x0 = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
  y = Math.round(y);
  const pass = (ox, oy, c) => {
    ctx.fillStyle = c;
    gl.forEach(({ c: ch, m }, i) => {
      const g = FONT[ch];
      const gx = x0 + ox + i * 6 * s;
      if (g) {
        for (let r = 0; r < 7; r++) for (let b = 0; b < 5; b++) {
          if (g[r] & (16 >> b)) ctx.fillRect(gx + b * s, y + oy + r * s, s, s);
        }
      }
      if (m && MARKS[m]) MARKS[m].forEach(([mx, my]) => ctx.fillRect(gx + mx * s, y + oy + my * s, s, s));
    });
  };
  if (shadow) pass(s, s, 'rgba(0,0,0,.55)');
  pass(0, 0, color);
}

function drawHUD() {
  const c = col('hud');
  const blink = flash > 0 && Math.floor(flash / 7) % 2 === 0;
  ctx.globalAlpha = 0.6;
  pixText('HI ' + pad(hi), W - 86 - insetR, 12, 2, 'right', c, false);
  ctx.globalAlpha = 1;
  if (!blink) pixText(pad(score), W - 12 - insetR, 12, 2, 'right', c, false);
  if (P.shield > 0) pixText('Escudo', W - 212 - insetR, 12, 2, 'right', '#4fc3f7');
  if (animal.id === 'peng' && P.duck && state === 'running') pixText('x2', W - 212 - insetR, 12, 2, 'right', '#ffd23f');
}

function draw() {
  // scroll specks/clouds
  const v = state === 'running' ? speed : 0;
  specks.forEach((s) => { s.x -= v; if (s.x < -8) { s.x = W + rnd(0, 40); s.y = rnd(GROUND + 10, H - 4); } });
  clouds.forEach((c) => { c.x -= v * 0.2 + (state === 'running' ? 0 : 0.1); if (c.x < -80) { c.x = W + rnd(0, 80); c.y = rnd(20, Math.max(40, GROUND - 110)); } });

  drawBackground();
  drawObstacles();
  drawPlayer();
  ctx.fillStyle = '#fff';
  dust.forEach((d) => {
    ctx.globalAlpha = Math.min(1, d.life / 14) * 0.8;
    ctx.fillStyle = col('speck');
    ctx.fillRect(Math.round(d.x), Math.round(d.y), 3, 3);
  });
  ctx.globalAlpha = 1;
  drawHUD();
  if (banner.t > 0 && !paused) pixText(banner.text, W / 2, 44, 2, 'center', '#ffd23f');

  const ty = GROUND * 0.38;
  if (paused) {
    // the pause menu is a DOM overlay
  } else if (state === 'ready') {
    pixText(animal.name, W / 2, ty - 14, 4, 'center');
    pixText('Toca la pantalla o pulsa espacio', W / 2, ty + 28, 2, 'center');
    pixText(ABILITY[animal.id][0] + ': ' + ABILITY[animal.id][1], W / 2, ty + 54, 2, 'center', '#ffd23f');
  } else if (state === 'over') {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, W, H);
    pixText('Game over', W / 2, ty - 14, 4, 'center', '#ffd23f');
    pixText('Toca o pulsa espacio para reintentar', W / 2, ty + 28, 2, 'center');
    if (lastRank) pixText('Ranking #' + lastRank.all.rank + ' global - #' + lastRank.animal.rank + ' ' + animal.name, W / 2, ty + 84, 2, 'center', '#7fd0ff');
    if (newlyUnlocked.length) pixText('Nuevo: ' + newlyUnlocked.join(', '), W / 2, ty + 56, 2, 'center', '#ffd23f');
  }
}

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

/* ---------- game speed ---------- */
const PACES = [0.6, 0.7, 0.8, 0.9, 1];
const fine = !window.matchMedia('(pointer: coarse)').matches;   // mouse/keyboard devices default to 80%
let pace = Number(store.get('dp-pace', fine ? '0.8' : '1'));
if (!PACES.includes(pace)) pace = fine ? 0.8 : 1;
function showPace() {
  ['pace', 'pace2'].forEach((id) => { $(id).querySelector('span').textContent = 'Velocidad ' + Math.round(pace * 100) + '%'; });
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
  const dt = Math.min((t - last) / 16.667, 3) * pace;   // pace < 1 slows the whole simulation evenly
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
function setPaused(v) {
  paused = v && inGame;
  duckHeld = false;
  jumpHeld = false;
  pauseEl.hidden = !paused;
  refreshShare();
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
  setPaused(false);
  stage.hidden = true;
  menu.hidden = false;
  showShare(false);
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
  if (!rankEl.hidden) { if (e.code === 'Escape') { e.preventDefault(); closeRank(); } return; }
  if (!help.hidden) { if (e.code === 'Escape' || e.code === 'KeyH') { e.preventDefault(); closeHelp(); } return; }
  if (e.code === 'KeyH') { e.preventDefault(); if (inGame) setPaused(true); openHelp(); return; }
  if (!inGame) {
    if (e.code === 'KeyM') setMuted(!muted);
    if (e.code === 'KeyF') { if (inFs()) leaveFs(); else goFs(); }
    return;
  }
  if (e.repeat) { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') e.preventDefault(); return; }
  switch (e.code) {
    case 'Space': case 'ArrowUp': case 'KeyW':
      e.preventDefault();
      if (paused) { if (e.code === 'Space') setPaused(false); } else { jumpHeld = true; press(); }
      break;
    case 'ArrowDown': case 'KeyS': e.preventDefault(); duckHeld = !paused; break;
    case 'KeyP': case 'Escape': setPaused(!paused); break;
    case 'KeyF': if (inFs()) leaveFs(); else goFs(); break;
    case 'KeyM': setMuted(!muted); break;
  }
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowDown' || e.code === 'KeyS') duckHeld = false;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') jumpHeld = false;
  if (inGame && e.code === 'Space') e.preventDefault();
});

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (paused) return;
  const r = canvas.getBoundingClientRect();
  const lower = (e.clientY - r.top) / r.height > 0.68;
  if (state === 'running' && lower) duckHeld = true;
  else { jumpHeld = true; press(); }
});
['pointerup', 'pointercancel', 'pointerleave'].forEach((n) => canvas.addEventListener(n, () => { duckHeld = false; jumpHeld = false; }));
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'running') setPaused(true); });
window.addEventListener('blur', () => { duckHeld = false; jumpHeld = false; if (state === 'running') setPaused(true); });

/* ---------- help screen ---------- */
const help = $('help'), helpBody = $('help-body');
const bullet = '<i data-icon="play" class="bullet"></i>';
function spriteCanvas(img, cell) {
  const c = document.createElement('canvas');
  c.width = img.width * cell; c.height = img.height * cell;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0, c.width, c.height);
  return c;
}
const HELP = {
  controls() {
    const keys = (...k) => k.map((x) => '<b>' + x + '</b>').join(' ');
    return `
      <table class="keys">
        <tr><th></th><th>Teclado</th><th>Táctil</th></tr>
        <tr><td>Saltar</td><td>${keys('ESPACIO', '<i data-icon="up"></i>', 'W')}</td><td>Toca</td></tr>
        <tr><td>Agacharte</td><td>${keys('<i data-icon="down"></i>', 'S')}</td><td>Mantén abajo</td></tr>
        <tr><td>Pausa</td><td>${keys('P', 'ESC')}</td><td>Botón arriba</td></tr>
        <tr><td>Pantalla completa</td><td>${keys('F')}</td><td></td></tr>
        <tr><td>Sonido</td><td>${keys('M')}</td><td>Botón del menú</td></tr>
        <tr><td>Ayuda</td><td>${keys('H')}</td><td>Botón del menú</td></tr>
      </table>
      <p class="note">Mantén pulsado para saltar más alto; suelta pronto para un salto corto.</p>
      <h3>Obstáculos</h3>
      <div class="obs"><span data-sprite="cactus"></span><p><em>Cactus:</em> salta por encima.</p></div>
      <div class="obs"><span data-sprite="bird"></span><p><em>Pájaro alto:</em> pasa por debajo sin hacer nada.<br>
        <em>Pájaro medio:</em> agáchate.<br><em>Pájaro bajo:</em> salta.</p></div>`;
  },
  animals() {
    return '<div class="ani">' + ANIMALS.map((a) => {
      const open = unlocked(a);
      const [n, d] = ABILITY[a.id];
      return `<div class="row${open ? '' : ' locked'}" data-animal="${a.id}">
        <span class="face"></span>
        <p><em>${a.name}</em> - ${n}<br>${d}<br>
        <span class="req">${a.unlock ? (open ? 'Desbloqueado' : '<i data-icon="lock"></i> Con ' + a.unlock + ' puntos') : 'Desde el principio'}</span></p>
      </div>`;
    }).join('') + '</div>';
  },
  tips() {
    const t = [
      'Tu <em>mejor puntuación</em> con cualquier animal desbloquea a los demás.',
      'Cada <em>700 puntos</em> cambia entre día y noche, y el juego va cada vez más rápido.',
      'Los <em>pájaros</em> aparecen a partir de 300 puntos.',
      'Cada animal guarda su <em>propio récord</em>.',
      'Si el juego te va muy rápido, baja la <em>velocidad</em> en el menú o en la pausa.',
      '<em>Gato:</em> guarda el segundo salto para corregir un salto corto.',
      '<em>Pingüino:</em> desliza cuando no haya cactus cerca; los puntos valen el doble.',
      '<em>Gallina:</em> mantén pulsado al caer para planear sobre grupos de cactus.',
    ];
    return '<ul class="tips">' + t.map((x) => '<li>' + bullet + '<p>' + x + '</p></li>').join('') + '</ul>';
  },
};
function renderHelp(tab) {
  helpBody.innerHTML = HELP[tab]();
  helpBody.scrollTop = 0;
  help.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  helpBody.querySelectorAll('i[data-icon]').forEach((el) => setIcon(el, el.dataset.icon));
  helpBody.querySelectorAll('[data-sprite]').forEach((el) => {
    el.appendChild(spriteCanvas(el.dataset.sprite === 'cactus' ? cactusImg : birdImgs[0], 2));
  });
  helpBody.querySelectorAll('[data-animal]').forEach((el) => {
    const a = ANIMALS.find((x) => x.id === el.dataset.animal);
    el.querySelector('.face').appendChild(spriteCanvas(a.frames[0], 3));
  });
}
function openHelp() { renderHelp('controls'); help.hidden = false; $('help-close').focus(); }
function closeHelp() { help.hidden = true; if (inGame) $('resume').focus(); else $('help-btn').focus(); }
help.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => renderHelp(b.dataset.tab)));
$('help-close').addEventListener('click', closeHelp);
$('help-btn').addEventListener('click', openHelp);
$('help-btn2').addEventListener('click', openHelp);

/* ---------- share ---------- */
const shareBtn = $('share-btn');
let shareWanted = false;                            // a run just ended and is worth sharing
function refreshShare() { shareBtn.hidden = !(shareWanted && !paused); }   // hidden behind the pause menu
function showShare(on) { shareWanted = on; refreshShare(); }
function flashShare(msg) {
  const span = shareBtn.querySelector('span'), old = 'Compartir';
  span.textContent = msg;
  setTimeout(() => { span.textContent = old; }, 1800);
}
async function shareRun() {
  const text = 'He llegado a ' + Math.floor(score) + ' puntos con ' + animal.name + ' en DinoPixel. ¿Puedes superarme?';
  const url = location.origin + '/';
  try {
    if (navigator.share) { await navigator.share({ title: 'DinoPixel', text, url }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }       // user closed the share sheet
  try { await navigator.clipboard.writeText(text + ' ' + url); flashShare('¡Copiado!'); } catch { flashShare('No se pudo copiar'); }
}
shareBtn.addEventListener('click', shareRun);

/* ---------- online ranking ---------- */
// Backend: /api/* Vercel functions + Upstash Redis. Everything here degrades silently if the backend is missing or offline.
const rankEl = $('rank'), rankBody = $('rank-body'), rankMsg = $('rank-msg'), nickInput = $('nick-input');
const NICK_RE = /^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u;
function newPid() {
  const a = new Uint8Array(16);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else a.forEach((_, i) => { a[i] = Math.random() * 256 | 0; });
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}
let pid = store.get('dp-pid', '');
if (!/^[a-f0-9]{32}$/.test(pid)) { pid = newPid(); store.set('dp-pid', pid); }
let nick = store.get('dp-nick', '').toUpperCase();
let rankBoard = 'all', rankReq = 0, nagged = false;

async function api(path, body) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 7000);
  try {
    const r = await fetch(path, body
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal }
      : { signal: ctl.signal });
    let data = {};
    try { data = await r.json(); } catch { /* not JSON (e.g. a 404 page) */ }
    return { ok: r.ok, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: {} };     // offline / timeout
  } finally { clearTimeout(to); }
}
const retryable = (r) => r.status === 0 || (r.status >= 500 && r.status !== 503);   // 503 = ranking not configured: don't retry

function submitRun() {
  const sc = Math.floor(score);
  if (sc < 20 || !runToken) return;                 // trivial runs and runs without a server token are not ranked
  const run = { animal: animal.id, score: sc, t: runToken };
  runToken = null;
  if (!nick) {
    if (!pendingRun || run.score > pendingRun.score) pendingRun = run;
    if (!nagged) {                                   // ask for a nickname once per session
      nagged = true;
      setTimeout(() => { if (inGame && state === 'over' && rankEl.hidden) openRank('¡Buena partida! Elige un apodo para guardar tu puntuación.'); }, 700);
    }
    return;
  }
  sendScore(run);
}
async function sendScore(run) {
  const r = await api('/api/score', { pid, nick, ...run });
  if (r.ok) { lastRank = r.data; flushQueue(); }
  else if (retryable(r)) queueRun(run);
}
function queueRun(run) {
  let q = [];
  try { q = JSON.parse(store.get('dp-queue', '[]')); } catch { /* ignore */ }
  q.push({ ...run, nick });
  store.set('dp-queue', JSON.stringify(q.slice(-5)));
}
let flushing = false;
async function flushQueue() {
  if (flushing) return;
  let q = [];
  try { q = JSON.parse(store.get('dp-queue', '[]')); } catch { /* ignore */ }
  if (!q.length) return;
  flushing = true;
  const left = [];
  for (const run of q) {
    const r = await api('/api/score', { pid, ...run });
    if (retryable(r)) left.push(run);
  }
  store.set('dp-queue', JSON.stringify(left));
  flushing = false;
}
window.addEventListener('online', flushQueue);
setTimeout(flushQueue, 4000);

function buildRankTabs() {
  const box = $('rank-tabs');
  const mk = (board, label, node) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'small tab'; b.dataset.board = board; b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', label); b.title = label;
    if (node) b.appendChild(node); else b.textContent = label;
    b.addEventListener('click', () => loadRank(board));
    box.appendChild(b);
  };
  mk('all', 'Global');
  ANIMALS.forEach((a) => mk(a.id, a.name, spriteCanvas(a.frames[0], 1)));
}
buildRankTabs();

function openRank(msg) {
  if (inGame && state === 'running') setPaused(true);
  rankMsg.textContent = msg || '';
  nickInput.value = nick;
  rankEl.hidden = false;
  loadRank(rankBoard);
  (msg ? nickInput : $('rank-close')).focus();
}
function closeRank() {
  resetDeleteLabel();
  rankEl.hidden = true;
  (inGame ? $('resume') : $('rank-btn')).focus();
}
async function loadRank(board) {
  rankBoard = board;
  const mine = ++rankReq;
  $('rank-tabs').querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.board === board));
  rankBody.innerHTML = '<p class="note">Cargando...</p>';
  const r = await api('/api/ranking?board=' + board + '&pid=' + pid);
  if (mine !== rankReq) return;                      // a newer tab was opened meanwhile
  if (!r.ok) {
    const why = r.status === 0 ? 'Sin conexión. Inténtalo más tarde.'
      : (r.status === 503 || r.status === 404) ? 'El ranking aún no está disponible.' : 'No se pudo cargar el ranking.';
    rankBody.innerHTML = '<p class="note"></p>';
    rankBody.firstChild.textContent = why;
    return;
  }
  renderRank(r.data);
}
function renderRank(d) {
  rankBody.replaceChildren();
  if (!d.rows.length) {
    const p = document.createElement('p'); p.className = 'note'; p.textContent = 'Aún no hay puntuaciones. ¡Sé el primero!';
    rankBody.appendChild(p);
    return;
  }
  const tbl = document.createElement('table'); tbl.className = 'lb';
  const add = (rk, n, sc, me) => {
    const tr = tbl.insertRow(); if (me) tr.className = 'me';
    tr.insertCell().textContent = '#' + rk;
    tr.insertCell().textContent = n;                 // textContent: nicknames are never interpreted as HTML
    tr.insertCell().textContent = sc;
  };
  d.rows.forEach((x) => add(x.r, x.n, x.s, x.me));
  if (d.me && !d.rows.some((x) => x.me)) {
    const c = tbl.insertRow().insertCell(); c.colSpan = 3; c.className = 'sep'; c.textContent = '...';
    add(d.me.r, d.me.n, d.me.s, true);
  }
  const foot = document.createElement('p'); foot.className = 'note'; foot.textContent = d.total + (d.total === 1 ? ' jugador' : ' jugadores');
  rankBody.append(tbl, foot);
}
async function saveNick() {
  const v = nickInput.value.normalize('NFC').replace(/\s+/g, ' ').trim().toUpperCase();
  const len = [...v].length;
  if (!len || len > 10 || !NICK_RE.test(v)) { rankMsg.textContent = 'Apodo no válido: 1-10 letras o números (se permite . _ -).'; return; }
  rankMsg.textContent = 'Guardando...';
  const r = await api('/api/name', { pid, nick: v });
  if (r.status === 400) { rankMsg.textContent = r.data.error === 'banned' ? 'Ese apodo no está permitido.' : 'Apodo no válido.'; return; }
  nick = v;
  store.set('dp-nick', nick);
  rankMsg.textContent = 'Apodo guardado.';
  if (pendingRun) {
    const run = pendingRun; pendingRun = null;
    await sendScore(run);
    if (lastRank) rankMsg.textContent = '¡Guardado! Eres el #' + lastRank.all.rank + ' del ranking global.';
  }
  loadRank(rankBoard);
}
let delTimer = null;
function resetDeleteLabel() {
  clearTimeout(delTimer); delTimer = null;
  $('rank-del').classList.remove('confirm');
  $('rank-del').querySelector('span').textContent = 'Borrar mis datos';
}
async function deleteMyData() {
  if (!delTimer) {                                  // first click: ask for confirmation
    $('rank-del').classList.add('confirm');
    $('rank-del').querySelector('span').textContent = '¿Seguro? Pulsa otra vez';
    delTimer = setTimeout(resetDeleteLabel, 4000);
    return;
  }
  resetDeleteLabel();
  rankMsg.textContent = 'Borrando...';
  const r = await api('/api/delete', { pid });
  if (!r.ok) { rankMsg.textContent = 'No se pudo borrar. Inténtalo más tarde.'; return; }
  nick = ''; pendingRun = null; lastRank = null;
  store.set('dp-nick', ''); store.set('dp-queue', '[]');
  pid = newPid(); store.set('dp-pid', pid);        // a fresh id: nothing links the old data to this device
  nickInput.value = '';
  rankMsg.textContent = 'Tus datos se han borrado del ranking.';
  loadRank(rankBoard);
}
$('rank-del').addEventListener('click', deleteMyData);
$('nick-save').addEventListener('click', saveNick);
nickInput.addEventListener('input', () => {       // force capitals while typing, keeping the caret where it was
  const a = nickInput.selectionStart, b = nickInput.selectionEnd;
  nickInput.value = nickInput.value.toUpperCase();
  try { nickInput.setSelectionRange(a, b); } catch { /* not supported */ }
});
nickInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); saveNick(); } });
$('rank-close').addEventListener('click', closeRank);
$('rank-btn').addEventListener('click', () => openRank());
$('rank-btn2').addEventListener('click', () => openRank());

/* ---------- UI: animal picker, sound, install ---------- */
const picker = $('picker');
function showAbility() {
  const [n, d] = ABILITY[animal.id];
  $('ability').textContent = animal.name + ': ' + n + ' - ' + d;
}
function refreshPicker() {
  [...picker.children].forEach((b) => {
    const a = ANIMALS.find((x) => x.id === b.dataset.id);
    const open = unlocked(a);
    b.classList.toggle('locked', !open);
    b.setAttribute('aria-disabled', String(!open));
    b.querySelector('span').textContent = open ? a.name : '???';
    b.querySelector('small').innerHTML = open
      ? iconSvg('star') + store.get('dp-hi-' + a.id, '0')
      : iconSvg('lock') + a.unlock;
  });
  showAbility();
  const next = ANIMALS.filter((a) => !unlocked(a)).sort((x, y) => x.unlock - y.unlock)[0];
  $('tag').textContent = next ? 'Próximo animal a los ' + next.unlock : 'Todos desbloqueados!';
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
  $('mute').querySelector('span').textContent = m ? 'Sin sonido' : 'Sonido';
}
function setVibe(v) {
  vibeOn = v;
  store.set('dp-vibe', v ? '1' : '0');
  $('vibe').querySelector('span').textContent = v ? 'Vibración' : 'Sin vibración';
  $('vibe').classList.toggle('off', !v);
}
if (canVibrate) $('vibe').hidden = false;      // hide the button on devices without vibration (iOS, desktop)
$('vibe').addEventListener('click', (e) => { setVibe(!vibeOn); if (vibeOn) haptic(25); e.currentTarget.blur(); });
setVibe(vibeOn);
$('mute').addEventListener('click', (e) => { setMuted(!muted); e.currentTarget.blur(); });
setMuted(muted);

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
})();
