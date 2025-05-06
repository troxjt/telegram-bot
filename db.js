const mysql = require('mysql2/promise');
const { db } = require('./config');

let pool;

module.exports = {
    connect: async () => {
        if (pool) return;
        try {
            pool = await mysql.createPool({
                host: db.host,
                user: db.user,
                password: db.password,
                database: db.database,
                waitForConnections: db.waitForConnections,
                connectionLimit: db.connectionLimit,
                queueLimit: db.queueLimit
            });
            console.log('[DB] Kết nối thành công.');
        } catch (err) {
            console.error(`[DB ERROR] Không thể tạo pool kết nối: ${err.message}`);
            throw err;
        }
    },
    query: async (sql, params) => {
        if (!pool) throw new Error('Database chưa kết nối.');
        try {
            const [results] = await pool.execute(sql, params);
            return results;
        } catch (err) {
            console.error(`[DB ERROR] Truy vấn không thành công: ${err.message}`);
            throw err;
        }
    }
};