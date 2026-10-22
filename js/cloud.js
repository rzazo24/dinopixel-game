// DinoPixel - guardado en el servidor: copia del progreso ligada a un código de recuperación (sin cuentas).
// Classic script: shares the page's global scope with the other js/ files, loaded in order by index.html.
'use strict';

/* ---------- cloud save ---------- */
// What travels: every dp-* key (records, coins, purchases, skins, achievements, stats, daily streak, nickname, ranking id)
// except device settings and transient data.
const CLOUD_SKIP = new Set(['dp-lang', 'dp-queue', 'dp-cloud', 'dp-cloud-at', 'dp-pace', 'dp-vol', 'dp-music', 'dp-muted', 'dp-vibe']);
let cloudCode = store.get('dp-cloud', '');
let cloudTimer = null, pendingRestore = null, restoreTimer = null, cloudDelTimer = null;
const cloudEl = $('cloud'), cloudMsg = $('cloud-msg');

function snapshot() {
  saveStats();
  const keys = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('dp-') && !CLOUD_SKIP.has(k)) keys[k] = localStorage.getItem(k);
    }
  } catch { /* storage unavailable */ }
  return { v: 1, keys };
}
async function cloudSave() {
  if (!cloudCode || !persist.on) return null;
  const r = await api('/api/save', { code: cloudCode, data: snapshot() });
  if (r.ok) { store.set('dp-cloud-at', String(r.data.savedAt)); refreshCloud(); }
  return r;
}
function cloudSaveSoon() {                              // after a run, a purchase...: batch changes, save 2 s later
  if (!cloudCode) return;
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(cloudSave, 2000);
}
document.addEventListener('visibilitychange', () => {   // leaving the app: last chance to save (keepalive survives the page closing)
  if (!document.hidden || !cloudCode || !persist.on) return;
  try {
    fetch('/api/save', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: cloudCode, data: snapshot() }) });
  } catch { /* offline */ }
});

function ago(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return L('hace un momento', 'just now');
  const h = Math.floor(m / 60);
  const t = m < 60 ? m + ' min' : h < 24 ? h + ' h' : Math.floor(h / 24) + L(' días', ' days');
  return L('hace ' + t, t + ' ago');
}
function refreshCloud() {
  const on = !!cloudCode;
  $('cloud-chip').classList.toggle('on', on);
  $('cloud-off').hidden = on;
  $('cloud-active').hidden = !on;
  $('cloud-danger').hidden = !on;
  if (on) {
    $('cloud-code').textContent = cloudCode;
    const at = Number(store.get('dp-cloud-at', '0'));
    $('cloud-when').textContent = at ? L('Último guardado: ', 'Last saved: ') + ago(at) : L('Aún sin guardar', 'Not saved yet');
  }
}
const failMsg = (r) => (r.status === 0 ? L('Sin conexión. Inténtalo más tarde.', 'No connection. Try again later.') : r.status === 503 || r.status === 404 && !r.data.error
  ? L('El guardado aún no está disponible.', 'Cloud save is not available yet.') : r.status === 429 ? L('Demasiados intentos. Espera un rato.', 'Too many tries. Wait a while.') : L('No se pudo completar.', 'It could not be done.'));

async function cloudActivate() {
  cloudMsg.textContent = L('Activando...', 'Turning on...');
  const r = await api('/api/save', { data: snapshot() });
  if (!r.ok) { cloudMsg.textContent = failMsg(r); return; }
  cloudCode = r.data.code;
  store.set('dp-cloud', cloudCode); store.set('dp-cloud-at', String(r.data.savedAt));
  refreshCloud();
  cloudMsg.textContent = L('¡Listo! Anota tu código: lo necesitarás para recuperar tu partida.', 'Done! Write down your code: you will need it to restore your progress.');
}
function resetRestore() { clearTimeout(restoreTimer); pendingRestore = null; $('cloud-restore').textContent = L('Recuperar', 'Restore'); }
async function cloudRestore() {
  if (pendingRestore) {                                 // second click: replace this device's progress and reload
    const { code, data } = pendingRestore;
    persist.on = false;                                 // nothing may write the old in-memory state from now on
    try {
      const old = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('dp-') && !CLOUD_SKIP.has(k)) old.push(k); }
      old.forEach((k) => localStorage.removeItem(k));
      Object.entries(data.keys || {}).forEach(([k, v]) => { if (k.startsWith('dp-') && !CLOUD_SKIP.has(k) && typeof v === 'string') localStorage.setItem(k, v); });
      localStorage.setItem('dp-cloud', code); localStorage.setItem('dp-cloud-at', String(Date.now()));
    } catch { /* storage unavailable */ }
    location.reload();
    return;
  }
  const code = $('cloud-input').value;
  if (!code.trim()) { cloudMsg.textContent = L('Escribe tu código (XXXXX-XXXXX).', 'Type your code (XXXXX-XXXXX).'); return; }
  cloudMsg.textContent = L('Buscando...', 'Looking...');
  const r = await api('/api/load', { code });
  if (!r.ok) { cloudMsg.textContent = r.status === 404 && r.data.error === 'not_found' ? L('No hay ninguna partida con ese código.', 'There is no save with that code.') : r.status === 400 ? L('Ese código no es válido.', 'That code is not valid.') : failMsg(r); return; }
  pendingRestore = { code: r.data.code, data: r.data.data };
  $('cloud-restore').textContent = L('¿Reemplazar? Pulsa otra vez', 'Replace? Tap again');
  cloudMsg.textContent = L('Partida encontrada (guardada ' + ago(r.data.savedAt) + '). Sustituirá el progreso de este dispositivo.', 'Save found (saved ' + ago(r.data.savedAt) + '). It will replace the progress on this device.');
  restoreTimer = setTimeout(resetRestore, 6000);
}
async function cloudDelete() {
  if (!cloudDelTimer) { $('cloud-del').querySelector('span').textContent = L('¿Seguro? Pulsa otra vez', 'Sure? Tap again'); $('cloud-del').classList.add('confirm'); cloudDelTimer = setTimeout(resetCloudDel, 4000); return; }
  resetCloudDel();
  const r = await api('/api/save', { code: cloudCode, delete: true });
  if (!r.ok) { cloudMsg.textContent = failMsg(r); return; }
  cloudCode = ''; store.set('dp-cloud', ''); store.set('dp-cloud-at', '');
  refreshCloud();
  cloudMsg.textContent = L('Copia borrada del servidor. Tu progreso sigue en este dispositivo.', 'Server copy deleted. Your progress stays on this device.');
}
function resetCloudDel() { clearTimeout(cloudDelTimer); cloudDelTimer = null; $('cloud-del').classList.remove('confirm'); $('cloud-del').querySelector('span').textContent = L('Borrar copia del servidor', 'Delete server copy'); }
function openCloud() { cloudMsg.textContent = ''; resetRestore(); resetCloudDel(); refreshCloud(); cloudEl.hidden = false; $('cloud-close').focus(); }
function closeCloud() { cloudEl.hidden = true; resetRestore(); $('cloud-chip').focus(); }
$('cloud-chip').addEventListener('click', openCloud);
$('cloud-chip').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCloud(); } });
$('cloud-close').addEventListener('click', closeCloud);
$('cloud-on').addEventListener('click', cloudActivate);
$('cloud-now').addEventListener('click', async () => { cloudMsg.textContent = L('Guardando...', 'Saving...'); const r = await cloudSave(); cloudMsg.textContent = r && r.ok ? L('Guardado.', 'Saved.') : failMsg(r || { status: 0, data: {} }); });
$('cloud-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(cloudCode); cloudMsg.textContent = L('Código copiado.', 'Code copied.'); } catch { cloudMsg.textContent = L('Cópialo a mano: ', 'Copy it by hand: ') + cloudCode; } });
$('cloud-restore').addEventListener('click', cloudRestore);
$('cloud-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); cloudRestore(); } });
$('cloud-del').addEventListener('click', cloudDelete);
refreshCloud();
