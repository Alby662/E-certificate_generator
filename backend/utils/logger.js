import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { ROOT_DIR } from './env.js';

const LOG_DIR = path.join(ROOT_DIR, 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

// Create rotating transport
const transport = new winston.transports.DailyRotateFile({
    filename: path.join(LOG_DIR, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '10m',
    maxFiles: '30d',
    format: logFormat
});

// Create logger instance
const logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        transport,
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Legacy support for logEmail (to minimize breakage) but using Winston
export const logEmail = (level, message, metadata = {}) => {
    logger.log({
        ...metadata,
        level: level.toLowerCase(),
        message,
        service: 'email-service'
    });
};

// Export default logger
export default logger;

