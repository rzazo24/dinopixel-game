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
    const weeks = L.recentWeekIds(3);                 // weekly boards live 14 days: the current week and the two before
    const cmds = [
      ...boards.map((x) => ['ZREM', L.boardKey(x), b.pid]),
      ...weeks.flatMap((id) => boards.map((x) => ['ZREM', L.weekKey(x, id), b.pid])),
      ['HDEL', 'dp:names', b.pid], ['HDEL', L.animalHashKey('all'), b.pid],
      ...weeks.map((id) => ['HDEL', L.animalHashKey('week', id), b.pid]),
    ];
    const r = await L.pipe(cmds);
    const zrems = boards.length * (1 + weeks.length);
    res.status(200).json({ ok: true, removed: r.slice(0, zrems).reduce((a, n) => a + n, 0) });
  } catch (e) {
    res.status(500).json({ error: 'server' });
  }
};
