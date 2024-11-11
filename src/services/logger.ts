import winston from 'winston';
import path from 'path';

const { format, createLogger: winstonCreateLogger, transports } = winston;

// Define custom levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

type LogLevel = keyof typeof levels;

// Custom colors configuration
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

// Add colors to Winston
winston.addColors(colors);

const logDir = 'logs';

// Custom format
const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.colorize(),
  format.printf(({ timestamp, level, message, module, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${module || 'default'}] ${level}: ${message}${metaStr}`;
  })
);

export function createLogger(module: string) {
  return winstonCreateLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format: customFormat,
    defaultMeta: { module },
    transports: [
      // Console transport
      new transports.Console({
        handleExceptions: true,
      }),
      // Error log file
      new transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      // Combined log file
      new transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: 5242880,
        maxFiles: 5,
      }),
    ],
    exitOnError: false,
  });
}

// Export default logger
export const logger = createLogger('app');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});