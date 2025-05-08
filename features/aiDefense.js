const { getConnection, releaseConnection, safeWrite } = require('../models/mikrotik');
const { sendAndDeleteMessage } = require('../utils/messageUtils');
const { logToFile } = require('../utils/log');

const showAIMenu = (bot, chatId) => {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📛 Danh sách IP bị AI chặn', callback_data: 'ai_defense_list' }
        ],
        [
          { text: '🔙 Quay lại', callback_data: 'menu' }
        ]
      ]
    }
  };

  sendAndDeleteMessage(bot, chatId, '🧠 *Tường lửa học máy - AI Defense*\n\nChọn chức năng:', {
    parse_mode: 'Markdown',
    ...options
  });
};

const showAIDefenseList = async (bot, chatId) => {
  let router;
  try {
    router = await getConnection();
    const smartList = await safeWrite(router, '/ip/firewall/address-list/print', ['?list=ai_blacklist']);

    if (smartList.length === 0) {
      return sendAndDeleteMessage(bot, chatId, '✅ Không có IP nào bị AI chặn.');
    }

    const MAX_MESSAGE_LENGTH = 4000;
    let msg = '🧠 *DANH SÁCH AI BLOCKED:*\n\n';
    smartList.forEach((e, i) => {
      const entry = `🔹 ${i + 1}. ${e.address} (${e.comment || 'No comment'})\n`;
      if ((msg + entry).length > MAX_MESSAGE_LENGTH) {
        sendAndDeleteMessage(bot, chatId, msg, { parse_mode: 'Markdown' });
        msg = '';
      }
      msg += entry;
    });

    if (msg) {
      sendAndDeleteMessage(bot, chatId, msg, { parse_mode: 'Markdown' });
    }

  } catch (err) {
    logToFile(`[ERROR] Failed to fetch AI block list: ${err.message}`);
    sendAndDeleteMessage(bot, chatId, '❌ Lỗi khi đọc danh sách AI block.');
  } finally {
    if (router) releaseConnection(router);
  }
};

module.exports = { showAIMenu, showAIDefenseList };
