const { RouterOSAPI } = require('node-routeros');
const { router, telegram } = require('../config');

let connection;

async function connect() {
  if (!connection) {
    console.log(1111111111111111)
    connection = new RouterOSAPI({
      host: router.host,
      user: router.user,
      password: router.password,
      port: router.port,
      timeout: 60000
    });
    console.log(2222222222222)
    await connection.connect();
    console.log(33333333333333)
    return connection;
  } else {
    console.log(44444444444444)
    return connection;
  }
}

async function processFirewallLists() {
  try {
    const routerConn = await connect();
    const ipLists = new Set();
    
    // Fetch IPs from address lists
    const lists = ['ai_port_scanner', 'ai_brute_force', 'ai_http_flood'];
    for (const list of lists) {
      const entries = await routerConn.write('/ip/firewall/address-list/print', [`?list=${list}`]);
      entries.forEach(entry => ipLists.add(entry.address));
    }

    for (const ip of ipLists) {
      console.log(ip)
      let score = 0;

      if (await routerConn.write('/ip/firewall/address-list/print', [`?list=ai_port_scanner`, `?address=${ip}`]).then(res => res.length > 0)) {
        score += 30;
      }
      if (await routerConn.write('/ip/firewall/address-list/print', [`?list=ai_brute_force`, `?address=${ip}`]).then(res => res.length > 0)) {
        score += 40;
      }
      if (await routerConn.write('/ip/firewall/address-list/print', [`?list=ai_http_flood`, `?address=${ip}`]).then(res => res.length > 0)) {
        score += 30;
      }

      if (score >= 60) {
        const alreadyBlocked = await routerConn.write('/ip/firewall/address-list/print', [`?list=ai_blacklist`, `?address=${ip}`]).then(res => res.length > 0);
        if (!alreadyBlocked) {
          await routerConn.write('/ip/firewall/address-list/add', [
            `=list=ai_blacklist`,
            `=address=${ip}`,
            `=timeout=24h`,
            `=comment=AI Auto Block`
          ]);

          // console.log(`[AI Firewall] Blocked IP=${ip} with score=${score}`);

          // Send Telegram alert
          const text = `🚨 Đã chặn IP nguy hiểm!\nIP: ${ip}\nĐiểm: ${score}`;
          const url = `https://api.telegram.org/bot${telegram.token}/sendMessage?chat_id=${telegram.chatId}&text=${encodeURIComponent(text)}`;
          await fetch(url);
        }
      }
    }
    await routerConn.close();
  } catch (err) {
    console.error(`[ERROR] Failed to process firewall lists: ${err.message}`);
    throw err;
  }
}

module.exports = { connect, processFirewallLists };
