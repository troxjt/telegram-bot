const TelegramBot = require('node-telegram-bot-api');
const { telegram } = require('./config');
const { initializeBotFeatures } = require('./features');
const { monitorDevices, processFirewallLists } = require('./server');
const { logToFile } = require('./utils/log');
const db = require('./db');

const bot = new TelegramBot(telegram.token, { polling: true });

// Khởi tạo giám sát thiết bị định kỳ
monitorDevices();
setInterval(monitorDevices, 60000);

// Lên lịch xử lý danh sách tường lửa
processFirewallLists();
setInterval(processFirewallLists, 10000);

(async () => {
  try {
    logToFile('[INIT] Kết nối với cơ sở dữ liệu ...');
    await db.connect();
    logToFile('[BOT] Khởi tạo các tính năng bot ...');
    initializeBotFeatures(bot);
    logToFile('[BOT] Bot Telegram đã sẵn sàng.');
  } catch (err) {
    logToFile('[LỖI] Không thể bắt đầu bot:', err.message);
    process.exit(1);
  }
})();