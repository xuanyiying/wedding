import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
dotenvConfig({ path: resolve(__dirname, '../.env') });

interface Config {
  nodeEnv: string;
  port: number;
  mcpPort: number;
  apiPrefix: string;
  apiBaseUrl: string;

  // JWT配置
  jwt: {
    secret: string;
    refreshSecret: string;
  };

  // 日志配置
  logging: {
    level: string;
    file: string;
    errorFile: string;
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

export const config: Config = {
  nodeEnv: getEnvVar('NODE_ENV', 'dev'),
  port: getEnvNumber('PORT', 3000),
  mcpPort: getEnvNumber('MCP_PORT', 3002),
  apiPrefix: getEnvVar('API_PREFIX', '/api/v1'),
  apiBaseUrl: getEnvVar('API_BASE_URL', 'http://localhost:3000'),

  // JWT配置
  jwt: {
    secret: getEnvVar('JWT_SECRET', 'default_jwt_secret'),
    refreshSecret: getEnvVar('JWT_REFRESH_SECRET', 'default_jwt_refresh_secret'),
  },

  logging: {
    level: getEnvVar('LOG_LEVEL', 'info'),
    file: getEnvVar('LOG_FILE', 'logs/app.log'),
    errorFile: getEnvVar('LOG_ERROR_FILE', 'logs/error.log'),
  },
};

// 验证必需的环境变量
if (config.nodeEnv === 'production') {
  const requiredVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Environment variable ${varName} is required in production`);
    }
  }
}