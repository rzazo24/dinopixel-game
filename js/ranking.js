// DinoPixel - ranking online: API, apodo, cola sin conexión, pantalla.
// Classic script: shares the page's global scope with the other js/ files, loaded in order by index.html.
'use strict';

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
let rankBoard = 'all', rankPeriod = 'week', rankReq = 0, nagged = false;

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
  if (runMode === 'zen') return;                   // zen runs are never ranked
  const run = { animal: animal.id, gear, hard: runMode === 'hard', score: sc, t: runToken };
  runToken = null;
  if (!nick) {
    if (!pendingRun || run.score > pendingRun.score) pendingRun = run;
    if (!nagged) {                                   // ask for a nickname once per session
      nagged = true;
      setTimeout(() => { if (inGame && state === 'over' && rankEl.hidden) openRank(L('¡Buena partida! Elige un apodo para guardar tu puntuación.', 'Nice run! Pick a nickname to save your score.')); }, 700);
    }
    return;
  }
  sendScore(run);
}
async function sendScore(run) {
  const r = await api('/api/score', { pid, nick, ...run });
  if (r.ok) {
    lastRank = r.data;
    if (r.data.all && r.data.all.rank <= 3) stats.podium = 1;
    if (r.data.week && r.data.week.all.rank === 1) stats.weekwin = 1;
    checkAch();
    flushQueue();
  }
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
  $('rank-period').querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.period === rankPeriod));
  rankBody.innerHTML = '<p class="note">' + L('Cargando...', 'Loading...') + '</p>';
  const r = await api('/api/ranking?board=' + board + '&period=' + rankPeriod + '&pid=' + pid);
  if (mine !== rankReq) return;                      // a newer tab was opened meanwhile
  if (!r.ok) {
    const why = r.status === 0 ? L('Sin conexión. Inténtalo más tarde.', 'No connection. Try again later.')
      : (r.status === 503 || r.status === 404) ? L('El ranking aún no está disponible.', 'The ranking is not available yet.') : L('No se pudo cargar el ranking.', 'The ranking could not be loaded.');
    rankBody.innerHTML = '<p class="note"></p>';
    rankBody.firstChild.textContent = why;
    return;
  }
  renderRank(r.data);
}
function countdown(ts) {
  const m = Math.max(0, Math.floor((ts - Date.now()) / 60000));
  const days = Math.floor(m / 1440), hours = Math.floor((m % 1440) / 60);
  return days ? days + 'd ' + hours + 'h' : hours ? hours + 'h ' + (m % 60) + 'min' : (m % 60) + 'min';
}
function renderRank(d) {
  rankBody.replaceChildren();
  if (!d.rows.length) {
    const p = document.createElement('p'); p.className = 'note'; p.textContent = rankPeriod === 'week' ? L('Esta semana aún no hay puntuaciones. ¡Sé el primero!', 'No scores yet this week. Be the first!') : L('Aún no hay puntuaciones. ¡Sé el primero!', 'No scores yet. Be the first!');
    rankBody.appendChild(p);
    return;
  }
  const tbl = document.createElement('table'); tbl.className = 'lb';
  let boosted = false, anyHard = false;
  const add = (rk, n, sc, me, aid, gid, hard) => {
    const tr = tbl.insertRow(); if (me) tr.className = 'me';
    tr.insertCell().textContent = '#' + rk;
    const ic = tr.insertCell(); ic.className = 'ico';
    const an = ANIMALS.find((x) => x.id === aid);
    if (an) ic.appendChild(spriteCanvas(an.frames[0], 1));   // the animal that set this score
    const gr = GEAR.find((x) => x.id === gid && x.img);
    if (gr) { const gc = spriteCanvas(gr.img, 1); gc.className = 'gear'; gc.title = gr.name; ic.appendChild(gc); }   // and the gear it wore
    tr.insertCell().textContent = n;                 // textContent: nicknames are never interpreted as HTML
    const nc = tr.insertCell(); nc.textContent = sc + (gr ? ' *' : '');   // * = made with a power-up accessory (legend below)
    if (gr) { tr.classList.add('boosted'); boosted = true; }
    if (hard) { const b = document.createElement('span'); b.className = 'hard'; b.textContent = L('DIF', 'HARD'); b.title = L('Modo difícil', 'Hard mode'); nc.prepend(b); anyHard = true; }
  };
  d.rows.forEach((x) => add(x.r, x.n, x.s, x.me, x.a, x.g, x.h));
  if (d.me && !d.rows.some((x) => x.me)) {
    const c = tbl.insertRow().insertCell(); c.colSpan = 4; c.className = 'sep'; c.textContent = '...';
    add(d.me.r, d.me.n, d.me.s, true, d.me.a, d.me.g, d.me.h);
  }
  const foot = document.createElement('p'); foot.className = 'note';
  foot.textContent = d.total + (d.total === 1 ? L(' jugador', ' player') : L(' jugadores', ' players')) + (d.endsAt ? L(' - Se reinicia en ', ' - Resets in ') + countdown(d.endsAt) : '');
  if (anyHard) foot.textContent = L('DIF = modo difícil - ', 'HARD = hard mode - ') + foot.textContent;
  if (boosted) foot.textContent = L('* Con accesorio potenciador - ', '* With a power-up accessory - ') + foot.textContent;
  rankBody.append(tbl, foot);
}
async function saveNick() {
  const v = nickInput.value.normalize('NFC').replace(/\s+/g, ' ').trim().toUpperCase();
  const len = [...v].length;
  if (!len || len > 10 || !NICK_RE.test(v)) { rankMsg.textContent = L('Apodo no válido: 1-10 letras o números (se permite . _ -).', 'Invalid nickname: 1-10 letters or numbers (. _ - allowed).'); return; }
  rankMsg.textContent = L('Guardando...', 'Saving...');
  const r = await api('/api/name', { pid, nick: v });
  if (r.status === 400) { rankMsg.textContent = r.data.error === 'banned' ? L('Ese apodo no está permitido.', 'That nickname is not allowed.') : L('Apodo no válido.', 'Invalid nickname.'); return; }
  nick = v;
  store.set('dp-nick', nick);
  cloudSaveSoon();
  rankMsg.textContent = L('Apodo guardado.', 'Nickname saved.');
  if (pendingRun) {
    const run = pendingRun; pendingRun = null;
    await sendScore(run);
    if (lastRank) rankMsg.textContent = L('¡Guardado! Eres el #' + lastRank.all.rank + ' del ranking global.', 'Saved! You are #' + lastRank.all.rank + ' in the global ranking.');
  }
  loadRank(rankBoard);
}
let delTimer = null;
function resetDeleteLabel() {
  clearTimeout(delTimer); delTimer = null;
  $('rank-del').classList.remove('confirm');
  $('rank-del').querySelector('span').textContent = L('Borrar mis datos', 'Delete my data');
}
async function deleteMyData() {
  if (!delTimer) {                                  // first click: ask for confirmation
    $('rank-del').classList.add('confirm');
    $('rank-del').querySelector('span').textContent = L('¿Seguro? Pulsa otra vez', 'Sure? Tap again');
    delTimer = setTimeout(resetDeleteLabel, 4000);
    return;
  }
  resetDeleteLabel();
  rankMsg.textContent = L('Borrando...', 'Deleting...');
  const r = await api('/api/delete', { pid });
  if (!r.ok) { rankMsg.textContent = L('No se pudo borrar. Inténtalo más tarde.', 'Could not delete. Try again later.'); return; }
  nick = ''; pendingRun = null; lastRank = null;
  store.set('dp-nick', ''); store.set('dp-queue', '[]');
  pid = newPid(); store.set('dp-pid', pid);        // a fresh id: nothing links the old data to this device
  nickInput.value = '';
  rankMsg.textContent = L('Tus datos se han borrado del ranking.', 'Your data has been deleted from the ranking.');
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
$('rank-period').querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => { rankPeriod = b.dataset.period; loadRank(rankBoard); }));
$('rank-close').addEventListener('click', closeRank);
$('rank-btn').addEventListener('click', () => openRank());
$('rank-btn2').addEventListener('click', () => openRank());
