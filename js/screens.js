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
        <tr><td>Agacharte</td><td>${keys('<i data-icon="down"></i>', 'S')}</td><td>Mantén abajo</td></tr>
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
      'Cada <em>1500 puntos</em> cambias de zona: desierto, nieve y ciudad, cada una con sus obstáculos.',
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
    if (navigator.share) { await navigator.share({ title: 'DinoPixel', text, url }); stats.shared = 1; checkAch(); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }       // user closed the share sheet
  try { await navigator.clipboard.writeText(text + ' ' + url); flashShare('¡Copiado!'); stats.shared = 1; checkAch(); } catch { flashShare('No se pudo copiar'); }
}
shareBtn.addEventListener('click', shareRun);

/* ---------- achievements screen ---------- */
const achEl = $('ach'), achBody = $('ach-body');
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
function openAch() { renderAch(); achEl.hidden = false; $('ach-close').focus(); }
function closeAch() { achEl.hidden = true; (inGame ? $('resume') : $('ach-btn')).focus(); }
$('ach-btn').addEventListener('click', openAch);
$('ach-btn2').addEventListener('click', openAch);
$('ach-close').addEventListener('click', closeAch);
checkAch(true);                                       // mark what you already earned (no banners on load)
document.addEventListener('visibilitychange', () => { if (document.hidden) saveStats(); });
window.addEventListener('pagehide', saveStats);
