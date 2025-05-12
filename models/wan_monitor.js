const { connect, safeWrite } = require('./mikrotik');
const { logToFile } = require('../utils/log');
const { GuiThongBaoTele } = require('../utils/messageUtils');

const pppoeList = ['pppoe-out1', 'pppoe-out2'];

async function monitorPPPoEs() {
  try {
    const router = await connect();
    let failList = [];
    let totalPPPoE = 0;
    let failedPPPoE = 0;

    for (const iface of pppoeList) {
      totalPPPoE++;

      // Kiểm tra địa chỉ IP của interface
      const ipAddr = await safeWrite(router, '/ip/address/print', [`?interface=${iface}`]);
      if (ipAddr.length === 0) {
        failList.push(`❌ ${iface}: không có IP`);
        failedPPPoE++;

        // Lấy .id của route liên quan đến interface
        const routeId = await safeWrite(router, '/ip/route/print', [`?gateway=${iface}`]);
        if (routeId.length > 0) {
          await safeWrite(router, '/ip/route/disable', [`=.id=${routeId[0]['.id']}`]);
        }
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
        failList.push(`❌ ${iface}: không ping được`);
        failedPPPoE++;

        // Lấy .id của route liên quan đến interface
        const routeId = await safeWrite(router, '/ip/route/print', [`?gateway=${iface}`]);
        if (routeId.length > 0) {
          await safeWrite(router, '/ip/route/disable', [`=.id=${routeId[0]['.id']}`]);
        }
      } else {
        // Kích hoạt lại cân bằng tải nếu interface hoạt động bình thường
        const routeId = await safeWrite(router, '/ip/route/print', [`?gateway=${iface}`]);
        if (routeId.length > 0) {
          await safeWrite(router, '/ip/route/enable', [`=.id=${routeId[0]['.id']}`]);
        }
      }
    }

    // Gửi thông báo Telegram nếu có lỗi
    if (failedPPPoE > 0) {
      const message = `🚨 CẢNH BÁO MẠNG PPPoE!\n\n${failList.join('\n')}`;
      await GuiThongBaoTele(message);
      console.log(`[CẢNH BÁO] ${failedPPPoE}/${totalPPPoE} kết nối PPPoE gặp sự cố.`);
    } else {
      console.log('[THÔNG TIN] Tất cả kết nối PPPoE đều hoạt động bình thường.');
    }
  } catch (err) {
    console.log(`[LỖI] Không thể kiểm tra kết nối PPPoE: ${err.message}`);
  }
}

module.exports = { monitorPPPoEs };