const express = require('express');
const path = require('path');
const db = require('./db');
const { connect } = require('./models/mikrotik');
const { isWhitelisted } = require('./models/whitelist');
const { isSuspicious, logSuspicious } = require('./models/suspicious');
const { sendAlert } = require('./utils/messageUtils');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API to get connected devices
app.get('/api/devices', async (req, res) => {
    try {
        const routerConn = await connect();
        const devices = await routerConn.write('/ip/arp/print');
        res.json(devices.map(device => ({
            mac: device['mac-address'],
            ip: device['address'],
            interface: device['interface']
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API to get whitelist
app.get('/api/whitelist', async (req, res) => {
    try {
        const whitelist = await getWhitelist();
        res.json(whitelist);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API to add to whitelist
app.post('/api/whitelist', async (req, res) => {
    try {
        const { mac } = req.body;
        await db.query('INSERT INTO whitelist (mac) VALUES (?)', [mac]);
        res.status(201).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API to remove from whitelist
app.delete('/api/whitelist/:mac', async (req, res) => {
    try {
        const { mac } = req.params;
        await db.query('DELETE FROM whitelist WHERE mac = ?', [mac]);
        res.status(200).json({ message: 'Loại bỏ khỏi danh sách trắng' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Function to monitor devices
async function monitorDevices() {
    try {
        const routerConn = await connect();
        const devices = await routerConn.write('/ip/arp/print');

        for (const device of devices) {
            const mac = device['mac-address'];
            const ip = device['address'];
            const iface = device['interface'];
            const clientId = device['client-id'] || null;

            if (!mac || !ip || !iface) {
                // console.warn(`[CẢNH BÁO] Thiếu thông tin thiết bị: MAC=${mac}, IP=${ip}, Interface=${iface}`);
                if (!mac) {
                    try {
                        await routerConn.write('/ip/arp/remove', ['=.id=' + device['.id']]);
                        // console.log(`[INFO] Đã xóa IP khỏi ARP: MAC=${mac}, IP=${ip}`);
                    } catch (err) {
                        console.error(`[ERROR] Không xóa IP khỏi ARP: MAC=${mac}, IP=${ip}, Error=${err.message}`);
                    }
                }
                continue;
            }

            const [isWhiteListed, isMarkedSuspicious] = await Promise.all([
                isWhitelisted(mac),
                isSuspicious(mac)
            ]);

            if (!isWhiteListed && !isMarkedSuspicious) {
                // console.log(`[ALERT] Thiết bị không được danh sách trắng: MAC=${mac}, IP=${ip}`);
                try {
                    await Promise.all([
                        logSuspicious(mac, ip, iface, clientId),
                        sendAlert(mac, ip, iface)
                    ]);
                } catch (err) {
                    console.error(`[ERROR] Không xử lý được thiết bị đáng ngờ: MAC=${mac}, IP=${ip}, Error=${err.message}`);
                }
            }
        }
    } catch (err) {
        console.error('[ERROR] Giám sát thiết bị không thành công:', err.message);
    }
}

// Function to start the web server
const startWebServer = (port) => {
    const app = express();

    app.get('/', (req, res) => {
        res.send('Máy chủ Web Bot Telegram đang chạy.');
    });

    app.listen(port, () => {
        console.log(`[WEB] Máy chủ web bắt đầu trên cổng ${port}`);
    });
};

module.exports = { startWebServer, monitorDevices };
