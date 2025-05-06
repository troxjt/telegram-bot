const { connect } = require('../models/mikrotik');
const { sendAndDeleteMessage } = require('../utils/messageUtils');

const handleSystemInfo = async (bot, chatId) => {
  try {
    const router = await connect(); // Ensure connection to RouterOS
    const [res, identity] = await Promise.all([
      router.write('/system/resource/print'),
      router.write('/system/identity/print')
    ]);

    const status = res[0];
    const name = identity[0]?.name || 'Không xác định';

    const message = `🖥️ *THÔNG TIN ROUTER:*
🔧 *Tên*: ${name}
⚙️ *CPU*: ${status['cpu-load']}%
🧠 *RAM*: ${(status['free-memory'] / 1048576).toFixed(2)} MB
💾 *Ổ đĩa*: ${(status['total-memory'] / 1048576).toFixed(2)} MB
⏱️ *Thời gian hoạt động*: ${status['uptime']}
🛠️ *Phiên bản RouterOS*: ${status['version']}`;

    sendAndDeleteMessage(bot, chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('❌ Lỗi khi lấy thông tin hệ thống:', err.message);
    sendAndDeleteMessage(bot, chatId, '❌ Lỗi khi lấy thông tin hệ thống.');
  }
};

const handleListConnections = async (bot, chatId) => {
  try {
    const router = await connect(); // Ensure connection to RouterOS
    const result = await router.write('/ip/arp/print');
    let message = '🔌 *DANH SÁCH KẾT NỐI ARP:*\n\n';
    result.forEach((c, i) => {
      message += `🔹 ${i + 1}. IP: ${c.address}, MAC: ${c['mac-address']}\n`;
    });
    sendAndDeleteMessage(bot, chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('❌ Lỗi khi lấy danh sách kết nối:', err.message);
    sendAndDeleteMessage(bot, chatId, '❌ Lỗi khi lấy danh sách kết nối.');
  }
};

const handleInterfaceStatus = async (bot, chatId) => {
  try {
    const router = await connect(); // Ensure connection to RouterOS
    const result = await router.write('/interface/print');
    let message = '🌐 *TRẠNG THÁI GIAO DIỆN:*\n\n';
    result.forEach((iface) => {
      message += `🔸 ${iface.name}: ${iface.running ? '✅ *Hoạt động*' : '❌ *Dừng*'}\n`;
    });
    sendAndDeleteMessage(bot, chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('❌ Lỗi khi lấy trạng thái giao diện:', err.message);
    sendAndDeleteMessage(bot, chatId, '❌ Lỗi khi lấy trạng thái giao diện.');
  }
};

module.exports = { handleSystemInfo, handleListConnections, handleInterfaceStatus };
