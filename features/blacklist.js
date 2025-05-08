const { getConnection, releaseConnection, safeWrite } = require('../models/mikrotik');
const { sendAndDeleteMessage } = require('../utils/messageUtils');
const { logToFile } = require('../utils/log');

const handleBlacklist = async (bot, chatId) => {
    let router;
    const lists = ['blacklist', 'ssh_blacklist', 'ftp_blacklist', 'port_scanners'];
    let message = '📛 *DANH SÁCH ĐỊA CHỈ BỊ CHẶN:*\n\n';

    try {
        router = await getConnection();
        const allEntries = await safeWrite(router, '/ip/firewall/address-list/print');

        if (!Array.isArray(allEntries) || allEntries.length === 0) {
            sendAndDeleteMessage(bot, chatId, '✅ Không có địa chỉ nào đang bị chặn.');
            return;
        }

        lists.forEach((list) => {
            const filtered = allEntries.filter((e) => e.list === list);

            if (filtered.length === 0) {
                message += `📂 *${list.toUpperCase()}*: _Không có địa chỉ nào._\n\n`;
                return;
            }

            message += `📂 *${list.toUpperCase()}* (${filtered.length} mục):\n`;
            filtered.forEach((e, i) => {
                const comment = e.comment ? `(${e.comment})` : '';
                message += ` ${i + 1}. ${e.address} ${comment}\n`;
            });
            message += '\n';
        });

        const chunks = message.match(/([\s\S]{1,3500})/g) || [];
        for (const chunk of chunks) {
            await sendAndDeleteMessage(bot, chatId, chunk, { parse_mode: 'Markdown' });
        }

    } catch (err) {
        logToFile('❌ Lỗi khi lấy danh sách address-list:', err);
        sendAndDeleteMessage(bot, chatId, '❌ Lỗi khi lấy danh sách blacklist.');
    } finally {
        if (router) releaseConnection(router);
    }
};

module.exports = { handleBlacklist };