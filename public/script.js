const { logToFile } = require('../utils/log');

document.addEventListener('DOMContentLoaded', () => {
  const whitelistTable = document.getElementById('whitelistTableBody');
  const suspiciousTable = document.getElementById('suspiciousTableBody');
  const trustedDevicesPage = document.getElementById('trustedDevicesPage');
  const suspiciousDevicesPage = document.getElementById('suspiciousDevicesPage');
  const trustedDevicesLink = document.getElementById('trustedDevicesLink');
  const suspiciousDevicesLink = document.getElementById('suspiciousDevicesLink');

  window.trustDevice = async function(mac) {
    try {
      await fetch('/api/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac })
      });
      alert('Thiết bị đã được thêm vào danh sách tin cậy.');
      loadDevices();
    } catch (err) {
      logToFile('Thiết bị tin cậy lỗi:', err);
    }
  };

  window.removeDevice = async function(mac) {
    try {
      await fetch(`/api/whitelist/${mac}`, { method: 'DELETE' });
      alert('Thiết bị đã bị xóa.');
      loadDevices();
    } catch (err) {
      logToFile('Loại bỏ thiết bị:', err);
    }
  };

  async function loadDevices() {
    const response = await fetch('/api/devices');
    const devices = await response.json();

    whitelistTable.innerHTML = '';
    suspiciousTable.innerHTML = '';

    for (const device of devices) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${device.mac}</td>
        <td>${device.ip}</td>
        <td>${device.interface}</td>
      `;

      if (device.isTrusted) {
        row.innerHTML += `
          <td>
            <button class="btn btn-danger" onclick="removeDevice('${device.mac}')">Xóa</button>
          </td>
        `;
        whitelistTable.appendChild(row);
      } else {
        row.innerHTML += `
          <td>
            <button class="btn btn-success" onclick="trustDevice('${device.mac}')">Tin Cậy</button>
            <button class="btn btn-danger" onclick="removeDevice('${device.mac}')">Xóa</button>
          </td>
        `;
        suspiciousTable.appendChild(row);
      }
    }
  }

  function showPage(page) {
    trustedDevicesPage.classList.remove('active');
    suspiciousDevicesPage.classList.remove('active');
    page.classList.add('active');
  }

  trustedDevicesLink.addEventListener('click', () => showPage(trustedDevicesPage));
  suspiciousDevicesLink.addEventListener('click', () => showPage(suspiciousDevicesPage));

  loadDevices();
  setInterval(loadDevices, 30000);
});
