const TelegramBot = require('node-telegram-bot-api');
const { telegram } = require('./config');
const { initializeBotFeatures } = require('./features');
const { monitorDevices, startWebServer } = require('./server');
const { processFirewallLists } = require('./models/mikrotik');
const { logToFile } = require('./utils/log');
const db = require('./db');

const bot = new TelegramBot(telegram.token, { polling: true });

// Initialize periodic device monitoring
monitorDevices();
setInterval(monitorDevices, 60000);

// Schedule firewall list processing
setInterval(async () => {
  try {
    await processFirewallLists();
  } catch (err) {
    logToFile(`[ERROR] Failed to process firewall lists: ${err.message}`);
  }
}, 60000);

(async () => {
  try {
    logToFile('[INIT] Kết nối với cơ sở dữ liệu ...');
    await db.connect();
    logToFile('[WEB] Bắt đầu máy chủ web ...');
    startWebServer(3000);
    logToFile('[BOT] Khởi tạo các tính năng bot ...');
    initializeBotFeatures(bot);
    logToFile('[BOT] Bot Telegram đã sẵn sàng.');
  } catch (err) {
    logToFile('[LỖI] Không thể bắt đầu bot:', err.message);
    process.exit(1);
  }
})();