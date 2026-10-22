// DinoPixel - idioma: español o inglés (detectado del navegador, se puede cambiar en el menú).
// Classic script: shares the page's global scope with the other js/ files, loaded in order by index.html.
'use strict';

/* ---------- language ---------- */
// Saved choice (dp-lang) wins; otherwise Spanish browsers get Spanish and everyone else English.
const LANG = (() => {
  let v = null;
  try { v = localStorage.getItem('dp-lang'); } catch { /* storage unavailable */ }
  if (v === 'es' || v === 'en') return v;
  return /^es\b/i.test(navigator.language || 'es') ? 'es' : 'en';
})();
const L = (es, en) => (LANG === 'en' ? en : es);          // pick the text for the current language
const LOCALE = L('es-ES', 'en-US');
document.documentElement.lang = LANG;

// Static HTML: data-en (text, or the inner <span> of an icon button), data-en-html, data-en-label (aria-label),
// data-en-title and data-en-ph (placeholder) hold the English version of the Spanish markup.
function translatePage() {
  if (LANG !== 'en') return;
  document.querySelectorAll('[data-en]').forEach((el) => { (el.querySelector(':scope > span') || el).textContent = el.dataset.en; });
  document.querySelectorAll('[data-en-html]').forEach((el) => { el.innerHTML = el.dataset.enHtml; });
  document.querySelectorAll('[data-en-label]').forEach((el) => el.setAttribute('aria-label', el.dataset.enLabel));
  document.querySelectorAll('[data-en-title]').forEach((el) => { el.title = el.dataset.enTitle; });
  document.querySelectorAll('[data-en-ph]').forEach((el) => { el.placeholder = el.dataset.enPh; });
}
translatePage();
