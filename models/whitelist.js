const db = require('../db');

async function isWhitelisted(mac) {
  const result = await db.query('SELECT 1 FROM whitelist WHERE mac = ?', [mac]);
  return result.length > 0;
}

module.exports = { isWhitelisted };
