'use strict';
const L = require('./_lib');

// POST { pid }: removes the player (nickname + score) from every board. The random pid is the proof of ownership.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!L.configured()) return res.status(503).json({ error: 'unavailable' });
  try {
    const b = L.body(req);
    if (!L.PID_RE.test(b.pid)) return res.status(400).json({ error: 'invalid' });
    if (!(await L.rateLimit('dp:rl:del:' + L.ipHash(req), 30, 3600))) return res.status(429).json({ error: 'rate' });
    const boards = ['all', ...L.ANIMALS];
    const r = await L.pipe([...boards.map((x) => ['ZREM', L.boardKey(x), b.pid]), ['HDEL', 'dp:names', b.pid]]);
    res.status(200).json({ ok: true, removed: r.slice(0, boards.length).reduce((a, n) => a + n, 0) });
  } catch (e) {
    res.status(500).json({ error: 'server' });
  }
};
