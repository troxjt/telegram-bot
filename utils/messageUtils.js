const { MessageFlags } = require("discord.js");
const { message, telegram } = require('../config');
const client = require('../bot');
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

const GuiThongBaoTele = async (alertMessage) => {
  try {
    const text = alertMessage;
    const url = `https://api.telegram.org/bot${telegram.token}/sendMessage?chat_id=${telegram.chatId}&text=${encodeURIComponent(text)}`;
    await fetch(url);
  } catch (err) {
    // logToFile(`[LỖI] Không thể gửi cảnh báo qua Telegram: ${err.message}`);
  }
};

const sendDiscordMsg = async (channelId, content) => {
  const channel = await client.checkChannel(client, channelId);

  if (!channel || !channel.isTextBased()) {
    console.error(`Kênh không hợp lệ hoặc không phải kênh chat!`);
    return;
  }

  try {
    await channel.send({ content: content, flags: MessageFlags.Ephemeral });
  } catch (e) {
    console.error(e);
  }
}

module.exports = { sendAndDeleteMessage, sendAndDeleteImg, GuiThongBaoTele, sendDiscordMsg };
