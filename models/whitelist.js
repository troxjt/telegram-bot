const db = require('../db');

async function getWhitelist() {
    const sql = 'SELECT mac FROM whitelist';
    return await db.query(sql);
}

module.exports = { getWhitelist };
