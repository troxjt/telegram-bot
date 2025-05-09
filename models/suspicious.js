const db = require('../db');
const { logToFile } = require('../utils/log');

async function logSuspicious(mac, ip, iface, clientId) {
  try {
    const exists = await db.query(
      'SELECT 1 FROM suspicious_devices WHERE mac = ? AND ip = ? AND interface = ?',
      [mac, ip, iface]
    );

    if (exists.length > 0) {
      // logToFile(`[THÔNG TIN] Thiết bị đã được ghi lại: MAC=${mac}, IP=${ip}, Interface=${iface}`);
      return;
    }

    await db.query(
      'INSERT INTO suspicious_devices (mac, ip, interface, client_id) VALUES (?, ?, ?, ?)',
      [mac, ip, iface, clientId]
    );
    logToFile(`[THÔNG TIN] Thiết bị đáng ngờ đã ghi lại: MAC=${mac}, IP=${ip}, Interface=${iface}, Client-ID=${clientId}`);
  } catch (err) {
    logToFile(`[LỖI] Không đăng nhập thiết bị đáng ngờ: ${err.message}`);
    throw err;
  }
}

async function KiemTraDanhSachKhaNghi(mac) {
  try {
    const result = await db.query('SELECT 1 FROM suspicious_devices WHERE mac = ?', [mac]);
    return result.length > 0;
  } catch (err) {
    logToFile(`[LỖI] Không kiểm tra thiết bị đáng ngờ: ${err.message}`);
    throw err;
  }
}

module.exports = { logSuspicious, KiemTraDanhSachKhaNghi };