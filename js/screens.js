// DinoPixel - pantallas de ayuda, compartir y logros.
// Classic script: shares the page's global scope with the other js/ files, loaded in order by index.html.
'use strict';

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
        <tr><th></th><th>${L('Teclado', 'Keyboard')}</th><th>${L('Táctil', 'Touch')}</th></tr>
        <tr><td>${L('Saltar', 'Jump')}</td><td>${keys(L('ESPACIO', 'SPACE'), '<i data-icon="up"></i>', 'W')}</td><td>${L('Toca', 'Tap')}</td></tr>
        <tr><td>${L('Caer rápido', 'Fast fall')}</td><td>${keys('<i data-icon="down"></i>', 'S')}</td><td>${L('Desliza abajo', 'Swipe down')}</td></tr>
        <tr><td>${L('Pausa', 'Pause')}</td><td>${keys('P', 'ESC')}</td><td>${L('Botón arriba', 'Top button')}</td></tr>
        <tr><td>${L('Pantalla completa', 'Fullscreen')}</td><td>${keys('F')}</td><td></td></tr>
        <tr><td>${L('Efectos', 'Sounds')}</td><td>${keys('M')}</td><td>${L('Botón del menú', 'Menu button')}</td></tr>
        <tr><td>${L('Música', 'Music')}</td><td>${keys('N')}</td><td>${L('Botón del menú', 'Menu button')}</td></tr>
        <tr><td>${L('Ayuda', 'Help')}</td><td>${keys('H')}</td><td>${L('Botón del menú', 'Menu button')}</td></tr>
      </table>
      <p class="note">${L('Mantén pulsado para saltar más alto; suelta pronto para un salto corto. Si pulsas un instante antes de aterrizar, el salto también vale.', 'Hold to jump higher; let go early for a short hop. Pressing a moment before landing still counts.')}</p>
      <h3>${L('Obstáculos', 'Obstacles')}</h3>
      <div class="obs"><span data-sprite="cactus"></span><p>${L('<em>Cactus:</em> salta por encima.', '<em>Cactus:</em> jump over it.')}</p></div>
      <div class="obs"><span data-sprite="bird"></span><p>${L(`<em>Pájaro alto:</em> pasa por debajo sin hacer nada.<br>
        <em>Pájaro medio:</em> salta (un poco más alto).<br><em>Pájaro bajo:</em> salta.`, `<em>High bird:</em> just run under it.<br>
        <em>Middle bird:</em> jump (a bit higher).<br><em>Low bird:</em> jump.`)}</p></div>`;
  },
  animals() {
    return '<div class="ani">' + ANIMALS.map((a) => {
      const open = unlocked(a);
      const [n, d] = ABILITY[a.id];
      return `<div class="row${open ? '' : ' locked'}" data-animal="${a.id}">
        <span class="face"></span>
        <p><em>${a.name}</em> - ${n}<br>${d}<br>
        <span class="req">${a.unlock ? (open ? L('Desbloqueado', 'Unlocked') : '<i data-icon="lock"></i> ' + L('Con ' + a.unlock + ' puntos', 'At ' + a.unlock + ' points')) : L('Desde el principio', 'From the start')}</span></p>
      </div>`;
    }).join('') + '</div>';
  },
  tips() {
    const t = L([
      'Tu <em>mejor puntuación</em> con cualquier animal desbloquea a los demás: uno nuevo cada 1000 puntos.',
      'Cada <em>700 puntos</em> cambia entre día y noche, y el juego va cada vez más rápido.',
      'Los <em>pájaros</em> aparecen a partir de 300 puntos.',
      'Las <em>monedas</em> dan 10 puntos y se gastan en la <em>tienda</em>: animales, colores, sombreros y <em>accesorios con poderes</em> (botas que saltan más, bufanda que alarga el imán, collar con más monedas y gafas que avisan de los pájaros). Cada <em>escudo</em> aguanta un golpe (se acumulan) y el <em>imán</em> atrae monedas 6 segundos (si coges otro, se suman).',
      'Cada <em>1500 puntos</em> cambias de zona: desierto, nieve, ciudad, selva y volcán, cada una con sus obstáculos.',
      'Desde 800 puntos hay <em>obstáculos que se mueven</em> (planta rodadora, bola de nieve, coche, coco, roca): llegan antes, salta un poco antes.',
      'Pasar <em>muy cerca</em> de un obstáculo sin tocarlo da <em>+20 puntos</em> ("¡Cerca!").',
      '<em>Combo:</em> esquiva obstáculos seguidos sin recibir un golpe; con 10 todo puntúa <em>x2</em> y con 25, <em>x3</em>.',
      'Las <em>monedas doradas</em> valen 2, pero están en sitios con riesgo: justo encima de un pájaro o muy altas sobre un cactus.',
      'Cada animal guarda su <em>propio récord</em>.',
      'Si el juego te va muy rápido, baja la <em>velocidad</em> en el menú o en la pausa.',
      '<em>Gato:</em> guarda el segundo salto para corregir un salto corto.',
      '<em>Pingüino:</em> cada punto le vale un 50% más: ideal para subir en el ranking.',
      '<em>Gallina:</em> mantén pulsado al caer para planear sobre grupos de cactus.',
    ], [
      'Your <em>best score</em> with any animal unlocks the others: a new one every 1000 points.',
      'Every <em>700 points</em> day turns to night and back, and the game keeps getting faster.',
      '<em>Birds</em> show up from 300 points.',
      '<em>Coins</em> give 10 points and are spent in the <em>shop</em>: animals, colors, hats and <em>gear with powers</em> (boots that jump higher, a scarf that boosts the magnet, a collar with more coins and goggles that warn of birds). Each <em>shield</em> takes one hit (they stack) and the <em>magnet</em> pulls coins in for 6 seconds (another one adds 6 more).',
      'Every <em>1500 points</em> you change zone: desert, snow, city, jungle and volcano, each with its own obstacles.',
      'From 800 points there are <em>moving obstacles</em> (tumbleweed, snowball, car, coconut, boulder): they arrive sooner, so jump a little earlier.',
      'Passing <em>very close</em> to an obstacle without touching it gives <em>+20 points</em> ("Close!").',
      '<em>Combo:</em> dodge obstacles in a row without a hit; at 10 everything scores <em>x2</em>, and at 25 <em>x3</em>.',
      '<em>Gold coins</em> are worth 2, but they sit in risky spots: right above a bird or high over a cactus.',
      'Each animal keeps its <em>own record</em>.',
      'If the game feels too fast, lower the <em>speed</em> in the menu or the pause screen.',
      '<em>Cat:</em> save the second jump to fix a short one.',
      '<em>Penguin:</em> every point is worth 50% more: great for climbing the ranking.',
      '<em>Chicken:</em> hold while falling to glide over groups of cacti.',
    ]);
    if (HALLOWEEN) t.unshift(L('<em>Halloween</em> (hasta el 2 de noviembre): murciélagos, caramelos, calabazas, la zona <em>Cementerio</em> después del volcán, y sombreros y colores de temporada en la tienda. El 31 hay un reto especial.',
      '<em>Halloween</em> (until November 2): bats, candies, pumpkins, the <em>Graveyard</em> zone after the volcano, and seasonal hats and colors in the shop. On the 31st there is a special challenge.'));
    return '<ul class="tips">' + t.map((x) => '<li>' + bullet + '<p>' + x + '</p></li>').join('') + '</ul>';
  },
};
function renderHelp(tab) {
  helpBody.innerHTML = HELP[tab]();
  helpBody.scrollTop = 0;
  help.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  helpBody.querySelectorAll('i[data-icon]').forEach((el) => setIcon(el, el.dataset.icon));
  helpBody.querySelectorAll('[data-sprite]').forEach((el) => {
    el.appendChild(spriteCanvas(el.dataset.sprite === 'cactus' ? cactusImg : (HALLOWEEN ? batImgs : birdImgs)[0], 2));
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
  const span = shareBtn.querySelector('span'), old = L('Compartir', 'Share');
  span.textContent = msg;
  setTimeout(() => { span.textContent = old; }, 1800);
}
async function shareRun() {
  const text = L('He llegado a ' + Math.floor(score) + ' puntos con ' + animal.name + ' en DinoPixel. ¿Puedes superarme?', 'I scored ' + Math.floor(score) + ' points with the ' + animal.name.toLowerCase() + ' in DinoPixel. Can you beat me?');
  const url = location.origin + '/';
  try {
    if (navigator.share) { await navigator.share({ title: 'DinoPixel', text, url }); stats.shared = 1; checkAch(); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }       // user closed the share sheet
  try { await navigator.clipboard.writeText(text + ' ' + url); flashShare(L('¡Copiado!', 'Copied!')); stats.shared = 1; checkAch(); } catch { flashShare(L('No se pudo copiar', 'Could not copy')); }
}
shareBtn.addEventListener('click', shareRun);

/* ---------- achievements screen ---------- */
const achEl = $('ach'), achBody = $('ach-body');
let achTab = 'ach';
function fmtTime(sec) {
  const m = Math.floor(sec / 60), h = Math.floor(m / 60);
  return h ? h + ' h ' + (m % 60) + ' min' : m ? m + ' min' : Math.floor(sec) + ' s';
}
const num = (n) => Math.floor(n).toLocaleString(LOCALE);
function renderStats() {
  const done = ACH.filter((a) => ach[a.id]).length;
  const rows = [
    [L('Partidas jugadas', 'Runs played'), num(stats.runs)], [L('Tiempo jugado', 'Time played'), fmtTime(stats.timeSec)], [L('Mejor puntuación', 'Best score'), num(best)],
    [L('Saltos', 'Jumps'), num(stats.jumps)], [L('Obstáculos esquivados', 'Obstacles dodged'), num(stats.dodged)], [L('Pájaros esquivados', 'Birds dodged'), num(stats.birds)],
    [L('Monedas recogidas', 'Coins collected'), num(stats.coins)], [L('Monedas gastadas', 'Coins spent'), num(stats.spent)],
    [L('Monedas de premios', 'Prize coins'), num(stats.bonus)], [L('Retos diarios completados', 'Daily challenges done'), num(stats.dailyDone)], [L('Racha de retos', 'Challenge streak'), num(stats.dailyStreak) + (stats.dailyStreak === 1 ? L(' día', ' day') : L(' días', ' days'))],
    [L('Logros', 'Achievements'), done + '/' + ACH.length], [L('Animales', 'Animals'), ANIMALS.filter(unlocked).length + '/' + ANIMALS.length],
  ];
  const tbl = document.createElement('table'); tbl.className = 'stats';
  rows.forEach(([k, v]) => { const tr = tbl.insertRow(); tr.insertCell().textContent = k; tr.insertCell().textContent = v; });
  const h = document.createElement('h3'); h.textContent = L('Récord por animal', 'Record per animal');
  const grid = document.createElement('div'); grid.className = 'recs';
  ANIMALS.forEach((a) => {
    const open = unlocked(a), cell = document.createElement('div'); cell.className = 'rec' + (open ? '' : ' locked');
    const c = spriteCanvas(lookOf(a).frames[0], 2);
    const p = document.createElement('p'); p.textContent = (open ? a.name : '???') + ' ' + num(animalBest[a.id]);
    cell.append(c, p); grid.appendChild(cell);
  });
  achBody.replaceChildren(tbl, h, grid);
}
function renderAchOrStats() {
  $('ach-tabs').querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.atab === achTab));
  if (achTab === 'stats') { $('ach-count').textContent = ACH.filter((a) => ach[a.id]).length + '/' + ACH.length; renderStats(); } else renderAch();
}
$('ach-tabs').querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => { achTab = b.dataset.atab; renderAchOrStats(); }));
function renderAch() {
  const done = ACH.filter((a) => ach[a.id]).length;
  $('ach-count').textContent = done + '/' + ACH.length;
  achBody.replaceChildren();
  const grid = document.createElement('div'); grid.className = 'achs';
  // earned ones first, then by how close they are
  const order = [...ACH].sort((a, b) => (!!ach[b.id] - !!ach[a.id]) || (Math.min(1, b.val() / b.goal) - Math.min(1, a.val() / a.goal)));
  order.forEach((a) => {
    const got = !!ach[a.id], v = Math.min(a.val(), a.goal);
    const row = document.createElement('div'); row.className = 'ach' + (got ? ' got' : '');
    const ic = document.createElement('i'); ic.dataset.icon = got ? 'medal' : 'lock'; setIcon(ic, ic.dataset.icon);
    const txt = document.createElement('p');
    const em = document.createElement('em'); em.textContent = a.name;
    const prog = document.createElement('span'); prog.className = 'req';
    prog.textContent = got ? L('Conseguido', 'Earned') : v + ' / ' + a.goal;
    txt.append(em, document.createElement('br'), a.desc, document.createElement('br'), prog);
    row.append(ic, txt);
    if (!got && a.goal > 1) {                         // progress bar
      const bar = document.createElement('div'); bar.className = 'bar';
      const fill = document.createElement('div'); fill.style.width = Math.floor(100 * v / a.goal) + '%';
      bar.appendChild(fill); txt.appendChild(bar);
    }
    grid.appendChild(row);
  });
  achBody.appendChild(grid);
}
function openAch() { achTab = 'ach'; renderAchOrStats(); achEl.hidden = false; $('ach-close').focus(); }
function closeAch() { achEl.hidden = true; (inGame ? $('resume') : $('ach-btn')).focus(); }
$('ach-btn').addEventListener('click', openAch);
$('ach-btn2').addEventListener('click', openAch);
$('ach-close').addEventListener('click', closeAch);

/* ---------- shop: spend coins on animals (early unlock) and colour skins ---------- */
const shopEl = $('shop'), shopBody = $('shop-body'), shopMsg = $('shop-msg');
let shopTab = 'animals';
const animalPrice = (a) => Math.round(a.unlock / 10);
function spend(price) {
  if (balance() < price) return false;
  stats.spent += price;
  saveStats();
  return true;
}
function setSkin(id, skinId) {
  skinSel[id] = skinId;
  store.set('dp-skin-' + id, skinId);
  refreshPicker();
}
function setGear(id, gearId) {
  gearSel[id] = gearId;
  store.set('dp-gear-' + id, gearId);
  refreshPicker();
}
function setHat(id, hatId) {
  hatSel[id] = hatId;
  store.set('dp-hat-' + id, hatId);
  refreshPicker();
}
function shopRow(img, title, sub, btn) {
  const row = document.createElement('div'); row.className = 'item';
  const face = document.createElement('span'); face.className = 'face'; face.appendChild(img);
  const p = document.createElement('p');
  const em = document.createElement('em'); em.textContent = title;
  p.append(em, document.createElement('br'), sub);
  row.append(face, p);
  if (btn) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'small buy';
    if (btn.price) {
      b.innerHTML = iconSvg('coin');
      b.append(' ' + btn.price.toLocaleString(LOCALE));
      if (balance() < btn.price) b.classList.add('short');
    } else b.textContent = btn.label;
    b.addEventListener('click', () => {
      if (btn.price && !spend(btn.price)) { shopMsg.textContent = L('Te faltan ', 'You need ') + (btn.price - balance()).toLocaleString(LOCALE) + L(' monedas.', ' more coins.'); return; }
      if (btn.price) sfx.power();
      shopMsg.textContent = btn.action() || '';
      cloudSaveSoon();
      renderShop();
    });
    row.appendChild(b);
  }
  return row;
}
function renderShop() {
  $('shop-balance').textContent = balance().toLocaleString(LOCALE);
  showCoins();
  $('shop-tabs').querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.stab === shopTab));
  const list = document.createElement('div'); list.className = 'shop';
  if (shopTab === 'animals') {
    ANIMALS.filter((a) => a.unlock > 0).forEach((a) => {
      const open = unlocked(a);
      list.appendChild(shopRow(spriteCanvas(a.frames[0], 3), a.name,
        ABILITY[a.id][0] + (open ? L(' - desbloqueado', ' - unlocked') : L(' - o llega a ', ' - or reach ') + a.unlock.toLocaleString(LOCALE) + L(' puntos', ' points')),
        open ? null : { price: animalPrice(a), action: () => {
          bought.push(a.id); store.set('dp-bought', JSON.stringify(bought));
          refreshPicker(); checkAch();
          return L('¡' + a.name + ' desbloqueado!', a.name + ' unlocked!');
        } }));
    });
  } else if (shopTab === 'gear') {
    const a = animal;                                   // gear is chosen for the animal selected in the menu, one at a time
    const note = document.createElement('p'); note.className = 'note';
    note.textContent = L('Accesorios para: ' + a.name + ' (cada uno tiene un poder; se compra una vez y sirve para todos los animales)', 'Gear for: ' + a.name + ' (each one has a power; buy it once and use it on every animal)');
    list.appendChild(note);
    GEAR.forEach((g) => {
      const owned = g.price === 0 || ownedGear.includes(g.id), using = gearOf(a.id) === g.id;
      list.appendChild(shopRow(spriteCanvas(dressedLooks(a, skinOf(a.id), hatOf(a.id), g.id).frames[0], 3), g.name,
        (g.desc ? g.desc + ' - ' : '') + (using ? L('En uso', 'In use') : owned ? L('Comprado', 'Owned') : g.price + L(' monedas', ' coins')),
        using ? null : owned ? { label: L('Usar', 'Use'), action: () => { setGear(a.id, g.id); return g.id === 'none' ? a.name + L(' ya no lleva accesorio.', ' has no gear now.') : a.name + L(' lleva ', ' wears: ') + g.name.toLowerCase() + '.'; } }
          : { price: g.price, action: () => {
            ownedGear.push(g.id); store.set('dp-gear', JSON.stringify(ownedGear));
            setGear(a.id, g.id);
            return L('¡' + g.name + ' comprado!', g.name + ' bought!');
          } }));
    });
  } else if (shopTab === 'hats') {
    const a = animal;                                   // hats are chosen for the animal selected in the menu
    const note = document.createElement('p'); note.className = 'note';
    note.textContent = L('Sombreros para: ' + a.name + ' (cada sombrero se compra una vez y sirve para todos los animales)', 'Hats for: ' + a.name + ' (buy each hat once and use it on every animal)');
    list.appendChild(note);
    const season = (x, owned) => !x.season || HALLOWEEN || owned.includes(x.id);   // seasonal items: on sale only in season, kept forever
    HATS.filter((h) => season(h, ownedHats)).forEach((h) => {
      const owned = h.price === 0 || ownedHats.includes(h.id), using = hatOf(a.id) === h.id;
      list.appendChild(shopRow(spriteCanvas(dressedLooks(a, skinOf(a.id), h.id, gearOf(a.id)).frames[0], 3), h.name,
        using ? L('En uso', 'In use') : owned ? L('Comprado', 'Owned') : h.price + L(' monedas', ' coins') + (h.season ? L(' - solo en Halloween', ' - Halloween only') : ''),
        using ? null : owned ? { label: L('Usar', 'Use'), action: () => { setHat(a.id, h.id); return h.id === 'none' ? a.name + L(' ya no lleva sombrero.', ' has no hat now.') : a.name + L(' lleva ', ' wears: ') + h.name.toLowerCase() + '.'; } }
          : { price: h.price, action: () => {
            ownedHats.push(h.id); store.set('dp-hats', JSON.stringify(ownedHats));
            setHat(a.id, h.id);
            return L('¡' + h.name + ' comprado!', h.name + ' bought!');
          } }));
    });
  } else {
    const a = animal;                                   // skins are chosen for the animal selected in the menu
    const note = document.createElement('p'); note.className = 'note';
    note.textContent = L('Colores para: ' + a.name + ' (cada color se compra una vez y sirve para todos los animales)', 'Colors for: ' + a.name + ' (buy each color once and use it on every animal)');
    list.appendChild(note);
    SKINS.filter((sk) => !sk.season || HALLOWEEN || ownedSkins.includes(sk.id)).forEach((sk) => {
      const owned = sk.price === 0 || ownedSkins.includes(sk.id), using = skinOf(a.id) === sk.id;
      list.appendChild(shopRow(spriteCanvas(dressedLooks(a, sk.id, hatOf(a.id), gearOf(a.id)).frames[0], 3), sk.name,
        using ? L('En uso', 'In use') : owned ? L('Comprado', 'Owned') : sk.price + L(' monedas', ' coins') + (sk.season ? L(' - solo en Halloween', ' - Halloween only') : ''),
        using ? null : owned ? { label: L('Usar', 'Use'), action: () => { setSkin(a.id, sk.id); return a.name + L(' ahora es ', ' is now ') + sk.name.toLowerCase() + '.'; } }
          : { price: sk.price, action: () => {
            ownedSkins.push(sk.id); store.set('dp-skins', JSON.stringify(ownedSkins));
            setSkin(a.id, sk.id);
            return L('¡Color ' + sk.name + ' comprado!', sk.name + ' color bought!');
          } }));
    });
  }
  shopBody.replaceChildren(list);
}
function openShop() { shopTab = 'animals'; shopMsg.textContent = ''; renderShop(); shopEl.hidden = false; $('shop-close').focus(); }
function closeShop() { shopEl.hidden = true; $('shop-btn').focus(); }
$('shop-tabs').querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => { shopTab = b.dataset.stab; shopMsg.textContent = ''; renderShop(); }));
$('shop-close').addEventListener('click', closeShop);
$('shop-btn').addEventListener('click', openShop);
$('wallet').addEventListener('click', openShop);
$('wallet').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openShop(); } });
checkAch(true);                                       // mark what you already earned (no banners on load)
document.addEventListener('visibilitychange', () => { if (document.hidden) saveStats(); });
window.addEventListener('pagehide', saveStats);
