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

    const wk = L.weekInfo();
    const ka = L.boardKey('all'), kb = L.boardKey(animal);
    const kaw = L.weekKey('all', wk.id), kbw = L.weekKey(animal, wk.id);
    const standing = (k) => [['ZREVRANK', k, pid], ['ZSCORE', k, pid], ['ZCARD', k]];
    const r = await L.pipe([
      ['ZADD', ka, 'GT', 'CH', score, pid],              // 0: CH -> 1 when the player's best on that board changed
      ['ZADD', kb, 'GT', 'CH', score, pid],              // 1
      ['ZADD', kaw, 'GT', 'CH', score, pid],             // 2
      ['ZADD', kbw, 'GT', 'CH', score, pid],             // 3
      ['EXPIRE', kaw, L.WEEK_TTL], ['EXPIRE', kbw, L.WEEK_TTL],   // 4, 5
      ['HSET', 'dp:names', pid, nick],                   // 6
      ...standing(ka), ...standing(kb), ...standing(kaw), ...standing(kbw),   // 7..18
    ]);
    // remember which animal (and gear: "dino+boots") set the score on the global boards
    const who = L.GEAR.includes(b.gear) ? animal + '+' + b.gear : animal;
    const tail = [];
    if (r[0]) tail.push(['HSET', L.animalHashKey('all'), pid, who]);
    if (r[2]) tail.push(['HSET', L.animalHashKey('week', wk.id), pid, who], ['EXPIRE', L.animalHashKey('week', wk.id), L.WEEK_TTL]);
    const gearCmd = (k) => (who.includes('+') ? ['HSET', k, pid, b.gear] : ['HDEL', k, pid]);   // a new best without gear clears the mark
    if (r[1]) tail.push(gearCmd(L.gearHashKey(animal, 'all')));
    if (r[3]) tail.push(gearCmd(L.gearHashKey(animal, 'week', wk.id)), ['EXPIRE', L.gearHashKey(animal, 'week', wk.id), L.WEEK_TTL]);
    if (tail.length) await L.pipe(tail);

    const row = (o) => ({ rank: r[o] + 1, best: Number(r[o + 1]), total: r[o + 2] });
    res.status(200).json({
      ok: true,
      all: row(7), animal: row(10),
      week: { all: row(13), animal: row(16), endsAt: wk.end },
    });
  } catch (e) {
    res.status(500).json({ error: 'server' });
  }
};
