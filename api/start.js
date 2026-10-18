'use strict';
const L = require('./_lib');

// Issues a signed token when a run starts; the score endpoint checks elapsed time against it.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!L.configured()) return res.status(503).json({ error: 'unavailable' });
  res.status(200).json({ t: L.newToken() });
};
