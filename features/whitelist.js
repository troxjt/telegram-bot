const { sendAndDeleteMessage } = require('../utils/messageUtils');
const { logToFile } = require('../utils/log');
const db = require('../db');
const { addToWhitelist } = require('../models/whitelist');
const { connect, safeWrite } = require('../models/mikrotik');

const addWhitelistFlow = async (bot, chatId) => {
  try {
    // Lấy danh sách thiết bị chưa có trong whitelist
    const arpList = await getUnwhitelistedDevices();
    if (arpList.length === 0) {
      sendAndDeleteMessage(bot, chatId, '✅ Tất cả thiết bị đã có trong whitelist.');
      return;
    }

    // Hiển thị danh sách để chọn
    const keyboard = arpList.slice(0, 10).map((d, idx) => [
      { text: `${d.mac} (${d.ip})`, callback_data: `addwl_${d.mac}_${d.ip}` }
    ]);
    sendAndDeleteMessage(bot, chatId, '*Chọn thiết bị để thêm vào whitelist:*', {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });

    // Lắng nghe callback chọn thiết bị
    const cbHandler = async (cbq) => {
      if (!cbq.data.startsWith('addwl_')) return;
      await bot.answerCallbackQuery(cbq.id);
      const [_, mac, ip] = cbq.data.split('_');
      await handleAddWhitelist(bot, chatId, mac, ip);
      bot.removeListener('callback_query', cbHandler);
    };
    bot.on('callback_query', cbHandler);
  } catch (err) {
    logToFile(`[LỖI] Không thể lấy danh sách thiết bị chưa whitelist: ${err.message}`);
    sendAndDeleteMessage(bot, chatId, '❌ Lỗi khi lấy danh sách thiết bị.');
  }
};

// Lấy danh sách thiết bị chưa có trong whitelist
async function getUnwhitelistedDevices() {
  // Lấy danh sách ARP từ Mikrotik
  const router = await connect();
  const arp = await safeWrite(router, '/ip/arp/print');
  // Lấy danh sách MAC đã whitelist
  const whitelist = await db.query('SELECT mac FROM whitelist');
  const whitelistedMacs = whitelist.map(r => r.mac);
  // Lọc thiết bị chưa whitelist
  const result = [];
  for (const d of arp) {
    const mac = d['mac-address'];
    const ip = d['address'];
    if (mac && ip && !whitelistedMacs.includes(mac)) {
      result.push({ mac, ip });
    }
  }
  return result;
}

// Xử lý thêm vào whitelist và dọn dẹp
async function handleAddWhitelist(bot, chatId, mac, ip) {
  try {
    // Thêm vào whitelist
    await addToWhitelist(ip, mac);

    // Xóa khỏi các bảng liên quan trong DB
    await db.query('DELETE FROM bandwidth_limits WHERE mac = ?', [mac]);
    await db.query('DELETE FROM blocked_ips WHERE ip = ?', [ip]);
    await db.query('DELETE FROM suspicious_devices WHERE mac = ?', [mac]);

    // Xóa giới hạn/blocked trên Mikrotik
    const router = await connect();
    const queues = await safeWrite(router, '/queue/simple/print');

    for (const queue of queues) {
      if (queue.target === ip) {
        await safeWrite(router, '/queue/simple/remove', [
          { '.id': queue['.id'] }
        ]);
        console.log(queue.name, queue.target);
      }
    }

    sendAndDeleteMessage(bot, chatId, `✅ Đã thêm thiết bị ${mac} (${ip}) vào whitelist và dọn dẹp thành công.`);
    logToFile(`[WHITELIST] Đã thêm MAC: ${mac}, IP: ${ip} và dọn dẹp liên quan`);
  } catch (err) {
    logToFile(`[LỖI] Không thể thêm MAC vào whitelist: ${err.message}`);
    sendAndDeleteMessage(bot, chatId, '❌ Lỗi khi thêm thiết bị vào whitelist.');
  }
}

module.exports = { addWhitelistFlow };