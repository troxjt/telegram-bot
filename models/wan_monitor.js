const { connect, safeWrite } = require('./mikrotik');
const { logToFile } = require('../utils/log');
const { GuiThongBaoTele } = require('../utils/messageUtils');

const pppoeList = ['pppoe-out1', 'pppoe-out2'];
let previousStatus = {}; // Lưu trạng thái trước đó của các PPPoE

async function checkInterface(router, iface) {
  const ipAddr = await safeWrite(router, '/ip/address/print', [`?interface=${iface}`]);
  if (ipAddr.length === 0) {
    return { status: 'fail', reason: 'không được cấp địa chỉ IP' };
  }

  const pingResult = await safeWrite(router, '/ping', [
    `=address=8.8.8.8`,
    `=interface=${iface}`,
    `=count=3`,
    `=interval=1s`
  ]);

  if (pingResult.length === 0 || pingResult[0].received === '0') {
    return { status: 'fail', reason: 'Không có kết nối Internet' };
  }

  return { status: 'success' };
}

async function updateRoute(router, iface, enable) {
  const routeId = await safeWrite(router, '/ip/route/print', [`?gateway=${iface}`]);
  if (routeId.length > 0) {
    const action = enable ? 'enable' : 'disable';
    await safeWrite(router, `/ip/route/${action}`, [`=.id=${routeId[0]['.id']}`]);
  }
}

async function monitorPPPoEs() {
  try {
    const router = await connect();
    let failList = [];
    let recoveredList = [];
    let totalPPPoE = pppoeList.length;
    let failedPPPoE = 0;

    for (const iface of pppoeList) {
      const result = await checkInterface(router, iface);

      if (result.status === 'fail') {
        failList.push(`❌ ${iface}: ${result.reason}.`);
        failedPPPoE++;
        await updateRoute(router, iface, false);
        previousStatus[iface] = false;
      } else {
        await updateRoute(router, iface, true);

        if (previousStatus[iface] === false) {
          recoveredList.push(`✅ ${iface}: Đã khôi phục kết nối Internet.`);
        }

        previousStatus[iface] = true;
      }
    }

    if (failedPPPoE > 0) {
      const message = `🚨 [ĐƯỜNG TRUYỀN MẤT TÍN HIỆU]!\n\n${failList.join('\n')}`;
      await GuiThongBaoTele(message);
    }

    if (recoveredList.length > 0) {
      const recoveryMessage = `✅ [ĐƯỜNG TRUYỀN ĐÃ KHÔI PHỤC]!\n\n${recoveredList.join('\n')}`;
      await GuiThongBaoTele(recoveryMessage);
    }

    if (failedPPPoE === 0 && recoveredList.length === 0) {
      logToFile('[THÔNG TIN] Tất cả kết nối PPPoE đều hoạt động bình thường.');
    }
  } catch (err) {
    logToFile(`[LỖI] Không thể kiểm tra kết nối PPPoE: ${err.message}`);
  }
}

module.exports = { monitorPPPoEs };
