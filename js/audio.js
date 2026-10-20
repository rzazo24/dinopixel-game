// DinoPixel - efectos de sonido, música chiptune y vibración.
// Classic script: shares the page's global scope with the other js/ files, loaded in order by index.html.
'use strict';

/* ---------- audio ---------- */
let audio = null, master = null, muted = store.get('dp-muted', '0') === '1';
function getAudio() {
  try {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      master = audio.createGain();                      // master volume: music and effects both go through it
      master.gain.value = vol * vol;
      master.connect(audio.destination);
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  } catch { return null; }                              // audio unavailable
}
function beep(f0, f1, dur, type = 'square', level = 0.08, force = false) {
  if (muted && !force) return;
  try {
    if (!getAudio()) return;
    const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur);
  } catch { /* audio unavailable */ }
}
const sfx = {
  coin: () => { beep(1319, 1319, 0.05, 'square', 0.045); setTimeout(() => beep(1760, 1760, 0.08, 'square', 0.045), 50); },
  power: () => [523, 784, 1047, 1568].forEach((f, i) => setTimeout(() => beep(f, f, 0.08, 'square', 0.06), i * 60)),
  jump: () => beep(300, 650, 0.12),
  die: () => beep(260, 40, 0.4, 'sawtooth', 0.1),
  // every 500 points: a soft two-note tick (the score blinks every 100 points, silently)
  mile: () => { beep(880, 880, 0.05, 'square', 0.04); setTimeout(() => beep(1175, 1175, 0.07, 'square', 0.04), 70); },
  // achievement: a quick rising arpeggio
  ach: () => [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, f, 0.1, 'square', 0.06), i * 85)),
  // new animal unlocked: a short fanfare ending on a long high note
  unlock: () => [[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.3]].forEach(([f, d], i) => setTimeout(() => beep(f, f, d, 'square', 0.07), i * 95)),
};

/* ---------- music: procedural chiptune generated live (square lead, triangle bass, noise hats, sine kick) ---------- */
// Day = C major pentatonic, Am-F-C-G feel replaced by C-Am-F-G; night = A minor, a bit slower and mellower.
// Tempo follows the game speed (and the speed setting); hats and kick join in as the run gets faster.
const music = { on: store.get('dp-music', '1') === '1', playing: false, timer: null, gain: null, noise: null, nextT: 0, step: 0, theme: 'day', zone: 'desert', bpm: 0, notes: 0, lastLead: '' };
const MUSIC_VOL = 1.2;                                   // music bus level: top-speed peaks stay around 0.4 (clipping starts at 1.0)
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const PENT_MAJ = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21], PENT_MIN = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22];
const MAJ = [0, 4, 7], MIN = [0, 3, 7];
// One song per zone, each with a day and a night version.
//   base/scale: melody key; chords: [root, tones] per bar; lead/arp: [waveform, volume(, octave shift)];
//   bass: 'long' (held notes) or 'pump' (octave eighths); drums: 'build' (joins in with speed), 'soft' or 'city'.
const SONGS = {
  desert: {
    day: { base: 60, scale: PENT_MAJ, chords: [[48, MAJ], [45, MIN], [41, MAJ], [43, MAJ]], lead: ['square', 0.05], arp: ['square', 0.02, 12], bass: 'long', drums: 'build', tempo: 1 },
    night: { base: 57, scale: PENT_MIN, chords: [[45, MIN], [41, MAJ], [48, MAJ], [43, MAJ]], lead: ['triangle', 0.1], arp: ['square', 0.02, 12], bass: 'long', drums: 'build', tempo: 0.88 },
  },
  snow: {                                                // calm, bell-like, sparkly; no kick
    day: { base: 65, scale: PENT_MAJ, chords: [[41, MAJ], [48, MAJ], [50, MIN], [46, MAJ]], lead: ['triangle', 0.1], arp: ['sine', 0.03, 24], bass: 'long', drums: 'soft', tempo: 0.92, sparse: true },
    night: { base: 62, scale: PENT_MIN, chords: [[50, MIN], [46, MAJ], [41, MAJ], [48, MAJ]], lead: ['triangle', 0.1], arp: ['sine', 0.03, 24], bass: 'long', drums: 'soft', tempo: 0.8, sparse: true },
  },
  jungle: {                                              // bouncy and warm: marimba-like sine lead, tom-ish drums that build
    day: { base: 62, scale: PENT_MAJ, chords: [[43, MAJ], [48, MAJ], [45, MIN], [50, MAJ]], lead: ['sine', 0.12], arp: ['triangle', 0.03, 12], bass: 'pump', drums: 'build', tempo: 1.02 },
    night: { base: 59, scale: PENT_MIN, chords: [[47, MIN], [43, MAJ], [45, MIN], [42, MAJ]], lead: ['sine', 0.12], arp: ['triangle', 0.03, 12], bass: 'long', drums: 'build', tempo: 0.9 },
  },
  volcano: {                                             // dark and heavy: low minor, sawtooth, pounding kick
    day: { base: 57, scale: PENT_MIN, chords: [[38, MIN], [41, MAJ], [36, MAJ], [43, MAJ]], lead: ['sawtooth', 0.035], arp: ['square', 0.016, 0], bass: 'pump', drums: 'city', tempo: 1.12 },
    night: { base: 55, scale: PENT_MIN, chords: [[36, MIN], [39, MAJ], [34, MAJ], [41, MAJ]], lead: ['sawtooth', 0.035], arp: ['square', 0.016, 0], bass: 'pump', drums: 'city', tempo: 1.05 },
  },
  city: {                                                // driving: pumping bass, four-on-the-floor, offbeat hats
    day: { base: 64, scale: PENT_MIN, chords: [[40, MIN], [45, MAJ], [40, MIN], [50, MAJ]], lead: ['sawtooth', 0.03], arp: ['square', 0.016, 12], bass: 'pump', drums: 'city', tempo: 1.08 },
    night: { base: 60, scale: PENT_MIN, chords: [[48, MIN], [44, MAJ], [51, MAJ], [46, MAJ]], lead: ['square', 0.045], arp: ['square', 0.016, 12], bass: 'pump', drums: 'city', tempo: 1 },
  },
};
const curSong = () => SONGS[music.zone][music.theme];
const MEL = [                                            // 16 steps per bar; numbers index PENT, -1 is a rest
  [4, -1, 5, -1, 4, -1, 2, -1, 3, -1, 2, -1, 0, -1, -1, -1],
  [2, -1, 4, -1, 5, -1, 6, -1, 5, -1, 4, -1, 2, -1, -1, 2],
  [0, -1, 2, -1, 4, 4, -1, 2, 3, -1, 2, -1, 1, -1, 0, -1],
  [5, -1, -1, 6, 5, -1, 4, -1, 2, -1, 4, -1, 2, -1, -1, -1],
  [4, -1, 4, 5, 6, -1, 5, 4, 2, -1, 3, -1, 2, -1, -1, -1],
  [6, -1, 5, -1, 4, -1, 2, -1, 4, -1, 5, -1, 7, -1, -1, -1],
  [0, 2, 4, 2, 0, 2, 4, 2, 3, 5, 7, 5, 3, 2, 1, -1],
  [2, -1, -1, 2, 4, -1, 2, -1, 1, -1, 2, -1, 0, -1, -1, -1],
];
const MEL_SEQ = [0, 1, 2, 3, 4, 1, 6, 3, 0, 5, 2, 7, 4, 1, 6, 5];   // 16 bars, then it loops
function mTone(a, type, freq, t, dur, vol) {
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(music.gain); o.start(t); o.stop(t + dur + 0.02);
  music.notes++;
}
function mHat(a, t, vol) {
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = music.noise; f.type = 'highpass'; f.frequency.value = 7000;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  src.connect(f).connect(g).connect(music.gain); src.start(t); src.stop(t + 0.06);
  music.notes++;
}
function mClap(a, t) {
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = music.noise; f.type = 'bandpass'; f.frequency.value = 1500;
  g.gain.setValueAtTime(0.09, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  src.connect(f).connect(g).connect(music.gain); src.start(t); src.stop(t + 0.13);
  music.notes++;
}
function mKick(a, t) {
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g).connect(music.gain); o.start(t); o.stop(t + 0.18);
  music.notes++;
}
function musicStep(a, step, t, d) {
  const s = step % 16, bar = Math.floor(step / 16);
  if (s === 0) {                                                     // day/night and zone change on a bar line
    music.theme = night > 0.5 ? 'night' : 'day';
    music.zone = BIOMES[biome].id;
  }
  const song = curSong(), [root, tones] = song.chords[bar % 4];
  const sp = Math.max(START_SPEED, speed || START_SPEED);
  const mel = MEL[MEL_SEQ[bar % MEL_SEQ.length]][s];
  if (mel >= 0 && !(song.sparse && s % 2)) {                         // sparse songs: only the notes on the beat, held longer
    mTone(a, song.lead[0], midi(song.base + song.scale[mel]), t, d * (song.sparse ? 3 : 1.7), song.lead[1]);
    music.lastLead = song.lead[0];
  }
  mTone(a, song.arp[0], midi(root + song.arp[2] + tones[[0, 1, 2, 1][s % 4]]), t, d * 0.8, song.arp[1]);   // chord arpeggio
  if (song.bass === 'pump') {                                       // octave eighths
    if (s % 2 === 0) mTone(a, 'triangle', midi(root - 12 + (s % 4 === 2 ? 12 : 0)), t, d * 1.2, 0.09);
  } else if (s === 0 || s === 8) mTone(a, 'triangle', midi(root - 12), t, d * 6, 0.11);
  else if (s === 12) mTone(a, 'triangle', midi(root - 5), t, d * 2.4, 0.09);
  else if (sp > 9 && (s === 4 || s === 10)) mTone(a, 'triangle', midi(root), t, d * 1.6, 0.07);
  if (song.drums === 'build') {                                     // hats and kick join in as you speed up
    if (sp > 7 && s % 4 === 2) mHat(a, t, 0.03);
    if (sp > 10 && s % 4 === 0) mHat(a, t, 0.02);
    if (sp > 9 && (s === 0 || s === 8)) mKick(a, t);
    if (sp > 11 && (s === 4 || s === 12)) mKick(a, t);
  } else if (song.drums === 'soft') {
    if (sp > 7 && s % 8 === 4) mHat(a, t, 0.02);
  } else {                                                          // city
    if (s % 4 === 0) mKick(a, t);
    if (s % 4 === 2) mHat(a, t, 0.03);
    if (sp > 9 && (s === 4 || s === 12)) mClap(a, t);
  }
}
function musicTick() {
  const a = audio;
  if (!a || !music.playing) return;
  while (music.nextT < a.currentTime + 0.18) {              // schedule a little ahead of the clock for tight timing
    const sp = Math.min(MAX_SPEED, Math.max(START_SPEED, speed || START_SPEED));
    music.bpm = (116 + ((sp - START_SPEED) / (MAX_SPEED - START_SPEED)) * 52) * simPace() * curSong().tempo;
    const d = 60 / music.bpm / 4;
    musicStep(a, music.step, music.nextT, d);
    music.nextT += d; music.step++;
  }
}
function startMusic(fromStart) {
  if (!music.on || music.playing) return;
  const a = getAudio();
  if (!a) return;
  if (!music.gain) { music.gain = a.createGain(); music.gain.connect(master); }
  if (!music.noise) {
    music.noise = a.createBuffer(1, Math.floor(a.sampleRate * 0.1), a.sampleRate);
    const ch = music.noise.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  const g = music.gain.gain;
  g.cancelScheduledValues(a.currentTime); g.setValueAtTime(0.0001, a.currentTime); g.linearRampToValueAtTime(MUSIC_VOL, a.currentTime + 0.15);
  if (fromStart) { music.step = 0; music.theme = night > 0.5 ? 'night' : 'day'; music.zone = BIOMES[biome].id; }
  music.nextT = a.currentTime + 0.06;
  music.playing = true;
  clearInterval(music.timer);
  music.timer = setInterval(musicTick, 30);
}
function stopMusic(fade = 0.25) {
  if (!music.playing) return;
  music.playing = false;
  clearInterval(music.timer); music.timer = null;
  if (audio && music.gain) {
    const g = music.gain.gain;
    g.cancelScheduledValues(audio.currentTime); g.setValueAtTime(g.value, audio.currentTime); g.linearRampToValueAtTime(0.0001, audio.currentTime + fade);
  }
}

/* ---------- haptics ---------- */
// Android: the Vibration API. iOS has none, but since iOS 18 Safari gives a haptic tick when an
// <input type="checkbox" switch> is toggled through its label, so each "on" step of a pattern becomes one tick.
const hasVibrate = typeof navigator.vibrate === 'function';
const iosSwitch = !hasVibrate && 'switch' in HTMLInputElement.prototype;
const canVibrate = hasVibrate || iosSwitch;
let vibeOn = store.get('dp-vibe', '1') === '1';
let tickLabel = null;
function iosTick() {
  if (!tickLabel) {
    tickLabel = document.createElement('label');
    tickLabel.setAttribute('aria-hidden', 'true');
    tickLabel.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    const box = document.createElement('input');
    box.type = 'checkbox'; box.setAttribute('switch', ''); box.tabIndex = -1;
    tickLabel.appendChild(box);
    document.body.appendChild(tickLabel);
  }
  tickLabel.click();
}
function iosPattern(pattern) {                          // [on, off, on, ...] in ms -> one tick at the start of each "on"
  const steps = Array.isArray(pattern) ? pattern : [pattern];
  let t = 0;
  steps.forEach((ms, i) => { if (i % 2 === 0) { if (t === 0) iosTick(); else setTimeout(iosTick, t); } t += ms; });
}
const haptic = (pattern) => {
  if (!vibeOn) return;
  try { if (hasVibrate) navigator.vibrate(pattern); else if (iosSwitch) iosPattern(pattern); } catch { /* ignore */ }
};
