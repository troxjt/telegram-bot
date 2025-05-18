const { logToFile } = require('../utils/log');
const { sendAndDeleteMessage } = require('../utils/messageUtils');
const { handleBlacklist } = require('./blacklist');
const { execUpdate, confirmReboot, rebootRouter } = require('./reboot');
const { addWhitelistFlow } = require('./whitelist'); // thêm dòng này

const showMenu = (bot, chatId) => {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📛 Danh sách chặn', callback_data: 'show_blacklist' }
        ],
        [
          { text: '➕ Thêm thiết bị tin cậy', callback_data: 'add_whitelist' } // thêm nút này
        ],
        [
          { text: '🧠 Cập nhật Bot', callback_data: 'update_code_bot' },
          { text: '🔁 Khởi động lại', callback_data: 'reboot_router' }
        ]
      ]
    }
  };

  const welcome = `📊 *BẢNG ĐIỀU KHIỂN ROUTER*\n\nChọn một chức năng để quản lý hệ thống của bạn:`;
  bot.sendMessage(chatId, welcome, { parse_mode: 'Markdown', ...options });
};

const handleCallbackQuery = async (bot, cbq) => {
  const chatId = cbq.message.chat.id;
  const action = cbq.data;

  try {
    await bot.answerCallbackQuery(cbq.id);

    switch (action) {
      case 'menu':
        return showMenu(bot, chatId);
      case 'show_blacklist':
        return handleBlacklist(bot, chatId);
      case 'add_whitelist':
        return addWhitelistFlow(bot, chatId); // thêm dòng này
      case 'update_code_bot':
        return execUpdate(bot, chatId);
      case 'reboot_router':
        return confirmReboot(bot, chatId);
      case 'confirm_reboot_yes':
        return rebootRouter(bot, chatId);
      default:
        return sendAndDeleteMessage(bot, chatId, '❌ Lệnh không hợp lệ.');
    }
  } catch (err) {
    logToFile('❌ Lỗi xử lý callback:', err);
    sendAndDeleteMessage(bot, chatId, '❌ Đã xảy ra lỗi khi xử lý yêu cầu.');
  }
};

module.exports = { showMenu, handleCallbackQuery };
