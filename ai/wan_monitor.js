const { connect, safeWrite } = require('../models/mikrotik');
const { logToFile } = require('../utils/log');
const { sendDiscordMsg } = require('../utils/messageUtils');
const { discord } = require('../config');

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    const pppoeList = ['pppoe-out1', 'pppoe-out2'];
    let previousStatus = {}; // Lưu trạng thái trước đó của các PPPoE

    async function monitorPPPoEs() {
      try {
        const router = await connect();
        let failList = [];
        let recoveredList = [];
        let totalPPPoE = 0;
        let failedPPPoE = 0;

        for (const iface of pppoeList) {
          totalPPPoE++;

          // Kiểm tra địa chỉ IP của interface
          const ipAddr = await safeWrite(router, '/ip/address/print', [`?interface=${iface}`]);
          if (ipAddr.length === 0) {
            failList.push(`❌ ${iface}: không được cấp địa chỉ IP.`);
            failedPPPoE++;

            // Lấy .id của route liên quan đến interface
            const routeId = await safeWrite(router, '/ip/route/print', [`?gateway=${iface}`]);
            if (routeId.length > 0) {
              await safeWrite(router, '/ip/route/disable', [`=.id=${routeId[0]['.id']}`]);
            }

            // Cập nhật trạng thái trước đó
            previousStatus[iface] = false;
            continue;
          }

          // Kiểm tra kết nối bằng ping
          const pingResult = await safeWrite(router, '/ping', [
            `=address=8.8.8.8`,
            `=interface=${iface}`,
            `=count=3`,
            `=interval=1s`
          ]);

          if (pingResult.length === 0 || pingResult[0].received === '0') {
            failList.push(`❌ ${iface}: Không có kết nối Internet.`);
            failedPPPoE++;

            // Lấy .id của route liên quan đến interface
            const routeId = await safeWrite(router, '/ip/route/print', [`?gateway=${iface}`]);
            if (routeId.length > 0) {
              await safeWrite(router, '/ip/route/disable', [`=.id=${routeId[0]['.id']}`]);
            }

            // Cập nhật trạng thái trước đó
            previousStatus[iface] = false;
          } else {
            // Kích hoạt lại cân bằng tải nếu interface hoạt động bình thường
            const routeId = await safeWrite(router, '/ip/route/print', [`?gateway=${iface}`]);
            if (routeId.length > 0) {
              await safeWrite(router, '/ip/route/enable', [`=.id=${routeId[0]['.id']}`]);
            }

            // Kiểm tra nếu trạng thái trước đó là lỗi và bây giờ đã khôi phục
            if (previousStatus[iface] === false) {
              recoveredList.push(`✅ ${iface}: Đã khôi phục kết nối Internet.`);
            }

            // Cập nhật trạng thái trước đó
            previousStatus[iface] = true;
          }
        }

        // Gửi thông báo Telegram nếu có lỗi
        if (failedPPPoE > 0) {
          const message = `🚨 [ĐƯỜNG TRUYỀN MẤT TÍN HIỆU]!\n\n${failList.join('\n')}`;
          await sendDiscordMsg(client, discord.channelIdNotiRouter, message);
          // logToFile(`[CẢNH BÁO] ${failedPPPoE}/${totalPPPoE} kết nối PPPoE gặp sự cố.`);
        }

        // Gửi thông báo Telegram nếu có đường truyền được khôi phục
        if (recoveredList.length > 0) {
          const recoveryMessage = `✅ [ĐƯỜNG TRUYỀN ĐÃ KHÔI PHỤC]!\n\n${recoveredList.join('\n')}`;
          await sendDiscordMsg(client, discord.channelIdNotiRouter, recoveryMessage);
          // logToFile(`[THÔNG TIN] ${recoveredList.length} kết nối PPPoE đã được khôi phục.`);
        }

        if (failedPPPoE === 0 && recoveredList.length === 0) {
          // logToFile('[THÔNG TIN] Tất cả kết nối PPPoE đều hoạt động bình thường.');
        }
      } catch (err) {
        logToFile(`[LỖI] Không thể kiểm tra kết nối PPPoE: ${err.message}`);
      }
    }

    // Kiểm tra kết nối WAN định kỳ
    monitorPPPoEs();
    setInterval(monitorPPPoEs, 5*60*1000);
  },
};