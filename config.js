require('dotenv').config();

const CONFIG = {
  telegram: {
    token: process.env.TELEGRAM_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
    allowedUserId: parseInt(process.env.TELEGRAM_ALLOWED_USER_ID, 10)
  },
  router: {
    host: process.env.ROUTER_HOST,
    port: parseInt(process.env.ROUTER_PORT, 10),
    user: process.env.ROUTER_USER,
    password: process.env.ROUTER_PASSWORD
  },
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },
  message: {
    timedeleteMessage: 10000,
    timedeleteImg: 30000
  }
};

module.exports = CONFIG;