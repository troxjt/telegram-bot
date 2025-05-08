const { connect, safeWrite } = require('./models/mikrotik');
const { isWhitelisted } = require('./models/whitelist');
const { isSuspicious, logSuspicious } = require('./models/suspicious');
const { sendAlert } = require('./utils/messageUtils');
const { logToFile } = require('./utils/log');
const {
  limitBandwidth,
  trackConnection,
  cleanupTrustedDevices,
  monitorSuspiciousIPs
} = require('./models/device');

// Function to monitor devices
async function monitorDevices() {
  try {
    const router = await connect();
    const devices = await safeWrite(router, '/ip/arp/print');

    if (devices.length > 0) {
      for (const device of devices) {
        const mac = device['mac-address'];
        const ip = device['address'];
        const iface = device['interface'];
        const clientId = device['client-id'] || null;

        if (!mac || !ip || !iface) {
          // logToFile(`[WARN] Skipping device due to missing data: MAC=${mac}, IP=${ip}, Interface=${iface}`);
          continue;
        }

        const [isWhiteListed, isMarkedSuspicious] = await Promise.all([
          isWhitelisted(mac),
          isSuspicious(mac)
        ]);

        if (!isWhiteListed && !isMarkedSuspicious) {
          await Promise.all([
            logSuspicious(mac, ip, iface, clientId),
            sendAlert(mac, ip, iface),
            limitBandwidth(mac, `${ip}/32`, iface)
          ]);
        }

        await trackConnection(mac, `${ip}/32`, iface);
      }

      await cleanupTrustedDevices();
      // await monitorSuspiciousIPs();

      logToFile('[INFO] Giám sát thiết bị thành công.');
    };
  } catch (err) {
    logToFile('[ERROR] Giám sát thiết bị không thành công:', err.message);
  }
}

async function processFirewallLists() {
  try {
    const routerConn = await connect();
    const entries = await safeWrite(routerConn, '/ip/firewall/address-list/print');

    if (entries.length > 0) {
      for (const entry of entries) {
        let score = 0;
        const ip = entry.address;
        const entrylist = entry.list;

        if (entrylist === 'ai_port_scanner') {
          score += 30;
        } else if (entrylist === 'ai_brute_force') {
          score += 40;
        } else if (entrylist === 'ai_http_flood') {
          score += 30;
        }

        if (score >= 60) {
          let duplicate = false;
          for (const entry_2 of entries) {
            if (entry_2.address === ip && entry_2.list === 'ai_blacklist') {
              duplicate = true;
              break;
            }
          }
          
          if (!duplicate) {
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

            logToFile(`[ALERT] Đã chặn IP nguy hiểm: ${ip} với điểm ${score}`);
          }
        }
      }
    }
    // logToFile('[INFO] Danh sách tường lửa được xử lý thành công.');
  } catch (err) {
    logToFile(`[ERROR] Không xử lý danh sách tường lửa: ${err.message}`);
  }
}

module.exports = { monitorDevices, processFirewallLists };