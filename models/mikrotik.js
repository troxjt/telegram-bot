const { RouterOSAPI } = require('node-routeros');
const { router } = require('../config');

let connection;

module.exports = {
    connect: async () => {
        if (!connection) {
            connection = new RouterOSAPI({
                host: router.host,
                user: router.user,
                password: router.password,
                port: router.port,
                timeout: 30000
            });
            await connection.connect();
        }
        return connection;
    }
};
