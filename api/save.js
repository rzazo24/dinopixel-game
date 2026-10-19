'use strict';
const L = require('./_lib');

// POST { data }             -> creates a cloud save with a new recovery code: { code, savedAt }
// POST { code, data }       -> overwrites the save of that code
// POST { code, delete: true } -> deletes it
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!L.configured()) return res.status(503).json({ error: 'unavailable' });
  try {
    const b = L.body(req);
    if (!(await L.rateLimit('dp:rl:save:' + L.ipHash(req), 120, 3600))) return res.status(429).json({ error: 'rate' });
    let code = b.code === undefined ? null : L.cleanCode(b.code);
    if (code !== null && !L.validCode(code)) return res.status(400).json({ error: 'code' });

    if (b.delete) {
      if (!code) return res.status(400).json({ error: 'code' });
      await L.cmd('DEL', L.saveKey(code));
      return res.status(200).json({ ok: true, deleted: true });
    }

    if (!b.data || typeof b.data !== 'object' || Array.isArray(b.data)) return res.status(400).json({ error: 'data' });
    const savedAt = Date.now();
    const blob = JSON.stringify({ data: b.data, savedAt });
    if (blob.length > L.SAVE_MAX) return res.status(413).json({ error: 'too_big' });

    if (code) {
      await L.cmd('SET', L.saveKey(code), blob, 'EX', L.SAVE_TTL);
    } else {
      for (let i = 0; i < 5 && !code; i++) {                       // a fresh code (a collision is astronomically unlikely)
        const c = L.newCode();
        if ((await L.cmd('SET', L.saveKey(c), blob, 'NX', 'EX', L.SAVE_TTL)) !== null) code = c;
      }
      if (!code) return res.status(500).json({ error: 'server' });
    }
    res.status(200).json({ ok: true, code: L.prettyCode(code), savedAt });
  } catch (e) {
    res.status(500).json({ error: 'server' });
  }
};
