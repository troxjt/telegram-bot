const { message, telegram } = require('../config');
const { logToFile } = require('./log');

const DEFAULT_DELETE_DELAY = 10000;
const DEFAULT_IMG_DELETE_DELAY = 30000;

const sendAndDelete = async (sendFunction, bot, chatId, content, options = {}, deleteDelay) => {
  try {
    const sentMessage = await sendFunction(chatId, content, options);
    if (sentMessage?.message_id) {
      setTimeout(async () => {
        try {
          await bot.deleteMessage(chatId, sentMessage.message_id);
        } catch (err) {
          logToFile(`❌ Lỗi khi xóa tin nhắn/ảnh:`, err.message);
        }
      }, deleteDelay);
    }
  } catch (err) {
    logToFile(`❌ Lỗi khi gửi tin nhắn/ảnh:`, err.message);
  }
};

const sendAndDeleteMessage = (bot, chatId, text, options = {}) => {
  const deleteDelay = message?.timedeleteMessage ?? DEFAULT_DELETE_DELAY;
  return sendAndDelete(bot.sendMessage.bind(bot), bot, chatId, text, options, deleteDelay);
};

const sendAndDeleteImg = (bot, chatId, photo, options = {}) => {
  const deleteDelay = message?.timedeleteImg ?? DEFAULT_IMG_DELETE_DELAY;
  return sendAndDelete(bot.sendPhoto.bind(bot), bot, chatId, photo, options, deleteDelay);
};

const sendAlert = async (mac, ip, iface) => {
  const alertMessage = `[ALERT] Thiết bị không có trong whitelist:\nMAC: ${mac}\nIP: ${ip}\nInterface: ${iface}`;
  try {
    const text = alertMessage;
    const url = `https://api.telegram.org/bot${telegram.token}/sendMessage?chat_id=${telegram.chatId}&text=${encodeURIComponent(text)}`;
    await fetch(url);
    logToFile(`[NOTIFY] Đã gửi cảnh báo qua Telegram: MAC=${mac}, IP=${ip}`);
  } catch (err) {
    logToFile(`[LỖI] Không thể gửi cảnh báo qua Telegram: ${err.message}`);
  }
};

module.exports = { sendAndDeleteMessage, sendAndDeleteImg, sendAlert };
