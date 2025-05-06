const { sendAndDeleteMessage } = require('../utils/messageUtils');
const { handleSystemInfo, handleListConnections, handleInterfaceStatus } = require('./system');
const { handleBlacklist } = require('./blacklist');
const { askSpeedtestMode, handleBandwidthAutoISP } = require('./speedtest');
const { generateBandwidthChart } = require('./chart');
const { execUpdate, confirmReboot, rebootRouter } = require('./reboot');
const { showAIMenu, showAIDefenseList } = require('./aiDefense');

const showMenu = (bot, chatId) => {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🖥️ Hệ thống', callback_data: 'get_system_info' },
          { text: '🌐 Giao diện', callback_data: 'interface_status' }
        ],
        [
          { text: '🔌 ARP', callback_data: 'list_connections' },
          { text: '📶 Băng thông', callback_data: 'check_bandwidth' }
        ],
        [
          { text: '📛 Blacklist', callback_data: 'show_blacklist' }
        ],
        [
          { text: '📊 Biểu đồ mạng', callback_data: 'show_chart' },
          { text: '🤖 AI Defense', callback_data: 'ai_defense_menu' }
        ],
        [
          { text: '🧠 Update Bot', callback_data: 'update_code_bot' },
          { text: '🔁 Reboot', callback_data: 'reboot_router' }
        ]
      ]
    }
  };

  const welcome = `📊 *BẢNG ĐIỀU KHIỂN ROUTER*\n\nChọn một chức năng để quản lý hệ thống của bạn:`;
  bot.sendMessage(chatId, welcome, { parse_mode: 'Markdown', ...options });
};

const handleCallbackQuery = async (bot, cbq) => {
  const chatId = cbq.message.chat.id;
  const action = cbq.data;

  try {
    await bot.answerCallbackQuery(cbq.id);

    switch (action) {
      case 'menu':
        return showMenu(bot, chatId);
      case 'get_system_info':
        return handleSystemInfo(bot, chatId);
      case 'interface_status':
        return handleInterfaceStatus(bot, chatId);
      case 'list_connections':
        return handleListConnections(bot, chatId);
      case 'check_bandwidth':
        return askSpeedtestMode(bot, chatId);
      case 'bandwidth_auto_isp':
        return handleBandwidthAutoISP(bot, chatId);
      case 'show_blacklist':
        return handleBlacklist(bot, chatId);
      case 'show_chart':
        return generateBandwidthChart(bot, chatId);
      case 'ai_defense_menu':
        return showAIMenu(bot, chatId);
      case 'ai_defense_list':
        return showAIDefenseList(bot, chatId);
      case 'update_code_bot':
        return execUpdate(bot, chatId);
      case 'reboot_router':
        return confirmReboot(bot, chatId);
      case 'confirm_reboot_yes':
        return rebootRouter(bot, chatId);
      default:
        return sendAndDeleteMessage(bot, chatId, '❌ Lệnh không hợp lệ.');
    }
  } catch (err) {
    console.error('❌ Lỗi xử lý callback:', err);
    sendAndDeleteMessage(bot, chatId, '❌ Đã xảy ra lỗi khi xử lý yêu cầu.');
  }
};

module.exports = { showMenu, handleCallbackQuery };
