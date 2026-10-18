(() => {
'use strict';

/* ---------- constants ---------- */
const W = 600, H = 200, GROUND = 160, S = 3;           // logical size, ground line, sprite scale
const GRAV = 0.6, JUMP_V = 11, START_SPEED = 6, MAX_SPEED = 13;
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
    pal: { a: '#4caf50', b: '#b6e388', k: '#1a1a1a' },
    body: [
      '........aaaaaa..', '.......aaaaaaaa.', '.......aakaaaaa.', '.......aaaaaaaa.',
      '.......aaaaa....', '.......aaaaaaa..', 'a.....aaaaa.....', 'aa...aaaaaaa.a..',
      'aaa.aaaaaaaaaa..', '.aaaaabbbbbbaa..', '..aaabbbbbbaa...', '...aaaaaaaa.....',
      '....aaaaaa......',
    ],
    legs: [
      ['....aa..aa......', '....aa..aa......', '....aaa.aaa.....'],
      ['....aa..aa......', '....aaa..a......', '........aaa.....'],
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
      '..........aa.aa.', '..........ab.ab.', '..........aaaaaa', '..........akaaka',
      '..........aaacca', '...........aaaa.', '..aaaa.aaaaaaa..', '.aaaaaaaaaaaaa..',
      'wwaaaaaaaaaaaa..', 'wwaaaaaaaaaaaa..', '..aabbbbbbbbaa..', '..aaaaaaaaaaaa..',
      '..aaaaaaaaaaaa..',
    ],
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

function sprite(rows, pal, w) {
  const c = document.createElement('canvas');
  c.width = w || rows[0].length;
  c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = pal[row[x]];
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }
  });
  return c;
}

ANIMALS.forEach((a) => {
  a.frames = a.legs.map((l) => sprite([...a.body, ...l].map((r) => r.padEnd(SP, '.')), a.pal, SP));
});
const cactusImg = sprite(CACTUS, CACTUS_PAL);
const birdImgs = BIRD.map((b) => sprite(b, BIRD_PAL));
const cloudImg = sprite(CLOUD, { w: '#ffffff' });

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

/* ---------- state ---------- */
let animal = ANIMALS.find((a) => a.id === store.get('dp-animal', 'dino')) || ANIMALS[0];
let state = 'ready';                                    // ready | running | over
let paused = false;
let score, speed, hi, night = 0, nightTarget = 0, scroll, distSince, gap, mile, flash, diedAt;
let obstacles, dust, animT, duckHeld = false;
const P = { h: 0, vy: 0, duck: false };

const specks = Array.from({ length: 50 }, () => ({ x: rnd(0, W), y: rnd(GROUND + 10, H - 4), w: Math.floor(rnd(1, 4)) * 2 }));
const clouds = Array.from({ length: 4 }, (_, i) => ({ x: i * 170 + rnd(0, 60), y: rnd(20, 70), s: rnd(3, 5) | 0 }));
const stars = Array.from({ length: 36 }, () => ({ x: rnd(0, W), y: rnd(4, 100), p: rnd(0, 6) }));

function reset() {
  score = 0; speed = START_SPEED; scroll = 0; distSince = 0; gap = 320; mile = 0; flash = 0;
  night = 0; nightTarget = 0; animT = 0;
  obstacles = []; dust = [];
  P.h = 0; P.vy = 0; P.duck = false;
  hi = Number(store.get('dp-hi-' + animal.id, '0'));
}
reset();

function start() { reset(); state = 'running'; }

function die() {
  state = 'over';
  diedAt = performance.now();
  sfx.die();
  if (score > hi) { hi = Math.floor(score); store.set('dp-hi-' + animal.id, String(hi)); }
}

function jump() {
  if (P.h > 0) return;
  P.vy = JUMP_V;
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
    const tops = [GROUND - 100, GROUND - 58, GROUND - 34];
    obstacles.push({ type: 'bird', x: W + 20, y: tops[(Math.random() * 3) | 0], w: 14 * S, h: 9 * S });
  } else {
    const n = 1 + ((Math.random() * (score > 150 ? 3 : 2)) | 0);
    const parts = [];
    let w = 0, h = 0;
    for (let i = 0; i < n; i++) {
      const big = Math.random() < 0.4;
      const k = big ? 4 : 3;
      parts.push({ k, dx: w });
      w += 10 * k + 6;
      h = Math.max(h, 13 * k);
    }
    obstacles.push({ type: 'cactus', x: W + 20, y: GROUND + 2 - h, w: w - 6, h, parts });
  }
  gap = speed * 30 + 120 + rnd(0, 260);
  distSince = 0;
}

/* ---------- update ---------- */
function hitbox(o) {
  return o.type === 'bird'
    ? { x: o.x + 6, y: o.y + 6, w: o.w - 12, h: o.h - 12 }
    : { x: o.x + 4, y: o.y + 4, w: o.w - 8, h: o.h - 4 };
}
function playerBox() {
  return P.duck
    ? { x: PX + 6, y: GROUND - P.h - 30 + 4, w: 44, h: 26 }
    : { x: PX + 10, y: GROUND - P.h - 48 + 6, w: 28, h: 40 };
}
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function update(dt) {
  nightTarget = Math.floor(score / 700) % 2;
  night += Math.sign(nightTarget - night) * Math.min(Math.abs(nightTarget - night), 0.006 * dt);
  dust.forEach((d) => { d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt; });
  dust = dust.filter((d) => d.life > 0);
  if (flash > 0) flash -= dt;
  if (state !== 'running') return;

  speed = Math.min(MAX_SPEED, START_SPEED + score / 300);
  score += speed * dt * 0.12;
  scroll += speed * dt;
  animT += speed * dt;

  // physics
  P.duck = duckHeld && P.h === 0;
  if (P.h > 0 || P.vy > 0) {
    P.vy -= GRAV * (duckHeld ? 3 : 1) * dt;
    P.h += P.vy * dt;
    if (P.h <= 0) { P.h = 0; P.vy = 0; puff(5); }
  } else if (Math.floor(animT) % 18 === 0 && Math.random() < 0.15) puff(1);

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
    if (overlap(pb, hitbox(o))) { die(); break; }
  }
  obstacles = obstacles.filter((o) => o.x + o.w > -20);
}

/* ---------- draw ---------- */
const col = (k) => mix(DAY[k], NIGHT[k], night);

function pixelDisc(cx, cy, r, c) {
  ctx.fillStyle = c;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy <= r * r) ctx.fillRect(cx + dx * 4, cy + dy * 4, 4, 4);
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
  if (night < 1) pixelDisc(500, 44, 5, '#ffd23f');
  ctx.globalAlpha = night;
  if (night > 0) {
    pixelDisc(500, 44, 5, '#f4f1c8');
    pixelDisc(512, 36, 4, mix(DAY.skyT, NIGHT.skyT, 1));
  }
  ctx.globalAlpha = 1;
  // clouds
  ctx.fillStyle = col('cloud');
  const cc = col('cloud');
  clouds.forEach((c) => {
    ctx.globalAlpha = 0.9;
    ctx.save();
    ctx.translate(Math.round(c.x), Math.round(c.y));
    ctx.fillStyle = cc;
    // draw cloud mask tinted via composite
    ctx.drawImage(tint(cloudImg, cc), 0, 0, 14 * c.s, 4 * c.s);
    ctx.restore();
  });
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
  const run = Math.floor(animT / 9) % 2;
  const img = animal.frames[P.h > 0 || state !== 'running' ? 0 : run];
  if (P.duck) ctx.drawImage(img, PX - 4, GROUND - 30, 56, 30);
  else ctx.drawImage(img, PX, GROUND - P.h - SP * S, SP * S, SP * S);
}

function drawObstacles() {
  obstacles.forEach((o) => {
    if (o.type === 'bird') {
      ctx.drawImage(birdImgs[o.f || 0], Math.round(o.x), o.y, o.w, o.h);
    } else {
      o.parts.forEach((p) => {
        const w = 10 * p.k, h = 13 * p.k;
        ctx.drawImage(cactusImg, Math.round(o.x + p.dx), GROUND + 2 - h, w, h);
      });
    }
  });
}

function text(str, x, y, size, align = 'center', color = '#fff') {
  ctx.font = `bold ${size}px ui-monospace, "Courier New", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillText(str, x + 2, y + 2);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function drawHUD() {
  const c = col('hud');
  ctx.font = 'bold 16px ui-monospace, "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = c;
  const blink = flash > 0 && Math.floor(flash / 7) % 2 === 0;
  ctx.globalAlpha = 0.6;
  ctx.fillText('HI ' + pad(hi), W - 90, 16);
  ctx.globalAlpha = 1;
  if (!blink) ctx.fillText(pad(score), W - 12, 16);
}

function draw() {
  // scroll specks/clouds
  const v = state === 'running' ? speed : 0;
  specks.forEach((s) => { s.x -= v; if (s.x < -8) { s.x = W + rnd(0, 40); s.y = rnd(GROUND + 10, H - 4); } });
  clouds.forEach((c) => { c.x -= v * 0.2 + (state === 'running' ? 0 : 0.1); if (c.x < -80) { c.x = W + rnd(0, 80); c.y = rnd(20, 70); } });

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

  if (paused) {
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, 0, W, H);
    text('PAUSA', W / 2, 80, 32);
    text('Pulsa P o toca para seguir', W / 2, 120, 14);
  } else if (state === 'ready') {
    text(animal.name.toUpperCase(), W / 2, 62, 28);
    text('Pulsa ESPACIO o toca para jugar', W / 2, 98, 14);
  } else if (state === 'over') {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, W, H);
    text('GAME OVER', W / 2, 62, 32, 'center', '#ffd23f');
    text('Espacio o toca para reintentar', W / 2, 98, 14);
  }
}

/* ---------- loop ---------- */
let last = performance.now();
function frame(t) {
  const dt = Math.min((t - last) / 16.667, 3);
  last = t;
  if (!paused) update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- input ---------- */
function press() {
  if (paused) { paused = false; return; }
  if (state === 'ready') { start(); jump(); }
  else if (state === 'over') { if (performance.now() - diedAt > 350) start(); }
  else jump();
}
function togglePause() { if (state === 'running') paused = !paused; }

document.addEventListener('keydown', (e) => {
  if (e.repeat) { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') e.preventDefault(); return; }
  switch (e.code) {
    case 'Space': case 'ArrowUp': case 'KeyW': e.preventDefault(); press(); break;
    case 'ArrowDown': case 'KeyS': e.preventDefault(); duckHeld = true; break;
    case 'KeyP': togglePause(); break;
    case 'KeyM': setMuted(!muted); break;
  }
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowDown' || e.code === 'KeyS') duckHeld = false;
  if (e.code === 'Space') e.preventDefault();
});

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const lower = (e.clientY - r.top) / r.height > 0.68;
  if (state === 'running' && !paused && lower) duckHeld = true;
  else press();
});
['pointerup', 'pointercancel', 'pointerleave'].forEach((n) => canvas.addEventListener(n, () => { duckHeld = false; }));
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'running') paused = true; });
window.addEventListener('blur', () => { duckHeld = false; if (state === 'running') paused = true; });

/* ---------- UI: animal picker, sound, install ---------- */
const picker = $('picker');
function selectAnimal(id) {
  animal = ANIMALS.find((a) => a.id === id) || ANIMALS[0];
  store.set('dp-animal', animal.id);
  [...picker.children].forEach((b) => b.classList.toggle('on', b.dataset.id === animal.id));
  hi = Number(store.get('dp-hi-' + animal.id, '0'));
  if (state === 'over') { reset(); state = 'ready'; }
}
ANIMALS.forEach((a) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pick';
  b.dataset.id = a.id;
  const c = document.createElement('canvas');
  c.width = c.height = SP * S;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(a.frames[0], 0, 0, SP * S, SP * S);
  const s = document.createElement('span');
  s.textContent = a.name;
  b.append(c, s);
  b.addEventListener('click', () => { if (state !== 'running') selectAnimal(a.id); b.blur(); });
  picker.appendChild(b);
});
selectAnimal(animal.id);

function setMuted(m) {
  muted = m;
  store.set('dp-muted', m ? '1' : '0');
  $('mute').textContent = m ? '🔇 Sonido' : '🔊 Sonido';
}
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
