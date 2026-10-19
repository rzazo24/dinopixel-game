// DinoPixel - constantes, sprites de animales y obstáculos, dibujo de sprites.
// Classic script: shares the page's global scope with the other js/ files, loaded in order by index.html.
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
    crouchDrop: [0, 1, 2, 3],          // already low: crouching just keeps the shell
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

ANIMALS.forEach((a) => {
  const mk = (body, legs) => sprite([...body, ...legs].map((r) => r.padEnd(SP, '.')), a.pal);
  const drop = a.crouchDrop || [7, 8, 9, 10];                   // squat: drop 4 rows (keeps the sprite 12 rows tall)
  const crouch = a.body.filter((_, i) => !drop.includes(i));
  a.frames = a.legs.map((l) => mk(a.body, l));
  a.duck = a.legs.map((l) => mk(crouch, l));
  if (a.bodyUp) {                                              // animals with flapping wings get a second set of frames
    a.framesUp = a.legs.map((l) => mk(a.bodyUp, l));
    a.duckUp = a.legs.map((l) => mk(a.bodyUp.filter((_, i) => !drop.includes(i)), l));
  }
});
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
};
const birdImgs = BIRD.map((b) => sprite(b, BIRD_PAL));
const cloudImg = sprite(CLOUD, { w: '#ffffff' }, null);
