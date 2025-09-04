import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { message } from 'antd';

/**
 * 重试配置接口
 */
export interface RetryConfig {
  /**
   * 最大重试次数
   */
  attempts: number;
  
  /**
   * 重试延迟(毫秒)
   */
  delay: number;
  
  /**
   * 退避策略
   * - linear: 线性退避 (delay * retryCount)
   * - exponential: 指数退避 (delay * 2^retryCount)
   * - fixed: 固定延迟 (delay)
   */
  backoff: 'linear' | 'exponential' | 'fixed';
  
  /**
   * 最大延迟时间(毫秒)
   */
  maxDelay?: number;
  
  /**
   * 请求超时时间(毫秒)
   */
  timeout?: number;
  
  /**
   * 是否启用抖动
   * 在延迟时间上添加随机抖动，避免多个请求同时重试
   */
  jitter?: boolean;
  
  /**
   * 抖动范围(0-1)
   * 例如：0.25表示在延迟时间上下浮动25%
   */
  jitterRange?: number;
  
  /**
   * 重试条件
   * 返回true表示应该重试，false表示不重试
   */
  retryCondition?: (error: any) => boolean;
}

/**
 * 默认重试配置
 */
const defaultRetryConfig: RetryConfig = {
  attempts: 3,
  delay: 1000,
  backoff: 'exponential',
  maxDelay: 30000,
  timeout: 30000,
  jitter: true,
  jitterRange: 0.25,
  retryCondition: (error) => {
    // 默认只重试网络错误和5xx错误
    return (
      !error.response || // 网络错误
      (error.response && error.response.status >= 500) // 服务器错误
    );
  }
};

/**
 * 创建增强的Axios实例
 * @param baseURL 基础URL
 * @param defaultConfig 默认配置
 * @returns 增强的Axios实例
 */
export function createEnhancedAxios(
  baseURL: string = '',
  defaultConfig: AxiosRequestConfig = {}
): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: defaultRetryConfig.timeout,
    ...defaultConfig
  });
  
  // 请求拦截器
  instance.interceptors.request.use(
    (config) => {
      // 添加认证令牌
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
  
  // 响应拦截器
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      // 处理401错误(未授权)
      if (error.response && error.response.status === 401) {
        // 清除本地存储的认证信息
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // 显示错误消息
        message.error('登录已过期，请重新登录');
        
        // 重定向到登录页
        setTimeout(() => {
          window.location.href = '/admin/login';
        }, 1500);
      }
      
      return Promise.reject(error);
    }
  );
  
  return instance;
}

/**
 * 带重试功能的请求
 * @param axiosInstance Axios实例
 * @param config 请求配置
 * @param retryConfig 重试配置
 * @returns Promise<AxiosResponse>
 */
export async function requestWithRetry<T = any>(
  axiosInstance: AxiosInstance,
  config: AxiosRequestConfig,
  retryConfig: Partial<RetryConfig> = {}
): Promise<AxiosResponse<T>> {
  // 合并重试配置
  const finalRetryConfig: RetryConfig = {
    ...defaultRetryConfig,
    ...retryConfig
  };
  
  let lastError: any;
  let attempt = 0;
  
  while (attempt < finalRetryConfig.attempts) {
    try {
      // 设置超时
      const requestConfig = {
        ...config,
        timeout: finalRetryConfig.timeout
      };
      
      // 发送请求
      return await axiosInstance(requestConfig);
    } catch (error) {
      lastError = error;
      attempt++;
      
      // 检查是否应该重试
      const shouldRetry = 
        attempt < finalRetryConfig.attempts && 
        finalRetryConfig.retryCondition?.(error);
      
      if (!shouldRetry) {
        break;
      }
      
      // 计算延迟时间
      let delay = finalRetryConfig.delay;
      
      // 应用退避策略
      switch (finalRetryConfig.backoff) {
        case 'linear':
          delay = delay * attempt;
          break;
        case 'exponential':
          delay = delay * Math.pow(2, attempt - 1);
          break;
        case 'fixed':
        default:
          // 使用固定延迟
          break;
      }
      
      // 应用最大延迟限制
      if (finalRetryConfig.maxDelay) {
        delay = Math.min(delay, finalRetryConfig.maxDelay);
      }
      
      // 应用抖动
      if (finalRetryConfig.jitter && finalRetryConfig.jitterRange) {
        const jitterAmount = delay * finalRetryConfig.jitterRange;
        delay = delay - jitterAmount + (Math.random() * jitterAmount * 2);
      }
      
      // 等待延迟时间
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // 记录重试信息
      console.log(`Retry attempt ${attempt}/${finalRetryConfig.attempts} for request:`, config.url);
    }
  }
  
  // 所有重试都失败了，抛出最后一个错误
  throw lastError;
}

// 创建增强的HTTP客户端
export const enhancedHttp = createEnhancedAxios('/api');

// 创建增强的上传客户端
export const enhancedUploadRequest = createEnhancedAxios('/api', {
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});

/**
 * 使用重试机制发送请求的便捷方法
 * @param config 请求配置
 * @param retryConfig 重试配置
 * @returns Promise<AxiosResponse>
 */
export function withRetry<T = any>(
  config: AxiosRequestConfig,
  retryConfig?: Partial<RetryConfig>
): Promise<AxiosResponse<T>> {
  return requestWithRetry<T>(enhancedHttp, config, retryConfig);
}

/**
 * 使用重试机制发送上传请求的便捷方法
 * @param config 请求配置
 * @param retryConfig 重试配置
 * @returns Promise<AxiosResponse>
 */
export function withRetryUpload<T = any>(
  config: AxiosRequestConfig,
  retryConfig?: Partial<RetryConfig>
): Promise<AxiosResponse<T>> {
  return requestWithRetry<T>(enhancedUploadRequest, config, retryConfig);
}