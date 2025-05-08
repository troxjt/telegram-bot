const db = require('../db');
const { connect, safeWrite } = require('./mikrotik');
const { logToFile } = require('../utils/log');

async function limitBandwidth(mac, ip, iface) {
  const router = await connect();
  const name = `limit_${mac.replace(/:/g, '')}`;

  await safeWrite(router, '/queue/simple/add', [
    `=name=${name}`,
    `=target=${ip}`,
    `=max-limit=512k/1M`,
    `=comment=Limited by AI`
  ]);

  await db.query('INSERT INTO bandwidth_limits (mac, ip, interface, limited_date) VALUES (?, ?, ?, NOW())', [mac, ip, iface]);
  
  logToFile(`[MikroTik] 🚦 Đã giới hạn băng thông cho ${mac} (${ip})`);
}

async function trackConnection(mac, ip, iface) {
  try {
    const result = await db.query('SELECT days_connected FROM connection_logs WHERE mac = ?', [mac]);
    if (result.length > 0) {
      const connectionDateCheck = await db.query(
        'SELECT connection_date FROM connection_logs WHERE mac = ?',
        [mac]
      );
      if (connectionDateCheck.length > 0) {
        const connectionDate = new Date(connectionDateCheck[0].connection_date);
        const currentDate = new Date();
        const timeDifference = currentDate - connectionDate;
        const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

        if (timeDifference > oneDayInMilliseconds) {
          await db.query('UPDATE connection_logs SET days_connected = days_connected + 1, connection_date = CURDATE() WHERE mac = ?', [mac]);
        }
      }
    } else {
      await db.query('INSERT INTO connection_logs (mac, connection_date) VALUES (?, CURDATE()) ON DUPLICATE KEY UPDATE connection_date = VALUES(connection_date)', [mac]);
      await limitBandwidth(mac, ip, iface);
    }
  } catch (err) {
    logToFile(`[ERROR] Failed to track connection for MAC=${mac}: ${err.message}`);
    throw err;
  }
}

async function cleanupTrustedDevices() {
  try {
    await db.query(
      'DELETE FROM whitelist WHERE mac NOT IN (SELECT mac FROM connection_logs WHERE connection_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY))'
    );
  } catch (err) {
    logToFile(`[ERROR] Không thể dọn dẹp các thiết bị đáng tin cậy: ${err.message}`);
    throw err;
  }
}

async function monitorSuspiciousIPs() {
  try {
    const router = await connect(); // Use connect instead of connect
    const addressLists = await safeWrite(router, '/ip/firewall/address-list/print');
    if (addressLists.length > 0) {
      for (const entry of addressLists) {
        if (entry.list && entry.list.startsWith('ai_')) {
          const ip = entry.address;
          const isMalicious = await inspectIP(ip);
          if (isMalicious) {
            await blockIP(ip, router);
          }
        }
      }
    };
  } catch (err) {
    logToFile(`[ERROR] Failed to monitor suspicious IPs: ${err.message}`);
    throw err;
  }
}

async function inspectIP(ip) {
  return false;
}

// Chặn IP vào danh sách
async function blockIp(ip, comment = 'Blocked by AI') {
  const router = await connect();
  const exists = await safeWrite(router, '/ip/firewall/address-list/print', [
    `?address=${ip}`,
    `?list=ai_blacklist`
  ]);
  if (exists.length === 0) {
    await safeWrite(router, '/ip/firewall/address-list/add', [
      `=address=${ip}`,
      `=list=ai_blacklist`,
      `=comment=${comment}`
    ]);
    await db.query('INSERT INTO blocked_ips (ip, blocked_date) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE blocked_date = NOW()', [ip]);
    logToFile(`[MikroTik] 🚫 IP ${ip} đã bị chặn.`);
  } else {
    logToFile(`[MikroTik] ⚠️ IP ${ip} đã có trong danh sách chặn.`);
  }
}

module.exports = {
  blockIp,
  limitBandwidth,
  trackConnection,
  cleanupTrustedDevices,
  monitorSuspiciousIPs
};
