import { uploadConfig } from '../config/upload.config';
import { RetryConfig } from './retry.util';
import { logger } from './logger';

/**
 * 动态配置接口
 */
export interface DynamicConfig {
  timeout?: {
    upload?: number;
    presignedUrl?: number;
    confirmation?: number;
    chunkUpload?: number;
    fileValidation?: number;
    ossOperation?: number;
  };
  retry?: {
    attempts?: number;
    delay?: number;
    maxDelay?: number;
    backoff?: 'linear' | 'exponential' | 'fixed';
  };
  mode?: {
    enableDirectUpload?: boolean;
    forceServerUpload?: boolean;
    chunkSize?: number;
    enableChunkUpload?: boolean;
    maxConcurrentChunks?: number;
    enableResumeUpload?: boolean;
  };
}

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  appliedConfig?: DynamicConfig;
}

/**
 * 配置管理工具类
 */
export class ConfigManager {
  private static dynamicConfig: DynamicConfig = {};
  private static configHistory: Array<{ timestamp: Date; config: DynamicConfig; reason: string }> = [];

  /**
   * 验证动态配置
   */
  static validateDynamicConfig(config: DynamicConfig): ConfigValidationResult {
    const result: ConfigValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      appliedConfig: {}
    };

    // 验证超时配置
    if (config.timeout) {
      const timeoutConfig = config.timeout;
      const appliedTimeout: any = {};

      Object.entries(timeoutConfig).forEach(([key, value]) => {
        if (value !== undefined) {
          if (!uploadConfig.timeout.customizable) {
            result.warnings.push(`系统不允许自定义超时配置: ${key}`);
            return;
          }

          if (value < uploadConfig.timeout.minTimeout) {
            result.errors.push(`${key} 超时时间不能小于 ${uploadConfig.timeout.minTimeout}ms`);
          } else if (value > uploadConfig.timeout.maxTimeout) {
            result.errors.push(`${key} 超时时间不能大于 ${uploadConfig.timeout.maxTimeout}ms`);
          } else {
            appliedTimeout[key] = value;
          }
        }
      });

      if (Object.keys(appliedTimeout).length > 0) {
        result.appliedConfig!.timeout = appliedTimeout;
      }
    }

    // 验证重试配置
    if (config.retry) {
      const retryConfig = config.retry;
      const appliedRetry: any = {};

      if (retryConfig.attempts !== undefined) {
        if (!uploadConfig.retry.customizable) {
          result.warnings.push('系统不允许自定义重试次数');
        } else if (retryConfig.attempts < uploadConfig.retry.minAttempts) {
          result.errors.push(`重试次数不能小于 ${uploadConfig.retry.minAttempts}`);
        } else if (retryConfig.attempts > uploadConfig.retry.maxAttempts) {
          result.errors.push(`重试次数不能大于 ${uploadConfig.retry.maxAttempts}`);
        } else {
          appliedRetry.attempts = retryConfig.attempts;
        }
      }

      if (retryConfig.delay !== undefined) {
        if (!uploadConfig.retry.customizable) {
          result.warnings.push('系统不允许自定义重试延迟');
        } else if (retryConfig.delay < uploadConfig.retry.minDelay) {
          result.errors.push(`重试延迟不能小于 ${uploadConfig.retry.minDelay}ms`);
        } else if (retryConfig.delay > uploadConfig.retry.maxDelay) {
          result.errors.push(`重试延迟不能大于 ${uploadConfig.retry.maxDelay}ms`);
        } else {
          appliedRetry.delay = retryConfig.delay;
        }
      }

      if (retryConfig.maxDelay !== undefined) {
        if (retryConfig.maxDelay < (appliedRetry.delay || uploadConfig.retry.delay)) {
          result.errors.push('最大重试延迟不能小于基础延迟时间');
        } else {
          appliedRetry.maxDelay = retryConfig.maxDelay;
        }
      }

      if (retryConfig.backoff !== undefined) {
        const validBackoffs = ['linear', 'exponential', 'fixed'];
        if (!validBackoffs.includes(retryConfig.backoff)) {
          result.errors.push(`无效的退避策略: ${retryConfig.backoff}`);
        } else {
          appliedRetry.backoff = retryConfig.backoff;
        }
      }

      if (Object.keys(appliedRetry).length > 0) {
        result.appliedConfig!.retry = appliedRetry;
      }
    }

    // 验证模式配置
    if (config.mode) {
      const modeConfig = config.mode;
      const appliedMode: any = {};

      if (modeConfig.chunkSize !== undefined) {
        if (modeConfig.chunkSize < 1024 * 1024) { // 最小1MB
          result.errors.push('分片大小不能小于1MB');
        } else if (modeConfig.chunkSize > 100 * 1024 * 1024) { // 最大100MB
          result.errors.push('分片大小不能大于100MB');
        } else {
          appliedMode.chunkSize = modeConfig.chunkSize;
        }
      }

      if (modeConfig.maxConcurrentChunks !== undefined) {
        if (modeConfig.maxConcurrentChunks < 1) {
          result.errors.push('最大并发分片数不能小于1');
        } else if (modeConfig.maxConcurrentChunks > 10) {
          result.errors.push('最大并发分片数不能大于10');
        } else {
          appliedMode.maxConcurrentChunks = modeConfig.maxConcurrentChunks;
        }
      }

      // 布尔值配置直接应用
      if (modeConfig.enableDirectUpload !== undefined) {
        appliedMode.enableDirectUpload = modeConfig.enableDirectUpload;
      }
      if (modeConfig.forceServerUpload !== undefined) {
        appliedMode.forceServerUpload = modeConfig.forceServerUpload;
      }
      if (modeConfig.enableChunkUpload !== undefined) {
        appliedMode.enableChunkUpload = modeConfig.enableChunkUpload;
      }
      if (modeConfig.enableResumeUpload !== undefined) {
        appliedMode.enableResumeUpload = modeConfig.enableResumeUpload;
      }

      if (Object.keys(appliedMode).length > 0) {
        result.appliedConfig!.mode = appliedMode;
      }
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * 应用动态配置
   */
  static applyDynamicConfig(config: DynamicConfig, reason: string = '手动更新'): ConfigValidationResult {
    const validation = this.validateDynamicConfig(config);
    
    if (!validation.valid) {
      logger.error('动态配置验证失败', { errors: validation.errors, config });
      return validation;
    }

    const appliedConfig = validation.appliedConfig;
    if (appliedConfig) {
      // 深度合并配置
      this.dynamicConfig = this.deepMerge(this.dynamicConfig, appliedConfig);
      
      // 记录配置历史
      this.configHistory.push({
        timestamp: new Date(),
        config: appliedConfig,
        reason
      });

      // 保持历史记录在合理范围内
      if (this.configHistory.length > 100) {
        this.configHistory = this.configHistory.slice(-50);
      }

      logger.info('动态配置已应用', {
        appliedConfig,
        reason,
        warnings: validation.warnings
      });
    }

    return validation;
  }

  /**
   * 获取当前有效配置
   */
  static getEffectiveConfig() {
    return {
      static: {
        timeout: uploadConfig.timeout,
        retry: uploadConfig.retry,
        mode: uploadConfig.mode,
        security: uploadConfig.security
      },
      dynamic: this.dynamicConfig,
      effective: this.getEffectiveValues()
    };
  }

  /**
   * 获取有效值（动态配置优先）
   */
  private static getEffectiveValues() {
    return {
      timeout: {
        upload: this.dynamicConfig.timeout?.upload ?? uploadConfig.timeout.upload,
        presignedUrl: this.dynamicConfig.timeout?.presignedUrl ?? uploadConfig.timeout.presignedUrl,
        confirmation: this.dynamicConfig.timeout?.confirmation ?? uploadConfig.timeout.confirmation,
        chunkUpload: this.dynamicConfig.timeout?.chunkUpload ?? uploadConfig.timeout.chunkUpload,
        fileValidation: this.dynamicConfig.timeout?.fileValidation ?? uploadConfig.timeout.fileValidation,
        ossOperation: this.dynamicConfig.timeout?.ossOperation ?? uploadConfig.timeout.ossOperation
      },
      retry: {
        attempts: this.dynamicConfig.retry?.attempts ?? uploadConfig.retry.attempts,
        delay: this.dynamicConfig.retry?.delay ?? uploadConfig.retry.delay,
        maxDelay: this.dynamicConfig.retry?.maxDelay ?? uploadConfig.retry.maxDelay,
        backoff: this.dynamicConfig.retry?.backoff ?? uploadConfig.retry.backoff
      },
      mode: {
        enableDirectUpload: this.dynamicConfig.mode?.enableDirectUpload ?? uploadConfig.mode.enableDirectUpload,
        forceServerUpload: this.dynamicConfig.mode?.forceServerUpload ?? uploadConfig.mode.forceServerUpload,
        chunkSize: this.dynamicConfig.mode?.chunkSize ?? uploadConfig.mode.chunkSize,
        enableChunkUpload: this.dynamicConfig.mode?.enableChunkUpload ?? uploadConfig.mode.enableChunkUpload,
        maxConcurrentChunks: this.dynamicConfig.mode?.maxConcurrentChunks ?? uploadConfig.mode.maxConcurrentChunks,
        enableResumeUpload: this.dynamicConfig.mode?.enableResumeUpload ?? uploadConfig.mode.enableResumeUpload
      }
    };
  }

  /**
   * 创建有效的重试配置
   */
  static createEffectiveRetryConfig(baseConfigName: keyof typeof import('./retry.util').RetryConfigs): RetryConfig {
    const effective = this.getEffectiveValues();
    const baseConfig = require('./retry.util').RetryConfigs[baseConfigName];
    
    return {
      ...baseConfig,
      attempts: effective.retry.attempts,
      delay: effective.retry.delay,
      maxDelay: effective.retry.maxDelay,
      backoff: effective.retry.backoff as 'linear' | 'exponential' | 'fixed'
    };
  }

  /**
   * 重置动态配置
   */
  static resetDynamicConfig(reason: string = '手动重置') {
    const oldConfig = { ...this.dynamicConfig };
    this.dynamicConfig = {};
    
    this.configHistory.push({
      timestamp: new Date(),
      config: { reset: true } as any,
      reason
    });

    logger.info('动态配置已重置', { oldConfig, reason });
  }

  /**
   * 获取配置历史
   */
  static getConfigHistory(limit: number = 20) {
    return this.configHistory.slice(-limit).reverse();
  }

  /**
   * 深度合并对象
   */
  private static deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * 获取配置统计信息
   */
  static getConfigStats() {
    const effective = this.getEffectiveValues();
    const dynamicKeys = Object.keys(this.dynamicConfig).length;
    
    return {
      hasDynamicConfig: dynamicKeys > 0,
      dynamicConfigCount: dynamicKeys,
      configHistoryCount: this.configHistory.length,
      lastConfigUpdate: this.configHistory.length > 0 ? 
        this.configHistory[this.configHistory.length - 1]?.timestamp : null,
      effectiveConfig: effective,
      capabilities: {
        timeoutCustomizable: uploadConfig.timeout?.customizable ?? false,
        retryCustomizable: uploadConfig.retry?.customizable ?? false,
        circuitBreakerEnabled: uploadConfig.retry?.enableCircuitBreaker ?? false,
        resumeUploadEnabled: uploadConfig.mode?.enableResumeUpload ?? false
      }
    };
  }
}