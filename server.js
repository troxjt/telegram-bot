const { connect, safeWrite } = require('./models/mikrotik');
const { KiemTraDanhSachWhitelist } = require('./models/whitelist');
const { KiemTraDanhSachKhaNghi, logSuspicious } = require('./models/suspicious');
const { GuiThongBaoTele } = require('./utils/messageUtils');
const { logToFile } = require('./utils/log');
const {
  GioiHanBangThong,
  KiemTraKetNoi,
  DonDepThietBiTinCay,
  monitorSuspiciousIPs
} = require('./models/device');

// Function to monitor devices
async function AI_GiamSat() {
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
          // logToFile(`[CẢNH BÁO] Skipping device due to missing data: MAC=${mac}, IP=${ip}, Interface=${iface}`);
          continue;
        }

        const [isWhiteListed, isMarkedSuspicious] = await Promise.all([
          KiemTraDanhSachWhitelist(mac),
          KiemTraDanhSachKhaNghi(mac)
        ]);

        
        if (!isWhiteListed && !isMarkedSuspicious) {
          const alertMessage = `[BÁO ĐỘNG] Thiết bị không có trong whitelist:\nMAC: ${mac}\nIP: ${ip}\nInterface: ${iface}`
          await Promise.all([
            logSuspicious(mac, ip, iface, clientId),
            GuiThongBaoTele(alertMessage),
            GioiHanBangThong(mac, `${ip}/32`, iface)
          ]);
        }

        await KiemTraKetNoi(mac, `${ip}/32`, iface);
      }

      await DonDepThietBiTinCay();
      // await monitorSuspiciousIPs();

      logToFile('[THÔNG TIN] Giám sát thiết bị thành công.');
    };
  } catch (err) {
    logToFile('[LỖI] Giám sát thiết bị không thành công:', err.message);
  }
}

async function AI_Firewall() {
  try {
    const routerConn = await connect();
    const FirewallAddressList = await safeWrite(routerConn, '/ip/firewall/address-list/print');

    if (FirewallAddressList.length > 0) {
      for (const entry_1 of FirewallAddressList) {
        let score = 0;
        const ip = entry_1.address;
        const entrylist = entry_1.list;

        if (entrylist === 'ai_port_scanner') {
          score += 30;
        } else if (entrylist === 'ai_brute_force') {
          score += 40;
        } else if (entrylist === 'ai_http_flood') {
          score += 30;
        } else if (entrylist === 'suspect_ips') {
          score += 20;
        }

        if (score >= 60) {
          let duplicate = false;
          for (const entry_2 of FirewallAddressList) {
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
              `=comment=Bi chan boi AI`
            ]);
    
            const text = `🚨 Đã chặn IP nguy hiểm!\nIP: ${ip}\nĐiểm: ${score}`;
            await GuiThongBaoTele(text);
            logToFile(`[BÁO ĐỘNG] Đã chặn IP nguy hiểm: ${ip} với điểm ${score}`);
          }
        }
      }
    }

    logToFile('[THÔNG TIN] Danh sách tường lửa được xử lý thành công.');
  } catch (err) {
    logToFile(`[LỖI] Không xử lý danh sách tường lửa: ${err.message}`);
  }
}

module.exports = { AI_GiamSat, AI_Firewall };