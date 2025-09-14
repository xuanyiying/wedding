import 'module-alias/register';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

import MCPApp from './app';
import { logger } from '../utils/logger';

// 处理未捕获的异常
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

async function bootstrap() {
  try {
    // 启动MCP应用
    const app = new MCPApp();
    await app.start();

  } catch (error) {
    logger.error('❌ Failed to start MCP server:', error);
    process.exit(1);
  }
}

// 启动应用
bootstrap().catch((error) => {
  logger.error('Bootstrap failed:', error);
  process.exit(1);
});