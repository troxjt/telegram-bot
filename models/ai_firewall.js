const { connect, safeWrite } = require('./mikrotik');
const { KiemTraDanhSachWhitelist } = require('./whitelist');
const { KiemTraDanhSachKhaNghi, logSuspicious } = require('./suspicious');
const { GuiThongBaoTele } = require('../utils/messageUtils');
const { logToFile } = require('../utils/log');
const {
  GioiHanBangThong,
  KiemTraKetNoi,
  DonDepThietBiTinCay,
  monitorSuspiciousIPs
} = require('./device');

// Xử lý thiết bị
async function processDevice(router, device) {
  const mac = device['mac-address'];
  const ip = device['address'];
  const iface = device['interface'];
  const clientId = device['client-id'] || null;

  if (!mac || !ip || !iface) {
    logToFile(`[CẢNH BÁO] Skipping device due to missing data: MAC=${mac}, IP=${ip}, Interface=${iface}`);
    return;
  }

  const [isWhiteListed, isMarkedSuspicious] = await Promise.all([
    KiemTraDanhSachWhitelist(mac),
    KiemTraDanhSachKhaNghi(mac)
  ]);

  if (!isWhiteListed && !isMarkedSuspicious) {
    const alertMessage = `[BÁO ĐỘNG] Thiết bị không có trong whitelist:\nMAC: ${mac}\nIP: ${ip}\nInterface: ${iface}`;
    await Promise.all([
      logSuspicious(mac, ip, iface, clientId),
      GuiThongBaoTele(alertMessage),
      GioiHanBangThong(mac, `${ip}/32`, iface)
    ]);
  }

  await KiemTraKetNoi(mac, `${ip}/32`, iface);
}

// Giám sát các thiết bị
async function AI_GiamSat() {
  try {
    const router = await connect();
    const devices = await safeWrite(router, '/ip/arp/print');

    if (devices.length > 0) {
      await Promise.all(devices.map(device => processDevice(router, device)));
      await DonDepThietBiTinCay();
      logToFile('[THÔNG TIN] Giám sát thiết bị thành công.');
    }
  } catch (err) {
    logToFile(`[LỖI] Giám sát thiết bị không thành công: ${err.message}`);
  }
}

// Tính toán điểm IP
function calculateIpScores(FirewallAddressList) {
  const ipScores = new Map();

  for (const entry of FirewallAddressList) {
    const ip = entry.address;
    const entrylist = entry.list;
    const scoreIncrement = {
      'ai_port_scanner': 30,
      'ai_brute_force': 40,
      'ai_http_flood': 30,
      'suspect_ips': 20
    }[entrylist] || 0;

    ipScores.set(ip, (ipScores.get(ip) || 0) + scoreIncrement);
  }

  return ipScores;
}

// Xử lý xử lý tường lửa
async function AI_Firewall() {
  try {
    const routerConn = await connect();
    const FirewallAddressList = await safeWrite(routerConn, '/ip/firewall/address-list/print');

    if (FirewallAddressList.length > 0) {
      const ipScores = calculateIpScores(FirewallAddressList);

      for (const [ip, score] of ipScores.entries()) {
        if (score >= 60) {
          const isBlacklisted = FirewallAddressList.some(
            (entry) => entry.address === ip && entry.list === 'ai_blacklist'
          );

          if (!isBlacklisted) {
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