const { RouterOSAPI } = require('node-routeros');
const { router } = require('../config');
const { logToFile } = require('../utils/log');

let clientInstance = null;

async function connect() {
  if (clientInstance && clientInstance.connected) {
    return clientInstance;
  }

  clientInstance = new RouterOSAPI({
    host: router.host,
    user: router.user,
    password: router.password,
    port: router.port,
    timeout: 30000,
  });

  try {
    await clientInstance.connect();
    // logToFile('[MikroTik] ✅ Kết nối thành công');
    return clientInstance;
  } catch (err) {
    logToFile(`[MikroTik] ❌ Lỗi kết nối: ${err.message}`);
    throw err;
  }
}

async function disconnect() {
  if (clientInstance && clientInstance.connected) {
    await clientInstance.close();
    logToFile('[MikroTik] 🔌 Đã đóng kết nối');
    clientInstance = null;
  }
}

async function safeWrite(client, command, params = []) {
  try {
    const res = await client.write(command, params);
    return res;
  } catch (err) {
    if (err.message.includes('!empty') || err.message.includes('UNKNOWNREPLY')) {
      logToFile(`[MikroTik] ⚠️ Lệnh "${command}" trả về !empty`);
      return [];
    }
    logToFile(`[MikroTik] ❌ Lỗi khi thực thi lệnh "${command}": ${err.message}`);
    throw err;
  }
}

module.exports = { connect, disconnect, safeWrite };