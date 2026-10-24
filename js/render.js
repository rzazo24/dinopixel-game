// DinoPixel - dibujo: fondo, zonas, jugador, obstáculos, fuente pixel y textos.
// Classic script: shares the page's global scope with the other js/ files, loaded in order by index.html.
'use strict';

/* ---------- draw ---------- */
const bpal = (i, which, k) => BIOMES[i][which][k] || (which === 'day' ? DAY : NIGHT)[k];
const col = (k) => mix(
  mix(bpal(biomePrev, 'day', k), bpal(biome, 'day', k), biomeT),
  mix(bpal(biomePrev, 'night', k), bpal(biome, 'night', k), biomeT), night);

// pixel disc; with `cut` ([dx, dy, r] in cells) the cut-out disc is skipped, giving a crescent
function pixelDisc(cx, cy, r, c, cut) {
  ctx.fillStyle = c;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r) continue;
    if (cut && (dx - cut[0]) ** 2 + (dy - cut[1]) ** 2 <= cut[2] ** 2) continue;
    ctx.fillRect(cx + dx * 4, cy + dy * 4, 4, 4);
  }
}

const col0 = (k, which) => mix(bpal(biomePrev, which, k), bpal(biome, which, k), biomeT);
// city skyline: blocky buildings instead of hills (heights are a fixed hash of the block index, so they scroll steadily)
function drawSkyline(base, amp, par, color, bw) {
  ctx.fillStyle = color;
  const off = worldX * par;
  for (let x = -((off % bw) + bw) % bw - bw; x < W + bw; x += bw) {
    const i = Math.floor((x + off) / bw + 0.5);
    const hsh = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    const top = Math.round((GROUND - base - hsh * amp) / 4) * 4;
    ctx.fillRect(Math.round(x), top, bw - 4, GROUND - top);
  }
}
function drawHills(base, amp, freq, par, color) {
  ctx.fillStyle = color;
  const off = worldX * par;
  for (let x = 0; x < W; x += 4) {
    const h = base + Math.sin((x + off) * freq) * amp + Math.sin((x + off) * freq * 2.3) * amp * 0.4;
    const top = Math.round((GROUND - h) / 4) * 4;
    ctx.fillRect(x, top, 4, GROUND - top);
  }
}

const SKY_BODY_Y = 66;                                  // vertical position of the sun / moon (it used to sit right under the score)
const SKY_BODY_DX = 170;                                // sun / moon distance from the right edge: keeps the HUD column (score, coins, magnet) clear
function drawBackground() {
  // stepped sky bands
  const bands = 10, bh = Math.ceil(GROUND / bands);
  for (let i = 0; i < bands; i++) {
    const f = i / (bands - 1);
    ctx.fillStyle = mix(mix(col0('skyT', 'day'), col0('skyB', 'day'), f), mix(col0('skyT', 'night'), col0('skyB', 'night'), f), night);
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
  if (night < 1) pixelDisc(W - SKY_BODY_DX, SKY_BODY_Y, 5, '#ffd23f');
  ctx.globalAlpha = night;
  if (night > 0) {
    HALLOWEEN ? pixelDisc(W - SKY_BODY_DX, SKY_BODY_Y, 5, '#ffb347') : pixelDisc(W - SKY_BODY_DX, SKY_BODY_Y, 5, '#f4f1c8', [3, -2, 4]);   // Halloween: full orange moon
  }
  ctx.globalAlpha = 1;
  // clouds
  ctx.fillStyle = col('cloud');
  const cc = col('cloud');
  ctx.globalAlpha = 0.9;
  clouds.forEach((c) => blit(tint(cloudImg, cc), Math.round(c.x), Math.round(c.y), 14 * c.s, 4 * c.s));
  ctx.globalAlpha = 1;
  const shapeB = BIOMES[biomeT < 0.5 ? biomePrev : biome];    // the silhouette swaps halfway through the color blend
  if (shapeB.skyline) { drawSkyline(30, 40, 0.15, col('hill1'), 32); drawSkyline(14, 28, 0.4, col('hill2'), 44); }
  else { drawHills(34, 14, 0.012, 0.15, col('hill1')); drawHills(18, 10, 0.02, 0.4, col('hill2')); }
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
  const lk = lookOf(animal);                                  // colour skin + hat from the shop
  let frames = lk.frames;
  if (lk.framesUp && state === 'running') {
    // wings: slow flap with the steps on the ground, quick flap in the air, slower and wider while gliding
    const gliding = animal.id === 'chick' && jumpHeld && P.vy < 0;
    const up = P.h > 0 ? Math.floor(flapT / (gliding ? 7 : 4)) % 2 : Math.floor(animT / 20) % 2;
    if (up) frames = lk.framesUp;
  }
  // frog: when the super jump is ready, a yellow bar and sparkles appear above it
  const frogReady = animal.id === 'frog' && state === 'running' && P.h === 0 && P.charge >= FROG_READY;
  const jx = 0;
  if (P.dodge > 0) ctx.globalAlpha = 0.55;                      // fox dodging: ghostly
  blit(frames[f], PX + jx, GROUND - P.h - (SP + lk.pad) * S, SP * S, (SP + lk.pad) * S);
  ctx.globalAlpha = 1;
  if (animal.id === 'fox' && state === 'running') {          // fox: orange bar = dodge ready, white bar = recharging
    const top = GROUND - P.h - 48 - 12;
    ctx.fillStyle = '#1b1b2b'; ctx.fillRect(PX + 11, top - 1, 26, 6);
    ctx.fillStyle = P.foxCd > 0 ? '#ffffff' : '#ff8a2a';
    ctx.fillRect(PX + 12, top, Math.round(24 * (P.foxCd > 0 ? 1 - P.foxCd / FOX_CD : 1)), 4);
  }
  if (frogReady) {                                                // super jump ready: yellow bar + blinking sparkles
    const top = GROUND - 48 - 12;
    ctx.fillStyle = '#1b1b2b'; ctx.fillRect(PX + 11, top - 1, 26, 6);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(PX + 12, top, 24, 4);
    if (Math.floor(flapT / 6) % 2 === 0) {
      ctx.fillStyle = '#ffd23f';
      [[-6, 10], [52, 6], [-2, -8], [48, -10]].forEach(([dx, dy]) => ctx.fillRect(PX + dx, top + 12 + dy, 3, 3));
    }
  }
}

const COINS = HALLOWEEN ? CANDY_IMGS : COIN_IMGS;
function drawItems() {
  items.forEach((it) => {
    const y = GROUND + it.dy;
    if (it.kind === 'coin') blit(COINS[Math.floor(flapT / 10) % 2], Math.round(it.x), Math.round(y), it.w, it.h);
    else {
      const bob = Math.round(Math.sin(flapT / 10) * 3);            // power-ups float up and down
      blit(it.kind === 'shield' ? SHIELD_IMG : MAGNET_IMG, Math.round(it.x), Math.round(y) + bob, it.w, it.h);
    }
  });
}
function drawShieldBubble() {
  if (P.shield <= 0 || state !== 'running') return;
  const cx = PX + 24, cy = GROUND - P.h - 24, r = 34;
  ctx.globalAlpha = 0.45; ctx.fillStyle = '#4fc3f7';
  for (let a = 0; a < Math.PI * 2; a += 0.16) ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 3, 3);
  ctx.globalAlpha = 1;
}
function drawObstacles() {
  obstacles.forEach((o) => {
    if (o.type === 'bird') {
      blit((HALLOWEEN ? (night > 0.5 ? batNightImgs : batImgs) : birdImgs)[o.f || 0], Math.round(o.x), GROUND + o.dy, o.w, o.h);
    } else if (o.type === 'mover') {
      blit(MOVERS[o.kind].imgs[Math.floor(flapT / 6) % 2], Math.round(o.x), Math.round(GROUND + o.dy), o.w, o.h);
    } else {
      o.parts.forEach((p) => {
        const w = 10 * p.k, h = 13 * p.k;
        blit(OBST[p.kind] || cactusImg, Math.round(o.x + p.dx), GROUND + 2 - h, w, h);
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
const textBoxes = [];                                    // what was drawn this frame: { t, x, w, y, h }
// Centered text that must fit between the notches: if it is too wide it wraps onto two lines (or shrinks as a last resort).
// Returns the height used, so callers can stack lines.
function pixFit(str, y, s, color) {
  const left = insetL + 12, right = W - insetR - 12, cx = (left + right) / 2, maxW = right - left;
  const width = (t, k) => [...t.normalize('NFC')].length * 6 * k - k;
  if (width(str, s) <= maxW) { pixText(str, cx, y, s, 'center', color); return 7 * s + 6; }
  const words = str.split(' ');
  let best = null;
  for (let i = 1; i < words.length; i++) {                // most balanced split into two lines
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const m = Math.max(width(a, s), width(b, s));
    if (!best || m < best.m) best = { a, b, m };
  }
  if (best && best.m <= maxW) {
    pixText(best.a, cx, y, s, 'center', color);
    pixText(best.b, cx, y + 7 * s + 6, s, 'center', color);
    return 2 * (7 * s + 6);
  }
  pixText(str, cx, y, Math.max(1, s - 1), 'center', color);    // a single huge word: shrink
  return 7 * Math.max(1, s - 1) + 6;
}
function pixText(str, x, y, s, align = 'left', color = '#fff', shadow = true) {
  const gl = glyphs(str);
  const w = gl.length * 6 * s - s;
  const x0 = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
  y = Math.round(y);
  textBoxes.push({ t: str, x: x0, w, y, h: 7 * s });
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
  if (P.shield > 0) pixText(L('Escudo', 'Shield') + (P.shield > 1 ? ' x' + P.shield : ''), W - 212 - insetR, 12, 2, 'right', '#4fc3f7');
  if (state === 'running' || state === 'over') {                   // coins this run, under the score
    const t = String(coinsRun), w = t.length * 12 - 2;
    pixText(t, W - 12 - insetR, 32, 2, 'right', '#ffd23f', false);
    blit(COINS[0], W - 12 - insetR - w - 18, 32, 14, 14);
  }
  if (magnetT > 0 && state === 'running') pixText(L('Imán ', 'Magnet ') + Math.ceil(magnetT / 60), W - 12 - insetR, 52, 2, 'right', '#e53935');
}

function draw() {
  textBoxes.length = 0;
  // scroll specks/clouds
  const v = state === 'running' ? speed : 0;
  specks.forEach((s) => { s.x -= v; if (s.x < -8) { s.x = W + rnd(0, 40); s.y = rnd(GROUND + 10, H - 4); } });
  clouds.forEach((c) => { c.x -= v * 0.2 + (state === 'running' ? 0 : 0.1); if (c.x < -80) { c.x = W + rnd(0, 80); c.y = rnd(20, Math.max(40, GROUND - 110)); } });

  drawBackground();
  drawObstacles();
  drawItems();
  drawPlayer();
  drawShieldBubble();
  ctx.fillStyle = '#fff';
  dust.forEach((d) => {
    ctx.globalAlpha = Math.min(1, d.life / 14) * 0.8;
    ctx.fillStyle = col('speck');
    ctx.fillRect(Math.round(d.x), Math.round(d.y), 3, 3);
  });
  ctx.globalAlpha = 1;
  drawHUD();
  // in-run banners only while running: the game over screen lists unlocks and achievements itself (they used to overlap)
  if (banner.t > 0 && state === 'running' && !paused) pixFit(banner.text, 44, 2, '#ffd23f');
  if (achShow.t > 0 && state === 'running' && !paused) pixFit(L('Logro: ', 'Achievement: ') + achShow.text, 68, 2, '#9be564');

  const ty = GROUND * 0.38;
  if (paused) {
    // the pause menu is a DOM overlay
  } else if (state === 'ready') {
    let y = ty - 14;
    y += pixFit(animal.name, y, 4) + 4;
    y += pixFit(L('Toca la pantalla o pulsa espacio', 'Tap the screen or press space'), y, 2);
    y += pixFit(ABILITY[animal.id][0] + ': ' + ABILITY[animal.id][1], y, 2, '#ffd23f') + 4;
    pixFit((daily.done ? L('Reto del día: completado', 'Daily challenge: done') : L('Reto: ', 'Challenge: ') + dailyText(daily)), y, 2, '#9be564');
  } else if (state === 'over') {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, W, H);
    let y = ty - 14;                                   // lines stack, so a wrapped line never runs into the next one
    y += pixFit('Game over', y, 4, '#ffd23f') + 4;
    y += pixFit(L('Toca o pulsa espacio para reintentar', 'Tap or press space to retry'), y, 2) + 6;
    if (coinsRun) y += pixFit(L('Monedas: ', 'Coins: ') + coinsRun, y, 2, '#ffd23f');
    if (dailyDoneRun) y += pixFit(L('Reto del día completado! +', 'Daily challenge done! +') + dailyDoneRun, y, 2, '#9be564');
    else if (!daily.done) y += pixFit(L('Reto: ', 'Challenge: ') + Math.min(daily.n, dailyProgress()) + ' / ' + daily.n, y, 2, '#9be564');
    if (newlyUnlocked.length) y += pixFit(L('Nuevo: ', 'New: ') + newlyUnlocked.join(', '), y, 2, '#ffd23f');
    if (lastRank) {
      const wk = lastRank.week ? L('Semana #', 'Week #') + lastRank.week.all.rank + ' - ' : '';
      y += pixFit(wk + 'Global #' + lastRank.all.rank + ' - ' + animal.name + ' #' + lastRank.animal.rank, y, 2, '#7fd0ff');
    }
    if (newAch.length) pixFit(L('Logros: ', 'Achievements: ') + newAch[0] + (newAch.length > 1 ? ' +' + (newAch.length - 1) : ''), y, 2, '#9be564');
  }
}
