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
        <tr><th></th><th>Teclado</th><th>Táctil</th></tr>
        <tr><td>Saltar</td><td>${keys('ESPACIO', '<i data-icon="up"></i>', 'W')}</td><td>Toca</td></tr>
        <tr><td>Pausa</td><td>${keys('P', 'ESC')}</td><td>Botón arriba</td></tr>
        <tr><td>Pantalla completa</td><td>${keys('F')}</td><td></td></tr>
        <tr><td>Efectos</td><td>${keys('M')}</td><td>Botón del menú</td></tr>
        <tr><td>Música</td><td>${keys('N')}</td><td>Botón del menú</td></tr>
        <tr><td>Ayuda</td><td>${keys('H')}</td><td>Botón del menú</td></tr>
      </table>
      <p class="note">Mantén pulsado para saltar más alto; suelta pronto para un salto corto.</p>
      <h3>Obstáculos</h3>
      <div class="obs"><span data-sprite="cactus"></span><p><em>Cactus:</em> salta por encima.</p></div>
      <div class="obs"><span data-sprite="bird"></span><p><em>Pájaro alto:</em> pasa por debajo sin hacer nada.<br>
        <em>Pájaro medio:</em> salta (un poco más alto).<br><em>Pájaro bajo:</em> salta.</p></div>`;
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
      'Tu <em>mejor puntuación</em> con cualquier animal desbloquea a los demás: uno nuevo cada 1000 puntos.',
      'Cada <em>700 puntos</em> cambia entre día y noche, y el juego va cada vez más rápido.',
      'Los <em>pájaros</em> aparecen a partir de 300 puntos.',
      'Las <em>monedas</em> dan 10 puntos y se gastan en la <em>tienda</em>: animales, colores y sombreros. Cada <em>escudo</em> aguanta un golpe (se acumulan) y el <em>imán</em> atrae monedas 6 segundos.',
      'Cada <em>1500 puntos</em> cambias de zona: desierto, nieve, ciudad, selva y volcán, cada una con sus obstáculos.',
      'Desde 800 puntos hay <em>obstáculos que se mueven</em> (planta rodadora, bola de nieve, coche, coco, roca): llegan antes, salta un poco antes.',
      'Cada animal guarda su <em>propio récord</em>.',
      'Si el juego te va muy rápido, baja la <em>velocidad</em> en el menú o en la pausa.',
      '<em>Gato:</em> guarda el segundo salto para corregir un salto corto.',
      '<em>Pingüino:</em> cada punto le vale un 50% más: ideal para subir en el ranking.',
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
    if (navigator.share) { await navigator.share({ title: 'DinoPixel', text, url }); stats.shared = 1; checkAch(); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }       // user closed the share sheet
  try { await navigator.clipboard.writeText(text + ' ' + url); flashShare('¡Copiado!'); stats.shared = 1; checkAch(); } catch { flashShare('No se pudo copiar'); }
}
shareBtn.addEventListener('click', shareRun);

/* ---------- achievements screen ---------- */
const achEl = $('ach'), achBody = $('ach-body');
let achTab = 'ach';
function fmtTime(sec) {
  const m = Math.floor(sec / 60), h = Math.floor(m / 60);
  return h ? h + ' h ' + (m % 60) + ' min' : m ? m + ' min' : Math.floor(sec) + ' s';
}
const num = (n) => Math.floor(n).toLocaleString('es-ES');
function renderStats() {
  const done = ACH.filter((a) => ach[a.id]).length;
  const rows = [
    ['Partidas jugadas', num(stats.runs)], ['Tiempo jugado', fmtTime(stats.timeSec)], ['Mejor puntuación', num(best)],
    ['Saltos', num(stats.jumps)], ['Obstáculos esquivados', num(stats.dodged)], ['Pájaros esquivados', num(stats.birds)],
    ['Monedas recogidas', num(stats.coins)], ['Monedas gastadas', num(stats.spent)],
    ['Monedas de premios', num(stats.bonus)], ['Retos diarios completados', num(stats.dailyDone)], ['Racha de retos', num(stats.dailyStreak) + (stats.dailyStreak === 1 ? ' día' : ' días')],
    ['Logros', done + '/' + ACH.length], ['Animales', ANIMALS.filter(unlocked).length + '/' + ANIMALS.length],
  ];
  const tbl = document.createElement('table'); tbl.className = 'stats';
  rows.forEach(([k, v]) => { const tr = tbl.insertRow(); tr.insertCell().textContent = k; tr.insertCell().textContent = v; });
  const h = document.createElement('h3'); h.textContent = 'Récord por animal';
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
    prog.textContent = got ? 'Conseguido' : v + ' / ' + a.goal;
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
      b.append(' ' + btn.price.toLocaleString('es-ES'));
      if (balance() < btn.price) b.classList.add('short');
    } else b.textContent = btn.label;
    b.addEventListener('click', () => {
      if (btn.price && !spend(btn.price)) { shopMsg.textContent = 'Te faltan ' + (btn.price - balance()).toLocaleString('es-ES') + ' monedas.'; return; }
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
  $('shop-balance').textContent = balance().toLocaleString('es-ES');
  showCoins();
  $('shop-tabs').querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.stab === shopTab));
  const list = document.createElement('div'); list.className = 'shop';
  if (shopTab === 'animals') {
    ANIMALS.filter((a) => a.unlock > 0).forEach((a) => {
      const open = unlocked(a);
      list.appendChild(shopRow(spriteCanvas(a.frames[0], 3), a.name,
        ABILITY[a.id][0] + (open ? ' - desbloqueado' : ' - o llega a ' + a.unlock.toLocaleString('es-ES') + ' puntos'),
        open ? null : { price: animalPrice(a), action: () => {
          bought.push(a.id); store.set('dp-bought', JSON.stringify(bought));
          refreshPicker(); checkAch();
          return '¡' + a.name + ' desbloqueado!';
        } }));
    });
  } else if (shopTab === 'hats') {
    const a = animal;                                   // hats are chosen for the animal selected in the menu
    const note = document.createElement('p'); note.className = 'note';
    note.textContent = 'Sombreros para: ' + a.name + ' (cada sombrero se compra una vez y sirve para todos los animales)';
    list.appendChild(note);
    HATS.forEach((h) => {
      const owned = h.price === 0 || ownedHats.includes(h.id), using = hatOf(a.id) === h.id;
      list.appendChild(shopRow(spriteCanvas(dressedLooks(a, skinOf(a.id), h.id).frames[0], 3), h.name,
        using ? 'En uso' : owned ? 'Comprado' : h.price + ' monedas',
        using ? null : owned ? { label: 'Usar', action: () => { setHat(a.id, h.id); return h.id === 'none' ? a.name + ' ya no lleva sombrero.' : a.name + ' lleva ' + h.name.toLowerCase() + '.'; } }
          : { price: h.price, action: () => {
            ownedHats.push(h.id); store.set('dp-hats', JSON.stringify(ownedHats));
            setHat(a.id, h.id);
            return '¡' + h.name + ' comprado!';
          } }));
    });
  } else {
    const a = animal;                                   // skins are chosen for the animal selected in the menu
    const note = document.createElement('p'); note.className = 'note';
    note.textContent = 'Colores para: ' + a.name + ' (cada color se compra una vez y sirve para todos los animales)';
    list.appendChild(note);
    SKINS.forEach((sk) => {
      const owned = sk.price === 0 || ownedSkins.includes(sk.id), using = skinOf(a.id) === sk.id;
      list.appendChild(shopRow(spriteCanvas(dressedLooks(a, sk.id, hatOf(a.id)).frames[0], 3), sk.name,
        using ? 'En uso' : owned ? 'Comprado' : sk.price + ' monedas',
        using ? null : owned ? { label: 'Usar', action: () => { setSkin(a.id, sk.id); return a.name + ' ahora es ' + sk.name.toLowerCase() + '.'; } }
          : { price: sk.price, action: () => {
            ownedSkins.push(sk.id); store.set('dp-skins', JSON.stringify(ownedSkins));
            setSkin(a.id, sk.id);
            return '¡Color ' + sk.name + ' comprado!';
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
