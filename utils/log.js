const fs = require('fs');
const path = require('path');

// Custom logging function
function logToFile(message) {
    try {
        const logDir = __dirname;
        const logFilePath = path.join(logDir, 'app.log');
        const timestamp = new Date().toISOString();

        // Ensure the log directory exists
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`);
    } catch (err) {
        logToFile(`[LOG ERROR] Failed to write log: ${err.message}`);
    }
}

module.exports = { logToFile };