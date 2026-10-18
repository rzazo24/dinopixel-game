'use strict';
const L = require('./_lib');

// POST { pid, nick }: validates a nickname; if the player is already on the board, renames them.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!L.configured()) return res.status(503).json({ error: 'unavailable' });
  try {
    const b = L.body(req);
    if (!L.PID_RE.test(b.pid)) return res.status(400).json({ error: 'invalid' });
    const nick = L.cleanNick(b.nick);
    if (!nick) return res.status(400).json({ error: 'nick' });
    if (L.isBanned(nick)) return res.status(400).json({ error: 'banned' });
    if (!(await L.rateLimit('dp:rl:name:' + L.ipHash(req), 60, 3600))) return res.status(429).json({ error: 'rate' });
    const onBoard = (await L.cmd('ZSCORE', L.boardKey('all'), b.pid)) !== null;
    if (onBoard) await L.cmd('HSET', 'dp:names', b.pid, nick);
    res.status(200).json({ ok: true, nick, saved: onBoard });
  } catch (e) {
    res.status(500).json({ error: 'server' });
  }
};
