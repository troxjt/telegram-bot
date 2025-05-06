const express = require('express');
const mysql = require('mysql2/promise');
const { RouterOSAPI } = require('node-routeros');
const path = require('path');
require('dotenv').config();

const CONFIG = require('./config');

// ==== CONFIGURATION ====
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || CONFIG.telegram.token;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || CONFIG.telegram.chatId;
const DB_CONFIG = {
    host: process.env.DB_HOST || CONFIG.database.host,
    user: process.env.DB_USER || CONFIG.database.user,
    password: process.env.DB_PASSWORD || CONFIG.database.password,
    database: process.env.DB_NAME || CONFIG.database.database
};

let routerConnection;

async function initMikrotikConnection() {
    if (!routerConnection || !routerConnection.connected) {
        routerConnection = new RouterOSAPI({
            host: CONFIG.router.host,
            user: CONFIG.router.user,
            password: CONFIG.router.password,
            port: CONFIG.router.port,
            timeout: 30000
        });

        try {
            await routerConnection.connect();
            console.log('✅ Connected to RouterOS');
        } catch (err) {
            if (err.message.includes('UNKNOWNREPLY') && err.data?.reply === '!empty') {
                console.warn('⚠️ Received !empty response during connection. Ignoring.');
            } else {
                console.error('❌ Error connecting to RouterOS:', err);
                throw err;
            }
        }
    }
    return routerConnection;
}

// ==== INIT ====
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==== TELEGRAM ====
async function sendTelegram(msg) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            body: new URLSearchParams({
                chat_id: TELEGRAM_CHAT_ID,
                text: msg
            })
        });
    } catch (err) {
        console.error('❌ Error sending Telegram message:', err);
    }
}

// ==== MIKROTIK ====
async function blockIp(ip) {
    try {
        const router = await initMikrotikConnection();
        const exists = await router.write('/ip/firewall/address-list/print', [
            '?address=' + ip,
            '?list=ai_blacklist',
        ]);
        if (!Array.isArray(exists)) {
            console.error(`[ERROR][blockIp] Unexpected response:`, exists);
            return;
        }
        if (exists.length > 0) {
            console.log(`[BLOCK] ${ip} đã có trong ai_blacklist.`);
            return;
        }

        await router.write('/ip/firewall/address-list/add', [
            '=list=ai_blacklist',
            `=address=${ip}`,
            '=comment=Blocked by Bot',
        ]);
        console.log(`[BLOCK] Đã chặn IP: ${ip}`);
    } catch (err) {
        console.error(`[ERROR][blockIp] ${err}`);
    }
}

async function addToCaptive(ip) {
    try {
        const router = await initMikrotikConnection();
        const exists = await router.write('/ip/firewall/address-list/print', [
            '?address=' + ip,
            '?list=captive',
        ]);
        if (!Array.isArray(exists)) {
            console.error(`[ERROR][addToCaptive] Unexpected response:`, exists);
            return;
        }
        if (exists.length > 0) {
            console.log(`[CAPTIVE] ${ip} đã có trong captive list.`);
            return;
        }

        await router.write('/ip/firewall/address-list/add', [
            '=list=captive',
            `=address=${ip}`,
            '=comment=Redirected by Captive Bot',
        ]);
        console.log(`[CAPTIVE] Đã thêm IP vào captive: ${ip}`);
    } catch (err) {
        console.error(`[ERROR][addToCaptive] ${err}`);
    }
}

async function limitBandwidth(ip) {
    try {
        const router = await initMikrotikConnection();
        const name = `Limit_${ip.replace(/\./g, '_')}`;
        const exists = await router.write('/queue/simple/print', [
            '?name=' + name,
        ]);
        if (!Array.isArray(exists)) {
            console.error(`[ERROR][limitBandwidth] Unexpected response:`, exists);
            return;
        }
        if (exists.length > 0) {
            console.log(`[QUEUE] Queue đã tồn tại cho IP ${ip}.`);
            return;
        }

        await router.write('/queue/simple/add', [
            `=name=${name}`,
            `=target=${ip}/32`,
            '=max-limit=512k/512k',
            '=comment=Limited by Bot',
        ]);
        console.log(`[QUEUE] Đã giới hạn băng thông IP: ${ip}`);
    } catch (err) {
        console.error(`[ERROR][limitBandwidth] ${err}`);
    }
}

async function fetchDHCPData() {
    try {
        const router = await initMikrotikConnection();
        const response = await router.write('/ip/dhcp-server/lease/print');
        if (!Array.isArray(response)) {
            if (response === '!empty') {
                console.warn('⚠️ DHCP data is empty.');
                return [];
            }
            console.error(`[ERROR][fetchDHCPData] Unexpected response:`, response);
            return [];
        }

        return response.map(lease => ({
            mac: lease['mac-address'],
            ip: lease['address'],
            hostname: lease['host-name'] || 'unknown',
            comment: lease['comment'] || 'unknown'
        }));
    } catch (err) {
        if (err.message.includes('UNKNOWNREPLY') && err.data?.reply === '!empty') {
            console.warn('⚠️ Received !empty response while fetching DHCP data. Returning empty list.');
            return [];
        }
        console.error('❌ Error fetching DHCP data:', err);
        return [];
    }
}

// ==== TRUST SCORE LOGIC ====
let db;

async function evaluateDevice(mac, ip, hostname, comment) {
    try {
        const [rows] = await db.execute("SELECT trust_score, whitelisted FROM devices WHERE mac = ?", [mac]);
        let trust_score = rows.length ? rows[0].trust_score : 50;
        const whitelisted = rows.length ? rows[0].whitelisted : false;

        if (whitelisted) {
            console.log(`[WHITELIST] Bỏ qua xử lý cho ${mac}`);
            return;
        }

        if (comment.toLowerCase().includes("tplink")) trust_score -= 10;
        if (hostname.toLowerCase().includes("iphone")) trust_score += 10;
        trust_score = Math.max(0, Math.min(100, trust_score));

        await db.execute(
            "REPLACE INTO devices (mac, ip, hostname, comment, trust_score, last_seen) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
            [mac, ip, hostname, comment, trust_score]
        );

        if (trust_score < 30) {
            await blockIp(ip);
            await sendTelegram(`⚠️ ${ip} (${mac}) blocked due to low trust score (${trust_score})`);
        } else if (trust_score < 60) {
            await addToCaptive(ip);
        } else if (trust_score < 90) {
            await limitBandwidth(ip);
        }
    } catch (err) {
        console.error('❌ Error evaluating device:', err);
    }
}

async function runTrustScoreUpdate() {
    const devices = await fetchDHCPData();
    for (const device of devices) {
        await evaluateDevice(device.mac, device.ip, device.hostname, device.comment);
    }
}

function getTrustClass(score) {
    if (score >= 90) return 'bg-success';
    if (score >= 60) return 'bg-primary';
    if (score >= 30) return 'bg-warning text-dark';
    return 'bg-danger';
}

// ==== DASHBOARD ====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/devices', async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT * FROM devices ORDER BY last_seen DESC");
        res.json(rows);
    } catch (err) {
        console.error('❌ Error fetching devices:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/api/device/unblock', async (req, res) => {
    const { ip } = req.body;
    let client;
    try {
        client = await initMikrotikConnection();

        const results = await client.write('/ip/firewall/address-list/print', [
            '?address=' + ip,
            '?list=ai_blacklist'
        ]);

        if (results.length === 0) {
            return res.status(404).json({ error: 'IP not found in ai_blacklist' });
        }

        const id = results[0]['.id'];
        await client.write('/ip/firewall/address-list/remove', [
            `=.id=${id}`
        ]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error unblocking IP');
    }
});

app.post('/api/device/reset-score', async (req, res) => {
    const { mac } = req.body;
    try {
        await db.execute("UPDATE devices SET trust_score = 50 WHERE mac = ?", [mac]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error resetting trust score');
    }
});

app.post('/api/device/whitelist', async (req, res) => {
    const { mac } = req.body;
    try {
        await db.execute("UPDATE devices SET whitelisted = TRUE WHERE mac = ?", [mac]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error whitelisting device');
    }
});

// ==== START SERVER ====
(async () => {
    try {
        db = await mysql.createPool(DB_CONFIG);
        app.listen(5000, () => {
            console.log('🚀 Server running on http://localhost:5000');
            runTrustScoreUpdate();
        });
    } catch (err) {
        console.error('❌ Error starting server:', err);
    }
})();

process.on('SIGINT', async () => {
    try {
        if (routerConnection && routerConnection.connected) {
            routerConnection.close();
            console.log('RouterOS connection closed.');
        }
        await db.end();
        console.log('Database connection closed.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during cleanup:', err);
        process.exit(1);
    }
});
