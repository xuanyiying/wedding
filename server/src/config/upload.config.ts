import { config } from './config';

/**
 * 上传配置接口
 */
export interface UploadConfig {
  // 基础配置
  maxFileSize: number;
  allowedImageTypes: string[];
  allowedVideoTypes: string[];
  allowedAudioTypes: string[];
  
  // 超时配置
  timeout: {
    upload: number;          // 上传超时时间（毫秒）
    presignedUrl: number;    // 预签名URL生成超时时间（毫秒）
    confirmation: number;    // 上传确认超时时间（毫秒）
    chunkUpload: number;     // 分片上传超时时间（毫秒）
    fileValidation: number;  // 文件验证超时时间（毫秒）
    ossOperation: number;    // OSS操作超时时间（毫秒）
    customizable: boolean;   // 是否允许客户端自定义超时时间
    minTimeout: number;      // 最小超时时间（毫秒）
    maxTimeout: number;      // 最大超时时间（毫秒）
  };
  
  // 重试配置
  retry: {
    attempts: number;        // 重试次数
    delay: number;          // 重试延迟（毫秒）
    backoff: 'linear' | 'exponential'; // 退避策略
    maxDelay: number;       // 最大延迟时间（毫秒）
    customizable: boolean;   // 是否允许客户端自定义重试参数
    minAttempts: number;     // 最小重试次数
    maxAttempts: number;     // 最大重试次数
    minDelay: number;        // 最小重试延迟（毫秒）
    enableCircuitBreaker: boolean; // 是否启用熔断器
    circuitBreakerThreshold: number; // 熔断器阈值
    circuitBreakerTimeout: number;   // 熔断器超时时间（毫秒）
  };
  
  // 上传模式配置
  mode: {
    enableDirectUpload: boolean;    // 是否启用直传OSS
    forceServerUpload: boolean;     // 是否强制服务端上传
    chunkSize: number;              // 分片大小（字节）
    enableChunkUpload: boolean;     // 是否启用分片上传
    maxConcurrentChunks: number;    // 最大并发分片数
    autoModeThreshold: number;      // 自动模式切换阈值（字节）
    enableResumeUpload: boolean;    // 是否启用断点续传
    resumeChunkSize: number;        // 断点续传分片大小（字节）
    directUploadSizeLimit: number;  // 直传文件大小限制（字节）
    serverUploadSizeLimit: number;  // 服务端上传文件大小限制（字节）
  };
  
  // 安全配置
  security: {
    enableVirusScan: boolean;       // 是否启用病毒扫描
    maxConcurrentUploads: number;   // 最大并发上传数
    rateLimitPerUser: number;       // 每用户速率限制
  };
  
  // 存储配置
  storage: {
    tempDir: string;               // 临时文件目录
    cleanupInterval: number;       // 清理间隔（毫秒）
    maxTempFileAge: number;        // 临时文件最大存活时间（毫秒）
  };
}

/**
 * 获取环境变量值，支持默认值
 */
const getEnvVar = (key: string, defaultValue?: string): string => {
  return process.env[key] || defaultValue || '';
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  return value ? value.toLowerCase() === 'true' : defaultValue;
};

const getEnvArray = (key: string, defaultValue: string[]): string[] => {
  const value = process.env[key];
  return value ? value.split(',').map(item => item.trim()) : defaultValue;
};

/**
 * 上传配置实例
 */
export const uploadConfig: UploadConfig = {
  // 基础配置
  maxFileSize: getEnvNumber('UPLOAD_MAX_FILE_SIZE', config.upload.maxFileSize),
  allowedImageTypes: getEnvArray('UPLOAD_ALLOWED_IMAGE_TYPES', config.upload.allowedImageTypes),
  allowedVideoTypes: getEnvArray('UPLOAD_ALLOWED_VIDEO_TYPES', config.upload.allowedVideoTypes),
  allowedAudioTypes: getEnvArray('UPLOAD_ALLOWED_AUDIO_TYPES', config.upload.allowedAudioTypes),
  
  // 超时配置
  timeout: {
    upload: getEnvNumber('UPLOAD_TIMEOUT', 300000),           // 5分钟
    presignedUrl: getEnvNumber('UPLOAD_PRESIGNED_TIMEOUT', 30000),  // 30秒
    confirmation: getEnvNumber('UPLOAD_CONFIRM_TIMEOUT', 60000),    // 1分钟
    chunkUpload: getEnvNumber('UPLOAD_CHUNK_TIMEOUT', 120000),      // 2分钟
    fileValidation: getEnvNumber('UPLOAD_VALIDATION_TIMEOUT', 30000), // 30秒
    ossOperation: getEnvNumber('UPLOAD_OSS_TIMEOUT', 60000),        // 1分钟
    customizable: getEnvBoolean('UPLOAD_TIMEOUT_CUSTOMIZABLE', true),
    minTimeout: getEnvNumber('UPLOAD_MIN_TIMEOUT', 10000),          // 10秒
    maxTimeout: getEnvNumber('UPLOAD_MAX_TIMEOUT', 1800000),        // 30分钟
  },
  
  // 重试配置
  retry: {
    attempts: getEnvNumber('UPLOAD_RETRY_ATTEMPTS', 3),
    delay: getEnvNumber('UPLOAD_RETRY_DELAY', 1000),          // 1秒
    backoff: (getEnvVar('UPLOAD_RETRY_BACKOFF', 'exponential') as 'linear' | 'exponential'),
    maxDelay: getEnvNumber('UPLOAD_RETRY_MAX_DELAY', 30000),  // 30秒
    customizable: getEnvBoolean('UPLOAD_RETRY_CUSTOMIZABLE', true),
    minAttempts: getEnvNumber('UPLOAD_MIN_RETRY_ATTEMPTS', 0),
    maxAttempts: getEnvNumber('UPLOAD_MAX_RETRY_ATTEMPTS', 10),
    minDelay: getEnvNumber('UPLOAD_MIN_RETRY_DELAY', 100),    // 100毫秒
    enableCircuitBreaker: getEnvBoolean('UPLOAD_ENABLE_CIRCUIT_BREAKER', true),
    circuitBreakerThreshold: getEnvNumber('UPLOAD_CIRCUIT_BREAKER_THRESHOLD', 5),
    circuitBreakerTimeout: getEnvNumber('UPLOAD_CIRCUIT_BREAKER_TIMEOUT', 60000), // 1分钟
  },
  
  // 上传模式配置
  mode: {
    enableDirectUpload: getEnvBoolean('UPLOAD_ENABLE_DIRECT', true),
    forceServerUpload: getEnvBoolean('UPLOAD_FORCE_SERVER_UPLOAD', false),
    chunkSize: getEnvNumber('UPLOAD_CHUNK_SIZE', 5 * 1024 * 1024), // 5MB
    enableChunkUpload: getEnvBoolean('UPLOAD_ENABLE_CHUNK_UPLOAD', true),
    maxConcurrentChunks: getEnvNumber('UPLOAD_MAX_CONCURRENT_CHUNKS', 3),
    autoModeThreshold: getEnvNumber('UPLOAD_AUTO_MODE_THRESHOLD', 10 * 1024 * 1024), // 10MB
    enableResumeUpload: getEnvBoolean('UPLOAD_ENABLE_RESUME', true),
    resumeChunkSize: getEnvNumber('UPLOAD_RESUME_CHUNK_SIZE', 2 * 1024 * 1024), // 2MB
    directUploadSizeLimit: getEnvNumber('UPLOAD_DIRECT_SIZE_LIMIT', 100 * 1024 * 1024), // 100MB
    serverUploadSizeLimit: getEnvNumber('UPLOAD_SERVER_SIZE_LIMIT', 1024 * 1024 * 1024), // 1GB
  },
  
  // 安全配置
  security: {
    enableVirusScan: getEnvBoolean('UPLOAD_ENABLE_VIRUS_SCAN', false),
    maxConcurrentUploads: getEnvNumber('UPLOAD_MAX_CONCURRENT_UPLOADS', 10),
    rateLimitPerUser: getEnvNumber('UPLOAD_RATE_LIMIT_PER_USER', 5),
  },
  
  // 存储配置
  storage: {
    tempDir: getEnvVar('UPLOAD_TEMP_DIR', 'uploads/temp'),
    cleanupInterval: getEnvNumber('UPLOAD_CLEANUP_INTERVAL', 3600000), // 1小时
    maxTempFileAge: getEnvNumber('UPLOAD_MAX_TEMP_FILE_AGE', 86400000),     // 24小时
  },
};

/**
 * 验证上传配置
 */
export const validateUploadConfig = (): void => {
  const errors: string[] = [];
  
  if (uploadConfig.maxFileSize <= 0) {
    errors.push('maxFileSize must be greater than 0');
  }
  
  if (uploadConfig.timeout.upload <= 0) {
    errors.push('upload timeout must be greater than 0');
  }
  
  if (uploadConfig.retry.attempts < 0) {
    errors.push('retry attempts must be non-negative');
  }
  
  if (uploadConfig.retry.delay < 0) {
    errors.push('retry delay must be non-negative');
  }
  
  if (uploadConfig.mode.chunkSize <= 0) {
    errors.push('chunk size must be greater than 0');
  }
  
  if (uploadConfig.mode.maxConcurrentChunks <= 0) {
    errors.push('max concurrent chunks must be greater than 0');
  }
  
  if (uploadConfig.timeout.minTimeout >= uploadConfig.timeout.maxTimeout) {
    errors.push('min timeout must be less than max timeout');
  }
  
  if (uploadConfig.retry.minAttempts > uploadConfig.retry.maxAttempts) {
    errors.push('min retry attempts must be less than or equal to max retry attempts');
  }
  
  if (uploadConfig.retry.minDelay >= uploadConfig.retry.maxDelay) {
    errors.push('min retry delay must be less than max retry delay');
  }
  
  if (uploadConfig.mode.directUploadSizeLimit <= 0) {
    errors.push('direct upload size limit must be greater than 0');
  }
  
  if (uploadConfig.mode.serverUploadSizeLimit <= 0) {
    errors.push('server upload size limit must be greater than 0');
  }
  
  if (errors.length > 0) {
    throw new Error(`Upload configuration validation failed: ${errors.join(', ')}`);
  }
};

// 在模块加载时验证配置
validateUploadConfig();