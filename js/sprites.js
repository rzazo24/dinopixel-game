// DinoPixel - constantes, sprites de animales y obstáculos, dibujo de sprites.
// Classic script: shares the page's global scope with the other js/ files, loaded in order by index.html.
'use strict';

/* ---------- constants ---------- */
let W = 600, H = 200, GROUND = 160;                     // logical size (adapts to the screen), ground line
const S = 3;                                            // sprite scale
const GRAV = 0.6, JUMP_V = 12, START_SPEED = 6, MAX_SPEED = 13;
const FOX_CD = 480;                                      // frames (~8 s) the fox needs to recharge its bird dodge
const SPEED_RAMP = 7000;                                // how gradually the speed approaches MAX_SPEED (bigger = slower ramp)
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
    bodyUp: [                          // wing raised behind the back (flap frame)
      '..........rrr...', '.........aaaaa..', '.........aakaaac', '.........aaaaac.',
      '.........aar....', '...www..aaaaa...', '..awww.aaaaaaa..', '..aawwaaaaaaaa..',
      '...aaaaaaaaaaa..', '...aaaaaaaaaaa..', '....aaaaaaaa....', '.....aaaaaa.....',
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
  {
    id: 'frog', name: 'Rana',
    pal: { a: '#5fbf4a', b: '#cdeb8b', d: '#2e6b2a', k: '#1a1a1a', w: '#ffffff' },
    body: [
      '................', '................', '................', '.........aa.aa..',
      '........awkawka.', '........aaaaaaa.', '...aaaaaaaaaaaaa', '..aaaaaaaaaadddd',
      '.aaaaaaaaaaaaaa.', '.aabbbbbbbbbbaa.', '.aabbbbbbbbbbaa.', '..aaaaaaaaaaaa..',
      '..aaa......aaa..',
    ],
    legs: [
      ['.aaa......aaa...', '.aa........aa...', 'aaaa......aaaa..'],
      ['..aa.....aa.....', '..aa.....aa.....', '.aaaa...aaaa....'],
    ],
  },
  {
    id: 'fox', name: 'Zorro',
    pal: { a: '#e8762c', w: '#fff3e0', d: '#4a2a14', k: '#1a1a1a' },
    body: [
      '...........a..a.', '..........aa.aa.', '..........aaaaa.', '..........akaaww',
      '..........aaawwk', '...........aww..', 'ww.aaaaaaaaaa...', 'awaaaaaaaaaaa...',
      'aaa.aaaaaaaaaa..', '....awwwwwwaa...', '....aaaaaaaaa...', '....aaaaaaaaa...',
      '....aa.....aa...',
    ],
    legs: [
      ['....dd.....dd...', '....dd.....dd...', '...ddd....ddd...'],
      ['.....dd...dd....', '.....dd...dd....', '....ddd..ddd....'],
    ],
  },
  {
    id: 'turtle', name: 'Tortuga',
    pal: { s: '#3f8f4a', S: '#2a6a35', h: '#9ccf6e', k: '#1a1a1a', b: '#d8c78a' },
    body: [
      '................', '................', '................', '................',
      '................', '.....ssssss.....', '....sSsSsSss....', '...sSSsSSsSss.hh',
      '..sssssssssss.hk', '..ssSsssSsssshhh', '.bbbbbbbbbbbbb..', '..bbbbbbbbbbb...',
      '...bbbbbbbbb....',
    ],
    legs: [
      ['...hh.....hh....', '...hh.....hh....', '..hhh....hhh....'],
      ['....hh...hh.....', '....hh...hh.....', '...hhh..hhh.....'],
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

// All the frames of an animal for a given palette (running, and wings up for animals that flap)
function buildLooks(a, pal) {
  const mk = (body, legs) => sprite([...body, ...legs].map((r) => r.padEnd(SP, '.')), pal);
  const looks = { frames: a.legs.map((l) => mk(a.body, l)) };
  if (a.bodyUp) looks.framesUp = a.legs.map((l) => mk(a.bodyUp, l));   // animals with flapping wings get a second set
  return looks;
}
ANIMALS.forEach((a) => Object.assign(a, buildLooks(a, a.pal)));

// Colour skins (bought in the shop): recolour every palette entry except near-black and near-white (eyes, outlines, teeth)
const SKINS = [
  { id: 'base', name: 'Original', price: 0 },
  { id: 'gold', name: 'Dorado', price: 300, f: (h, s, l) => [45, Math.max(s, 0.75), l] },
  { id: 'shadow', name: 'Sombra', price: 300, f: (h, s, l) => [h, s * 0.15, l * 0.55] },
  { id: 'ice', name: 'Hielo', price: 300, f: (h, s, l) => [195, s * 0.8, Math.min(0.85, l + 0.1)] },
  { id: 'candy', name: 'Chicle', price: 300, f: (h, s, l) => [320, Math.max(s, 0.6), Math.min(0.8, l + 0.05)] },
];
function hexToHsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
function hslToHex(h, s, l) {
  s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}
function skinPal(pal, skin) {
  const out = {};
  for (const [k, hex] of Object.entries(pal)) {
    const [h, s, l] = hexToHsl(hex);
    out[k] = l < 0.15 || l > 0.9 ? hex : hslToHex(...skin.f(h, s, l));
  }
  return out;
}
const lookCache = {};
function looksOf(a, skinId) {
  const skin = SKINS.find((x) => x.id === skinId);
  if (!skin || !skin.f) return a;
  const key = a.id + ':' + skinId;
  return lookCache[key] || (lookCache[key] = buildLooks(a, skinPal(a.pal, skin)));
}
const cactusImg = sprite(CACTUS, CACTUS_PAL);
// pickups: a spinning coin (face / edge), the shield bubble and the magnet
const COIN_PAL = { o: '#b8860b', y: '#ffd23f', w: '#fff6b0' };
const COIN_IMGS = [
  sprite(['..ooo..', '.oyyyo.', 'oywyyyo', 'oywyyyo', 'oyyyyyo', '.oyyyo.', '..ooo..'], COIN_PAL),
  sprite(['...o...', '..oyo..', '..owo..', '..owo..', '..oyo..', '..oyo..', '...o...'], COIN_PAL),
];
const SHIELD_IMG = sprite([
  '..ccccc..', '.cwwbbbc.', 'cwbbbbbbc', 'cbbbbbbbc', 'cbbbbbbbc', 'cbbbbbbbc', 'cbbbbbbbc', '.cbbbbbc.', '..ccccc..',
], { c: '#1f6fb2', b: '#4fc3f7', w: '#ffffff' });
const MAGNET_IMG = sprite([
  'ss.....ss', 'ss.....ss', 'rr.....rr', 'rr.....rr', 'rr.....rr', 'rrr...rrr', '.rrrrrrr.', '..rrrrr..',
], { r: '#e53935', s: '#cfd8dc' });
// moving obstacles (one per zone), two frames each to look like they roll
function ballRows(n, marks) {                           // a filled circle with a shaded lower-right side and some marks
  const r = n / 2 - 0.5, rows = [];
  for (let y = 0; y < n; y++) {
    let row = '';
    for (let x = 0; x < n; x++) {
      const dx = x - r, dy = y - r;
      row += dx * dx + dy * dy > (r + 0.5) * (r + 0.5) ? '.' : marks.some(([mx, my]) => mx === x && my === y) ? 'm' : dx + dy > r * 0.7 ? 's' : 'f';
    }
    rows.push(row);
  }
  return rows;
}
const TUMBLE_PAL = { f: '#b08a4a', s: '#8a6630', m: '#e2c48a' };
const COCO_PAL = { f: '#7a4a24', s: '#553018', m: '#c8a070' };
const BOULDER_PAL = { f: '#6e625e', s: '#4a403c', m: '#ff7a2a' };
const SNOWBALL_PAL = { f: '#f8fbff', s: '#b9cbe0', m: '#9fb6c9' };
const CAR_ROWS = (hub) => [
  '....rrrrrrr.......', '...rwwwrwwwr......', '..rwwwwrwwwwr.....', 'yrrrrrrrrrrrrrrrr.', 'rrrrrrrrrrrrrrrrrt',
  'rrrrrrrrrrrrrrrrrr', '.rrkkkrrrrrrkkkrr.', '...k' + hub + 'k......k' + hub + 'k...', '...kkk......kkk...',
];
const MOVERS = {                                         // w/h in logical px; extra = how much faster than the ground
  tumbleweed: { w: 30, h: 30, extra: [0.25, 0.4], bounce: 22, imgs: [ballRows(10, [[2, 2], [5, 4], [7, 7], [3, 6], [6, 1]]), ballRows(10, [[7, 2], [4, 5], [2, 7], [6, 6], [3, 1]])].map((r) => sprite(r, TUMBLE_PAL)) },
  snowball: { w: 36, h: 36, extra: [0.3, 0.45], bounce: 0, imgs: [ballRows(12, [[3, 3], [7, 8]]), ballRows(12, [[8, 3], [3, 8]])].map((r) => sprite(r, SNOWBALL_PAL)) },
  coconut: { w: 27, h: 27, extra: [0.25, 0.4], bounce: 16, imgs: [ballRows(9, [[2, 2], [4, 2], [3, 4]]), ballRows(9, [[6, 2], [6, 4], [4, 3]])].map((r) => sprite(r, COCO_PAL)) },
  boulder: { w: 36, h: 36, extra: [0.3, 0.45], bounce: 0, imgs: [ballRows(12, [[3, 4], [4, 5], [8, 7], [6, 2]]), ballRows(12, [[7, 3], [6, 4], [3, 7], [9, 6]])].map((r) => sprite(r, BOULDER_PAL)) },
  car: { w: 54, h: 27, extra: [0.4, 0.55], bounce: 0, imgs: ['g', 'k'].map((h) => sprite(CAR_ROWS(h), { r: '#2f6fd6', w: '#bfe6ff', y: '#ffe680', t: '#ff4d4d', k: '#1a1a1a', g: '#cfd8dc' })) },
};
const ZONE_MOVER = { desert: 'tumbleweed', snow: 'snowball', city: 'car', jungle: 'coconut', volcano: 'boulder' };
const OBST = {
  cactus: cactusImg,
  snowman: sprite([
    '...hhhh...', '...hhhh...', '..hhhhhh..', '...wwww...', '..wkwwkw..', '..wwccww..', '...wwww...',
    '..wwwwww..', '.wwwkwwww.', 'swwwwwwwws', 'swwwkwwwws', 'swwwwwwwws', '.ssssssss.',
  ], { h: '#2c2c3a', w: '#f8fbff', s: '#b9cbe0', k: '#1a1a1a', c: '#f08a24' }),
  pine: sprite([
    '....ww....', '...wggw...', '...gggg...', '..wggggw..', '..gggggg..', '.wggggggw.', '.gggggggg.',
    'wggggggggw', 'gggggggggg', '....tt....', '....tt....', '....tt....', '...tttt...',
  ], { w: '#f8fbff', g: '#2f7a55', t: '#6b4426' }),
  cone: sprite([
    '....oo....', '....oo....', '...oooo...', '...wwww...', '...oooo...', '..oooooo..', '..wwwwww..',
    '..oooooo..', '.oooooooo.', '.oooooooo.', '.oooooooo.', 'dddddddddd', 'dddddddddd',
  ], { o: '#f26a1b', w: '#ffffff', d: '#3a3a44' }),
  hydrant: sprite([
    '....rr....', '...rrrr...', '..RRRRRR..', '.rrrrrrrr.', 'rrrrrrrrrr', '.rrrrrrrr.', '..rrrrrr..',
    '..rrRrrr..', '..rrrrrr..', '..rrrrrr..', '..rrrrrr..', '.RRRRRRRR.', '.RRRRRRRR.',
  ], { r: '#d8322a', R: '#9b1f1a' }),
  bush: sprite([
    '..........', '...gg.....', '..gGgg.g..', '.gggGggGg.', '.gGggggggg', 'gggggGgggg', 'ggGgggggGg',
    'gggggggggg', 'gGgggGgggg', 'gggggggggg', 'ggggggggGg', '.gggggggg.', '..dddddd..',
  ], { g: '#2f9a4a', G: '#1e6a32', d: '#5a3a20' }),
  stump: sprite([
    '..........', '..........', '...ll.....', '..llll....', '..lttl....', '.ttttttt..', 'tTtTttTtt.',
    'tttttttTt.', 'tTttttttt.', 'tttTttttt.', 'ttttttTtt.', 'tTttttttt.', 'rtttttttrr',
  ], { t: '#8a5a32', T: '#5e3a1e', l: '#4caa4a', r: '#5e3a1e' }),
  rock: sprite([
    '..........', '..........', '..........', '...rrr....', '..rrRrr...', '.rrrrrRr..', '.rRrrrrrr.',
    'rrrrrRrrr.', 'rrRrrrrrrr', 'rrrrrrRrrr', 'rRrrrrrrrr', 'rrrrrRrrrr', 'RRRRRRRRRR',
  ], { r: '#7a6a64', R: '#4a3e3a' }),
  lava: sprite([
    '....oo....', '...oyo....', '....o.....', '...rrr....', '..rrorr...', '.rrrorrr..', '.rRroorrr.',
    'rrrrorRrr.', 'rrRroorrrr', 'rrrrrorRrr', 'rRrroorrrr', 'rrrrrorrrr', 'RRRRRRRRRR',
  ], { r: '#3e3436', R: '#241e20', o: '#ff6a1a', y: '#ffd23f' }),
};
const birdImgs = BIRD.map((b) => sprite(b, BIRD_PAL));
const cloudImg = sprite(CLOUD, { w: '#ffffff' }, null);
