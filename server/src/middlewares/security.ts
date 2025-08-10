import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import { Logger } from '../utils/logger';
import { RedisCache } from '../config/redis';

// 基础速率限制配置
const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000),
    },
    keyGenerator: options.keyGenerator || ((req: Request) => req.ip || 'unknown'),
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      Logger.security('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: `${req.method} ${req.path}`,
        limit: options.max,
        window: options.windowMs,
      });

      res.status(429).json({
        error: options.message,
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
  });
};

// 通用速率限制
export const generalRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 1000, // 每个 IP 每 15 分钟最多 1000 个请求
  message: 'Too many requests from this IP, please try again later.',
});

// 严格速率限制（用于敏感操作）
export const strictRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 10, // 每个 IP 每 15 分钟最多 10 个请求
  message: 'Too many requests for this operation, please try again later.',
});

// 认证相关速率限制
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 5, // 每个 IP 每 15 分钟最多 5 次登录尝试
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true, // 成功的请求不计入限制
});

// 注册速率限制
export const registerRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 3, // 每个 IP 每小时最多 3 次注册
  message: 'Too many registration attempts, please try again later.',
});

// 密码重置速率限制
export const passwordResetRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 3, // 每个 IP 每小时最多 3 次密码重置
  message: 'Too many password reset attempts, please try again later.',
});

// 文件上传速率限制
export const uploadRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 20, // 每个 IP 每 15 分钟最多 20 次上传
  message: 'Too many upload attempts, please try again later.',
});

// API 速率限制（用于 API 密钥认证的请求）
export const apiRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 1000, // 每个 API 密钥每 15 分钟最多 1000 个请求
  message: 'API rate limit exceeded, please try again later.',
  keyGenerator: (req: Request) => {
    const apiKey = req.headers['x-api-key'] as string;
    return apiKey || req.ip || 'unknown';
  },
});

// 慢速攻击防护
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 分钟
  delayAfter: 50, // 前 50 个请求正常处理
  delayMs: 500, // 每个后续请求延迟 500ms
  maxDelayMs: 20000, // 最大延迟 20 秒
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  keyGenerator: (req: Request) => {
    // 使用 IP 地址和用户代理的组合作为键
    return `${req.ip || 'unknown'}-${req.get('User-Agent') || 'unknown'}`;
  },
});

// Helmet 安全头配置
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
});

// IP 黑名单检查
const blacklistedIPs = new Set<string>();

export const checkIPBlacklist = (req: Request, res: Response, next: NextFunction): void => {
  const clientIP = req.ip || 'unknown';

  if (blacklistedIPs.has(clientIP)) {
    Logger.security('Blocked request from blacklisted IP', {
      ip: clientIP,
      userAgent: req.get('User-Agent'),
      endpoint: `${req.method} ${req.path}`,
    });

    res.status(403).json({
      error: 'Access denied',
    });
    return;
  }

  next();
};

// 添加 IP 到黑名单
export const addToBlacklist = (ip: string): void => {
  blacklistedIPs.add(ip);
  Logger.security('IP added to blacklist', { ip });
};

// 从黑名单移除 IP
export const removeFromBlacklist = (ip: string): void => {
  blacklistedIPs.delete(ip);
  Logger.security('IP removed from blacklist', { ip });
};

// 可疑活动检测
export const suspiciousActivityDetection = (req: Request, _: Response, next: NextFunction): void => {
  try {
    const clientIP = req.ip;
    const userAgent = req.get('User-Agent') || '';
    const endpoint = `${req.method} ${req.path}`;

    // 检查 User-Agent
    if (!userAgent || userAgent.length < 10) {
      Logger.security('Suspicious request: Invalid User-Agent', {
        ip: clientIP,
        userAgent,
        endpoint,
      });
    }

    // 检查常见的攻击模式
    const suspiciousPatterns = [
      /\.\.\//g, // 路径遍历
      /<script/gi, // XSS
      /union.*select/gi, // SQL 注入
      /javascript:/gi, // JavaScript 协议
      /vbscript:/gi, // VBScript 协议
    ];

    const requestData = JSON.stringify({
      url: req.url,
      body: req.body,
      query: req.query,
    });

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestData)) {
        Logger.security('Suspicious request: Potential attack pattern detected', {
          ip: clientIP,
          userAgent,
          endpoint,
          pattern: pattern.source,
        });

        // 可以选择阻止请求或仅记录
        // throw new AuthorizationError('Suspicious activity detected');
        break;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// 请求大小限制
export const requestSizeLimit = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0', 10);

    if (contentLength > maxSize) {
      Logger.security('Request size limit exceeded', {
        ip: req.ip,
        contentLength,
        maxSize,
        endpoint: `${req.method} ${req.path}`,
      });

      res.status(413).json({
        error: 'Request entity too large',
        maxSize,
      });
      return;
    }

    next();
  };
};

// CSRF 保护（简单实现）
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // 对于状态改变的操作（POST, PUT, DELETE, PATCH），检查 CSRF token
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const token = req.headers['x-csrf-token'] || req.body._csrf;

    if (!token) {
      Logger.security('CSRF token missing', {
        ip: req.ip,
        method: req.method,
        endpoint: req.path,
      });

      res.status(403).json({
        error: 'CSRF token required',
      });
      return;
    }

    // 这里应该验证 CSRF token 的有效性
    // 简单实现：检查 token 是否存在于 session 或 Redis 中
    // const isValidToken = await validateCSRFToken(token, req.session?.id);
    // if (!isValidToken) {
    //   throw new AuthorizationError('Invalid CSRF token');
    // }
  }

  next();
};

// 生成 CSRF token
export const generateCSRFToken = async (sessionId: string): Promise<string> => {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  // 将 token 存储到 Redis 中，设置过期时间
  await RedisCache.set(`csrf:${sessionId}`, token, 3600); // 1 小时过期

  return token;
};

// 验证 CSRF token
export const validateCSRFToken = async (token: string, sessionId: string): Promise<boolean> => {
  try {
    const storedToken = await RedisCache.get(`csrf:${sessionId}`);
    return storedToken === token;
  } catch (error) {
    Logger.error('Failed to validate CSRF token:', error as Error);
    return false;
  }
};

// 输入清理中间件
export const sanitizeInput = (req: Request, _: Response, next: NextFunction): void => {
  // 递归清理对象中的字符串值
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      // 移除潜在的危险字符
      return obj
        .replace(/<script[^>]*>.*?<\/script>/gi, '') // 移除 script 标签
        .replace(/<[^>]*>/g, '') // 移除 HTML 标签
        .replace(/javascript:/gi, '') // 移除 javascript: 协议
        .replace(/vbscript:/gi, '') // 移除 vbscript: 协议
        .replace(/on\w+\s*=/gi, '') // 移除事件处理器
        .trim();
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }

    return obj;
  };

  // 清理请求体
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // 清理查询参数
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// 地理位置限制（示例：仅允许特定国家/地区）
export const geoRestriction = (_: string[]) => {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    // 这里需要集成地理位置服务（如 MaxMind GeoIP）
    // const country = getCountryFromIP(req.ip);
    //
    // if (!allowedCountries.includes(country)) {
    //   Logger.security('Geo-restricted access attempt', {
    //     ip: req.ip,
    //     country,
    //     allowedCountries,
    //   });
    //
    //   res.status(403).json({
    //     error: 'Access denied from your location',
    //   });
    //   return;
    // }

    next();
  };
};

// 时间窗口限制（仅在特定时间段允许访问）
export const timeWindowRestriction = (allowedHours: { start: number; end: number }) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const currentHour = new Date().getHours();

    if (currentHour < allowedHours.start || currentHour > allowedHours.end) {
      Logger.security('Time window restriction triggered', {
        ip: req.ip,
        currentHour,
        allowedWindow: allowedHours,
      });

      res.status(403).json({
        error: 'Access denied outside allowed time window',
        allowedHours,
      });
      return;
    }

    next();
  };
};

// 导出安全中间件组合
export const securityMiddlewares = {
  // 基础安全
  basic: [securityHeaders, checkIPBlacklist, suspiciousActivityDetection],

  // 速率限制
  rateLimiting: {
    general: generalRateLimit,
    strict: strictRateLimit,
    auth: authRateLimit,
    register: registerRateLimit,
    passwordReset: passwordResetRateLimit,
    upload: uploadRateLimit,
    api: apiRateLimit,
  },

  // 输入安全
  inputSecurity: [sanitizeInput, requestSizeLimit(10 * 1024 * 1024)], // 10MB 限制

  // CSRF 保护
  csrf: csrfProtection,

  // 慢速攻击防护
  slowDown: speedLimiter,
};

export default securityMiddlewares;
