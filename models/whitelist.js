const db = require('../db');

async function KiemTraDanhSachWhitelist(mac) {
  const result = await db.query('SELECT 1 FROM whitelist WHERE mac = ?', [mac]);
  return result.length > 0;
}

// Thêm MAC vào whitelist
async function addToWhitelist(mac) {
  await db.query('INSERT INTO whitelist (mac, added_date) VALUES (?, NOW())', [mac]);
}

module.exports = { KiemTraDanhSachWhitelist, addToWhitelist };
