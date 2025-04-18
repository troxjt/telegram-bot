const fs = require('fs');
const { RouterOSAPI } = require('node-routeros');
const CONFIG = require('./config');

const router = new RouterOSAPI({
  host: CONFIG.router.host,
  user: CONFIG.router.user,
  password: CONFIG.router.password,
  port: CONFIG.router.port,
  timeout: 30000
});

const filePath = './data/bandwidth.json';

const collectBandwidth = async () => {
  try {
    await router.connect();
    const res = await router.write([
      '/interface/monitor-traffic',
      '=interface=BridgeLAN',
      '=once='
    ]);
    
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    const rx = parseInt(res[0]['rx-bits-per-second']) / 1000000;
    const tx = parseInt(res[0]['tx-bits-per-second']) / 1000000;

    let data = { labels: [], rx: [], tx: [] };
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath);
      if (raw) data = JSON.parse(raw);
    }

    if (data.labels.length >= 20) {
      data.labels.shift(); data.rx.shift(); data.tx.shift();
    }

    data.labels.push(time);
    data.rx.push(rx.toFixed(2));
    data.tx.push(tx.toFixed(2));

    fs.writeFileSync(filePath, JSON.stringify(data));
    await router.close();
  } catch (err) {
    console.error('❌ Lỗi tracker:', err);
  }
};

collectBandwidth();
