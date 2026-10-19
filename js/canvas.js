// DinoPixel - canvas a resolución nativa, escala entera y márgenes del notch.
// Classic script: shares the page's global scope with the other js/ files, loaded in order by index.html.
'use strict';

/* ---------- canvas ---------- */
const canvas = $('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// Native-resolution canvas: every logical px is K whole device px, so pixel art stays razor sharp.
// The world is ~560+ logical px wide and ~300 tall, whatever the screen.
let K = 1, insetR = 0, insetL = 0;                      // safe-area (notch) on each side, in logical px
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-right:env(safe-area-inset-right,0px);padding-left:env(safe-area-inset-left,0px)';
document.body.appendChild(probe);
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const dw = Math.max(1, Math.round(window.innerWidth * dpr));
  const dh = Math.max(1, Math.round(window.innerHeight * dpr));
  K = Math.max(1, Math.round(dh / 300));
  while (K > 1 && dw / K < 560) K--;
  W = Math.ceil(dw / K); H = Math.ceil(dh / K);
  canvas.width = W * K; canvas.height = H * K;
  canvas.style.width = (W * K / dpr) + 'px';
  canvas.style.height = (H * K / dpr) + 'px';
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.imageSmoothingEnabled = false;
  GROUND = H - 40;
  insetR = Math.ceil((parseFloat(getComputedStyle(probe).paddingRight) || 0) * dpr / K);
  insetL = Math.ceil((parseFloat(getComputedStyle(probe).paddingLeft) || 0) * dpr / K);
}
resize();
