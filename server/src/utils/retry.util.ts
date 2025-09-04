import { logger } from './logger';

/**
 * 重试配置接口
 */
export interface RetryConfig {
  attempts: number;                    // 重试次数
  delay: number;                      // 初始延迟时间（毫秒）
  backoff: 'linear' | 'exponential' | 'fixed'; // 退避策略
  maxDelay: number;                   // 最大延迟时间（毫秒）
  timeout?: number;                   // 单次操作超时时间（毫秒）
  retryCondition?: (error: any) => boolean; // 重试条件判断函数
  jitter?: boolean;                   // 是否添加随机抖动
  jitterRange?: number;               // 抖动范围（0-1）
  enableCircuitBreaker?: boolean;     // 是否启用熔断器
  circuitBreakerThreshold?: number;   // 熔断器失败阈值
  circuitBreakerTimeout?: number;     // 熔断器超时时间（毫秒）
}

/**
 * 熔断器状态
 */
enum CircuitBreakerState {
  CLOSED = 'closed',     // 关闭状态，正常工作
  OPEN = 'open',         // 开启状态，拒绝请求
  HALF_OPEN = 'half_open' // 半开状态，尝试恢复
}

/**
 * 熔断器接口
 */
interface CircuitBreaker {
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
}

/**
 * 重试结果接口
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

/**
 * 重试工具类
 */
export class RetryUtil {
  private static circuitBreakers = new Map<string, CircuitBreaker>();
  /**
   * 执行带重试的异步操作
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    operationName?: string
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: Error = new Error('未知错误');
    const opName = operationName || 'unknown';

    // 检查熔断器状态
    if (config.enableCircuitBreaker && operationName) {
      const circuitBreakerResult = this.checkCircuitBreaker(operationName, config);
      if (!circuitBreakerResult.canExecute) {
        throw new Error(`熔断器开启，拒绝执行操作: ${operationName}`);
      }
    }

    for (let attempt = 1; attempt <= config.attempts + 1; attempt++) {
      try {
        logger.debug(`执行操作 ${opName} - 尝试 ${attempt}/${config.attempts + 1}`);

        let result: T;

        // 如果配置了超时时间，使用Promise.race实现超时控制
        if (config.timeout) {
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`操作超时: ${config.timeout}ms`)), config.timeout);
          });

          result = await Promise.race([operation(), timeoutPromise]);
        } else {
          result = await operation();
        }

        // 操作成功，更新熔断器状态
        if (config.enableCircuitBreaker && operationName) {
          this.recordSuccess(operationName);
        }

        logger.debug(`操作 ${opName} 成功完成 - 尝试 ${attempt}`);
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 记录失败到熔断器
        if (config.enableCircuitBreaker && operationName) {
          this.recordFailure(operationName, config);
        }

        logger.warn(`操作 ${opName} 失败 - 尝试 ${attempt}/${config.attempts + 1}`, {
          error: lastError.message,
          attempt,
          totalAttempts: config.attempts + 1
        });

        // 如果是最后一次尝试，直接抛出错误
        if (attempt > config.attempts) {
          break;
        }

        // 检查是否应该重试
        if (config.retryCondition && !config.retryCondition(lastError)) {
          logger.info(`操作 ${opName} 不满足重试条件，停止重试`);
          break;
        }

        // 计算延迟时间
        const delay = this.calculateDelay(attempt - 1, config);

        logger.debug(`操作 ${opName} 将在 ${delay}ms 后重试`);

        // 等待延迟时间
        await this.sleep(delay);
      }
    }

    const totalTime = Date.now() - startTime;
    logger.error(`操作 ${operationName || 'unknown'} 最终失败`, {
      totalAttempts: config.attempts + 1,
      totalTime,
      finalError: lastError.message
    });

    throw lastError;
  }

  /**
   * 执行带重试的异步操作（返回详细结果）
   */
  static async executeWithRetryDetailed<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    operationName?: string
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let attempts = 0;

    try {
      const result = await this.executeWithRetry(operation, config, operationName);
      return {
        success: true,
        result,
        attempts: attempts + 1,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        attempts: config.attempts + 1,
        totalTime: Date.now() - startTime
      };
    }
  }

  /**
   * 计算延迟时间
   */
  private static calculateDelay(attemptNumber: number, config: RetryConfig): number {
    let delay: number;

    switch (config.backoff) {
      case 'linear':
        delay = config.delay * (attemptNumber + 1);
        break;
      case 'exponential':
        delay = config.delay * Math.pow(2, attemptNumber);
        break;
      case 'fixed':
      default:
        delay = config.delay;
    }

    // 添加随机抖动
    if (config.jitter) {
      const jitterRange = config.jitterRange || 0.1;
      const jitter = delay * jitterRange * (Math.random() * 2 - 1);
      delay += jitter;
    }

    // 确保不超过最大延迟时间且不小于0
    return Math.max(0, Math.min(delay, config.maxDelay));
  }

  /**
   * 睡眠函数
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 创建常用的重试条件判断函数
   */
  static createRetryConditions() {
    return {
      // 网络错误重试
      networkError: (error: any): boolean => {
        const message = error.message?.toLowerCase() || '';
        return message.includes('network') ||
          message.includes('timeout') ||
          message.includes('econnreset') ||
          message.includes('enotfound') ||
          message.includes('econnrefused');
      },

      // HTTP 5xx 错误重试
      serverError: (error: any): boolean => {
        const status = error.status || error.statusCode;
        return status >= 500 && status < 600;
      },

      // 临时错误重试
      temporaryError: (error: any): boolean => {
        const message = error.message?.toLowerCase() || '';
        const status = error.status || error.statusCode;

        return (status >= 500 && status < 600) ||
          message.includes('timeout') ||
          message.includes('temporary') ||
          message.includes('busy') ||
          message.includes('throttle');
      },

      // 组合条件
      combine: (...conditions: ((error: any) => boolean)[]): (error: any) => boolean => {
        return (error: any) => conditions.some(condition => condition(error));
      }
    };
  }

  /**
   * 检查熔断器状态
   */
  private static checkCircuitBreaker(operationName: string, config: RetryConfig): { canExecute: boolean; reason?: string } {
    const breaker = this.circuitBreakers.get(operationName);
    if (!breaker) {
      // 初始化熔断器
      this.circuitBreakers.set(operationName, {
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0
      });
      return { canExecute: true };
    }

    const now = Date.now();
    const threshold = config.circuitBreakerThreshold || 5;
    const timeout = config.circuitBreakerTimeout || 60000;

    // 在CLOSED状态下，如果失败次数超过阈值，则开启熔断器
    if (breaker.state === CircuitBreakerState.CLOSED && breaker.failureCount >= threshold) {
      breaker.state = CircuitBreakerState.OPEN;
      breaker.lastFailureTime = now;
    }

    switch (breaker.state) {
      case CircuitBreakerState.CLOSED:
        return { canExecute: true };

      case CircuitBreakerState.OPEN:
        if (now - breaker.lastFailureTime >= timeout) {
          // 超时后转为半开状态
          breaker.state = CircuitBreakerState.HALF_OPEN;
          breaker.successCount = 0;
          breaker.failureCount = 0; // 重置失败计数
          return { canExecute: true };
        }
        return { canExecute: false, reason: '熔断器开启状态' };

      case CircuitBreakerState.HALF_OPEN:
        return { canExecute: true };

      default:
        return { canExecute: true };
    }
  }

  /**
   * 记录操作成功
   */
  private static recordSuccess(operationName: string) {
    const breaker = this.circuitBreakers.get(operationName);
    if (!breaker) return;

    if (breaker.state === CircuitBreakerState.HALF_OPEN) {
      breaker.successCount++;
      if (breaker.successCount >= 3) { // 连续3次成功后关闭熔断器
        breaker.state = CircuitBreakerState.CLOSED;
        breaker.failureCount = 0;
      }
    } else if (breaker.state === CircuitBreakerState.CLOSED) {
      breaker.failureCount = Math.max(0, breaker.failureCount - 1); // 成功时减少失败计数
    }
  }

  /**
   * 记录操作失败
   */
  private static recordFailure(operationName: string, config: RetryConfig) {
    const breaker = this.circuitBreakers.get(operationName);
    if (!breaker) return;

    const threshold = config.circuitBreakerThreshold || 5;

    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();

    if (breaker.state === CircuitBreakerState.HALF_OPEN) {
      // 半开状态下失败，立即转为开启状态
      breaker.state = CircuitBreakerState.OPEN;
    } else if (breaker.state === CircuitBreakerState.CLOSED && breaker.failureCount >= threshold) {
      // 失败次数达到阈值，开启熔断器
      breaker.state = CircuitBreakerState.OPEN;
    }
  }

  /**
   * 获取熔断器状态
   */
  static getCircuitBreakerStatus(operationName: string) {
    const breaker = this.circuitBreakers.get(operationName);
    if (!breaker) {
      return null;
    }

    return {
      state: breaker.state,
      failureCount: breaker.failureCount,
      lastFailureTime: breaker.lastFailureTime,
      successCount: breaker.successCount
    };
  }

  /**
   * 重置熔断器
   */
  static resetCircuitBreaker(operationName: string) {
    const breaker = this.circuitBreakers.get(operationName);
    if (breaker) {
      breaker.state = CircuitBreakerState.CLOSED;
      breaker.failureCount = 0;
      breaker.successCount = 0;
      breaker.lastFailureTime = 0;
    }
  }

  /**
   * 创建自定义重试配置
   */
  static createCustomConfig(baseConfig: RetryConfig, overrides: Partial<RetryConfig>): RetryConfig {
    return {
      ...baseConfig,
      ...overrides
    };
  }
}

/**
 * 装饰器：为方法添加重试功能
 */
export function Retry(config: RetryConfig, operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const name = operationName || `${target.constructor.name}.${propertyKey}`;
      return RetryUtil.executeWithRetry(
        () => originalMethod.apply(this, args),
        config,
        name
      );
    };

    return descriptor;
  };
}

/**
 * 预定义的重试配置
 */
export const RetryConfigs = {
  // 快速重试（适用于轻量级操作）
  fast: {
    attempts: 3,
    delay: 500,
    backoff: 'linear' as const,
    maxDelay: 2000,
    timeout: 10000,
    jitter: true,
    jitterRange: 0.1
  },

  // 标准重试（适用于一般操作）
  standard: {
    attempts: 3,
    delay: 1000,
    backoff: 'exponential' as const,
    maxDelay: 10000,
    timeout: 30000,
    jitter: true,
    jitterRange: 0.1,
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000
  },

  // 慢重试（适用于重量级操作）
  slow: {
    attempts: 5,
    delay: 2000,
    backoff: 'exponential' as const,
    maxDelay: 30000,
    timeout: 60000,
    jitter: true,
    jitterRange: 0.2,
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 3,
    circuitBreakerTimeout: 120000
  },

  // 文件上传重试
  upload: {
    attempts: 3,
    delay: 1000,
    backoff: 'exponential' as const,
    maxDelay: 15000,
    timeout: 300000, // 5分钟
    jitter: true,
    jitterRange: 0.15,
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 3,
    circuitBreakerTimeout: 180000, // 3分钟
    retryCondition: RetryUtil.createRetryConditions().combine(
      RetryUtil.createRetryConditions().networkError,
      RetryUtil.createRetryConditions().temporaryError
    )
  },

  // 网络请求重试
  network: {
    attempts: 3,
    delay: 1000,
    backoff: 'exponential' as const,
    maxDelay: 8000,
    timeout: 30000,
    jitter: true,
    jitterRange: 0.1,
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000,
    retryCondition: RetryUtil.createRetryConditions().combine(
      RetryUtil.createRetryConditions().networkError,
      RetryUtil.createRetryConditions().serverError
    )
  },

  // 高可用重试（适用于关键操作）
  highAvailability: {
    attempts: 5,
    delay: 500,
    backoff: 'exponential' as const,
    maxDelay: 20000,
    timeout: 45000,
    jitter: true,
    jitterRange: 0.2,
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 3,
    circuitBreakerTimeout: 300000, // 5分钟
    retryCondition: RetryUtil.createRetryConditions().combine(
      RetryUtil.createRetryConditions().networkError,
      RetryUtil.createRetryConditions().serverError,
      RetryUtil.createRetryConditions().temporaryError
    )
  }
};