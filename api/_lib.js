'use strict';
// Shared helpers for the ranking API (Vercel Functions, no dependencies).
// Storage: Upstash Redis through its REST API (connect it from Vercel -> Storage; it sets these env vars).
const crypto = require('crypto');

const ANIMALS = ['dino', 'cat', 'dog', 'bunny', 'chick', 'peng'];
const PID_RE = /^[a-f0-9]{32}$/;
const TOP = 20;
const MAX_SCORE = 999999;
// Anti-cheat: no animal can earn more than this many points per second (penguin sliding at top speed is ~190).
const MAX_RATE = 190;
const SLACK = 60;
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
  const n = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
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
const validBoard = (b) => b === 'all' || ANIMALS.includes(b);

module.exports = {
  ANIMALS, PID_RE, TOP, MAX_SCORE, MAX_RATE, SLACK,
  configured, cmd, pipe, newToken, verifyToken, cleanNick, isBanned, ipHash, rateLimit, body, boardKey, validBoard,
};
