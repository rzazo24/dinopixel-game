// DinoPixel - desbloqueos, logros y habilidades.
// Classic script: shares the page's global scope with the other js/ files, loaded in order by index.html.
'use strict';

/* ---------- unlocks: animals open up as your best score grows ---------- */
// Best score needed per animal. Points come at ~43/s at the start and approach ~94/s as the speed ramps up,
// so a new animal every 1000 points: 1000 is ~22 s of perfect play and 8000 about 2 min 15 s without a mistake.
const UNLOCK = { dino: 0, cat: 1000, dog: 2000, bunny: 3000, chick: 4000, peng: 5000, frog: 6000, fox: 7000, turtle: 8000 };
ANIMALS.forEach((a) => { a.unlock = UNLOCK[a.id] || 0; });
let best = Number(store.get('dp-best', '0')) || 0;      // best score reached with any animal
const jsonList = (k) => { try { const v = JSON.parse(store.get(k, '[]')); return Array.isArray(v) ? v : []; } catch { return []; } };
const bought = jsonList('dp-bought');                   // animals unlocked early with coins
const ownedSkins = jsonList('dp-skins');                // colour skins bought (they work on every animal)
const unlocked = (a) => best >= a.unlock || bought.includes(a.id);
const skinSel = {};                                     // chosen skin per animal
ANIMALS.forEach((a) => { skinSel[a.id] = store.get('dp-skin-' + a.id, 'base'); });
const skinOf = (id) => skinSel[id] || 'base';
const ownedHats = jsonList('dp-hats');                  // hats bought (they work on every animal)
const hatSel = {};                                      // chosen hat per animal
ANIMALS.forEach((a) => { hatSel[a.id] = store.get('dp-hat-' + a.id, 'none'); });
const hatOf = (id) => hatSel[id] || 'none';
const ownedGear = jsonList('dp-gear');                  // gear bought (it works on every animal)
const gearSel = {};                                     // chosen gear per animal
ANIMALS.forEach((a) => { gearSel[a.id] = store.get('dp-gear-' + a.id, 'none'); });
const gearOf = (id) => (GEAR.some((g) => g.id === gearSel[id]) ? gearSel[id] : 'none');
const lookOf = (a) => dressedLooks(a, skinOf(a.id), hatOf(a.id), gearOf(a.id));   // skin + hat + gear, for the game and the menus

/* ---------- achievements ---------- */
const jsonStore = (k, d) => { try { return Object.assign(d, JSON.parse(store.get(k, '{}'))); } catch { return d; } };
const stats = jsonStore('dp-stats', { runs: 0, jumps: 0, dodged: 0, birds: 0, doubles: 0, shields: 0, glideSec: 0, slidePts: 0, longestRun: 0, podium: 0, weekwin: 0, shared: 0, coins: 0, spent: 0, timeSec: 0, bonus: 0, dailyDone: 0, dailyStreak: 0, dailyLast: '', candy: 0 });
const balance = () => stats.coins + stats.bonus - stats.spent;   // spendable: collected + challenge prizes - spent (achievements only count collected)
const ach = jsonStore('dp-ach', {});                    // { id: unlock timestamp }
const animalBest = {};                                  // best score per animal (kept in memory, saved with the record)
ANIMALS.forEach((a) => { animalBest[a.id] = Number(store.get('dp-hi-' + a.id, '0')) || 0; });
const persist = { on: true };                           // turned off while a cloud save is being restored (so nothing overwrites it)
const saveStats = () => { if (!persist.on) return; store.set('dp-stats', JSON.stringify(stats)); store.set('dp-ach', JSON.stringify(ach)); };
// val(): current progress; the achievement is earned when val() >= goal
const bestNow = () => Math.max(best, state === 'running' ? Math.floor(score) : 0);
const ACH = [
  { id: 'first', name: L('Primeros pasos', 'First steps'), desc: L('Juega tu primera partida', 'Play your first run'), goal: 1, val: () => stats.runs },
  { id: 'runs25', name: L('Constante', 'Regular'), desc: L('Juega 25 partidas', 'Play 25 runs'), goal: 25, val: () => stats.runs },
  { id: 'runs100', name: L('Veterano', 'Veteran'), desc: L('Juega 100 partidas', 'Play 100 runs'), goal: 100, val: () => stats.runs },
  { id: 's500', name: L('Calentando', 'Warming up'), desc: L('500 puntos en una partida', '500 points in one run'), goal: 500, val: bestNow },
  { id: 's1400', name: L('Madrugador', 'Early bird'), desc: L('Sobrevive a una noche entera (1400)', 'Survive a whole night (1400)'), goal: 1400, val: bestNow },
  { id: 's3000', name: L('Imparable', 'Unstoppable'), desc: L('3000 puntos en una partida', '3000 points in one run'), goal: 3000, val: bestNow },
  { id: 's7000', name: L('Leyenda', 'Legend'), desc: L('7000 puntos en una partida', '7000 points in one run'), goal: 7000, val: bestNow },
  { id: 'jumps200', name: L('Saltarín', 'Hopper'), desc: L('Salta 200 veces', 'Jump 200 times'), goal: 200, val: () => stats.jumps },
  { id: 'jumps2000', name: L('Resorte', 'Spring'), desc: L('Salta 2000 veces', 'Jump 2000 times'), goal: 2000, val: () => stats.jumps },
  { id: 'dodge100', name: L('Esquivador', 'Dodger'), desc: L('Esquiva 100 obstáculos', 'Dodge 100 obstacles'), goal: 100, val: () => stats.dodged },
  { id: 'birds30', name: L('Cazapájaros', 'Bird watcher'), desc: L('Esquiva 30 pájaros', 'Dodge 30 birds'), goal: 30, val: () => stats.birds },
  { id: 'coins100', name: L('Hucha', 'Piggy bank'), desc: L('Recoge 100 monedas', 'Collect 100 coins'), goal: 100, val: () => stats.coins },
  { id: 'coins1000', name: L('Tesoro', 'Treasure'), desc: L('Recoge 1000 monedas', 'Collect 1000 coins'), goal: 1000, val: () => stats.coins },
  { id: 'marathon', name: L('Maratón', 'Marathon'), desc: L('Aguanta 2 minutos en una partida', 'Last 2 minutes in one run'), goal: 120, val: () => Math.floor(stats.longestRun || 0) },
  { id: 'double50', name: L('Rebote', 'Bounce'), desc: L('50 dobles saltos con el gato', '50 double jumps with the cat'), goal: 50, val: () => stats.doubles },
  { id: 'shield5', name: L('Escudo de hierro', 'Iron shield'), desc: L('Salva 5 golpes con el perro', 'Survive 5 hits with the dog'), goal: 5, val: () => stats.shields },
  { id: 'glide20', name: L('Planeador', 'Glider'), desc: L('Planea 20 segundos con la gallina', 'Glide 20 seconds with the chicken'), goal: 20, val: () => Math.floor(stats.glideSec) },
  { id: 'slide1000', name: L('Surfista', 'Surfer'), desc: L('1000 puntos extra con el pingüino', '1000 bonus points with the penguin'), goal: 1000, val: () => Math.floor(stats.slidePts) },
  { id: 'master', name: L('Maestro', 'Master'), desc: L('1500 puntos con cada animal', '1500 points with every animal'), goal: ANIMALS.length, val: () => ANIMALS.filter((a) => animalBest[a.id] >= 1500).length },
  { id: 'collector', name: L('Coleccionista', 'Collector'), desc: L('Desbloquea los ' + ANIMALS.length + ' animales', 'Unlock all ' + ANIMALS.length + ' animals'), goal: ANIMALS.length, val: () => ANIMALS.filter(unlocked).length },
  { id: 'podium', name: L('Podio', 'Podium'), desc: L('Entra en el top 3 del ranking global', 'Reach the top 3 of the global ranking'), goal: 1, val: () => stats.podium },
  { id: 'weekwin', name: L('Campeón semanal', 'Weekly champion'), desc: L('Sé el número 1 del ranking semanal', 'Be number 1 in the weekly ranking'), goal: 1, val: () => stats.weekwin },
  { id: 'share', name: L('Embajador', 'Ambassador'), desc: L('Comparte una puntuación', 'Share a score'), goal: 1, val: () => stats.shared },
  { id: 'halloween', name: L('Truco o trato', 'Trick or treat'), desc: L('Recoge 100 caramelos en Halloween', 'Collect 100 candies at Halloween'), goal: 100, val: () => stats.candy },
  { id: 'daily7', name: L('Constancia', 'Dedication'), desc: L('Completa 7 retos diarios', 'Complete 7 daily challenges'), goal: 7, val: () => stats.dailyDone },
];
let achQ = [], achShow = { text: '', t: 0 }, newAch = [];
function checkAch(silent) {
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
  dino: L(['Clásico', 'Sin habilidad'], ['Classic', 'No ability']),
  cat: L(['Salto doble', 'Toca otra vez en el aire'], ['Double jump', 'Tap again in the air']),
  dog: L(['Escudo', 'Sobrevive a un golpe'], ['Shield', 'Survives one hit']),
  bunny: L(['Salto alto', 'Salta mucho más'], ['High jump', 'Jumps much higher']),
  chick: L(['Planeo', 'Mantén al caer para planear'], ['Glide', 'Hold while falling to glide']),
  peng: L(['Patinador', 'Suma un 50% más de puntos'], ['Skater', 'Scores 50% more points']),
  frog: L(['Supersalto', 'Espera un momento en el suelo y salta altísimo'], ['Super jump', 'Wait a moment on the ground and jump sky-high']),
  fox: L(['Esquiva', 'El primer pájaro que le toca lo atraviesa; se recarga en 8 s'], ['Dodge', 'Passes through the first bird that hits it; recharges in 8 s']),
  turtle: L(['Caparazón', 'Los pájaros no le hacen daño'], ['Shell', 'Birds can\'t hurt it']),
};
const INVULN = 90;
const FROG_READY = 45;                                  // frames on the ground (~3/4 s) the frog needs before a super jump                                      // frames of invulnerability after the dog's shield breaks
