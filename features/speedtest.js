const { sendAndDeleteMessage } = require('../utils/messageUtils');

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

const handleBandwidthAutoISP = async (bot, chatId) => {
  // Implementation for auto ISP detection and speed test
};

module.exports = { askSpeedtestMode, handleBandwidthAutoISP };
