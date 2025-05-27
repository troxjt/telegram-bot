const { Client, Collection, GatewayIntentBits, EmbedBuilder  } = require("discord.js");
const { token } = require('./config');
const { AI_GiamSat, AI_Firewall } = require('./models/ai_firewall');
const { monitorPPPoEs } = require('./models/wan_monitor');
const { logToFile } = require('./utils/log');
const { sendDiscordMsg } = require('./utils/messageUtils');
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

client.checkChannel = function CheckChannel(Client, ChannelId) {
	if (Name && Client && ChannelId ) {
		const Channel = Client.channels.cache.get(ChannelId);
		if (Channel) {
			return Channel;
		} else {
			console.error(`Kênh không tồn tại!`);
		};
	} else {
		console.error('Thiếu dữ liệu');
	};
},

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
    client.login(token);
    sendDiscordMsg('1376735228441133136', '[BOT] Bot đã sẵn sàng.');
  } catch (err) {
    logToFile('[LỖI] Không thể bắt đầu bot:', err.message);
    process.exit(1);
  }
})();

module.exports = { client };