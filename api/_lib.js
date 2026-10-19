'use strict';
// Shared helpers for the ranking API (Vercel Functions, no dependencies).
// Storage: Upstash Redis through its REST API (connect it from Vercel -> Storage; it sets these env vars).
const crypto = require('crypto');

const ANIMALS = ['dino', 'cat', 'dog', 'bunny', 'chick', 'peng', 'frog', 'fox', 'turtle'];
const PID_RE = /^[a-f0-9]{32}$/;
const TOP = 20;
const MAX_SCORE = 999999;
// Anti-cheat: no animal can earn more than this many points per second (penguin sliding at top speed is ~190).
const MAX_RATE = 230;                                   // coins (+10 each) add short bursts on top
const SLACK = 100;
const TOKEN_TTL_MS = 24 * 3600 * 1000;

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const configured = () => !!(REST_URL && REST_TOKEN);

async function rest(path, body) {
  const r = await fetch(REST_URL.replace(/\/$/, '') + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error('redis ' + r.status);
  return data;
}
async function cmd(...c) {
  const d = await rest('', c);
  if (d.error) throw new Error(d.error);
  return d.result;
}
async function pipe(cmds) {
  const d = await rest('/pipeline', cmds);
  return d.map((x) => { if (x.error) throw new Error(x.error); return x.result; });
}

/* ---- signed run tokens: stateless, issued when a run starts ---- */
const secret = () => crypto.createHash('sha256').update('dinopixel:' + (process.env.SCORE_SECRET || REST_TOKEN || '')).digest();
const sign = (s) => crypto.createHmac('sha256', secret()).update(s).digest('hex').slice(0, 32);
function newToken() {
  const ts = Date.now(), nonce = crypto.randomBytes(8).toString('hex');
  return `${ts}.${nonce}.${sign(ts + '.' + nonce)}`;
}
function verifyToken(tok) {
  if (typeof tok !== 'string') return null;
  const [ts, nonce, sig] = tok.split('.');
  if (!/^\d{13}$/.test(ts || '') || !/^[a-f0-9]{16}$/.test(nonce || '') || !/^[a-f0-9]{32}$/.test(sig || '')) return null;
  const want = sign(ts + '.' + nonce);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  const age = Date.now() - Number(ts);
  if (age < -5000 || age > TOKEN_TTL_MS) return null;
  return { ts: Number(ts), nonce };
}

/* ---- nicknames ---- */
const BANNED = ['puta', 'puto', 'mierda', 'joder', 'cabron', 'pendejo', 'gilipollas', 'verga', 'follar', 'fuck',
  'shit', 'bitch', 'nigger', 'nigga', 'faggot', 'cunt', 'nazi', 'hitler', 'porn'];
function cleanNick(raw) {
  if (typeof raw !== 'string') return null;
  const n = raw.normalize('NFC').replace(/\s+/g, ' ').trim().toUpperCase();   // nicknames are always stored in capitals
  const len = [...n].length;
  if (len < 1 || len > 10) return null;
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(n)) return null;
  return n;
}
function isBanned(n) {
  const s = n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
    .replace(/[^a-z]/g, '');
  return BANNED.some((w) => s.includes(w));
}

/* ---- misc ---- */
function ipHash(req) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || 'x';
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);   // never store the raw IP
}
async function rateLimit(key, limit, windowSec) {
  const [n] = await pipe([['INCR', key]]);
  if (n === 1) await cmd('EXPIRE', key, windowSec);
  return n <= limit;
}
function body(req) {
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body || {};
}
const boardKey = (b) => 'dp:lb:' + b;

/* ---- weekly boards: a new set of boards every Monday 00:00 UTC, kept 14 days so old weeks vanish on their own ---- */
const WEEK_MS = 7 * 24 * 3600 * 1000;
const WEEK_TTL = 14 * 24 * 3600;
function weekInfo(now = Date.now()) {
  const d = new Date(now);
  const day = (d.getUTCDay() + 6) % 7;                              // Monday = 0
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
  return { id: new Date(start).toISOString().slice(0, 10), start, end: start + WEEK_MS };
}
const weekKey = (board, id) => `dp:wk:${id}:${board}`;
// which animal set each score on the global boards (so rows can show an icon)
const animalHashKey = (period, id) => (period === 'week' ? `dp:ba:wk:${id}` : 'dp:ba:all');
const recentWeekIds = (n = 3, now = Date.now()) => Array.from({ length: n }, (_, i) => weekInfo(now - i * WEEK_MS).id);
const validBoard = (b) => b === 'all' || ANIMALS.includes(b);

module.exports = {
  ANIMALS, PID_RE, TOP, MAX_SCORE, MAX_RATE, SLACK,
  WEEK_TTL, weekInfo, weekKey, animalHashKey, recentWeekIds,
  configured, cmd, pipe, newToken, verifyToken, cleanNick, isBanned, ipHash, rateLimit, body, boardKey, validBoard,
};
