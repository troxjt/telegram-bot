const db = require('../db');

async function logSuspicious(mac, ip, iface) {
    const sql = 'INSERT INTO suspicious_devices (mac, ip, interface, detected_at) VALUES (?, ?, ?, NOW())';
    await db.query(sql, [mac, ip, iface]);
}

module.exports = { logSuspicious };
