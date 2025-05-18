const TelegramBot = require('node-telegram-bot-api');
const { telegram } = require('./config');
const { initializeBotFeatures } = require('./features');
const { AI_GiamSat, AI_Firewall } = require('./models/ai_firewall');
const { monitorPPPoEs } = require('./models/wan_monitor');
const { logToFile } = require('./utils/log');
const db = require('./db');

const bot = new TelegramBot(telegram.token, { polling: true });

// Xử lý danh sách tường lửa
AI_Firewall();
setInterval(AI_Firewall, 1*60*1000);

// Giám sát thiết bị định kỳ
AI_GiamSat();
setInterval(AI_GiamSat, 2*60*1000);

// Kiểm tra kết nối WAN định kỳ
monitorPPPoEs();
setInterval(monitorPPPoEs, 5*60*1000);

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