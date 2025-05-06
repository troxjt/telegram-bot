const { router } = require('../config');
const { sendAndDeleteMessage } = require('../utils/messageUtils');

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
  try {
    await router.write('/system/reboot');
    sendAndDeleteMessage(bot, chatId, '🔁 RouterOS đang khởi động lại...');
  } catch (err) {
    sendAndDeleteMessage(bot, chatId, '❌ Lỗi khi khởi động lại Router.');
  }
};

module.exports = { confirmReboot, rebootRouter };
