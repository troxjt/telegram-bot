const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const { telegram } = require('./config');
const { initializeBotFeatures } = require('./features');
const { monitorDevices, startWebServer } = require('./server');
const { processFirewallLists } = require('./models/mikrotik');
const db = require('./db');

// Custom logging function
function logToFile(message) {
  const logFilePath = path.join(__dirname, 'app.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`);
}

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
    await db.connect();
    startWebServer(3000);
    initializeBotFeatures(bot);
    logToFile('Bot Telegram đã sẵn sàng.');
  } catch (err) {
    logToFile(`Không thể bắt đầu bot: ${err.message}`);
    process.exit(1);
  }
})();