// DinoPixel - reto diario: un objetivo por día (mismo todo el día, renovado a medianoche), con premio en monedas y racha.
// Classic script: shares the page's global scope with the other js/ files, loaded in order by index.html.
'use strict';

/* ---------- daily challenge ---------- */
// Five kinds, always within a single run. The day's challenge is picked from a seed made of the date,
// then stored, so it stays the same all day even if you unlock animals meanwhile.
const DAILY_TYPES = ['animal', 'coins', 'birds', 'dodge', 'time'];
const DAILY_REWARD = { animal: 60, coins: 50, birds: 60, dodge: 50, time: 70 };
const DAILY_STREAK_BONUS = 10, DAILY_STREAK_MAX = 5;   // +10 coins per day of streak, up to +50
const pad2 = (n) => String(n).padStart(2, '0');
const dateStr = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const todayStr = () => dateStr(new Date());
const yesterdayStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dateStr(d); };
function seeded(str) {                                 // small deterministic PRNG (FNV-1a hash + mulberry32)
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6D2B79F5) | 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeDaily(date, pool) {
  if (date.slice(5) === '10-31') return { date, type: 'coins', special: 'halloween', n: 31, animal: null, reward: 100, done: false, best: 0 };   // Halloween night
  if (date.slice(5) === '12-25') return { date, type: 'coins', special: 'christmas', n: 25, animal: null, reward: 100, done: false, best: 0 };   // Christmas day
  const r = seeded('dinopixel:' + date), pick = (arr) => arr[Math.floor(r() * arr.length)];
  const type = pick(DAILY_TYPES);
  const n = { animal: [800, 1000, 1200, 1500], coins: [15, 20, 25, 30], birds: [4, 6, 8], dodge: [20, 30, 40], time: [60, 90, 120] }[type];
  return { date, type, n: pick(n), animal: type === 'animal' ? pick(pool) : null, reward: DAILY_REWARD[type], done: false, best: 0 };
}
function dailyText(d) {
  if (d.special === 'halloween') return L('Truco o trato: recoge ' + d.n + ' caramelos en una partida', 'Trick or treat: collect ' + d.n + ' candies in one run');
  if (d.special === 'christmas') return L('Navidad: recoge ' + d.n + ' regalos en una partida', 'Christmas: collect ' + d.n + ' presents in one run');
  const a = d.animal && ANIMALS.find((x) => x.id === d.animal);
  return (LANG === 'en' ? {
    animal: 'Reach ' + d.n + ' points with the ' + (a ? a.name.toLowerCase() : 'dino'),
    coins: 'Collect ' + d.n + ' coins in one run',
    birds: 'Dodge ' + d.n + ' birds in one run',
    dodge: 'Dodge ' + d.n + ' obstacles in one run',
    time: 'Last ' + d.n + ' seconds in one run',
  } : {
    animal: 'Llega a ' + d.n + ' puntos con ' + (a ? a.name : 'el dino'),
    coins: 'Recoge ' + d.n + ' monedas en una partida',
    birds: 'Esquiva ' + d.n + ' pájaros en una partida',
    dodge: 'Esquiva ' + d.n + ' obstáculos en una partida',
    time: 'Aguanta ' + d.n + ' segundos en una partida',
  })[d.type];
}
function loadDaily() {
  let d = null;
  try { d = JSON.parse(store.get('dp-daily', 'null')); } catch { /* ignore */ }
  if (!d || d.date !== todayStr() || !DAILY_TYPES.includes(d.type)) {
    d = makeDaily(todayStr(), ANIMALS.filter(unlocked).map((a) => a.id));
    store.set('dp-daily', JSON.stringify(d));
  }
  return d;
}
let daily = loadDaily();
let dailyBase = { birds: 0, dodged: 0 }, dailyDoneRun = 0;
const saveDaily = () => store.set('dp-daily', JSON.stringify(daily));

// progress of the current run towards today's challenge
function dailyProgress() {
  switch (daily.type) {
    case 'animal': return animal.id === daily.animal ? Math.floor(score) : 0;
    case 'coins': return coinsRun;
    case 'birds': return stats.birds - dailyBase.birds;
    case 'dodge': return stats.dodged - dailyBase.dodged;
    default: return Math.floor(runTime);
  }
}
function dailyStart() {                                // called when a run starts
  if (daily.date !== todayStr()) daily = loadDaily();  // a new day began while the game was open
  dailyBase = { birds: stats.birds, dodged: stats.dodged };
  dailyDoneRun = 0;
}
function dailyCheck() {                                // called every frame while running
  if (daily.done || dailyProgress() < daily.n) return;
  daily.done = true;
  stats.dailyStreak = stats.dailyLast === yesterdayStr() ? stats.dailyStreak + 1 : 1;
  stats.dailyLast = daily.date;
  stats.dailyDone++;
  dailyDoneRun = daily.reward + Math.min(DAILY_STREAK_MAX, stats.dailyStreak - 1) * DAILY_STREAK_BONUS;
  stats.bonus += dailyDoneRun;
  daily.best = Math.max(daily.best, daily.n);
  saveDaily(); saveStats();
  banner = { text: L('Reto del día! +', 'Daily challenge! +') + dailyDoneRun, t: 220 };
  sfx.unlock(); haptic([40, 60, 40, 60, 90]);
  checkAch();
}
function dailyEnd() {                                  // called on game over: remember today's best attempt
  if (!daily.done) { daily.best = Math.max(daily.best, Math.min(daily.n, dailyProgress())); saveDaily(); }
}

/* ---------- weekly challenges ---------- */
// Three goals a week (Monday to Sunday), over all the runs of the week: progress = a stat now minus its value when the week began.
// Zen runs don't count (their stats are rolled back).
const WEEKLY_TYPES = {
  coins: { n: [250, 300, 400], reward: 300, text: (n) => L('Recoge ' + n + ' monedas', 'Collect ' + n + ' coins') },
  birds: { n: [30, 40, 50], reward: 300, text: (n) => L('Esquiva ' + n + ' pájaros', 'Dodge ' + n + ' birds') },
  dodged: { n: [300, 400, 500], reward: 300, text: (n) => L('Esquiva ' + n + ' obstáculos', 'Dodge ' + n + ' obstacles') },
  bosses: { n: [3, 4, 5], reward: 400, text: (n) => L('Supera ' + n + ' jefes de zona', 'Beat ' + n + ' zone bosses') },
  runs: { n: [15, 20, 25], reward: 300, text: (n) => L('Juega ' + n + ' partidas', 'Play ' + n + ' runs') },
  missions: { n: [6, 8, 10], reward: 400, text: (n) => L('Completa ' + n + ' misiones', 'Complete ' + n + ' missions') },
};
const weekStr = (d = new Date()) => { const m = new Date(d); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return dateStr(m); };   // the week's Monday
function makeWeekly(week) {
  const r = seeded('dinopixel-week:' + week), types = Object.keys(WEEKLY_TYPES), goals = [];
  while (goals.length < 3) {
    const k = types.splice(Math.floor(r() * types.length), 1)[0], w = WEEKLY_TYPES[k];
    goals.push({ k, n: w.n[Math.floor(r() * w.n.length)], reward: w.reward, done: false });
  }
  const base = {}; goals.forEach((g) => { base[g.k] = stats[g.k] || 0; });
  return { week, goals, base };
}
function loadWeekly() {
  let w = null;
  try { w = JSON.parse(store.get('dp-weekly', 'null')); } catch { /* ignore */ }
  if (!w || w.week !== weekStr() || !Array.isArray(w.goals)) { w = makeWeekly(weekStr()); store.set('dp-weekly', JSON.stringify(w)); }
  return w;
}
let weekly = loadWeekly();
const weeklyProgress = (g) => Math.max(0, Math.min(g.n, (stats[g.k] || 0) - (weekly.base[g.k] || 0)));
function weeklyCheck() {                               // every frame while running, and at game over (runs count then)
  if (weekly.week !== weekStr()) weekly = loadWeekly();   // a new week began while the game was open
  weekly.goals.forEach((g) => {
    if (g.done || weeklyProgress(g) < g.n) return;
    g.done = true; stats.bonus += g.reward; stats.weeklyDone = (stats.weeklyDone || 0) + 1;
    store.set('dp-weekly', JSON.stringify(weekly)); saveStats();
    banner = { text: L('Reto semanal! +', 'Weekly challenge! +') + g.reward, t: 220 };
    sfx.unlock(); haptic([40, 60, 40, 60, 90]);
  });
}

/* ---------- menu chip + detail screen ---------- */
const dailyEl = $('daily');
function untilMidnight() {
  const now = new Date(), next = new Date(now); next.setHours(24, 0, 0, 0);
  const m = Math.ceil((next - now) / 60000);
  return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
}
function showDaily() {
  if (daily.date !== todayStr()) daily = loadDaily();
  $('daily-chip').classList.toggle('done', daily.done);
  setIcon($('daily-chip').querySelector('i'), daily.done ? 'check' : 'target');
  $('daily-chip').setAttribute('aria-label', L('Reto del día: ', 'Daily challenge: ') + dailyText(daily) + (daily.done ? L(' (completado)', ' (done)') : ''));
}
function renderDaily() {
  const body = $('daily-body');
  body.replaceChildren();
  const p = (cls, text) => { const e = document.createElement('p'); e.className = cls; e.textContent = text; body.appendChild(e); return e; };
  const a = daily.animal && ANIMALS.find((x) => x.id === daily.animal);
  if (a) { const f = document.createElement('div'); f.className = 'face'; f.appendChild(spriteCanvas(lookOf(a).frames[0], 4)); body.appendChild(f); }
  p('goal', dailyText(daily));
  const streakNext = Math.min(DAILY_STREAK_MAX, (stats.dailyLast === yesterdayStr() ? stats.dailyStreak : 0)) * DAILY_STREAK_BONUS;
  if (daily.done) p('state ok', L('¡Completado! Vuelve mañana para el siguiente.', 'Done! Come back tomorrow for the next one.'));
  else {
    p('state', L('Tu mejor intento hoy: ', 'Your best try today: ') + daily.best + ' / ' + daily.n);
    p('reward', L('Premio: ', 'Prize: ') + (daily.reward + streakNext) + L(' monedas', ' coins') + (streakNext ? L(' (incluye +' + streakNext + ' por tu racha)', ' (includes +' + streakNext + ' for your streak)') : ''));
    if (a && !unlocked(a)) p('note', L('Necesitas tener a ' + a.name + ': desbloquéalo o cómpralo en la tienda.', 'You need the ' + a.name.toLowerCase() + ': unlock it or buy it in the shop.'));
  }
  p('note', L('Racha: ', 'Streak: ') + (stats.dailyStreak || 0) + (stats.dailyStreak === 1 ? L(' día', ' day') : L(' días', ' days')) + L(' - Retos completados: ', ' - Challenges done: ') + (stats.dailyDone || 0));
  p('note', L('Nuevo reto en ', 'New challenge in ') + untilMidnight());
  if (weekly.week !== weekStr()) weekly = loadWeekly();
  p('week-title', L('Retos de la semana', 'Weekly challenges'));
  weekly.goals.forEach((g) => {
    const e = p('week' + (g.done ? ' ok' : ''), WEEKLY_TYPES[g.k].text(g.n) + ': ' + (g.done ? L('¡hecho!', 'done!') : weeklyProgress(g) + ' / ' + g.n + ' - ' + g.reward + L(' monedas', ' coins')));
    const bar = document.createElement('span'); bar.className = 'bar'; bar.style.setProperty('--p', (weeklyProgress(g) / g.n * 100) + '%'); e.appendChild(bar);
  });
  const left = Math.ceil((new Date(weekly.week + 'T00:00').getTime() + 7 * 864e5 - Date.now()) / 864e5);
  p('note', L('Nuevos retos semanales en ', 'New weekly challenges in ') + left + (left === 1 ? L(' día', ' day') : L(' días', ' days')));
}
function openDaily() { renderDaily(); dailyEl.hidden = false; $('daily-close').focus(); }
function closeDaily() { dailyEl.hidden = true; $('daily-chip').focus(); }
$('daily-chip').addEventListener('click', openDaily);
$('daily-chip').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDaily(); } });
$('daily-close').addEventListener('click', closeDaily);
