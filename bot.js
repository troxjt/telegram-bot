const TelegramBot = require('node-telegram-bot-api');
const { RouterOSAPI } = require('node-routeros');
const { exec } = require('child_process');
const fs = require('fs');
const cron = require('node-cron');
const axios = require('axios');
const path = './data/bandwidth.json';
const CONFIG = require('./config');

const bot = new TelegramBot(CONFIG.telegram.token, { polling: true });

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

const sendAndDeleteMessage = async (chatId, text, options = {}) => {
  try {
    const sentMessage = await bot.sendMessage(chatId, text, options);
    setTimeout(() => {
      bot.deleteMessage(chatId, sentMessage.message_id).catch((err) => {
        console.error('❌ Lỗi khi xóa tin nhắn:', err);
      });
    }, CONFIG.message.timedeleteMessage);
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
    }, CONFIG.message.timedeleteImg);
  } catch (err) {
    console.error('❌ Lỗi khi gửi ảnh:', err);
  }
};

const askSpeedtestMode = async (chatId) => {
  const text = '📶 *Chọn loại đo tốc độ bạn muốn:*';
  const options = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🇻🇳 Đo nội mạng (theo nhà mạng)', callback_data: 'bandwidth_auto_isp' }
        ],
        [
          { text: '🌍 Đo quốc tế (Singapore)', callback_data: 'bandwidth_global' },
          { text: '🏢 FPT', callback_data: 'bandwidth_local_fpt' },
          { text: '🏢 Viettel', callback_data: 'bandwidth_local_viettel' },
          { text: '🏢 VNPT', callback_data: 'bandwidth_local_vnpt' }
        ]
      ]
    }
  };
  await sendAndDeleteMessage(chatId, text, options);
};

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

bot.on('callback_query', async (cbq) => {
  const chatId = cbq.message.chat.id;
  const action = cbq.data;

  try {
    await bot.answerCallbackQuery(cbq.id);

    const globalServer = 21541;
    const fptServer = 4181;
    const viettelServer = 4062;
    const vnptServer = 7232;

    switch (action) {
      case 'menu':
        return showMenu(chatId);
      case 'get_system_info':
        return handleSystemInfo(chatId);
      case 'list_connections':
        return handleListConnections(chatId);
      case 'check_bandwidth':
        return askSpeedtestMode(chatId);
      case 'bandwidth_auto_isp':
        return handleBandwidthAutoISP(chatId);
      case 'bandwidth_global':
        return handleBandwidth(chatId, globalServer);
      case 'bandwidth_local_fpt':
        return handleBandwidth(chatId, fptServer);
      case 'bandwidth_local_viettel':
        return handleBandwidth(chatId, viettelServer);
      case 'bandwidth_local_vnpt':
        return handleBandwidth(chatId, vnptServer);
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

const getISP = async () => {
  try {
    const res = await axios.get('https://ipinfo.io/json');
    return res.data.org; // ví dụ: 'AS18403 FPT Telecom Company'
  } catch (err) {
    console.error('❌ Không lấy được ISP:', err.message);
    return null;
  }
};

const getServerIdByISP = (ispName) => {
  const mappings = [
    { keyword: 'FPT', id: 4181 },      // FPT Hanoi
    { keyword: 'Viettel', id: 4062 },  // Viettel HCM
    { keyword: 'VNPT', id: 7232 },     // VNPT Hanoi
  ];

  for (let entry of mappings) {
    if (ispName.toLowerCase().includes(entry.keyword.toLowerCase())) {
      return entry.id;
    }
  }

  return 21541; // fallback đo quốc tế Singapore
};

const handleBandwidth = async (chatId) => {
  let lastText = ''; // nội dung đã gửi lần trước

  const safeEditMessage = async (text) => {
    try {
      if (text !== lastText) {
        lastText = text;
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: message.message_id,
          parse_mode: 'Markdown'
        });
      }
    } catch (err) {
      if (
        err.response?.body?.description !== 'Bad Request: message is not modified'
      ) {
        console.error('❌ Lỗi editMessageText:', err.message);
      }
    }
  };

  // Gửi tin nhắn khởi tạo
  const message = await bot.sendMessage(chatId, '📡 *ĐANG CHUẨN BỊ ĐO...*', { parse_mode: 'Markdown' });
  lastText = '📡 *ĐANG CHUẨN BỊ ĐO...*';

  const steps = [
    '📡 *ĐANG CHUẨN BỊ ĐO...*',
    '🌐 *ĐANG CHỌN SERVER...*',
    '🚀 *ĐANG ĐO DOWNLOAD...*',
    '🔼 *ĐANG ĐO UPLOAD...*',
    '📶 *ĐANG ĐO PING...*',
    '📊 *PHÂN TÍCH KẾT QUẢ...*'
  ];

  let stepIndex = 0;

  const interval = setInterval(() => {
    if (stepIndex < steps.length) {
      safeEditMessage(steps[stepIndex]);
      stepIndex++;
    }
  }, 1500);

  const { exec } = require('child_process');

  exec('speedtest --accept-license --accept-gdpr -f json', async (error, stdout, stderr) => {
    clearInterval(interval);

    if (error) {
      await safeEditMessage(`❌ *Lỗi đo tốc độ:* ${error.message}`);
      return;
    }

    try {
      const data = JSON.parse(stdout);
      const download = (data.download.bandwidth / 125000).toFixed(2);
      const upload = (data.upload.bandwidth / 125000).toFixed(2);
      const ping = data.ping.latency;
      const server = `${data.server.name}, ${data.server.location}`;
      const timestamp = new Date(data.timestamp).toLocaleString('vi-VN');

      const result =
        `✅ *KẾT QUẢ TỐC ĐỘ:*\n\n` +
        `🏢 *Server*: ${server}\n` +
        `🕒 *Thời gian*: ${timestamp}\n\n` +
        `🔻 *Download*: ${download} Mbps\n` +
        `🔺 *Upload*: ${upload} Mbps\n` +
        `📶 *Ping*: ${ping} ms`;

      await safeEditMessage(result);
      setTimeout(() => {
        bot.deleteMessage(chatId, message.message_id).catch((err) => {
          console.error('❌ Lỗi khi xóa tin nhắn:', err);
        });
      }, CONFIG.message.timedeleteMessage);
    } catch (e) {
      await safeEditMessage(`❌ *Lỗi phân tích kết quả:* ${e.message}`);
    }
  });
};

const handleBandwidthAutoISP = async (chatId) => {
  const message = await bot.sendMessage(chatId, '📡 *ĐANG KIỂM TRA NHÀ MẠNG...*', { parse_mode: 'Markdown' });

  try {
    const isp = await getISP();
    if (!isp) throw new Error('Không xác định được nhà mạng');

    const serverId = getServerIdByISP(isp);
    await bot.editMessageText(`✅ *Nhà mạng:* ${isp}\n🔍 *Chọn server phù hợp...*`, {
      chat_id: chatId,
      message_id: message.message_id,
      parse_mode: 'Markdown'
    });

    setTimeout(() => {
      bot.deleteMessage(chatId, message.message_id).catch((err) => {
        console.error('❌ Lỗi khi xóa tin nhắn:', err);
      });
      handleBandwidth(chatId, serverId)
    }, 2000);
  } catch (err) {
    await bot.editMessageText(`❌ *Lỗi kiểm tra ISP:* ${err.message}`, {
      chat_id: chatId,
      message_id: message.message_id,
      parse_mode: 'Markdown'
    });
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
    return sendAndDeleteMessage(chatId, '⚠️ Không thể đọc dữ liệu biểu đồ. File có thể đang trống hoặc lỗi JSON.');
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
      title: { display: true, text: '📡 Băng thông (BridgeLAN)' },
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

cron.schedule('*/5 * * * *', () => {
  exec('node /home/troxjt/telegram-bot/bandwidthTracker.js', (err, stdout, stderr) => {
    if (err) {
      console.error('❌ Lỗi khi chạy tracker:', err);
    };
  });
});