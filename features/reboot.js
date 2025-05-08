const { router } = require('../config');
const { exec } = require('child_process');
const { sendAndDeleteMessage } = require('../utils/messageUtils');
const { getConnection, releaseConnection, safeWrite } = require('../models/mikrotik');

const execUpdate = (bot, chatId) => {
  exec('cd /home/troxjt/telegram-bot && git pull && pm2 restart telegram-bot', (err) => {
    if (err) sendAndDeleteMessage(bot, chatId, '❌ Lỗi khi cập nhật bot.');
    else sendAndDeleteMessage(bot, chatId, '✅ Bot đã được cập nhật và khởi động lại.');
  });
};

const confirmReboot = async (bot, chatId) => {
  sendAndDeleteMessage(bot, chatId, '⚠️ *Bạn có chắc muốn khởi động lại Router không?*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Có, khởi động lại', callback_data: 'confirm_reboot_yes' },
          { text: '❌ Không', callback_data: 'confirm_reboot_no' }
        ]
      ]
    }
  });
};

const rebootRouter = async (bot, chatId) => {
  let router;
  try {
    router = await getConnection();
    await safeWrite(router, '/system/reboot');
    sendAndDeleteMessage(bot, chatId, '🔁 RouterOS đang khởi động lại...');
  } catch (err) {
    sendAndDeleteMessage(bot, chatId, '❌ Lỗi khi khởi động lại Router.');
  } finally {
    if (router) releaseConnection(router);
  }
};

module.exports = { execUpdate, confirmReboot, rebootRouter };
