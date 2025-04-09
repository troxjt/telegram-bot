// ==========================
// 🔐 TELEGRAM BOT + ROUTEROS
// ==========================

const TelegramBot = require('node-telegram-bot-api');
const { RouterOSAPI } = require('node-routeros');
const { exec } = require('child_process');

// ==========================
// 🔧 CẤU HÌNH HỆ THỐNG
// ==========================
const CONFIG = {
  telegram: {
    token: '7703387581:AAFbcNP5TzESZwh09kiqetIsczbqn6ybPSY',
    chatId: '-1002545905741',
    allowedUserId: 5865055827
  },
  router: {
    host: '192.168.123.1',
    port: 8728,
    user: 'troxjt',
    password: 'Trox071299@@'
  }
};

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

  switch (action) {
    case 'menu':
      return showMenu(chatId);

    case 'get_system_info':
      bot.sendMessage(chatId, '🖥️ Đang lấy thông tin hệ thống...');
      return handleSystemInfo(chatId);

    case 'list_connections':
      bot.sendMessage(chatId, '🔍 Đang lấy danh sách kết nối...');
      return handleListConnections(chatId);

    case 'check_bandwidth':
      bot.sendMessage(chatId, '📡 Đang kiểm tra băng thông...');
      return handleBandwidth(chatId);

    case 'interface_status':
      bot.sendMessage(chatId, '🌐 Đang kiểm tra trạng thái giao diện...');
      return handleInterfaceStatus(chatId);

    case 'show_blacklist':
      bot.sendMessage(chatId, '📥 Đang lấy danh sách blacklist tổng hợp...');
      return handleBlacklist(chatId);

    case 'update_code_bot':
      bot.sendMessage(chatId, '⚙️ Đang cập nhật code bot...');
      return execUpdate(chatId);

    case 'reboot_router':
      bot.sendMessage(chatId, '⚠️ Chuẩn bị khởi động lại router...');
      return rebootRouter(chatId);
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
      message += `🔸 ${iface.name}: ⬇️ ${(iface['rx-byte']/1048576).toFixed(2)} MB / ⬆️ ${(iface['tx-byte']/1048576).toFixed(2)} MB\n`;
    });
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(chatId, '❌ Lỗi khi lấy thông tin băng thông.');
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
      const entries = await router.write('/ip/firewall/address-list/print', [`?list=${list}`]);
      message += `📂 *${list.toUpperCase()}* (${entries.length} mục):\n`;
      if (entries.length === 0) message += '_Không có địa chỉ nào._\n\n';
      else {
        entries.forEach((e, i) => {
          const comment = e.comment ? `(${e.comment})` : '';
          message += ` ${i + 1}. ${e.address} ${comment}\n`;
        });
        message += '\n';
      }
    } catch (err) {
      message += `⚠️ Lỗi khi lấy danh sách ${list}: ${err.message}\n\n`;
    }
  }

  const chunks = message.match(/([\s\S]{1,3500})/g);
  chunks.forEach(chunk => bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown' }));
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