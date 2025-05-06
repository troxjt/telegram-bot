const { connect } = require('../models/mikrotik');
const { sendAndDeleteMessage } = require('../utils/messageUtils');

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
  try {
    const router = await connect(); // Ensure connection to RouterOS
    const list = await router.write('/ip/firewall/address-list/print');
    const smartList = list.filter((e) => e.list === 'ai_blacklist');

    if (smartList.length === 0) {
      return sendAndDeleteMessage(bot, chatId, '✅ Không có IP nào bị AI chặn.');
    }

    let msg = '🧠 *DANH SÁCH AI BLOCKED:*\n\n';
    smartList.forEach((e, i) => {
      msg += `🔹 ${i + 1}. ${e.address} (${e.comment || 'No comment'})\n`;
    });

    sendAndDeleteMessage(bot, msg, { parse_mode: 'Markdown' });

  } catch (err) {
    sendAndDeleteMessage(bot, chatId, '❌ Lỗi khi đọc danh sách AI block.');
  }
};

module.exports = { showAIMenu, showAIDefenseList };
