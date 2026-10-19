'use strict';
const L = require('./_lib');

// POST { code } -> { data, savedAt } of that cloud save. Rate limited per IP so codes cannot be guessed.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!L.configured()) return res.status(503).json({ error: 'unavailable' });
  try {
    if (!(await L.rateLimit('dp:rl:load:' + L.ipHash(req), 20, 3600))) return res.status(429).json({ error: 'rate' });
    const code = L.cleanCode(L.body(req).code);
    if (!L.validCode(code)) return res.status(400).json({ error: 'code' });
    const raw = await L.cmd('GET', L.saveKey(code));
    if (raw === null) return res.status(404).json({ error: 'not_found' });
    await L.cmd('EXPIRE', L.saveKey(code), L.SAVE_TTL);           // using it keeps it alive
    const { data, savedAt } = JSON.parse(raw);
    res.status(200).json({ ok: true, code: L.prettyCode(code), data, savedAt });
  } catch (e) {
    res.status(500).json({ error: 'server' });
  }
};
