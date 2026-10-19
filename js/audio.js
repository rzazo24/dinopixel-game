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
const music = { on: store.get('dp-music', '1') === '1', playing: false, timer: null, gain: null, noise: null, nextT: 0, step: 0, theme: 'day', bpm: 0, notes: 0 };
const MUSIC_VOL = 1.2;                                   // music bus level: top-speed peaks stay around 0.4 (clipping starts at 1.0)
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const PENT = { day: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21], night: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22] };
const BASE_NOTE = { day: 60, night: 57 };
const CHORDS = {                                         // [root, chord tones]
  day: [[48, [0, 4, 7]], [45, [0, 3, 7]], [41, [0, 4, 7]], [43, [0, 4, 7]]],
  night: [[45, [0, 3, 7]], [41, [0, 4, 7]], [48, [0, 4, 7]], [43, [0, 4, 7]]],
};
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
function mKick(a, t) {
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g).connect(music.gain); o.start(t); o.stop(t + 0.18);
  music.notes++;
}
function musicStep(a, step, t, d) {
  const s = step % 16, bar = Math.floor(step / 16);
  if (s === 0) music.theme = night > 0.5 ? 'night' : 'day';      // the theme changes on a bar line
  const th = music.theme, [root, tones] = CHORDS[th][bar % 4];
  const sp = Math.max(START_SPEED, speed || START_SPEED);
  const mel = MEL[MEL_SEQ[bar % MEL_SEQ.length]][s];
  if (mel >= 0) mTone(a, th === 'night' ? 'triangle' : 'square', midi(BASE_NOTE[th] + PENT[th][mel]), t, d * 1.7, th === 'night' ? 0.1 : 0.05);
  mTone(a, 'square', midi(root + 12 + tones[[0, 1, 2, 1][s % 4]]), t, d * 0.8, 0.02);          // chord arpeggio
  if (s === 0 || s === 8) mTone(a, 'triangle', midi(root - 12), t, d * 6, 0.11);                // bass
  else if (s === 12) mTone(a, 'triangle', midi(root - 5), t, d * 2.4, 0.09);
  else if (sp > 9 && (s === 4 || s === 10)) mTone(a, 'triangle', midi(root), t, d * 1.6, 0.07);
  if (sp > 7 && s % 4 === 2) mHat(a, t, 0.03);                                                   // hats join in as you speed up
  if (sp > 10 && s % 4 === 0) mHat(a, t, 0.02);
  if (sp > 9 && (s === 0 || s === 8)) mKick(a, t);
  if (sp > 11 && (s === 4 || s === 12)) mKick(a, t);
}
function musicTick() {
  const a = audio;
  if (!a || !music.playing) return;
  while (music.nextT < a.currentTime + 0.18) {              // schedule a little ahead of the clock for tight timing
    const sp = Math.min(MAX_SPEED, Math.max(START_SPEED, speed || START_SPEED));
    music.bpm = (116 + ((sp - START_SPEED) / (MAX_SPEED - START_SPEED)) * 52) * simPace() * (music.theme === 'night' ? 0.88 : 1);
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
  if (fromStart) { music.step = 0; music.theme = night > 0.5 ? 'night' : 'day'; }
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

/* ---------- haptics (Android; iOS has no web vibration API) ---------- */
const canVibrate = typeof navigator.vibrate === 'function';
let vibeOn = store.get('dp-vibe', '1') === '1';
const haptic = (pattern) => { if (canVibrate && vibeOn) { try { navigator.vibrate(pattern); } catch { /* ignore */ } } };
