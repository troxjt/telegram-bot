// const { showMenu, handleCallbackQuery } = require('./menu');
// const { sendAndDeleteMessage } = require('../utils/messageUtils');
// const { telegram } = require('../config');
// const { logToFile } = require('../utils/log');

// const initializeBotFeatures = (bot) => {
//   bot.onText(/\/start|\/menu/, (msg) => {
//     if (msg.from.id !== telegram.allowedUserId) {
//       return sendAndDeleteMessage(bot, msg.chat.id, '🚫 Bạn không được phép sử dụng bot này.');
//     }

//     showMenu(bot, msg.chat.id);
//   });

//   bot.on('callback_query', async (cbq) => {
//     try {
//       await handleCallbackQuery(bot, cbq);
//     } catch (err) {
//       logToFile('❌ Callback error:', err.message);
//       sendAndDeleteMessage(bot, cbq.message.chat.id, '❌ Đã xảy ra lỗi trong khi xử lý yêu cầu của bạn.');
//     }
//   });
// };

// module.exports = { initializeBotFeatures };
