const db = require('../db');

async function KiemTraDanhSachWhitelist(mac) {
  const result = await db.query('SELECT 1 FROM whitelist WHERE mac = ?', [mac]);
  return result.length > 0;
}

// Thêm MAC vào whitelist
async function addToWhitelist(ip, mac) {
  await db.query('INSERT INTO whitelist (ip, mac, description) VALUES (?, ?, ?)', [ip, mac, 'Thêm bởi bot']);
}

module.exports = { KiemTraDanhSachWhitelist, addToWhitelist };
