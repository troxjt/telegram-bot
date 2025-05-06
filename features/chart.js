const fs = require('fs');
const { sendAndDeleteImg, sendAndDeleteMessage } = require('../utils/messageUtils');

const generateBandwidthChart = async (bot, chatId) => {
  const path = './data/bandwidth.json';

  if (!fs.existsSync(path)) {
    return sendAndDeleteMessage(bot, chatId, '⛔ Chưa có dữ liệu thống kê.');
  }

  let data = { labels: [], rx: [], tx: [] };

  try {
    const raw = fs.readFileSync(path, 'utf8');
    if (raw) {
      data = JSON.parse(raw);
    }
  } catch (err) {
    console.error('❌ Lỗi đọc dữ liệu bandwidth:', err);
    return sendAndDeleteMessage(bot, chatId, '⚠️ Không thể đọc dữ liệu biểu đồ.');
  }

  const { labels, rx, tx } = data;

  const chartConfig = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Download (Mbps)',
          data: rx,
          borderColor: '#00c0ff',
          fill: false
        },
        {
          label: 'Upload (Mbps)',
          data: tx,
          borderColor: '#ff4c4c',
          fill: false
        }
      ]
    },
    options: {
      title: { display: true, text: '📡 Băng thông (BridgeLAN)' },
      scales: {
        yAxes: [{ ticks: { beginAtZero: true } }]
      }
    }
  };

  const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
  await sendAndDeleteImg(bot, chatId, chartUrl, { caption: '📈 Thống kê băng thông' });
};

module.exports = { generateBandwidthChart };
