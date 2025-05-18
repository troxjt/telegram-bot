const { sendAndDeleteMessage } = require('../utils/messageUtils');
const { logToFile } = require('../utils/log');
const db = require('../db');
const { addToWhitelist } = require('../models/whitelist');

const addWhitelistFlow = (bot, chatId) => {
  sendAndDeleteMessage(bot, chatId, '📝 Vui lòng nhập địa chỉ MAC của thiết bị muốn thêm vào whitelist (ví dụ: AA:BB:CC:DD:EE:FF):');
  bot.once('message', async (msg) => {
    const mac = (msg.text || '').trim().toUpperCase();
    // Kiểm tra định dạng MAC đơn giản
    if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac)) {
      sendAndDeleteMessage(bot, chatId, '❌ Định dạng MAC không hợp lệ. Hủy thao tác.');
      return;
    }
    try {
      const exists = await db.query('SELECT 1 FROM whitelist WHERE mac = ?', [mac]);
      if (exists.length > 0) {
        sendAndDeleteMessage(bot, chatId, `⚠️ Thiết bị với MAC ${mac} đã có trong whitelist.`);
        return;
      }
      await addToWhitelist(mac);
      sendAndDeleteMessage(bot, chatId, `✅ Đã thêm thiết bị ${mac} vào whitelist.`);
      logToFile(`[WHITELIST] Đã thêm MAC: ${mac}`);
    } catch (err) {
      logToFile(`[LỖI] Không thể thêm MAC vào whitelist: ${err.message}`);
      sendAndDeleteMessage(bot, chatId, '❌ Lỗi khi thêm thiết bị vào whitelist.');
    }
  });
};

module.exports = { addWhitelistFlow };