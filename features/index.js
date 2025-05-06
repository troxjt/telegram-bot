const { showMenu, handleCallbackQuery } = require('./menu');

const initializeBotFeatures = (bot) => {
  bot.onText(/\/start/, (msg) => {
    const { sendAndDeleteMessage } = require('../utils/messageUtils');
    const { telegram } = require('../config');

    if (msg.from.id !== telegram.allowedUserId) {
      return sendAndDeleteMessage(bot, msg.chat.id, '🚫 You are not authorized to use this bot.');
    }

    sendAndDeleteMessage(bot, msg.chat.id, '🎮 *Welcome!* Use the menu to control the Router:', {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📜 Show Menu', callback_data: 'menu' }]
        ]
      }
    });
  });

  bot.onText(/\/menu/, (msg) => showMenu(bot, msg.chat.id));

  bot.on('callback_query', async (cbq) => {
    await handleCallbackQuery(bot, cbq);
  });
};

module.exports = { initializeBotFeatures };
