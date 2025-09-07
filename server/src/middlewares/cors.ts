/**
 * CORS中间件配置
 * 解决"Provisional headers are shown"问题
 */

import { Request, Response, NextFunction } from 'express';
import cors from 'cors';

// CORS配置选项
const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // 从环境变量解析多个源
    const envOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['http://' + process.env.SERVER_HOST + ':80', 'http://' + process.env.SERVER_HOST + ':3000'];

    // 允许的源列表
    const allowedOrigins = [process.env.FRONTEND_URL, process.env.CLIENT_URL, ...envOrigins].filter(Boolean);

    // 开发环境允许所有源
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // 生产环境检查源 - 允许同源请求和undefined origin
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('🚫 CORS blocked origin:', origin, 'Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
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
  ],
  exposedHeaders: ['Content-Length', 'Content-Range', 'X-Upload-Progress', 'X-Upload-Status'],
  maxAge: 86400, // 24小时预检缓存
};

/**
 * 增强的CORS中间件
 */
export const enhancedCors = cors(corsOptions);

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
