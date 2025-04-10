require('dotenv').config();

module.exports = {
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
  }
};