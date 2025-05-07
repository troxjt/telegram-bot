const TelegramBot = require('node-telegram-bot-api');
const { telegram } = require('./config');
const { initializeBotFeatures } = require('./features');
const { monitorDevices, startWebServer } = require('./server');
const db = require('./db');

const bot = new TelegramBot(telegram.token, { polling: true });

// Initialize periodic device monitoring
monitorDevices();
setInterval(monitorDevices, 10000);

(async () => {
  try {
    console.log('[INIT] Kết nối với cơ sở dữ liệu ...');
    await db.connect();

    console.log('[WEB] Bắt đầu máy chủ web ...');
    startWebServer(3000);

    console.log('[BOT] Khởi tạo các tính năng bot ...');
    initializeBotFeatures(bot);

    console.log('[BOT] Bot Telegram đã sẵn sàng.');
  } catch (err) {
    console.error('[LỖI] Không thể bắt đầu bot:', err.message);
    process.exit(1);
  }
})();