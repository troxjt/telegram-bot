const TelegramBot = require('node-telegram-bot-api');
const { RouterOSAPI } = require('node-routeros');

// Thong tin bot Telegram va RouterOS
const token = '7703387581:AAFbcNP5TzESZwh09kiqetIsczbqn6ybPSY';  // Thay token bot cua ban vao day
const chatId = '-1002545905741';  // Thay chatId cua ban vao day

// Thong tin ket noi RouterOS
const routerIp = '192.168.123.1'; // Dia chi IP cua router
const routerPort = 8728;          // Cong API mac dinh
const routerUser = 'troxjt';      // Ten nguoi dung RouterOS
const routerPassword = 'Trox071299@@';  // Mat khau RouterOS

// Tao bot Telegram
const bot = new TelegramBot(token, { polling: true });

// ID ngu?i d�ng du?c ph�p s? d?ng bot
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
    console.log('Da ket noi den RouterOS');
  })
  .catch((err) => {
    console.error('Khong the ket noi den RouterOS:', err);
  });

// Lang nghe cac lenh tu nguoi dung
bot.onText(/\/start/, (msg) => {
  if (msg.from.id !== allowedUserId) {
    return bot.sendMessage(msg.chat.id, 'Ban khong co quyen su dung bot nay.');
  }

  bot.sendMessage(msg.chat.id, 'Chao ban! Hay su dung cac lenh de dieu khien router cua ban.');
});

bot.onText(/\/reboot/, (msg) => {
  if (msg.from.id !== allowedUserId) {
    return bot.sendMessage(msg.chat.id, 'Ban khong co quyen su dung bot nay.');
  }

  // Lenh de reboot RouterOS
  router.write('/system/reboot')
    .then((result) => {
      bot.sendMessage(msg.chat.id, 'RouterOS dang khoi dong lai...');
    })
    .catch((err) => {
      bot.sendMessage(msg.chat.id, 'Loi khi khoi dong lai router.');
      console.error(err);
    });
});

bot.onText(/\/trangthai/, (msg) => {
  if (msg.from.id !== allowedUserId) {
    return bot.sendMessage(msg.chat.id, 'Ban khong co quyen su dung bot nay.');
  }

  // Lenh de lay thong tin trang thai cua router
  router.write('/system/resource/print')
    .then((result) => {
      const status = result[0];
      
      // Lay thong tin chi tiet ve CPU, Memory, Uptime, va Version
      router.write('/system/identity/print')
        .then((identity) => {
          const routerName = identity[0]['name'];
          
          // Lay thong tin ve License
          router.write('/system/license/print')
            .then((license) => {

              // Gui thong tin chi tiet ve trang thai
              const statusMsg = `Thong tin RouterOS:
                - Ten Router: ${routerName}
                - Tai CPU: ${status['cpu-load']}%
                - Bo nho tu do: ${status['free-memory']} bytes
                - Tong bo nho: ${status['total-memory']} bytes
                - Thoi gian hoat dong: ${status['uptime']}
                - Phien ban RouterOS: ${status['version']}`;
                
              bot.sendMessage(msg.chat.id, statusMsg);
            })
            .catch((err) => {
              bot.sendMessage(msg.chat.id, 'Loi khi lay thong tin license.');
              console.error(err);
            });
        })
        .catch((err) => {
          bot.sendMessage(msg.chat.id, 'Loi khi lay thong tin Router Identity.');
          console.error(err);
        });
    })
    .catch((err) => {
      bot.sendMessage(msg.chat.id, 'Loi khi lay trang thai router.');
      console.error(err);
    });
});

bot.onText(/\/ketnoi/, (msg) => {
  if (msg.from.id !== allowedUserId) {
    return bot.sendMessage(msg.chat.id, 'Ban khong co quyen su dung bot nay.');
  }

  // Lenh de lay danh sach ket noi hien tai
  router.write('/ip/arp/print')
    .then((result) => {
      if (result.length > 0) {
        let connections = 'Danh sach ket noi:\n';
        result.forEach((conn) => {
          connections += `IP: ${conn['address']}, MAC: ${conn['mac-address']}\n`;
        });
        bot.sendMessage(msg.chat.id, connections);
      } else {
        bot.sendMessage(msg.chat.id, 'Khong co ket noi nao hien tai.');
      }
    })
    .catch((err) => {
      bot.sendMessage(msg.chat.id, 'Loi khi lay danh sach ket noi.');
      console.error(err);
    });
});

bot.onText(/\/bangthong/, (msg) => {
  if (msg.from.id !== allowedUserId) {
    return bot.sendMessage(msg.chat.id, 'Ban khong co quyen su dung bot nay.');
  }

  // Lenh de lay thong tin bang thong
  router.write('/interface/ethernet/print')
    .then((result) => {
      let statsMsg = 'Thong tin bang thong:\n';
      result.forEach((interfaceInfo) => {
        statsMsg += `Ten: ${interfaceInfo['name']}, Luu luong: ${interfaceInfo['rx-byte'] / 1024 / 1024} MB/ ${interfaceInfo['tx-byte'] / 1024 / 1024} MB\n`;
      });
      bot.sendMessage(msg.chat.id, statsMsg);
    })
    .catch((err) => {
      bot.sendMessage(msg.chat.id, 'Loi khi lay thong tin bang thong.');
      console.error(err);
    });
});

bot.onText(/\/interface-status/, (msg) => {
  if (msg.from.id !== allowedUserId) {
    return bot.sendMessage(msg.chat.id, 'Ban khong co quyen su dung bot nay.');
  }

  // Lenh de kiem tra trang thai giao dien mang
  router.write('/interface/print')
    .then((result) => {
      let interfacesStatus = 'Trang thai giao dien:\n';
      result.forEach((interfaceInfo) => {
        interfacesStatus += `Giao dien: ${interfaceInfo['name']}, Trang thai: ${interfaceInfo['running'] ? 'Hoat dong' : 'Dung'}\n`;
      });
      bot.sendMessage(msg.chat.id, interfacesStatus);
    })
    .catch((err) => {
      bot.sendMessage(msg.chat.id, 'Loi khi lay trang thai giao dien.');
      console.error(err);
    });
});

bot.onText(/\/updatecode/, (msg) => {
  if (msg.from.id !== allowedUserId) {
    return bot.sendMessage(msg.chat.id, 'Ban khong co quyen su dung bot nay.');
  }

  const exec = require('child_process').exec;
  exec('cd /home/troxjt/telegram-bot && git pull && pm2 restart telegram-bot', (err, stdout, stderr) => {
    if (err) {
      bot.sendMessage(msg.chat.id, 'Loi khi cap nhat bot.');
      console.error(err);
    } else {
      bot.sendMessage(msg.chat.id, 'Bot da duoc cap nhat va khoi dong lai.');
    }
  });
});
