const { connect, safeWrite } = require('../../models/mikrotik');
const { KiemTraDanhSachWhitelist } = require('../../models/whitelist');
const { KiemTraDanhSachKhaNghi, logSuspicious } = require('../../models/suspicious');
const { sendDiscordMsg } = require('../../utils/messageUtils');
const { logToFile } = require('../../utils/log');
const { discord } = require('../../config');
const {
  KiemTraKetNoi,
  DonDepThietBiTinCay
} = require('../../models/device');

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
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
                sendDiscordMsg(client, discord.channelIdNotiRouter, alertMessage),
                // GioiHanBangThong(mac, `${ip}/32`, iface)
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

    // Giám sát thiết bị định kỳ
    AI_GiamSat();
    setInterval(AI_GiamSat, 2*60*1000);
  },
};