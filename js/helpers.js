// DinoPixel - utilidades: colores, almacenamiento, paletas de día/noche y zonas.
// Classic script: shares the page's global scope with the other js/ files, loaded in order by index.html.
'use strict';

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
const mix = (a, b, t) => {
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join('');
};
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};
const pad = (n) => String(Math.floor(n)).padStart(5, '0');

const DAY = { skyT: '#6ec6f0', skyB: '#d4f1fc', hill1: '#a8dba0', hill2: '#7cc47a', ground: '#e0c48a', lip: '#8a6a3a', speck: '#b89860', cloud: '#ffffff', hud: '#2c2c2c' };
// Zones: the scenery and obstacles change every BIOME_LEN points (colors blend over ~2 s)
const BIOME_LEN = 1500;
const BIOMES = [
  { id: 'desert', name: L('Desierto', 'Desert'), obs: ['cactus'], day: {}, night: {} },
  { id: 'snow', name: L('Nieve', 'Snow'), obs: ['snowman', 'pine'],
    day: { skyB: '#e8f6fc', hill1: '#cfe0ee', hill2: '#a3bfd6', ground: '#f4f8fb', lip: '#9fb6c9', speck: '#cfdde8' },
    night: { hill1: '#3a4a73', hill2: '#2c3a5e', ground: '#4f5d84', lip: '#28304d', speck: '#6a78a0' } },
  { id: 'city', name: L('Ciudad', 'City'), obs: ['cone', 'hydrant'], skyline: true,
    day: { hill1: '#9aa7b8', hill2: '#6f7d91', ground: '#7a7a82', lip: '#4a4a52', speck: '#c9c9cf' },
    night: { hill1: '#2a2f4a', hill2: '#1e2238', ground: '#2c2c38', lip: '#15151d', speck: '#8a8060' } },
  { id: 'jungle', name: L('Selva', 'Jungle'), obs: ['bush', 'stump'],
    day: { skyB: '#dff7d6', hill1: '#5fae5a', hill2: '#2f8a4a', ground: '#7a5532', lip: '#3e2a18', speck: '#a07a4a' },
    night: { hill1: '#1f4a3a', hill2: '#163828', ground: '#3a2a20', lip: '#1a1210', speck: '#5a4630' } },
  { id: 'volcano', name: L('Volcán', 'Volcano'), obs: ['rock', 'lava'],
    day: { skyT: '#e98a5a', skyB: '#fcd6a8', hill1: '#9a6252', hill2: '#6a3e34', ground: '#5a4640', lip: '#e2572a', speck: '#ff8a3a' },
    night: { skyT: '#1e0c14', skyB: '#4a1e2a', hill1: '#4a2228', hill2: '#33161c', ground: '#2e2020', lip: '#c2401e', speck: '#ff7030' } },
];
const NIGHT = { skyT: '#0d0f2b', skyB: '#2a2d5c', hill1: '#2d3a63', hill2: '#212b4d', ground: '#3b3452', lip: '#1c1830', speck: '#554c72', cloud: '#4a5080', hud: '#e8e8ff' };
