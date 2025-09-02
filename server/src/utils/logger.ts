import winston from 'winston';

import { config } from '../config/config';

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // 如果有堆栈信息，添加到日志中
    if (stack) {
      log += `\n${stack}`;
    }

    // 如果有额外的元数据，添加到日志中
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return log;
  }),
);

// 控制台格式（开发环境使用）
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss',
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let log = `${timestamp} ${level}: ${message}`;
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  }),
);

// 创建传输器数组
const transports: winston.transport[] = [];

// 控制台传输器
if (config.nodeEnv === 'development') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug',
    }),
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: logFormat,
      level: config.logging.level,
    }),
  );
}

// 文件传输器
if (config.nodeEnv === 'prod') {
  // 普通日志文件
  transports.push(
    new winston.transports.File({
      filename: config.logging.file,
      format: logFormat,
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
  );

  // 错误日志文件
  transports.push(
    new winston.transports.File({
      filename: config.logging.errorFile,
      format: logFormat,
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
  );
}

// 创建 logger 实例
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  // 处理未捕获的异常
  exceptionHandlers: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
  // 处理未处理的 Promise 拒绝
  rejectionHandlers: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
  exitOnError: false,
});

// 日志工具类
export class Logger {
  // 调试日志
  static debug(message: string, meta?: object): void {
    logger.debug(message, meta);
  }

  // 信息日志
  static info(message: string, meta?: object): void {
    logger.info(message, meta);
  }

  // 警告日志
  static warn(message: string, meta?: object): void {
    logger.warn(message, meta);
  }

  // 错误日志
  static error(message: string, error?: Error | object): void {
    if (error instanceof Error) {
      logger.error(message, { error: error.message, stack: error.stack });
    } else {
      logger.error(message, error);
    }
  }

  // HTTP 请求日志
  static http(message: string, meta?: object): void {
    logger.http(message, meta);
  }

  // 数据库操作日志
  static database(operation: string, table: string, meta?: object): void {
    logger.info(`Database ${operation} on ${table}`, meta);
  }

  // 认证日志
  static auth(action: string, userId?: string, meta?: object): void {
    logger.info(`Auth ${action}`, { userId, ...meta });
  }

  // 业务日志
  static business(action: string, meta?: object): void {
    logger.info(`Business ${action}`, meta);
  }

  // 性能日志
  static performance(operation: string, duration: number, meta?: object): void {
    logger.info(`Performance ${operation}`, { duration: `${duration}ms`, ...meta });
  }

  // 安全日志
  static security(event: string, meta?: object): void {
    logger.warn(`Security ${event}`, meta);
  }
}

// 性能监控装饰器
export function LogPerformance(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = async function (...args: unknown[]) {
    const start = Date.now();
    try {
      const result = await method.apply(this, args);
      const duration = Date.now() - start;
      Logger.performance(`${target.constructor.name}.${propertyName}`, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      Logger.performance(`${target.constructor.name}.${propertyName} (failed)`, duration);
      throw error;
    }
  };
}

// 错误日志装饰器
export function LogErrors(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = async function (...args: unknown[]) {
    try {
      return await method.apply(this, args);
    } catch (error) {
      Logger.error(`Error in ${target.constructor.name}.${propertyName}`, error as Error);
      throw error;
    }
  };
}

export default logger;
