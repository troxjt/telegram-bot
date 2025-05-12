const { connect, safeWrite } = require('./mikrotik');
const { GuiThongBaoTele } = require('../utils/messageUtils');
const redis = require('redis').createClient();
const WANS = [
  { name: 'WAN1', gateway: '8.8.8.8', routeMark: 'WAN1' },
  { name: 'WAN2', gateway: '1.1.1.1', routeMark: 'WAN2' }
];

// Kết nối Redis (nếu chưa kết nối)
redis.connect().catch(console.error);

async function checkWanStatus(client, wan) {
  try {
    const result = await safeWrite(client, '/ping', [
      `=address=${wan.gateway}`,
      '=count=2',
      '=interval=1s',
      '=timeout=1000ms'
    ]);
    return result.length > 0;
  } catch (err) {
    console.error(`[WAN Monitor] Ping thất bại: ${wan.name}`, err.message);
    return false;
  }
}

async function toggleWanRoute(client, wan, enable = true) {
  const routes = await safeWrite(client, '/ip/route/print', [`?routing-mark=${wan.routeMark}`]);
  for (const r of routes) {
    const action = enable ? '/ip/route/enable' : '/ip/route/disable';
    await safeWrite(client, action, [`=.id=${r['.id']}`]);
    console.log(`[WAN Monitor] ${enable ? 'Bật' : 'Tắt'} route cho ${wan.name}`);
  }
}

async function monitorWANs() {
  const client = await connect();

  for (const wan of WANS) {
    const alive = await checkWanStatus(client, wan);
    const stateKey = `wan_state_${wan.name}`;
    const previous = await redis.get(stateKey);

    if (!alive && previous !== 'down') {
      await toggleWanRoute(client, wan, false);
      await GuiThongBaoTele(`\u26A0\uFE0F *MẤT KẾT NỐI* \u26A0\uFE0F\nĐường truyền *${wan.name}* không phản hồi (${wan.gateway})\n\uD83D\uDD04 Chuyển tải về đường còn lại.`);
      await redis.set(stateKey, 'down');
    } else if (alive && previous === 'down') {
      await toggleWanRoute(client, wan, true);
      await GuiThongBaoTele(`✅ *HOẠT ĐỘNG TRỞ LẠI* ✅\nĐường truyền *${wan.name}* đã phản hồi (${wan.gateway})\n\uD83D\uDEE0\uFE0F Đã bật lại cân bằng tải.`);
      await redis.set(stateKey, 'up');
    } else {
      console.log(`[WAN Monitor] ${wan.name}: trạng thái ${alive ? 'up' : 'down'} không thay đổi.`);
    }
  }
}

module.exports = { monitorWANs };