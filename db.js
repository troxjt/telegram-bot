const mysql = require('mysql2/promise');
const { db } = require('./config');

let pool;

module.exports = {
    connect: async () => {
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
            throw new Error(`[DB ERROR] Không thể tạo pool kết nối: ${err.message}`);
        }
    },
    query: async (sql, params) => {
        if (!pool) throw new Error('Database chưa kết nối.');
        const [results] = await pool.execute(sql, params);
        return results;
    }
};
