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
// 📥 MENU & LỆNH CƠ BẢN
// ==========================
bot.onText(/\/start/, (msg) => {
  if (msg.from.id !== CONFIG.telegram.allowedUserId)
    return bot.sendMessage(msg.chat.id, '🚫 Bạn không có quyền sử dụng bot này.');

  bot.sendMessage(msg.chat.id, '🎮 *Chào bạn!* Dùng menu để điều khiển Router:', {
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
  bot.sendMessage(chatId, '📲 *Chọn một tùy chọn từ menu:*', { parse_mode: 'Markdown', ...options });
};

// ==========================
// ⚡ XỬ LÝ CALLBACK
// ==========================
bot.on('callback_query', async (cbq) => {
  const chatId = cbq.message.chat.id;
  const action = cbq.data;

  try {
    switch (action) {
      case 'menu':
        await bot.answerCallbackQuery(cbq.id);
        return showMenu(chatId);
      case 'get_system_info':
        await bot.answerCallbackQuery(cbq.id);
        return handleSystemInfo(chatId);
      case 'list_connections':
        await bot.answerCallbackQuery(cbq.id);
        return handleListConnections(chatId);
      case 'check_bandwidth':
        await bot.answerCallbackQuery(cbq.id);
        return handleBandwidth(chatId);
      case 'interface_status':
        await bot.answerCallbackQuery(cbq.id);
        return handleInterfaceStatus(chatId);
      case 'show_blacklist':
        await bot.answerCallbackQuery(cbq.id);
        return handleBlacklist(chatId);
      case 'update_code_bot':
        await bot.answerCallbackQuery(cbq.id);
        return execUpdate(chatId);
      case 'reboot_router':
        await bot.answerCallbackQuery(cbq.id);
        return rebootRouter(chatId);
      default:
        await bot.answerCallbackQuery(cbq.id, { text: '❌ Lệnh không hợp lệ.' });
    }
  } catch (err) {
    console.error('❌ Lỗi xử lý callback:', err);
    await bot.answerCallbackQuery(cbq.id, { text: '❌ Đã xảy ra lỗi khi xử lý yêu cầu.' });
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

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(chatId, '❌ Lỗi khi lấy thông tin hệ thống.');
  }
};

const handleListConnections = async (chatId) => {
  try {
    const result = await router.write('/ip/arp/print');
    let message = '🔌 *DANH SÁCH KẾT NỐI ARP:*\n\n';
    result.forEach((c, i) => {
      message += `🔹 ${i + 1}. IP: ${c.address}, MAC: ${c['mac-address']}\n`;
    });
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(chatId, '❌ Lỗi khi lấy danh sách kết nối.');
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

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(chatId, '❌ Lỗi khi lấy thông tin băng thông.');
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
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(chatId, '❌ Lỗi khi lấy trạng thái giao diện.');
  }
};

const handleBlacklist = async (chatId) => {
  const lists = ['blacklist', 'ssh_blacklist', 'ftp_blacklist', 'port_scanners'];
  let message = '📛 *DANH SÁCH ĐỊA CHỈ BỊ CHẶN:*\n\n';

  for (const list of lists) {
    try {
      const entries = await router.write('/ip/firewall/address-list/print', [
        `?list=${list}`
      ]);

      // Nếu Mikrotik trả về !empty, ta kiểm tra bằng typeof entries === 'object' && !Array.isArray()
      if (!Array.isArray(entries) || entries.length === 0 || (entries.length === 1 && entries[0]['!re'] === '!empty')) {
        message += `📂 *${list.toUpperCase()}*: _Không có địa chỉ nào._\n\n`;
        continue;
      }

      message += `📂 *${list.toUpperCase()}* (${entries.length} mục):\n`;
      entries.forEach((e, i) => {
        const comment = e.comment ? `(${e.comment})` : '';
        message += ` ${i + 1}. ${e.address} ${comment}\n`;
      });
      message += '\n';
    } catch (err) {
      console.error(`❌ Lỗi khi lấy danh sách ${list}:`, err);
      message += `⚠️ Lỗi khi lấy danh sách ${list}: ${err.message}\n\n`;
    }
  }

  // Tách tin nhắn lớn nếu cần
  const chunks = message.match(/([\s\S]{1,3500})/g) || [];
  if (chunks.length === 0) {
    bot.sendMessage(chatId, '❌ Không thể lấy danh sách blacklist.');
  } else {
    for (const chunk of chunks) {
      await bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown' });
    }
  }
};

const execUpdate = (chatId) => {
  exec('cd /home/troxjt/telegram-bot && git pull && pm2 restart telegram-bot', (err) => {
    if (err) bot.sendMessage(chatId, '❌ Lỗi khi cập nhật bot.');
    else bot.sendMessage(chatId, '✅ Bot đã được cập nhật và khởi động lại.');
  });
};

const rebootRouter = async (chatId) => {
  try {
    await router.write('/system/reboot');
    bot.sendMessage(chatId, '🔁 RouterOS đang khởi động lại...');
  } catch (err) {
    bot.sendMessage(chatId, '❌ Lỗi khi khởi động lại Router.');
  }
};