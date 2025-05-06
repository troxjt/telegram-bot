const express = require('express');
const path = require('path');
const { getWhitelist } = require('./models/whitelist');
const { logSuspicious } = require('./models/suspicious');
const db = require('./db');
const { connect } = require('./models/mikrotik');

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
        res.status(200).json({ message: 'Removed from whitelist' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Function to start the web server
function startWebServer(port) {
    app.listen(port, () => {
        console.log(`[WEB] Server đang chạy tại http://localhost:${port}`);
    });
}

module.exports = startWebServer;
