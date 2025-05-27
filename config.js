require('dotenv').config();

const CONFIG = {
  discord: {
    token: process.env.DISCORD_TOKEN || '',
    guildId: process.env.DISCORD_GUILD_ID || '',
    channelIdNotiRouter: process.env.DISCORD_CHANNEL_ID_NOTI_ROUTER || '',
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
    timedeleteMessage: 10000,
    timedeleteImg: 30000
  }
};

if (!CONFIG.discord.token || !CONFIG.router.host || !CONFIG.db.host) {
  throw new Error('❌ Missing required configuration in .env file.');
}

module.exports = CONFIG;