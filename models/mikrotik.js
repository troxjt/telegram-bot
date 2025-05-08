const { RouterOSAPI } = require('node-routeros');
const { router, telegram } = require('../config');
const { logToFile } = require('../utils/log');

async function connect() {
  const client = new RouterOSAPI({
    host: router.host,
    user: router.user,
    password: router.password,
    port: router.port,
    timeout: 30000
  });
  await client.connect();
  return client;
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
    throw err;
  }
}

module.exports = { connect, safeWrite };