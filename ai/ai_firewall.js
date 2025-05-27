const { connect, safeWrite } = require('../models/mikrotik');
const { sendDiscordMsg } = require('../utils/messageUtils');
const { logToFile } = require('../utils/log');
const { discord } = require('../config');

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    async function AI_Firewall() {
      try {
        const routerConn = await connect();
        const FirewallAddressList = await safeWrite(routerConn, '/ip/firewall/address-list/print');

        if (FirewallAddressList.length > 0) {
          const ipScores = new Map();

          for (const entry of FirewallAddressList) {
            const ip = entry.address;
            const entrylist = entry.list;
            let score = ipScores.get(ip) || 0;

            if (entrylist === 'ai_port_scanner') {
              score += 30;
            } else if (entrylist === 'ai_brute_force') {
              score += 40;
            } else if (entrylist === 'ai_http_flood') {
              score += 30;
            } else if (entrylist === 'suspect_ips') {
              score += 20;
            }

            ipScores.set(ip, score);
          }

          for (const [ip, score] of ipScores.entries()) {
            if (score >= 60) {
              const isBlacklisted = FirewallAddressList.some(
                (entry) => entry.address === ip && entry.list === 'ai_blacklist'
              );

              if (!isBlacklisted) {
                await safeWrite(routerConn, '/ip/firewall/address-list/add', [
                  `=list=ai_blacklist`,
                  `=address=${ip}`,
                  `=timeout=24h`,
                  `=comment=Bi chan boi AI`
                ]);

                const text = `🚨 Đã chặn IP nguy hiểm!\nIP: ${ip}\nĐiểm: ${score}`;
                await sendDiscordMsg(client, discord.channelIdNotiRouter, text);
                logToFile(`[BÁO ĐỘNG] Đã chặn IP nguy hiểm: ${ip} với điểm ${score}`);
              }
            }
          }
        }

        logToFile('[THÔNG TIN] Danh sách tường lửa được xử lý thành công.');
      } catch (err) {
        logToFile(`[LỖI] Không xử lý danh sách tường lửa: ${err.message}`);
      }
    }

    // Xử lý danh sách tường lửa
    AI_Firewall();
    setInterval(AI_Firewall, 1*60*1000);
  },
};