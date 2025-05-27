const { MessageFlags } = require("discord.js");
const { discord, message } = require('../config');
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

const sendDiscordMsg = async (client, channelId, content) => {
  try {
    const guild = await client.guilds.fetch(discord.guildId);
    const channel = await guild.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      console.error(`Kênh không hợp lệ hoặc không phải kênh chat!`);
      return;
    }
    await channel.send({ content: content, flags: MessageFlags.Ephemeral });
  } catch (e) {
    console.error(e);
  }
};

module.exports = { sendAndDeleteMessage, sendAndDeleteImg, sendDiscordMsg };