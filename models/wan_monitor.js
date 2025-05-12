const { connect, safeWrite } = require('./mikrotik');
const { GuiThongBaoTele } = require('../utils/messageUtils');
const fs = require('fs');

const PPPoE_LIST = ['pppoe-out1', 'pppoe-out2'];
const stateFile = './data/wan_states.json';

function loadState() {
    try {
        return JSON.parse(fs.readFileSync(stateFile));
    } catch {
        return {};
    }
}

function saveState(state) {
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

async function checkPPPoEStatus(client, iface) {
    try {
        const ipAddr = await safeWrite(client, '/ip/address/print', [`?interface=${iface}`]);
        if (ipAddr.length === 0) {
            return { iface, status: 'no_ip' };
        }

        const pingResult = await safeWrite(client, '/ping', [
            '=address=8.8.8.10',
            `=interface=${iface}`,
            '=count=3',
            '=interval=1s'
        ]);

        if (pingResult.length === 0) {
            return { iface, status: 'no_ping' };
        }

        return { iface, status: 'ok' };
    } catch (err) {
        console.error(`[PPPoE Monitor] Lỗi kiểm tra ${iface}:`, err.message);
        return { iface, status: 'error' };
    }
}

async function monitorPPPoEs() {
    const client = await connect();
    const state = loadState();
    let failList = [];
    let totalPPPoE = 0;
    let failedPPPoE = 0;
    console.log('[PPPoE Monitor] Bắt đầu kiểm tra trạng thái PPPoE...');
    for (const iface of PPPoE_LIST) {
        totalPPPoE++;
        const result = await checkPPPoEStatus(client, iface);
        console.log(`[PPPoE Monitor] ${iface}: ${result.status}`);
        if (result.status === 'no_ip') {
            failList.push(`❌ ${iface}: không có IP`);
            failedPPPoE++;
        } else if (result.status === 'no_ping') {
            failList.push(`❌ ${iface}: không ping được`);
            failedPPPoE++;
        }

        state[iface] = result.status;
    }

    if (failedPPPoE > 0) {
        const message = `🚨 CẢNH BÁO MẠNG PPPoE!\n\n${failList.join('\n')}`;
        await GuiThongBaoTele(message);
    }

    saveState(state);
}

module.exports = { monitorPPPoEs };