'use strict';
const L = require('./_lib');

// GET /api/ranking?board=all|dino|cat|...&pid=<optional, to mark/locate the player>
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
  if (!L.configured()) { res.setHeader('Cache-Control', 'no-store'); return res.status(503).json({ error: 'unavailable' }); }
  try {
    const q = req.query || {};
    const board = String(q.board || 'all');
    if (!L.validBoard(board)) return res.status(400).json({ error: 'board' });
    const pid = L.PID_RE.test(q.pid || '') ? q.pid : null;
    res.setHeader('Cache-Control', pid ? 'no-store' : 's-maxage=10, stale-while-revalidate=30');

    const key = L.boardKey(board);
    const cmds = [['ZREVRANGE', key, 0, L.TOP - 1, 'WITHSCORES'], ['ZCARD', key]];
    if (pid) cmds.push(['ZREVRANK', key, pid], ['ZSCORE', key, pid]);
    const r = await L.pipe(cmds);

    const flat = r[0], rows = [];
    for (let i = 0; i < flat.length; i += 2) rows.push({ pid: flat[i], s: Number(flat[i + 1]) });
    const myRank = pid && r[2] !== null ? r[2] + 1 : null;
    const wanted = rows.map((x) => x.pid);
    const meOutside = pid && myRank && !wanted.includes(pid);
    if (meOutside) wanted.push(pid);
    const names = wanted.length ? await L.cmd('HMGET', 'dp:names', ...wanted) : [];

    const out = rows.map((x, i) => ({ r: i + 1, n: names[i] || '???', s: x.s, me: x.pid === pid }));
    const me = pid && myRank ? { r: myRank, s: Number(r[3]), n: names[wanted.indexOf(pid)] || '???' } : null;
    res.status(200).json({ board, total: r[1], rows: out, me });
  } catch (e) {
    res.status(500).json({ error: 'server' });
  }
};
