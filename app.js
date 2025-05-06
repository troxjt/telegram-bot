require('dotenv').config();
const db = require('./db');
const startWebServer = require('./server');

async function main() {
  try {
    console.log('[INIT] Connecting to database...');
    await db.connect();

    console.log('[WEB] Starting web server...');
    startWebServer(81);

    console.log('[DONE] Initialization complete.');
  } catch (err) {
    console.error('[ERROR]', err.message);
  } finally {
    process.exit();
  }
}

main();