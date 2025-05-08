const { RouterOSAPI } = require('node-routeros');
const { router, telegram } = require('../config');
const { logToFile } = require('../utils/log');

let connectionPool = [];

async function getConnection() {
  const availableConnection = connectionPool.find(conn => !conn.inUse);
  if (availableConnection) {
    availableConnection.inUse = true;
    return availableConnection.api;
  }

  const newConnection = new RouterOSAPI({
    host: router.host,
    user: router.user,
    password: router.password,
    port: router.port,
    timeout: 30000
  });

  await newConnection.connect();
  connectionPool.push({ api: newConnection, inUse: true });
  return newConnection;
}

function releaseConnection(api) {
  const connection = connectionPool.find(conn => conn.api === api);
  if (connection) {
    connection.inUse = false;
  }
}

// Helper to safely call routerConn.write and handle !empty reply
async function safeWrite(routerConn, command, params = []) {
  try {
    const res = await routerConn.write(command, params);
    return res;
  } catch (err) {
    if (
      err &&
      err.errno === 'UNKNOWNREPLY' &&
      err.message &&
      err.message.includes('!empty')
    ) {
      // Return empty array if !empty reply
      return [];
    }
    throw err;
  }
}

async function processFirewallLists() {
  let routerConn;
  try {
    routerConn = await getConnection();
    const ipLists = new Set();

    // Fetch IPs from address lists
    const lists = ['ai_port_scanner', 'ai_brute_force', 'ai_http_flood'];
    for (const list of lists) {
      const entries = await safeWrite(routerConn, '/ip/firewall/address-list/print', [`?list=${list}`]);
      entries.forEach(entry => ipLists.add(entry.address));
    }

    for (const ip of ipLists) {
      let score = 0;

      if (await safeWrite(routerConn, '/ip/firewall/address-list/print', [`?list=ai_port_scanner`, `?address=${ip}`]).then(res => res.length > 0)) {
        score += 30;
      }
      if (await safeWrite(routerConn, '/ip/firewall/address-list/print', [`?list=ai_brute_force`, `?address=${ip}`]).then(res => res.length > 0)) {
        score += 40;
      }
      if (await safeWrite(routerConn, '/ip/firewall/address-list/print', [`?list=ai_http_flood`, `?address=${ip}`]).then(res => res.length > 0)) {
        score += 30;
      }

      if (score >= 60) {
        const alreadyBlocked = await safeWrite(routerConn, '/ip/firewall/address-list/print', [`?list=ai_blacklist`, `?address=${ip}`]).then(res => res.length > 0);
        if (!alreadyBlocked) {
          await safeWrite(routerConn, '/ip/firewall/address-list/add', [
            `=list=ai_blacklist`,
            `=address=${ip}`,
            `=timeout=24h`,
            `=comment=AI Auto Block`
          ]);

          // Send Telegram alert
          const text = `🚨 Đã chặn IP nguy hiểm!\nIP: ${ip}\nĐiểm: ${score}`;
          const url = `https://api.telegram.org/bot${telegram.token}/sendMessage?chat_id=${telegram.chatId}&text=${encodeURIComponent(text)}`;
          await fetch(url);
        }
      }
    }
    logToFile('[INFO] Firewall lists processed successfully.');
  } catch (err) {
    logToFile(`[ERROR] Failed to process firewall lists: ${err.message}`);
    if (err.errno) {
      logToFile(`[ERROR] RouterOS API error code: ${err.errno}`);
    }
  } finally {
    if (routerConn) {
      releaseConnection(routerConn);
    }
  }
}

module.exports = { getConnection, releaseConnection, safeWrite, processFirewallLists };
