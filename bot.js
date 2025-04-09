const TelegramBot = require('node-telegram-bot-api');
const { RouterOSAPI } = require('node-routeros');

// Thong tin bot Telegram va RouterOS
const token = '7703387581:AAFbcNP5TzESZwh09kiqetIsczbqn6ybPSY';  // Thay token bot cua ban vao day
const chatId = '-1002545905741';  // Thay chatId cua ban vao day

// Thong tin kết nối RouterOS
const routerIp = '192.168.123.1'; // Dia chi IP cua router
const routerPort = 8728;          // Cong API mac dinh
const routerUser = 'troxjt';      // Ten nguoi dung RouterOS
const routerPassword = 'Trox071299@@';  // Mat khau RouterOS

// Tao bot Telegram
const bot = new TelegramBot(token, { polling: true });

// ID nguoi dung duoc phep su dung bot
const allowedUserId = 5865055827;

// Ket noi voi RouterOS API
const router = new RouterOSAPI({
  host: routerIp,
  user: routerUser,
  password: routerPassword,
  port: routerPort,
  timeout: 30000
});

router.connect()
  .then(() => {
    console.log('Da kết nối den RouterOS');
  })
  .catch((err) => {
    console.error('Khong the kết nối den RouterOS:', err);
  });

// Lang nghe cac lenh tu nguoi dung
bot.onText(/\/start/, (msg) => {
  if (msg.from.id !== allowedUserId) {
    return bot.sendMessage(msg.chat.id, 'Ban khong co quyen su dung bot nay.');
  }

  bot.sendMessage(msg.chat.id, 'Chao ban! Hay su dung cac lenh de dieu khien router cua ban.');
});

bot.onText(/\/menu/, (msg) => {
  if (msg.from.id !== allowedUserId) {
    return bot.sendMessage(msg.chat.id, 'Bạn không có quyền sử dụng bot.');
  }

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Thông tin hệ thống', callback_data: 'get_system_info' }],
        [{ text: 'Thông tin hệ thống', callback_data: 'get_system_info' }],
        [{ text: 'Danh sách kết nối', callback_data: 'list_connections' }],
        [{ text: 'Kiểm tra băng thông', callback_data: 'check_bandwidth' }],
        [{ text: 'Trạng thái giao diện', callback_data: 'interface-status' }],
        [{ text: '📛 Danh sách IP bị chặn', callback_data: 'show_blacklist' }],
        [{ text: 'Update code bot', callback_data: 'update_code_bot' }],
        [{ text: 'Khởi động lại router', callback_data: 'reboot_router' }]
      ]
    }
  };

  bot.sendMessage(msg.chat.id, 'Chọn một tùy chọn từ menu:', options);
});

// Lắng nghe khi người dùng nhấn vào nút trong menu
bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;
  if (data === 'get_system_info') {
    bot.sendMessage(msg.chat.id, 'Đang lấy thông tin hệ thống...');
    router.write('/system/resource/print')
      .then((result) => {
        const status = result[0];
        
        // Lay thông tin chi tiet ve CPU, Memory, Uptime, va Version
        router.write('/system/identity/print')
          .then((identity) => {
            const routerName = identity[0]['name'];
            
            // Lay thông tin ve License
            router.write('/system/license/print')
              .then((license) => {
  
                // Gui thông tin chi tiet ve trạng thái
                const statusMsg = `THÔNG TIN PC ROUTER:
              - 🔧 NAME: ${routerName}
              - ⚙️ CPU: ${status['cpu-load']}%
              - 🧠 RAM: ${status['free-memory']} bytes
              - 🔧 DISK: ${status['total-memory']} bytes
              - ⏱️ UPTIME: ${status['uptime']}
              - 🛠️ ROUTEROS: ${status['version']}`;
                  
                bot.sendMessage(msg.chat.id, statusMsg);
              })
              .catch((err) => {
                bot.sendMessage(msg.chat.id, 'Lỗi khi lấy thông tin license.');
                console.error(err);
              });
          })
          .catch((err) => {
            bot.sendMessage(msg.chat.id, 'Lỗi khi lấy thông tin Router Identity.');
            console.error(err);
          });
      })
      .catch((err) => {
        bot.sendMessage(msg.chat.id, 'Lỗi khi lấy trạng thái Router.');
        console.error(err);
      });
  } else if (data === 'list_connections') {
    bot.sendMessage(msg.chat.id, 'Đang lấy danh sách kết nối...');
    router.write('/ip/arp/print')
      .then((result) => {
        if (result.length > 0) {
          let connections = 'Danh sách kết nối:\n';
          result.forEach((conn) => {
            connections += `IP: ${conn['address']}, MAC: ${conn['mac-address']}\n`;
          });
          bot.sendMessage(msg.chat.id, connections);
        } else {
          bot.sendMessage(msg.chat.id, 'Không có kết nối nào hiện tại.');
        }
      })
      .catch((err) => {
        bot.sendMessage(msg.chat.id, 'Lỗi khi lấy danh sach kết nối.');
        console.error(err);
      });
  } else if (data === 'check_bandwidth') {
    bot.sendMessage(msg.chat.id, 'Đang kiểm tra băng thông...');
    router.write('/interface/ethernet/print')
      .then((result) => {
        let statsMsg = 'THÔNG TIN BĂNG THÔNG:\n';
        result.forEach((interfaceInfo) => {
          statsMsg += `Tên: ${interfaceInfo['name']}, Lưu lượng: ${interfaceInfo['rx-byte'] / 1024 / 1024} MB/ ${interfaceInfo['tx-byte'] / 1024 / 1024} MB\n`;
        });
        bot.sendMessage(msg.chat.id, statsMsg);
      })
      .catch((err) => {
        bot.sendMessage(msg.chat.id, 'Lỗi khi lấy thông tin băng thông.');
        console.error(err);
      });
  } else if (data === 'interface-status') {
    bot.sendMessage(msg.chat.id, 'Đang kiểm tra trạng thái giao diện mạng...');
    router.write('/interface/print')
    .then((result) => {
      let interfacesStatus = 'TRẠNG THÁI GIAO DIỆN:\n';
      result.forEach((interfaceInfo) => {
        interfacesStatus += `Giao diện: ${interfaceInfo['name']}, Trạng thái: ${interfaceInfo['running'] ? 'Hoạt động' : 'Dùng'}\n`;
      });
      bot.sendMessage(msg.chat.id, interfacesStatus);
    })
    .catch((err) => {
      bot.sendMessage(msg.chat.id, 'Lỗi khi lấy trạng thái giao diện.');
      console.error(err);
    });
  } else if (data === 'show_blacklist') {
    bot.sendMessage(msg.chat.id, '📥 Đang lấy danh sách blacklist tổng hợp...');
    const listNames = ['blacklist', 'ssh_blacklist', 'ftp_blacklist', 'port_scanners'];
    let resultMessage = '📊 **DANH SÁCH CÁC ĐỊA CHỈ BỊ CHẶN**\n\n';
    let fetchCount = 0;

    listNames.forEach((listName) => {
      router.write('/ip/firewall/address-list/print', [
        `?list=${listName}`
      ])
      .then((entries) => {
        resultMessage += `📂 *${listName.toUpperCase()}* (${entries.length} mục):\n`;
        if (entries.length === 0) {
          resultMessage += '_Không có địa chỉ nào._\n\n';
        } else {
          entries.forEach((entry, idx) => {
            const comment = entry.comment ? `(${entry.comment})` : '';
            resultMessage += ` ${idx + 1}. ${entry.address} ${comment}\n`;
          });
          resultMessage += '\n';
        }

        fetchCount++;
        if (fetchCount === listNames.length) {
          // Sau khi đã lấy hết tất cả danh sách
          const chunks = resultMessage.match(/[\s\S]{1,3500}/g); // chia nhỏ nếu quá dài
          chunks.forEach(chunk => bot.sendMessage(msg.chat.id, chunk, { parse_mode: 'Markdown' }));
        }
      })
      .catch((err) => {
        resultMessage += `⚠️ Lỗi khi lấy danh sách ${listName}: ${err.message}\n\n`;
        fetchCount++;
        if (fetchCount === listNames.length) {
          const chunks = resultMessage.match(/[\s\S]{1,3500}/g);
          chunks.forEach(chunk => bot.sendMessage(msg.chat.id, chunk, { parse_mode: 'Markdown' }));
        }
      });
    });
  } else if (data === 'update_code_bot') {
    bot.sendMessage(msg.chat.id, 'Đang update bot...');
    const exec = require('child_process').exec;
    exec('cd /home/troxjt/telegram-bot && git pull && pm2 restart telegram-bot', (err, stdout, stderr) => {
      if (err) {
        bot.sendMessage(msg.chat.id, 'Lỗi khi cập nhật bot.');
        console.error(err);
      } else {
        bot.sendMessage(msg.chat.id, 'Bot đã được cập nhật và khởi động lại.');
      }
    });
  } else if (data === 'reboot_router') {
    bot.sendMessage(msg.chat.id, 'Chuẩn bị khởi động lại router...');
    router.write('/system/reboot')
      .then((result) => {
        bot.sendMessage(msg.chat.id, 'RouterOS đang khởi động lại...');
      })
      .catch((err) => {
        bot.sendMessage(msg.chat.id, 'Lỗi khi khởi động lại router.');
        console.error(err);
      });
  }
});
