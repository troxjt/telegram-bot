const TelegramBot = require('node-telegram-bot-api');
const { telegram } = require('./config');
const db = require('./db');
const startWebServer = require('./server');
const { initializeBotFeatures } = require('./features'); // Import feature initialization

const bot = new TelegramBot(telegram.token, { polling: true });

(async () => {
  try {
    console.log('[INIT] Connecting to database...');
    await db.connect();

    console.log('[WEB] Starting web server...');
    startWebServer(81);

    console.log('[BOT] Initializing features...');
    initializeBotFeatures(bot); // Initialize all bot features

    console.log('[BOT] Telegram bot is ready.');
  } catch (err) {
    console.error('[ERROR] Failed to start bot:', err.message);
    process.exit(1);
  }
})();