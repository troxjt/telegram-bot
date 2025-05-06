document.addEventListener('DOMContentLoaded', () => {
  const whitelistTable = document.getElementById('whitelistTableBody');
  const suspiciousTable = document.getElementById('suspiciousTableBody');

  async function loadDevices() {
    const response = await fetch('/api/devices');
    const devices = await response.json();

    whitelistTable.innerHTML = '';
    suspiciousTable.innerHTML = '';

    devices.forEach(device => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${device.mac}</td>
        <td>${device.ip}</td>
        <td>${device.interface}</td>
      `;
      suspiciousTable.appendChild(row);
    });
  }

  loadDevices();
  setInterval(loadDevices, 30000);
});
