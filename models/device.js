const db = require('../db');
const { connect } = require('./mikrotik');

async function limitBandwidth(mac, ip, iface) {
  try {
    if (!ip.includes('/')) {
      throw new Error(`Invalid IP address format: ${ip}. Expected format: 'x.x.x.x/xx'`);
    }

    const routerConn = await connect();

    // // Check if the queue already exists in MikroTik
    // const existingQueues = await routerConn.write('/queue/simple/print', [`?name=${mac}`]);
    // if (existingQueues.length > 0) {
    //   console.log(`[INFO] Queue already exists for MAC=${mac}, skipping creation.`);
    //   return;
    // }

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

      // console.log(`[INFO] Bandwidth limited for MAC=${mac}, IP=${ip}`);
    }
  } catch (err) {
    console.error(`[ERROR] Failed to limit bandwidth for MAC=${mac}: ${err.message}`);
    throw err;
  }
}

async function trackConnection(mac, ip, iface) {
  try {
    const result = await db.query('SELECT days_connected FROM connection_logs WHERE mac = ?', [mac]);
    if (result.length > 0) {
      if (result[0].days_connected >= 7) {
        const suspiciousdevicescheck = await db.query('SELECT 1 FROM suspicious_devices WHERE mac = ?', [mac]);
        if (suspiciousdevicescheck.length > 0) {
          db.query('DELETE FROM suspicious_devices WHERE mac = ?', [mac]);
        }
      } else {
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
      }
    } else {
      await db.query('INSERT INTO connection_logs (mac, connection_date) VALUES (?, CURDATE()) ON DUPLICATE KEY UPDATE connection_date = VALUES(connection_date)', [mac]);
      await limitBandwidth(mac, ip, iface);
      // console.log(`[INFO] MAC=${mac} has connected`);
    }
  } catch (err) {
    console.error(`[ERROR] Failed to track connection for MAC=${mac}: ${err.message}`);
    throw err;
  }
}

async function cleanupTrustedDevices() {
  try {
    await db.query(
      'DELETE FROM whitelist WHERE mac NOT IN (SELECT mac FROM connection_logs WHERE connection_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY))'
    );
    // console.log('[INFO] Làm sạch các thiết bị đáng tin cậy.');
  } catch (err) {
    console.error(`[ERROR] Không thể dọn dẹp các thiết bị đáng tin cậy: ${err.message}`);
    throw err;
  }
}

async function monitorSuspiciousIPs() {
  try {
    const routerConn = await connect();
    const addressLists = await routerConn.write('/ip/firewall/address-list/print');

    for (const entry of addressLists) {
      // console.log(entry.list, entry.list.startsWith('ai_'))
      if (entry.list && entry.list.startsWith('ai_')) {
        const ip = entry.address;
        const isMalicious = await inspectIP(ip);
        if (isMalicious) {
          await blockIP(ip, routerConn);
          // console.log(`[ALERT] Blocked malicious IP=${ip}`);
        }
      }
    }
  } catch (err) {
    console.error(`[ERROR] Failed to monitor suspicious IPs: ${err.message}`);
    throw err;
  }
}

async function inspectIP(ip) {
  // console.log(`[INFO] Inspecting IP=${ip}`);
  return false;
}

async function blockIP(ip, routerConn = null) {
  try {
    if (!routerConn) {
      routerConn = await connect();
    }
    await routerConn.write('/ip/firewall/address-list/add', [
      `=list=blocked`,
      `=address=${ip}`,
      `=comment=Blocked by system`
    ]);

    await db.query('INSERT INTO blocked_ips (ip, blocked_date) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE blocked_date = NOW()', [ip]);

    // console.log(`[INFO] IP=${ip} has been blocked in MikroTik and logged in the database.`);
  } catch (err) {
    console.error(`[ERROR] Failed to block IP=${ip}: ${err.message}`);
    throw err;
  }
}

module.exports = {
  limitBandwidth,
  trackConnection,
  cleanupTrustedDevices,
  monitorSuspiciousIPs
};
