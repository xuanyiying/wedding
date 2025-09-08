require('module-alias/register');
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
// import rateLimit from 'express-rate-limit'; // 已临时注释以解决频繁刷新token导致的429错误
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec, swaggerUiOptions } from './config/swagger';

import { config } from './config/config';
import { logger } from './utils/logger';
import { errorHandler } from './middlewares/error';
import { requestLogger } from './middlewares/request-logger';
import { 
  enhancedCors, 
  preflightHandler, 
  requestLogger as corsRequestLogger, 
  securityHeaders, 
  corsErrorHandler 
} from './middlewares/cors';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { FSService } from './services/fs.service';
// 导入模型以确保它们被正确初始化
import './models';


// 路由导入
import apiRoutes from './routes';

class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // 预检请求处理（必须在其他中间件之前）
    this.app.use(preflightHandler);

    // 增强的CORS配置
    this.app.use(enhancedCors);

    // 安全头中间件
    this.app.use(securityHeaders);

    // 安全中间件
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }));

    // 压缩响应
    this.app.use(compression());

    // 增强的请求日志
    this.app.use(corsRequestLogger);

    // 原有的请求日志
    if (config.nodeEnv === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined', {
        stream: {
          write: (message: string) => logger.info(message.trim()),
        },
      }));
    }

    // 速率限制 (已临时注释以解决频繁刷新token导致的429错误)
    // const limiter = rateLimit({
    //   windowMs: config.rateLimit.windowMs,
    //   max: config.rateLimit.maxRequests,
    //   message: {
    //     error: 'Too many requests from this IP, please try again later.',
    //   },
    //   standardHeaders: true,
    //   legacyHeaders: false,
    // });
    // this.app.use(limiter);

    // 解析请求体 - 增加到500MB以支持大文件上传
    this.app.use(express.json({ limit: '500mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '500mb' }));

    // 静态文件服务
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // 自定义请求日志中间件
    this.app.use(requestLogger);
  }

  private initializeRoutes(): void {
    const apiPrefix = config.apiPrefix;

    // 健康检查
    this.app.get('/health', (_req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
      });
    });

    // API 路由
    this.app.use(apiPrefix, apiRoutes);

    // Swagger API 文档路由
    this.app.use(`${apiPrefix}/docs`, swaggerUi.serve);
    this.app.get(`${apiPrefix}/docs`, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

    // API 规范 JSON 端点
    this.app.get(`${apiPrefix}/docs.json`, (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
  }

  private initializeErrorHandling(): void {
    // CORS错误处理
    this.app.use(corsErrorHandler);
    
    // 全局错误处理
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      await connectDatabase();
      await connectRedis();

      // 初始化文件存储服务
      const fsService = new FSService();
      await fsService.initializeBucket();
      logger.info('File storage service initialized successfully');

      this.listen();
    } catch (error) {
      logger.error('Failed to start server:', error as Error);
      process.exit(1);
    }
  }

  public listen(): void {
    const port = config.port;
    this.app.listen(port, () => {
      // 在运行时动态获取API_HOST环境变量
      const host = process.env.API_HOST || 'localhost';
      logger.info(`🚀 Server running on port ${port}`);
      logger.info(`📝 Environment: ${config.nodeEnv}`);
      logger.info(`🔗 API Base URL: http://${host}:${port}${config.apiPrefix}`);
      if (config.nodeEnv === 'development') {
        logger.info(`📚 API Docs: http://${host}:${port}${config.apiPrefix}/docs`);
      }
    });
  }
}

export default App;

// 启动应用
if (require.main === module) {
  const app = new App();
  app.start();
}