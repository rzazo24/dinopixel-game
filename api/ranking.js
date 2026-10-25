'use strict';
const L = require('./_lib');

// GET /api/ranking?board=all|dino|cat|...&period=week|all&pid=<optional, to mark/locate the player>
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
  if (!L.configured()) { res.setHeader('Cache-Control', 'no-store'); return res.status(503).json({ error: 'unavailable' }); }
  try {
    const q = req.query || {};
    const board = String(q.board || 'all');
    const period = q.period === 'week' ? 'week' : 'all';
    if (!L.validBoard(board)) return res.status(400).json({ error: 'board' });
    const pid = L.PID_RE.test(q.pid || '') ? q.pid : null;
    // requests with a pid skip the CDN cache and hit Redis: cap them per IP so nobody can run up the bill
    if (pid && !(await L.rateLimit('dp:rl:rk:' + L.ipHash(req), 300, 3600))) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(429).json({ error: 'rate' });
    }
    res.setHeader('Cache-Control', pid ? 'no-store' : 's-maxage=10, stale-while-revalidate=30');

    const wk = L.weekInfo();
    const key = period === 'week' ? L.weekKey(board, wk.id) : L.boardKey(board);
    const cmds = [['ZREVRANGE', key, 0, L.TOP - 1, 'WITHSCORES'], ['ZCARD', key]];
    if (pid) cmds.push(['ZREVRANK', key, pid], ['ZSCORE', key, pid]);
    const r = await L.pipe(cmds);

    const flat = r[0], rows = [];
    for (let i = 0; i < flat.length; i += 2) rows.push({ pid: flat[i], s: Number(flat[i + 1]) });
    const myRank = pid && r[2] !== null ? r[2] + 1 : null;
    const wanted = rows.map((x) => x.pid);
    if (pid && myRank && !wanted.includes(pid)) wanted.push(pid);

    let names = [], animals = [];
    if (wanted.length) {
      const lookups = [['HMGET', 'dp:names', ...wanted]];
      lookups.push(board === 'all' ? ['HMGET', L.animalHashKey(period, wk.id), ...wanted]   // icon: the animal (and gear) that set the score
        : ['HMGET', L.gearHashKey(board, period, wk.id), ...wanted]);                         // per-animal board: just the gear
      const got = await L.pipe(lookups);
      names = got[0];
      animals = got[1] || [];
    }
    const animalOf = (i) => (board === 'all' ? (animals[i] || '').split('+')[0] || null : board);
    const gearOf = (i) => (board === 'all' ? (animals[i] || '').split('+')[1] : animals[i]) || null;   // global: stored as "animal+gear"

    const out = rows.map((x, i) => ({ r: i + 1, n: names[i] || '???', s: x.s, me: x.pid === pid, a: animalOf(i), g: gearOf(i) }));
    const mi = wanted.indexOf(pid);
    const me = pid && myRank ? { r: myRank, s: Number(r[3]), n: names[mi] || '???', a: animalOf(mi), g: gearOf(mi) } : null;
    res.status(200).json({ board, period, total: r[1], rows: out, me, endsAt: period === 'week' ? wk.end : null });
  } catch (e) {
    res.status(500).json({ error: 'server' });
  }
};
