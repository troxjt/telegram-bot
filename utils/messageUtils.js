const { CONFIG } = require('../config');

const sendAndDeleteMessage = async (bot, chatId, text, options = {}) => {
  try {
    const sentMessage = await bot.sendMessage(chatId, text, options);
    if (sentMessage && sentMessage.message_id) {
      setTimeout(() => {
        bot.deleteMessage(chatId, sentMessage.message_id).catch((err) => {
          console.error('❌ Lỗi khi xóa tin nhắn:', err.message);
        });
      }, 10000); // Giá trị mặc định là 5000ms
    }
  } catch (err) {
    console.error('❌ Lỗi khi gửi tin nhắn:', err.message);
  }
};

const sendAndDeleteImg = async (bot, chatId, text, options = {}) => {
  try {
    const sentImg = await bot.sendPhoto(chatId, text, options);
    if (sentImg && sentImg.message_id) {
      setTimeout(() => {
        bot.deleteMessage(chatId, sentImg.message_id).catch((err) => {
          console.error('❌ Lỗi khi xóa ảnh:', err.message);
        });
      }, CONFIG.message?.timedeleteImg || 5000); // Giá trị mặc định là 5000ms
    }
  } catch (err) {
    console.error('❌ Lỗi khi gửi ảnh:', err.message);
  }
};

module.exports = { sendAndDeleteMessage, sendAndDeleteImg };
