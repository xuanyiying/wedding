import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
dotenvConfig({ path: resolve(__dirname, '../../.env') });

interface Config {
  nodeEnv: string;
  port: number;
  apiPrefix: string;

  // 数据库配置
  database: {
    host: string;
    port: number;
    name: string;
    username: string;
    password: string;
    dialect: string;
    logging: boolean;
    pool: {
      max: number;
      min: number;
      acquire: number;
      idle: number;
    };
  };

  // Redis 配置
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    retryDelayOnFailover: number;
    maxRetriesPerRequest: number;
  };

  // JWT 配置
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };

  // 文件上传配置
  upload: {
    dir: string;
    maxFileSize: number;
    allowedImageTypes: string[];
    allowedVideoTypes: string[];
    allowedAudioTypes: string[];
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };

  // 邮件配置
  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
  };

  // 安全配置
  security: {
    bcryptRounds: number;
  };

  // 速率限制配置
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };

  // 日志配置
  logging: {
    level: string;
    file: string;
    errorFile: string;
  };

  // CORS 配置
  cors: {
    origin: string | string[];
    credentials: boolean;
  };

  // OSS存储配置
  oss: {
    type: 'minio' | 'aws' | 'aliyun' | 'tencent';
    endpoint: string;
    region: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    publicEndpoint?: string;
    useSSL: boolean;
    pathStyle: boolean;
  };
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value || defaultValue!;
};

const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value ? parseInt(value, 10) : defaultValue!;
};

const getEnvBoolean = (key: string, defaultValue?: boolean): boolean => {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value ? value.toLowerCase() === 'true' : defaultValue!;
};

const getEnvArray = (key: string, defaultValue?: string[]): string[] => {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value ? value.split(',').map(item => item.trim()) : defaultValue!;
};

export const config: Config = {
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  port: getEnvNumber('PORT', 3000),
  apiPrefix: getEnvVar('API_PREFIX', '/api/v1'),

  database: {
    host: getEnvVar('DB_HOST', 'mysql'),
    port: getEnvNumber('DB_PORT', 3306),
    name: getEnvVar('DB_NAME', 'wedding_club'),
    username: getEnvVar('DB_USERNAME', 'root'),
    password: getEnvVar('DB_PASSWORD', ''),
    dialect: getEnvVar('DB_DIALECT', 'mysql'),
    logging: getEnvBoolean('DB_LOGGING', false),
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },

  redis: {
    host: getEnvVar('REDIS_HOST', 'redis'),
    port: getEnvNumber('REDIS_PORT', 6379),
    ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
    db: getEnvNumber('REDIS_DB', 0),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  },

  jwt: {
    secret: getEnvVar('JWT_SECRET'),
    refreshSecret: getEnvVar('JWT_REFRESH_SECRET'),
    expiresIn: getEnvVar('JWT_EXPIRES_IN', '15m'),
    refreshExpiresIn: getEnvVar('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  upload: {
    dir: getEnvVar('UPLOAD_DIR', 'uploads'),
    maxFileSize: getEnvNumber('MAX_FILE_SIZE', 104857600), // 100MB (增加到100MB)
    allowedImageTypes: getEnvArray('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
    allowedVideoTypes: getEnvArray('ALLOWED_VIDEO_TYPES', ['video/mp4', 'video/avi', 'video/mov', 'video/wmv']),
    allowedAudioTypes: getEnvArray('ALLOWED_AUDIO_TYPES', ['audio/mp3', 'audio/wav', 'audio/aac']),
    timeout: getEnvNumber('UPLOAD_TIMEOUT', 300000), // 5分钟超时
    retryAttempts: getEnvNumber('UPLOAD_RETRY_ATTEMPTS', 3), // 重试3次
    retryDelay: getEnvNumber('UPLOAD_RETRY_DELAY', 1000), // 重试延迟1秒
  },

  email: {
    host: getEnvVar('SMTP_HOST', 'smtp.gmail.com'),
    port: getEnvNumber('SMTP_PORT', 587),
    secure: getEnvBoolean('SMTP_SECURE', false),
    user: getEnvVar('SMTP_USER'),
    pass: getEnvVar('SMTP_PASS'),
    from: getEnvVar('SMTP_FROM', 'Wedding Club <noreply@weddingclub.com>'),
  },

  security: {
    bcryptRounds: getEnvNumber('BCRYPT_ROUNDS', 12),
  },

  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  },

  logging: {
    level: getEnvVar('LOG_LEVEL', 'info'),
    file: getEnvVar('LOG_FILE', 'logs/app.log'),
    errorFile: getEnvVar('LOG_ERROR_FILE', 'logs/error.log'),
  },

  cors: {
    origin: getEnvVar('CORS_ORIGIN', '*'),
    credentials: getEnvBoolean('CORS_CREDENTIALS', true),
  },

  oss: {
    type: getEnvVar('OSS_TYPE', 'minio') as 'minio' | 'aws' | 'aliyun' | 'tencent',
    endpoint: getEnvVar('OSS_ENDPOINT', 'http://localhost:9000'),
    region: getEnvVar('OSS_REGION', 'us-east-1'),
    accessKey: getEnvVar('OSS_ACCESS_KEY', 'ossadmin'),
    secretKey: getEnvVar('OSS_SECRET_KEY', 'osspassword'),
    bucket: getEnvVar('OSS_BUCKET', 'wedding-prod'),
    publicEndpoint: getEnvVar('OSS_PUBLIC_ENDPOINT'),
    useSSL: getEnvBoolean('OSS_USE_SSL', false),
    pathStyle: getEnvBoolean('OSS_PATH_STYLE', true),
  },
};

// 验证必需的环境变量
if (config.nodeEnv === 'production') {
  const requiredVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_PASSWORD', 'SMTP_USER', 'SMTP_PASS'];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Environment variable ${varName} is required in production`);
    }
  }
}
