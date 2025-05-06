const { sendAndDeleteMessage } = require('../utils/messageUtils');
const axios = require('axios');
const { exec } = require('child_process');

const askSpeedtestMode = async (bot, chatId) => {
  const text = '📶 *Chọn loại đo tốc độ bạn muốn:*';
  const options = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🇻🇳 Đo nội mạng (theo nhà mạng)', callback_data: 'bandwidth_auto_isp' }
        ],
        [
          { text: '🌍 Đo quốc tế (Singapore)', callback_data: 'bandwidth_global' },
          { text: '🏢 FPT', callback_data: 'bandwidth_local_fpt' },
          { text: '🏢 Viettel', callback_data: 'bandwidth_local_viettel' },
          { text: '🏢 VNPT', callback_data: 'bandwidth_local_vnpt' }
        ]
      ]
    }
  };
  await sendAndDeleteMessage(bot, chatId, text, options);
};

const handleBandwidth = async (bot, chatId, serverId) => {
  const message = await bot.sendMessage(chatId, '📡 *ĐANG CHUẨN BỊ ĐO...*', { parse_mode: 'Markdown' });

  exec(`speedtest --accept-license --accept-gdpr -s ${serverId} -f json`, async (error, stdout) => {
    if (error) {
      return bot.editMessageText(`❌ *Lỗi đo tốc độ:* ${error.message}`, {
        chat_id: chatId,
        message_id: message.message_id,
        parse_mode: 'Markdown'
      });
    }

    try {
      const data = JSON.parse(stdout);
      const download = (data.download.bandwidth / 125000).toFixed(2);
      const upload = (data.upload.bandwidth / 125000).toFixed(2);
      const ping = data.ping.latency;
      const server = `${data.server.name}, ${data.server.location}`;
      const timestamp = new Date(data.timestamp).toLocaleString('vi-VN');

      const result =
        `✅ *KẾT QUẢ TỐC ĐỘ:*\n\n` +
        `🏢 *Máy chủ*: ${server}\n` +
        `🕒 *Thời gian*: ${timestamp}\n\n` +
        `🔻 *Tải xuống*: ${download} Mbps\n` +
        `🔺 *Tải lên*: ${upload} Mbps\n` +
        `📶 *Ping*: ${ping} ms`;

      await bot.editMessageText(result, {
        chat_id: chatId,
        message_id: message.message_id,
        parse_mode: 'Markdown'
      });
    } catch (err) {
      bot.editMessageText(`❌ *Lỗi phân tích kết quả:* ${err.message}`, {
        chat_id: chatId,
        message_id: message.message_id,
        parse_mode: 'Markdown'
      });
    }
  });
};

const handleBandwidthAutoISP = async (bot, chatId) => {
  const message = await bot.sendMessage(chatId, '📡 *ĐANG KIỂM TRA NHÀ MẠNG...*', { parse_mode: 'Markdown' });

  try {
    const isp = await axios.get('https://ipinfo.io/json').then((res) => res.data.org);
    const serverId = getServerIdByISP(isp);

    await bot.editMessageText(`✅ *Nhà mạng:* ${isp}\n🔍 *Chọn server phù hợp...*`, {
      chat_id: chatId,
      message_id: message.message_id,
      parse_mode: 'Markdown'
    });

    setTimeout(() => handleBandwidth(bot, chatId, serverId), 2000);
  } catch (err) {
    bot.editMessageText(`❌ *Lỗi kiểm tra ISP:* ${err.message}`, {
      chat_id: chatId,
      message_id: message.message_id,
      parse_mode: 'Markdown'
    });
  }
};

const getServerIdByISP = (ispName) => {
  const mappings = [
    { keyword: 'FPT', id: 4181 },
    { keyword: 'Viettel', id: 4062 },
    { keyword: 'VNPT', id: 7232 }
  ];

  for (const entry of mappings) {
    if (ispName.toLowerCase().includes(entry.keyword.toLowerCase())) {
      return entry.id;
    }
  }

  return 21541; // Default to Singapore server
};

module.exports = { askSpeedtestMode, handleBandwidth, handleBandwidthAutoISP };
