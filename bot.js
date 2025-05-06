const TelegramBot = require('node-telegram-bot-api');
const { telegram } = require('./config');
const { sendAndDeleteMessage } = require('./utils/messageUtils');
const { showMenu, handleCallbackQuery } = require('./features/menu');
const db = require('./db');
const startWebServer = require('./server');

const bot = new TelegramBot(telegram.token, { polling: true });

(async () => {
  try {
    console.log('[INIT] Connecting to database...');
    await db.connect();

    console.log('[WEB] Starting web server...');
    startWebServer(81);

    console.log('[BOT] Telegram bot is running...');
    bot.onText(/\/start/, (msg) => {
      if (msg.from.id !== telegram.allowedUserId)
        return sendAndDeleteMessage(bot, msg.chat.id, '🚫 You are not authorized to use this bot.');

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

    console.log('[BOT] Telegram bot is ready.');
  } catch (err) {
    console.error('[ERROR] Failed to start bot:', err.message);
    process.exit(1);
  }
})();