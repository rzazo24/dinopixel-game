// DinoPixel - guardado en el servidor: copia del progreso ligada a un código de recuperación (sin cuentas).
// Classic script: shares the page's global scope with the other js/ files, loaded in order by index.html.
'use strict';

/* ---------- cloud save ---------- */
// What travels: every dp-* key (records, coins, purchases, skins, achievements, stats, daily streak, nickname, ranking id)
// except device settings and transient data.
const CLOUD_SKIP = new Set(['dp-queue', 'dp-cloud', 'dp-cloud-at', 'dp-pace', 'dp-vol', 'dp-music', 'dp-muted', 'dp-vibe']);
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
  if (m < 1) return 'hace un momento';
  if (m < 60) return 'hace ' + m + ' min';
  const h = Math.floor(m / 60);
  return h < 24 ? 'hace ' + h + ' h' : 'hace ' + Math.floor(h / 24) + ' días';
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
    $('cloud-when').textContent = at ? 'Último guardado: ' + ago(at) : 'Aún sin guardar';
  }
}
const failMsg = (r) => (r.status === 0 ? 'Sin conexión. Inténtalo más tarde.' : r.status === 503 || r.status === 404 && !r.data.error
  ? 'El guardado aún no está disponible.' : r.status === 429 ? 'Demasiados intentos. Espera un rato.' : 'No se pudo completar.');

async function cloudActivate() {
  cloudMsg.textContent = 'Activando...';
  const r = await api('/api/save', { data: snapshot() });
  if (!r.ok) { cloudMsg.textContent = failMsg(r); return; }
  cloudCode = r.data.code;
  store.set('dp-cloud', cloudCode); store.set('dp-cloud-at', String(r.data.savedAt));
  refreshCloud();
  cloudMsg.textContent = '¡Listo! Anota tu código: lo necesitarás para recuperar tu partida.';
}
function resetRestore() { clearTimeout(restoreTimer); pendingRestore = null; $('cloud-restore').textContent = 'Recuperar'; }
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
  if (!code.trim()) { cloudMsg.textContent = 'Escribe tu código (XXXXX-XXXXX).'; return; }
  cloudMsg.textContent = 'Buscando...';
  const r = await api('/api/load', { code });
  if (!r.ok) { cloudMsg.textContent = r.status === 404 && r.data.error === 'not_found' ? 'No hay ninguna partida con ese código.' : r.status === 400 ? 'Ese código no es válido.' : failMsg(r); return; }
  pendingRestore = { code: r.data.code, data: r.data.data };
  $('cloud-restore').textContent = '¿Reemplazar? Pulsa otra vez';
  cloudMsg.textContent = 'Partida encontrada (guardada ' + ago(r.data.savedAt) + '). Sustituirá el progreso de este dispositivo.';
  restoreTimer = setTimeout(resetRestore, 6000);
}
async function cloudDelete() {
  if (!cloudDelTimer) { $('cloud-del').querySelector('span').textContent = '¿Seguro? Pulsa otra vez'; $('cloud-del').classList.add('confirm'); cloudDelTimer = setTimeout(resetCloudDel, 4000); return; }
  resetCloudDel();
  const r = await api('/api/save', { code: cloudCode, delete: true });
  if (!r.ok) { cloudMsg.textContent = failMsg(r); return; }
  cloudCode = ''; store.set('dp-cloud', ''); store.set('dp-cloud-at', '');
  refreshCloud();
  cloudMsg.textContent = 'Copia borrada del servidor. Tu progreso sigue en este dispositivo.';
}
function resetCloudDel() { clearTimeout(cloudDelTimer); cloudDelTimer = null; $('cloud-del').classList.remove('confirm'); $('cloud-del').querySelector('span').textContent = 'Borrar copia del servidor'; }
function openCloud() { cloudMsg.textContent = ''; resetRestore(); resetCloudDel(); refreshCloud(); cloudEl.hidden = false; $('cloud-close').focus(); }
function closeCloud() { cloudEl.hidden = true; resetRestore(); $('cloud-chip').focus(); }
$('cloud-chip').addEventListener('click', openCloud);
$('cloud-chip').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCloud(); } });
$('cloud-close').addEventListener('click', closeCloud);
$('cloud-on').addEventListener('click', cloudActivate);
$('cloud-now').addEventListener('click', async () => { cloudMsg.textContent = 'Guardando...'; const r = await cloudSave(); cloudMsg.textContent = r && r.ok ? 'Guardado.' : failMsg(r || { status: 0, data: {} }); });
$('cloud-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(cloudCode); cloudMsg.textContent = 'Código copiado.'; } catch { cloudMsg.textContent = 'Cópialo a mano: ' + cloudCode; } });
$('cloud-restore').addEventListener('click', cloudRestore);
$('cloud-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); cloudRestore(); } });
$('cloud-del').addEventListener('click', cloudDelete);
refreshCloud();
