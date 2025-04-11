// ==========================
// 🔐 TELEGRAM BOT + ROUTEROS
// ==========================

const TelegramBot = require('node-telegram-bot-api');
const { RouterOSAPI } = require('node-routeros');
const { exec } = require('child_process');
const fs = require('fs');
const path = './data/bandwidth.json';
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
    }, 5000); // 15 giây
  } catch (err) {
    console.error('❌ Lỗi khi gửi tin nhắn:', err);
  }
};

const sendAndDeleteImg = async (chatId, text, options = {}) => {
  try {
    const sentImg = await bot.sendPhoto(chatId, text, options);
    setTimeout(() => {
      bot.deleteMessage(chatId, sentImg.message_id).catch((err) => {
        console.error('❌ Lỗi khi xóa ảnh:', err);
      });
    }, 5000); // 15 giây
  } catch (err) {
    console.error('❌ Lỗi khi gửi ảnh:', err);
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
        [
          { text: '🖥️ Hệ thống', callback_data: 'get_system_info' },
          { text: '🌐 Giao diện', callback_data: 'interface_status' }
        ],
        [
          { text: '🔌 ARP', callback_data: 'list_connections' },
          { text: '📶 Băng thông', callback_data: 'check_bandwidth' }
        ],
        [
          { text: '📛 Blacklist', callback_data: 'show_blacklist' },
          { text: '🚫 Chặn IP', callback_data: 'block_ip_manual' }
        ],
        [
          { text: '📊 Biểu đồ mạng', callback_data: 'show_chart' },
          { text: '🤖 AI Defense', callback_data: 'ai_defense_menu' }
        ],        
        [
          { text: '🧠 Update Bot', callback_data: 'update_code_bot' },
          { text: '🔁 Reboot', callback_data: 'reboot_router' }
        ]
      ]
    }
  };

  const welcome = `📊 *BẢNG ĐIỀU KHIỂN ROUTER*\n\nChọn một chức năng để quản lý hệ thống của bạn:`;
  bot.sendMessage(chatId, welcome, { parse_mode: 'Markdown', ...options });
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
      case 'block_ip_manual':
        return askForIPBlock(chatId);
      case 'show_chart':
        return generateBandwidthChart(chatId);
      case 'ai_defense_menu':
        return showAIMenu(chatId);
      case 'ai_defense_list':
        return showAIDefenseList(chatId);        
      case 'update_code_bot':
        return execUpdate(chatId);
      case 'reboot_router':
        return confirmReboot(chatId);
      case 'confirm_reboot_yes':
        return rebootRouter(chatId);
      case 'confirm_reboot_no':
        return sendAndDeleteMessage(chatId, '🚫 Đã hủy thao tác khởi động lại.');
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

const askForIPBlock = (chatId) => {
  sendAndDeleteMessage(chatId, '📥 Nhập IP bạn muốn chặn:');
  const ipListener = async (msg) => {
    const ip = msg.text.trim();
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)$/;

    if (!ipRegex.test(ip)) {
      sendAndDeleteMessage(chatId, '❌ Địa chỉ IP không hợp lệ. Vui lòng thử lại.');
      return;
    }

    try {
      await router.write('/ip/firewall/address-list/add', [
        { list: 'blacklist', address: ip, comment: 'Blocked by Telegram bot' }
      ]);
      sendAndDeleteMessage(chatId, `🚫 Đã chặn IP: ${ip}`);
    } catch (err) {
      sendAndDeleteMessage(chatId, '❌ Lỗi khi chặn IP.');
    }
  };

  bot.once('message', ipListener);
};

const generateBandwidthChart = async (chatId) => {
  if (!fs.existsSync(path)) {
    return sendAndDeleteMessage(chatId, '⛔ Chưa có dữ liệu thống kê.');
  }

  let data = { labels: [], rx: [], tx: [] };

  try {
    if (fs.existsSync(path)) {
      const raw = fs.readFileSync(path, 'utf8');
      if (raw) {
        data = JSON.parse(raw);
      }
    }
  } catch (err) {
    console.error('❌ Lỗi đọc dữ liệu bandwidth:', err);
    return bot.sendMessage(chatId, '⚠️ Không thể đọc dữ liệu biểu đồ. File có thể đang trống hoặc lỗi JSON.');
  }

  const { labels, rx, tx } = data;

  const chartConfig = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Download (Mbps)',
          data: rx,
          borderColor: '#00c0ff',
          fill: false
        },
        {
          label: 'Upload (Mbps)',
          data: tx,
          borderColor: '#ff4c4c',
          fill: false
        }
      ]
    },
    options: {
      title: { display: true, text: '📡 Băng thông (ether4)' },
      scales: {
        yAxes: [{ ticks: { beginAtZero: true } }]
      }
    }
  };

  const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
  await sendAndDeleteImg(chatId, chartUrl, { caption: '📈 Thống kê băng thông' });
};

const showAIMenu = (chatId) => {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📛 Danh sách IP bị AI chặn', callback_data: 'ai_defense_list' }
        ],
        [
          { text: '🔙 Quay lại', callback_data: 'menu' }
        ]
      ]
    }
  };

  sendAndDeleteMessage(chatId, '🧠 *Tường lửa học máy - AI Defense*\n\nChọn chức năng:', {
    parse_mode: 'Markdown',
    ...options
  });
};

const showAIDefenseList = async (chatId) => {
  try {
    const list = await router.write('/ip/firewall/address-list/print');
    const smartList = list.filter((e) => e.list === 'smart_defense_list');

    if (smartList.length === 0) {
      return sendAndDeleteMessage(chatId, '✅ Không có IP nào bị AI chặn.');
    }

    let msg = '🧠 *DANH SÁCH AI BLOCKED:*\n\n';
    smartList.forEach((e, i) => {
      msg += `🔹 ${i + 1}. ${e.address} (${e.comment || 'No comment'})\n`;
    });

    sendAndDeleteMessage(chatId, msg, { parse_mode: 'Markdown' });

  } catch (err) {
    sendAndDeleteMessage(chatId, '❌ Lỗi khi đọc danh sách AI block.');
  }
};

const execUpdate = (chatId) => {
  exec('cd /home/troxjt/telegram-bot && git pull && pm2 restart telegram-bot', (err) => {
    if (err) sendAndDeleteMessage(chatId, '❌ Lỗi khi cập nhật bot.');
    else sendAndDeleteMessage(chatId, '✅ Bot đã được cập nhật và khởi động lại.');
  });
};

const confirmReboot = async (chatId) => {
  sendAndDeleteMessage(chatId, '⚠️ *Bạn có chắc muốn khởi động lại Router không?*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Có, khởi động lại', callback_data: 'confirm_reboot_yes' },
          { text: '❌ Không', callback_data: 'confirm_reboot_no' }
        ]
      ]
    }
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

const cron = require('node-cron');
const { exec } = require('child_process');

cron.schedule('*/5 * * * *', () => {
  exec('node /home/troxjt/telegram-bot/bandwidthTracker.js', (err, stdout, stderr) => {
    if (err) console.error('❌ Lỗi khi chạy tracker:', err);
    else console.log('✅ Đã thu thập dữ liệu băng thông lúc', new Date().toLocaleTimeString());
  });
});