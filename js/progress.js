// DinoPixel - desbloqueos, logros y habilidades.
// Classic script: shares the page's global scope with the other js/ files, loaded in order by index.html.
'use strict';

/* ---------- unlocks: animals open up as your best score grows ---------- */
// Best score needed per animal. Points come at ~43/s at the start and ~94/s at top speed (reached at ~2100),
// so 1000 is ~20 s of perfect play and 7000 is ~85 s without a single mistake.
const UNLOCK = { dino: 0, cat: 1000, dog: 2500, bunny: 4000, chick: 5500, peng: 7000, frog: 8500, fox: 10000, turtle: 12000 };
ANIMALS.forEach((a) => { a.unlock = UNLOCK[a.id] || 0; });
let best = Number(store.get('dp-best', '0')) || 0;      // best score reached with any animal
const unlocked = (a) => best >= a.unlock;

/* ---------- achievements ---------- */
const jsonStore = (k, d) => { try { return Object.assign(d, JSON.parse(store.get(k, '{}'))); } catch { return d; } };
const stats = jsonStore('dp-stats', { runs: 0, jumps: 0, dodged: 0, birds: 0, doubles: 0, shields: 0, glideSec: 0, slidePts: 0, noDuckBest: 0, podium: 0, weekwin: 0, shared: 0 });
const ach = jsonStore('dp-ach', {});                    // { id: unlock timestamp }
const animalBest = {};                                  // best score per animal (kept in memory, saved with the record)
ANIMALS.forEach((a) => { animalBest[a.id] = Number(store.get('dp-hi-' + a.id, '0')) || 0; });
const saveStats = () => { store.set('dp-stats', JSON.stringify(stats)); store.set('dp-ach', JSON.stringify(ach)); };
// val(): current progress; the achievement is earned when val() >= goal
const bestNow = () => Math.max(best, state === 'running' ? Math.floor(score) : 0);
const ACH = [
  { id: 'first', name: 'Primeros pasos', desc: 'Juega tu primera partida', goal: 1, val: () => stats.runs },
  { id: 'runs25', name: 'Constante', desc: 'Juega 25 partidas', goal: 25, val: () => stats.runs },
  { id: 'runs100', name: 'Veterano', desc: 'Juega 100 partidas', goal: 100, val: () => stats.runs },
  { id: 's500', name: 'Calentando', desc: '500 puntos en una partida', goal: 500, val: bestNow },
  { id: 's1400', name: 'Madrugador', desc: 'Sobrevive a una noche entera (1400)', goal: 1400, val: bestNow },
  { id: 's3000', name: 'Imparable', desc: '3000 puntos en una partida', goal: 3000, val: bestNow },
  { id: 's7000', name: 'Leyenda', desc: '7000 puntos en una partida', goal: 7000, val: bestNow },
  { id: 'jumps200', name: 'Saltarín', desc: 'Salta 200 veces', goal: 200, val: () => stats.jumps },
  { id: 'jumps2000', name: 'Resorte', desc: 'Salta 2000 veces', goal: 2000, val: () => stats.jumps },
  { id: 'dodge100', name: 'Esquivador', desc: 'Esquiva 100 obstáculos', goal: 100, val: () => stats.dodged },
  { id: 'birds30', name: 'Cazapájaros', desc: 'Esquiva 30 pájaros', goal: 30, val: () => stats.birds },
  { id: 'noduck', name: 'Pie plano', desc: '1000 puntos sin agacharte', goal: 1000, val: () => stats.noDuckBest },
  { id: 'double50', name: 'Rebote', desc: '50 dobles saltos con el gato', goal: 50, val: () => stats.doubles },
  { id: 'shield5', name: 'Escudo de hierro', desc: 'Salva 5 golpes con el perro', goal: 5, val: () => stats.shields },
  { id: 'glide20', name: 'Planeador', desc: 'Planea 20 segundos con la gallina', goal: 20, val: () => Math.floor(stats.glideSec) },
  { id: 'slide1000', name: 'Surfista', desc: '1000 puntos deslizando con el pingüino', goal: 1000, val: () => Math.floor(stats.slidePts) },
  { id: 'master', name: 'Maestro', desc: '1500 puntos con cada animal', goal: ANIMALS.length, val: () => ANIMALS.filter((a) => animalBest[a.id] >= 1500).length },
  { id: 'collector', name: 'Coleccionista', desc: 'Desbloquea los ' + ANIMALS.length + ' animales', goal: ANIMALS.length, val: () => ANIMALS.filter(unlocked).length },
  { id: 'podium', name: 'Podio', desc: 'Entra en el top 3 del ranking global', goal: 1, val: () => stats.podium },
  { id: 'weekwin', name: 'Campeón semanal', desc: 'Sé el número 1 del ranking semanal', goal: 1, val: () => stats.weekwin },
  { id: 'share', name: 'Embajador', desc: 'Comparte una puntuación', goal: 1, val: () => stats.shared },
];
let achQ = [], achShow = { text: '', t: 0 }, newAch = [], runDucked = false;
function checkAch(silent) {
  if (state === 'running' && !runDucked) stats.noDuckBest = Math.max(stats.noDuckBest, Math.floor(score));
  let got = false;
  for (const a of ACH) {
    if (!ach[a.id] && a.val() >= a.goal) {
      ach[a.id] = Date.now();
      got = true;
      if (!silent) { achQ.push(a.name); newAch.push(a.name); sfx.ach(); haptic([30, 50, 30]); }
    }
  }
  if (got) saveStats();
}

/* ---------- abilities: [name, how it works] ---------- */
const ABILITY = {
  dino: ['Clásico', 'Sin habilidad'],
  cat: ['Salto doble', 'Toca otra vez en el aire'],
  dog: ['Escudo', 'Sobrevive a un golpe'],
  bunny: ['Salto alto', 'Salta mucho más'],
  chick: ['Planeo', 'Mantén al caer para planear'],
  peng: ['Deslizar', 'Agachado: puntos x2'],
  frog: ['Supersalto', 'Espera un momento en el suelo y salta altísimo'],
  fox: ['Esquiva', 'Al levantarte, los pájaros no te tocan un instante'],
  turtle: ['Caparazón', 'Los pájaros no le hacen daño; va más despacio'],
};
const INVULN = 90;
const FROG_READY = 45;                                  // frames on the ground (~3/4 s) the frog needs before a super jump                                      // frames of invulnerability after the dog's shield breaks
