// bandwidthTracker.js
const fs = require('fs');
const { RouterOSAPI } = require('node-routeros');
const moment = require('moment');
const CONFIG = require('./config');

const router = new RouterOSAPI({
  host: CONFIG.router.host,
  user: CONFIG.router.user,
  password: CONFIG.router.password,
  port: CONFIG.router.port,
  timeout: 30000
});

const logPath = './data/bandwidth.json';

const collectBandwidth = async () => {
  try {
    await router.connect();
    const interfaces = await router.write('/interface/monitor-traffic', [
      { interface: 'ether1', once: true }
    ]);

    const now = moment().format('HH:mm');
    const rx = parseInt(interfaces[0]['rx-bits-per-second']) / 1000000; // Mbps
    const tx = parseInt(interfaces[0]['tx-bits-per-second']) / 1000000;

    let data = { labels: [], rx: [], tx: [] };
    if (fs.existsSync(logPath)) {
      data = JSON.parse(fs.readFileSync(logPath));
    }

    if (data.labels.length >= 20) {
      data.labels.shift();
      data.rx.shift();
      data.tx.shift();
    }

    data.labels.push(now);
    data.rx.push(rx.toFixed(2));
    data.tx.push(tx.toFixed(2));

    fs.writeFileSync(logPath, JSON.stringify(data));
    await router.close();
  } catch (err) {
    console.error('❌ Lỗi khi thu thập băng thông:', err);
  }
};

collectBandwidth();