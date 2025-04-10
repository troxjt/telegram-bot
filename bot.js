// ==========================
// 🔐 TELEGRAM BOT + ROUTEROS
// ==========================

const TelegramBot = require('node-telegram-bot-api');
const { RouterOSAPI } = require('node-routeros');
const { exec } = require('child_process');
const CONFIG = require('./config');

// ==========================
// 🤖 KHỞI TẠO TELEGRAM BOT
// ==========================
const bot = new TelegramBot(CONFIG.telegram.token, { polling: true });

// ==========================
// 🌐 KẾT NỐI ROUTEROS API
// ==========================
const router = new RouterOSAPI({
  host: CONFIG.router.host,
  user: CONFIG.router.user,
  password: CONFIG.router.password,
  port: CONFIG.router.port,
  timeout: 30000
});

router.connect()
  .then(() => console.log('✅ Đã kết nối RouterOS'))
  .catch(err => console.error('❌ Lỗi kết nối RouterOS:', err));

// ==========================
// 🛠️ HÀM TIỆN ÍCH
// ==========================
const sendAndDeleteMessage = async (chatId, text, options = {}) => {
  try {
    const sentMessage = await bot.sendMessage(chatId, text, options);
    setTimeout(() => {
      bot.deleteMessage(chatId, sentMessage.message_id).catch((err) => {
        console.error('❌ Lỗi khi xóa tin nhắn:', err);
      });
    }, 15000); // 15 giây
  } catch (err) {
    console.error('❌ Lỗi khi gửi tin nhắn:', err);
  }
};

// ==========================
// 📥 MENU & LỆNH CƠ BẢN
// ==========================
bot.onText(/\/start/, (msg) => {
  if (msg.from.id !== CONFIG.telegram.allowedUserId)
    return sendAndDeleteMessage(msg.chat.id, '🚫 Bạn không có quyền sử dụng bot này.');

  sendAndDeleteMessage(msg.chat.id, '🎮 *Chào bạn!* Dùng menu để điều khiển Router:', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📜 Hiển thị Menu', callback_data: 'menu' }]
      ]
    }
  });
});

bot.onText(/\/menu/, (msg) => showMenu(msg.chat.id));

const showMenu = (chatId) => {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🖥️ Thông tin hệ thống', callback_data: 'get_system_info' }],
        [{ text: '🔌 Danh sách kết nối', callback_data: 'list_connections' }],
        [{ text: '📶 Kiểm tra băng thông', callback_data: 'check_bandwidth' }],
        [{ text: '🌐 Trạng thái giao diện', callback_data: 'interface_status' }],
        [{ text: '📛 Danh sách IP bị chặn', callback_data: 'show_blacklist' }],
        [{ text: '🧠 Update code bot', callback_data: 'update_code_bot' }],
        [{ text: '🔁 Khởi động lại router', callback_data: 'reboot_router' }]
      ]
    }
  };
  sendAndDeleteMessage(chatId, '📲 *Chọn một tùy chọn từ menu:*', { parse_mode: 'Markdown', ...options });
};

// ==========================
// ⚡ XỬ LÝ CALLBACK
// ==========================
bot.on('callback_query', async (cbq) => {
  const chatId = cbq.message.chat.id;
  const action = cbq.data;

  try {
    await bot.answerCallbackQuery(cbq.id);
    switch (action) {
      case 'menu':
        return showMenu(chatId);
      case 'get_system_info':
        return handleSystemInfo(chatId);
      case 'list_connections':
        return handleListConnections(chatId);
      case 'check_bandwidth':
        return handleBandwidth(chatId);
      case 'interface_status':
        return handleInterfaceStatus(chatId);
      case 'show_blacklist':
        return handleBlacklist(chatId);
      case 'update_code_bot':
        return execUpdate(chatId);
      case 'reboot_router':
        return rebootRouter(chatId);
      default:
        return sendAndDeleteMessage(chatId, '❌ Lệnh không hợp lệ.');
    }
  } catch (err) {
    console.error('❌ Lỗi xử lý callback:', err);
    sendAndDeleteMessage(chatId, '❌ Đã xảy ra lỗi khi xử lý yêu cầu.');
  }
});

// ==========================
// 🧩 CÁC HÀM XỬ LÝ CHÍNH
// ==========================
const handleSystemInfo = async (chatId) => {
  try {
    const [res, identity, license] = await Promise.all([
      router.write('/system/resource/print'),
      router.write('/system/identity/print'),
      router.write('/system/license/print')
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

    sendAndDeleteMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    sendAndDeleteMessage(chatId, '❌ Lỗi khi lấy thông tin hệ thống.');
  }
};

const handleListConnections = async (chatId) => {
  try {
    const result = await router.write('/ip/arp/print');
    let message = '🔌 *DANH SÁCH KẾT NỐI ARP:*\n\n';
    result.forEach((c, i) => {
      message += `🔹 ${i + 1}. IP: ${c.address}, MAC: ${c['mac-address']}\n`;
    });
    sendAndDeleteMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    sendAndDeleteMessage(chatId, '❌ Lỗi khi lấy danh sách kết nối.');
  }
};

const handleBandwidth = async (chatId) => {
  try {
    const interfaces = await router.write('/interface/ethernet/print');
    let message = '📡 *BĂNG THÔNG HIỆN TẠI:*\n\n';

    interfaces.forEach((iface) => {
      const rx = parseInt(iface['rx-byte']) || 0;
      const tx = parseInt(iface['tx-byte']) || 0;
      const rxMB = (rx / 1048576).toFixed(2); // 1024 * 1024
      const txMB = (tx / 1048576).toFixed(2);

      message += `🔸 *${iface.name}*\n  ↘️ RX: ${rxMB} MB\n  ↗️ TX: ${txMB} MB\n\n`;
    });

    sendAndDeleteMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    sendAndDeleteMessage(chatId, '❌ Lỗi khi lấy thông tin băng thông.');
    console.error(err);
  }
};

const handleInterfaceStatus = async (chatId) => {
  try {
    const result = await router.write('/interface/print');
    let message = '🌐 *TRẠNG THÁI GIAO DIỆN:*\n\n';
    result.forEach((iface) => {
      message += `🔸 ${iface.name}: ${iface.running ? '✅ *Hoạt động*' : '❌ *Dừng*'}\n`;
    });
    sendAndDeleteMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    sendAndDeleteMessage(chatId, '❌ Lỗi khi lấy trạng thái giao diện.');
  }
};

const handleBlacklist = async (chatId) => {
  const lists = ['blacklist', 'ssh_blacklist', 'ftp_blacklist', 'port_scanners'];
  let message = '📛 *DANH SÁCH ĐỊA CHỈ BỊ CHẶN:*\n\n';

  try {
    const allEntries = await router.write('/ip/firewall/address-list/print');

    if (!Array.isArray(allEntries) || allEntries.length === 0) {
      sendAndDeleteMessage(chatId, '✅ Không có địa chỉ nào đang bị chặn.');
      return;
    }

    for (const list of lists) {
      const filtered = allEntries.filter((e) => e.list === list);

      if (filtered.length === 0) {
        message += `📂 *${list.toUpperCase()}*: _Không có địa chỉ nào._\n\n`;
        continue;
      }

      message += `📂 *${list.toUpperCase()}* (${filtered.length} mục):\n`;
      filtered.forEach((e, i) => {
        const comment = e.comment ? `(${e.comment})` : '';
        message += ` ${i + 1}. ${e.address} ${comment}\n`;
      });
      message += '\n';
    }

    const chunks = message.match(/([\s\S]{1,3500})/g) || [];
    for (const chunk of chunks) {
      await sendAndDeleteMessage(chatId, chunk, { parse_mode: 'Markdown' });
    }

  } catch (err) {
    console.error(`❌ Lỗi khi lấy danh sách address-list:`, err);
    sendAndDeleteMessage(chatId, '❌ Lỗi khi lấy danh sách blacklist.');
  }
};

const execUpdate = (chatId) => {
  exec('cd /home/troxjt/telegram-bot && git pull && pm2 restart telegram-bot', (err) => {
    if (err) sendAndDeleteMessage(chatId, '❌ Lỗi khi cập nhật bot.');
    else sendAndDeleteMessage(chatId, '✅ Bot đã được cập nhật và khởi động lại.');
  });
};

const rebootRouter = async (chatId) => {
  try {
    await router.write('/system/reboot');
    sendAndDeleteMessage(chatId, '🔁 RouterOS đang khởi động lại...');
  } catch (err) {
    sendAndDeleteMessage(chatId, '❌ Lỗi khi khởi động lại Router.');
  }
};