const { router } = require('../config');
const { sendAndDeleteMessage } = require('../utils/messageUtils');

const handleSystemInfo = async (bot, chatId) => {
  try {
    const [res, identity] = await Promise.all([
      router.write('/system/resource/print'),
      router.write('/system/identity/print')
    ]);

    const status = res[0];
    const name = identity[0].name;

    const message = `🖥️ *THÔNG TIN PC ROUTER:*
🔧 *NAME*: ${name}
⚙️ *CPU*: ${status['cpu-load']}%
🧠 *RAM*: ${status['free-memory']} bytes
💾 *DISK*: ${status['total-memory']} bytes
⏱️ *UPTIME*: ${status['uptime']}
🛠️ *ROUTEROS*: ${status['version']}`;

    sendAndDeleteMessage(bot, chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    sendAndDeleteMessage(bot, chatId, '❌ Lỗi khi lấy thông tin hệ thống.');
  }
};

const handleListConnections = async (bot, chatId) => {
  try {
    const result = await router.write('/ip/arp/print');
    let message = '🔌 *DANH SÁCH KẾT NỐI ARP:*\n\n';
    result.forEach((c, i) => {
      message += `🔹 ${i + 1}. IP: ${c.address}, MAC: ${c['mac-address']}\n`;
    });
    sendAndDeleteMessage(bot, chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    sendAndDeleteMessage(bot, chatId, '❌ Lỗi khi lấy danh sách kết nối.');
  }
};

const handleInterfaceStatus = async (bot, chatId) => {
  try {
    const result = await router.write('/interface/print');
    let message = '🌐 *TRẠNG THÁI GIAO DIỆN:*\n\n';
    result.forEach((iface) => {
      message += `🔸 ${iface.name}: ${iface.running ? '✅ *Hoạt động*' : '❌ *Dừng*'}\n`;
    });
    sendAndDeleteMessage(bot, chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    sendAndDeleteMessage(bot, chatId, '❌ Lỗi khi lấy trạng thái giao diện.');
  }
};

module.exports = { handleSystemInfo, handleListConnections, handleInterfaceStatus };
