const express = require('express');
const path = require('path');
const db = require('./db');
const { connect } = require('./models/mikrotik');
const { isWhitelisted } = require('./models/whitelist');
const { isSuspicious, logSuspicious } = require('./models/suspicious');
const { sendAlert } = require('./utils/messageUtils');
const {
  limitBandwidth,
  trackConnection,
  cleanupTrustedDevices,
  monitorSuspiciousIPs
} = require('./models/device');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API to get connected devices
app.get('/api/devices', async (req, res) => {
    try {
        const routerConn = await connect();
        const devices = await routerConn.write('/ip/arp/print');

        const whitelist = await db.query('SELECT mac FROM whitelist');
        const trustedMacs = new Set(whitelist.map(entry => entry.mac));

        res.json(devices.map(device => ({
            mac: device['mac-address'],
            ip: device['address'],
            interface: device['interface'],
            isTrusted: trustedMacs.has(device['mac-address'])
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
                console.warn(`[WARN] Skipping device due to missing data: MAC=${mac}, IP=${ip}, Interface=${iface}`);
                continue;
            }

            const [isWhiteListed, isMarkedSuspicious] = await Promise.all([
                isWhitelisted(mac),
                isSuspicious(mac)
            ]);

            if (!isWhiteListed && !isMarkedSuspicious) {
                await Promise.all([
                    logSuspicious(mac, ip, iface, clientId),
                    sendAlert(mac, ip, iface),
                    limitBandwidth(mac, `${ip}/32`, iface) // Ensure IP is formatted with subnet mask
                ]);
            }

            await trackConnection(mac, `${ip}/32`, iface);
        }

        await cleanupTrustedDevices();
        await monitorSuspiciousIPs();
    } catch (err) {
        console.error('[ERROR] Giám sát thiết bị không thành công:', err.message);
    }
}

// Function to start the web server
const startWebServer = (port = PORT) => {
    app.listen(port, () => {
        console.log(`[WEB] Server is running on http://localhost:${port}`);
    });
};

module.exports = { startWebServer, monitorDevices };
