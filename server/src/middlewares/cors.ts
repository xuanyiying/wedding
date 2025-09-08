/**
 * CORS中间件配置
 * 解决"Provisional headers are shown"问题
 */

import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from '../config/config';

// 在服务启动时计算一次允许的源
const allowedOrigins = config.cors.origin
  ? (Array.isArray(config.cors.origin)
    ? config.cors.origin
    : config.cors.origin.split(',').map(o => o.trim()))
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

// 开发环境下，额外允许所有来源，便于调试
if (process.env.NODE_ENV === 'development') {
  // 使用 Set 来避免重复
  const originSet = new Set(allowedOrigins);
  originSet.add('*'); // 添加通配符以允许所有来源
}

// CORS配置选项
const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // 开发环境始终允许
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // 生产环境检查源
    // 允许列表中的源或服务器到服务器的请求（origin为undefined）
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('🚫 CORS blocked origin:', origin, 'Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Upload-Type',
    'X-Chunk-Index',
    'X-File-ID',
    'X-Upload-ID',
    // 添加在Nginx配置中看到的额外头部
    'DNT',
    'User-Agent',
    'If-Modified-Since',
    'Range',
    'X-Request-ID',
    'X-External-Host',
    'X-External-Proto',
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Range',
    'X-Upload-Progress',
    'X-Upload-Status',
    // 添加在Nginx配置中看到的额外头部
    'X-Request-ID',
    'X-Cache-Status',
    'ETag',
  ],
  maxAge: 86400, // 24小时预检缓存
};

const corsMiddleware = cors(corsOptions);

export default corsMiddleware;

/**
 * 预检请求处理中间件
 */
export const preflightHandler = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    console.log('🔍 处理CORS预检请求:', {
      origin: req.headers.origin,
      method: req.headers['access-control-request-method'],
      headers: req.headers['access-control-request-headers'],
      userAgent: req.headers['user-agent']?.substring(0, 100),
    });

    // 设置预检响应头
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    const allowedHeaders = corsOptions.allowedHeaders;
    if (Array.isArray(allowedHeaders)) {
      res.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    } else if (typeof allowedHeaders === 'string') {
      res.header('Access-Control-Allow-Headers', allowedHeaders);
    }
    res.header('Access-Control-Max-Age', '86400');

    // 返回成功状态
    res.status(204).end();
    return;
  }

  next();
};

/**
 * 请求日志中间件
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // 记录请求开始
  console.log('📥 收到请求:', {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']?.substring(0, 50),
    contentType: req.headers['content-type'],
    authorization: req.headers.authorization ? 'Bearer ***' : 'none',
    timestamp: new Date().toISOString(),
  });

  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length') || '0',
    };

    if (res.statusCode >= 400) {
      console.error('❌ 请求失败:', logData);
    } else {
      console.log('✅ 请求成功:', logData);
    }
  });

  next();
};

/**
 * 安全头中间件
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // 设置安全相关的响应头
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 文件上传相关的头
  if (req.url.includes('/files/') || req.url.includes('/upload')) {
    res.header('X-Upload-Server', 'wedding-app');
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  }

  next();
};

/**
 * 错误处理中间件
 */
export const corsErrorHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error.message === 'Not allowed by CORS') {
    console.error('🚫 CORS错误:', {
      origin: req.headers.origin,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent']?.substring(0, 100),
    });

    res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      error: 'Origin not allowed',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next(error);
};