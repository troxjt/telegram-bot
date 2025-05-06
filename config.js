require('dotenv').config();

const CONFIG = {
  telegram: {
    token: process.env.TELEGRAM_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    allowedUserId: parseInt(process.env.TELEGRAM_ALLOWED_USER_ID, 10) || 0
  },
  router: {
    host: process.env.ROUTER_HOST || '',
    port: parseInt(process.env.ROUTER_PORT, 10) || 8728,
    user: process.env.ROUTER_USER || '',
    password: process.env.ROUTER_PASSWORD || ''
  },
  db: {
    host: process.env.DB_HOST || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },
  message: {
    timedeleteMessage: 5000, // Thời gian xóa tin nhắn (ms)
    timedeleteImg: 5000 // Thời gian xóa ảnh (ms)
  }
};

if (!CONFIG.telegram.token || !CONFIG.router.host || !CONFIG.db.host) {
  throw new Error('❌ Missing required configuration in .env file.');
}

module.exports = CONFIG;