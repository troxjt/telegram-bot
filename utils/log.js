const fs = require('fs');

// Custom logging function
function logToFile(message) {
    try {
        const logDir = __dirname;
        const logFilePath = './data/app.log';

        // Get current time in UTC+7
        const now = new Date();
        const utc7Offset = 7 * 60 * 60 * 1000; // 7 hours in milliseconds
        const vietnamTime = new Date(now.getTime() + utc7Offset);
        const timestamp = vietnamTime.toISOString().replace('T', ' ').slice(0, 19); // Format: YYYY-MM-DD HH:mm:ss

        // Ensure the log directory exists
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`);
    } catch (err) {
        logToFile(`[LỖI] Không ghi nhật ký: ${err.message}`);
    }
}

module.exports = { logToFile };