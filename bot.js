const { Client, Collection, GatewayIntentBits, EmbedBuilder  } = require("discord.js");
const fs = require('fs');
const path = require("node:path");
const { discord } = require('./config');
const { logToFile } = require('./utils/log');
const db = require('./db');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildVoiceStates,
	],
});

const AI_Firewall_Path = path.join(__dirname, "ai");
const AI_Firewall_Files = fs
	.readdirSync(AI_Firewall_Path)
	.filter((file) => file.endsWith(".js"));

for (const file of AI_Firewall_Files) {
	const filePath = path.join(AI_Firewall_Path, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args, client));
	}
}

(async () => {
  try {
    await db.connect();
    logToFile('[INIT] Đã kết nối với cơ sở dữ liệu.');
    client.login(discord.token);
    logToFile('[BOT] Bot đã sẵn sàng.');
  } catch (err) {
    logToFile('[LỖI] Không thể bắt đầu bot:', err.message);
    process.exit(1);
  }
})();

module.exports = { client };