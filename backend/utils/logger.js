import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, '../logs');
const EMAIL_LOG_FILE = path.join(LOG_DIR, 'email.log');
const MAX_LOG_AGE_DAYS = 7;

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Format current timestamp for logging
 * @returns {string} Formatted timestamp
 */
const getTimestamp = () => {
    return new Date().toISOString();
};

/**
 * Log email activity to file
 * @param {string} level - Log level (INFO, ERROR, WARN)
 * @param {string} message - Log message
 * @param {object} metadata - Additional metadata
 */
export const logEmail = (level, message, metadata = {}) => {
    const logEntry = {
        timestamp: getTimestamp(),
        level,
        message,
        ...metadata
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    try {
        fs.appendFileSync(EMAIL_LOG_FILE, logLine, 'utf8');
    } catch (error) {
        console.error('Failed to write to email log:', error);
    }
};

/**
 * Clean up old log files (older than MAX_LOG_AGE_DAYS)
 */
export const cleanupOldLogs = () => {
    try {
        const now = Date.now();
        const maxAge = MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000; // Convert days to milliseconds

        const files = fs.readdirSync(LOG_DIR);

        for (const file of files) {
            const filePath = path.join(LOG_DIR, file);
            const stats = fs.statSync(filePath);

            if (now - stats.mtimeMs > maxAge) {
                fs.unlinkSync(filePath);
                console.log(`🗑️  Deleted old log file: ${file}`);
            }
        }
    } catch (error) {
        console.error('Error cleaning up old logs:', error);
    }
};

/**
 * Get email sending statistics from log file
 * @returns {{totalSent: number, totalFailed: number, byCategory: object}}
 */
export const getEmailStats = () => {
    try {
        if (!fs.existsSync(EMAIL_LOG_FILE)) {
            return { totalSent: 0, totalFailed: 0, byCategory: {} };
        }

        const content = fs.readFileSync(EMAIL_LOG_FILE, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        const stats = {
            totalSent: 0,
            totalFailed: 0,
            byCategory: {}
        };

        lines.forEach(line => {
            try {
                const entry = JSON.parse(line);

                if (entry.status === 'sent') {
                    stats.totalSent++;
                } else if (entry.status === 'failed') {
                    stats.totalFailed++;

                    const category = entry.errorCategory || 'unknown';
                    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
                }
            } catch (parseError) {
                // Skip invalid JSON lines
            }
        });

        return stats;
    } catch (error) {
        console.error('Error reading email stats:', error);
        return { totalSent: 0, totalFailed: 0, byCategory: {} };
    }
};

// Run cleanup on module load
cleanupOldLogs();
