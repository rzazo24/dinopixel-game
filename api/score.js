'use strict';
const L = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!L.configured()) return res.status(503).json({ error: 'unavailable' });
  try {
    const b = L.body(req);
    const { pid, animal, score } = b;
    if (!L.PID_RE.test(pid) || !L.ANIMALS.includes(animal) || !Number.isInteger(score) || score < 1 || score > L.MAX_SCORE) {
      return res.status(400).json({ error: 'invalid' });
    }
    const nick = L.cleanNick(b.nick);
    if (!nick) return res.status(400).json({ error: 'nick' });
    if (L.isBanned(nick)) return res.status(400).json({ error: 'banned' });

    const tok = L.verifyToken(b.t);
    if (!tok) return res.status(403).json({ error: 'token' });
    const elapsed = (Date.now() - tok.ts) / 1000;
    if (score > L.MAX_RATE * elapsed + L.SLACK) return res.status(422).json({ error: 'too_fast' });

    const okPid = await L.rateLimit('dp:rl:p:' + pid, 40, 3600);
    const okIp = await L.rateLimit('dp:rl:ip:' + L.ipHash(req), 150, 3600);
    if (!okPid || !okIp) return res.status(429).json({ error: 'rate' });

    // a token can be used once
    const fresh = await L.cmd('SET', 'dp:tok:' + tok.nonce, '1', 'NX', 'EX', 172800);
    if (fresh === null) return res.status(409).json({ error: 'used' });

    const ka = L.boardKey('all'), kb = L.boardKey(animal);
    const r = await L.pipe([
      ['ZADD', ka, 'GT', score, pid],
      ['ZADD', kb, 'GT', score, pid],
      ['HSET', 'dp:names', pid, nick],
      ['ZREVRANK', ka, pid], ['ZSCORE', ka, pid], ['ZCARD', ka],
      ['ZREVRANK', kb, pid], ['ZSCORE', kb, pid], ['ZCARD', kb],
    ]);
    res.status(200).json({
      ok: true,
      all: { rank: r[3] + 1, best: Number(r[4]), total: r[5] },
      animal: { rank: r[6] + 1, best: Number(r[7]), total: r[8] },
    });
  } catch (e) {
    res.status(500).json({ error: 'server' });
  }
};
