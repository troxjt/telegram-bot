const db = require('../db');
const { getConnection } = require('./mikrotik'); // Corrected import
const { logToFile } = require('../utils/log');

async function limitBandwidth(mac, ip, iface) {
  try {
    if (!ip.includes('/')) {
      throw new Error(`Invalid IP address format: ${ip}. Expected format: 'x.x.x.x/xx'`);
    }

    const routerConn = await getConnection(); // Use getConnection instead of connect

    // Check if the MAC is in the database
    const bandwidthlimitsCheck = await db.query('SELECT 1 FROM bandwidth_limits WHERE mac = ?', [mac]);
    if (bandwidthlimitsCheck.length === 0) {
      // Add new queue
      await routerConn.write('/queue/simple/add', [
        `=name=${mac}`,
        `=target=${ip}`,
        '=max-limit=100M/100M'
      ]);

      // Log to database
      await db.query(
        'INSERT INTO bandwidth_limits (mac, ip, interface, limited_date) VALUES (?, ?, ?, NOW())',
        [mac, ip, iface]
      );
    }
  } catch (err) {
    logToFile(`[ERROR] Failed to limit bandwidth for MAC=${mac}: ${err.message}`);
    throw err;
  }
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
    const routerConn = await getConnection(); // Use getConnection instead of connect
    const addressLists = await routerConn.write('/ip/firewall/address-list/print');

    for (const entry of addressLists) {
      if (entry.list && entry.list.startsWith('ai_')) {
        const ip = entry.address;
        const isMalicious = await inspectIP(ip);
        if (isMalicious) {
          await blockIP(ip, routerConn);
        }
      }
    }
  } catch (err) {
    logToFile(`[ERROR] Failed to monitor suspicious IPs: ${err.message}`);
    throw err;
  }
}

async function inspectIP(ip) {
  return false;
}

async function blockIP(ip, routerConn = null) {
  try {
    if (!routerConn) {
      routerConn = await getConnection();
    }
    await routerConn.write('/ip/firewall/address-list/add', [
      `=list=ai_blacklist`,
      `=address=${ip}`,
      `=timeout=24h`,
      `=comment=AI Auto Block`
    ]);

    await db.query('INSERT INTO blocked_ips (ip, blocked_date) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE blocked_date = NOW()', [ip]);
  } catch (err) {
    logToFile(`[ERROR] Failed to block IP=${ip}: ${err.message}`);
    throw err;
  }
}

module.exports = {
  limitBandwidth,
  trackConnection,
  cleanupTrustedDevices,
  monitorSuspiciousIPs
};
