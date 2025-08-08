import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig, AxiosError } from 'axios';
import { API_BASE_URL, ERROR_MESSAGES } from '../constants';
import type { ApiResponse } from '../types';
import { AuthStorage } from './auth';

// 获取message实例的函数
let messageApi: any = null;

// 设置message API实例
export const setMessageApi = (api: any) => {
  messageApi = api;
};

// 安全的message调用
const safeMessage = {
  error: (content: string) => {
    if (messageApi) {
      messageApi.error(content);
    } else {
      console.error('Message API not available:', content);
    }
  },
  success: (content: string) => {
    if (messageApi) {
      messageApi.success(content);
    } else {
      console.log('Success:', content);
    }
  },
  warning: (content: string) => {
    if (messageApi) {
      messageApi.warning(content);
    } else {
      console.warn('Warning:', content);
    }
  },
  info: (content: string) => {
    if (messageApi) {
      messageApi.info(content);
    } else {
      console.info('Info:', content);
    }
  }
};

// 创建axios实例
const request: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 增加到30秒
  headers: {
    'Content-Type': 'application/json',
  },
});

// 创建专用于文件上传的axios实例
const uploadRequest: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 文件上传超时设为5分钟
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// 为上传请求实例添加相同的拦截器
uploadRequest.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log('🚀 发送上传请求:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`
    });
    
    // 使用统一的认证工具获取token
    const token = AuthStorage.getAccessToken();
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ 上传请求Authorization头已设置');
    }
    
    return config;
  },
  (error: AxiosError) => {
    console.error('💥 上传请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

uploadRequest.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<any>>) => {
    const { data } = response;
    
    console.log('📥 收到上传响应:', {
      status: response.status,
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
      success: data.success,
      message: data.message
    });
    
    if (data.success) {
      return response;
    } else {
      console.error('❌ 上传业务错误:', data.message);
      safeMessage.error(data.message || ERROR_MESSAGES.UNKNOWN_ERROR);
      return Promise.reject(new Error(data.message || ERROR_MESSAGES.UNKNOWN_ERROR));
    }
  },
  async (error: AxiosError) => {
    const { response, code, message: errorMessage } = error;
    
    console.error('💥 上传响应错误:', {
      status: response?.status,
      statusText: response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      code,
      message: errorMessage,
      responseData: response?.data
    });
    
    // 网络错误或超时
    if (code === 'ECONNABORTED' || errorMessage.includes('timeout')) {
      safeMessage.error('文件上传超时，请检查网络连接或稍后重试');
      return Promise.reject(error);
    }
    
    if (!response) {
      safeMessage.error('网络连接失败，请检查网络设置');
      return Promise.reject(error);
    }
    
    const { status } = response;
    
    switch (status) {
      case 401:
        // Token过期或无效，清除认证信息并跳转登录
        console.error('🔐 上传请求401错误 - Token过期');
        safeMessage.error('登录已过期，请重新登录');
        AuthStorage.clearAll();
        
        // Token过期时自动跳转到登录页面
        window.location.replace('/admin/login');
        break;
      case 413:
        safeMessage.error('文件大小超出限制，请选择较小的文件');
        break;
      case 415:
        safeMessage.error('不支持的文件类型');
        break;
      default:
        safeMessage.error(errorMessage || '文件上传失败，请稍后重试');
        break;
    }
    
    return Promise.reject(error);
  }
);

// 请求拦截器
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log('🚀 发送请求:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`
    });
    
    // 使用统一的认证工具获取token
    const token = AuthStorage.getAccessToken();
    
    console.log('🔑 Token检查:', {
      hasToken: !!token,
      tokenType: typeof token,
      tokenLength: token ? token.length : 0,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'null',
      hasHeaders: !!config.headers
    });
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Authorization头已设置:', config.headers.Authorization.substring(0, 30) + '...');
    } else {
      console.log('❌ 未设置Authorization头:', { hasToken: !!token, hasHeaders: !!config.headers });
    }
    
    // 添加时间戳防止缓存
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    
    return config;
  },
  (error: AxiosError) => {
    console.error('💥 请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<any>>) => {
    const { data } = response;
    
    console.log('📥 收到响应:', {
      status: response.status,
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
      success: data.success,
      message: data.message
    });
    
    // 检查业务状态码
    if (data.success) {
      return response;
    } else {
      // 业务错误
      console.error('❌ 业务错误:', data.message);
      safeMessage.error(data.message || ERROR_MESSAGES.UNKNOWN_ERROR);
      return Promise.reject(new Error(data.message || ERROR_MESSAGES.UNKNOWN_ERROR));
    }
  },
  async (error: AxiosError) => {
    const { response, code, message: errorMessage } = error;
    
    console.error('💥 响应错误:', {
      status: response?.status,
      statusText: response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      code,
      message: errorMessage,
      responseData: response?.data
    });
    
    // 网络错误
    if (code === 'ECONNABORTED' || errorMessage.includes('timeout')) {
      safeMessage.error('请求超时，请稍后重试');
      return Promise.reject(error);
    }
    
    if (!response) {
      safeMessage.error(ERROR_MESSAGES.NETWORK_ERROR);
      return Promise.reject(error);
    }
    
    const { status } = response;
    
    switch (status) {
      case 401:
        // Token过期或无效，直接清除认证信息并跳转登录
        console.error('🔐 401错误 - Token问题:', {
          url: error.config?.url,
          method: error.config?.method,
          currentToken: AuthStorage.getAccessToken(),
          responseData: response.data
        });
        
        safeMessage.error('登录已过期，请重新登录');
        AuthStorage.clearAll();
        
        // Token过期时自动跳转到登录页面
        window.location.replace('/admin/login');
        break;
        
      case 403:
        safeMessage.error(ERROR_MESSAGES.FORBIDDEN);
        break;
        
      case 404:
        safeMessage.error(ERROR_MESSAGES.NOT_FOUND);
        break;
        
      case 422:
        // 表单验证错误
        safeMessage.error(ERROR_MESSAGES.VALIDATION_ERROR);
        break;
        
      case 500:
        safeMessage.error(ERROR_MESSAGES.SERVER_ERROR);
        break;
        
      default:
        safeMessage.error(errorMessage || ERROR_MESSAGES.UNKNOWN_ERROR);
        break;
    }
    
    return Promise.reject(error);
  }
);

// 封装请求方法
export const http = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return request.get(url, config).then(res => res.data);
  },
  
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return request.post(url, data, config).then(res => res.data);
  },
  
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return request.put(url, data, config).then(res => res.data);
  },
  
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return request.patch(url, data, config).then(res => res.data);
  },
  
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return request.delete(url, config).then(res => res.data);
  },
  
  upload: <T = any>(url: string, formData: FormData, config?: AxiosRequestConfig & { retryConfig?: RetryConfig }): Promise<ApiResponse<T>> => {
    const { retryConfig, ...axiosConfig } = config || {};
    
    return withRetry(
      () => uploadRequest.post(url, formData, {
        ...axiosConfig,
        headers: {
          'Content-Type': 'multipart/form-data',
          ...axiosConfig?.headers,
        },
        // 上传进度回调
        onUploadProgress: axiosConfig?.onUploadProgress,
      }).then(res => res.data),
      retryConfig,
      `文件上传: ${url}`
    );
  },
  
  // 带重试的上传方法（专门用于大文件）
  uploadWithRetry: <T = any>(
    url: string, 
    formData: FormData, 
    config?: AxiosRequestConfig & { 
      retryConfig?: RetryConfig;
      onProgress?: (progress: number) => void;
      onRetry?: (attempt: number, error: any) => void;
    }
  ): Promise<ApiResponse<T>> => {
    const { retryConfig, onProgress, onRetry, ...axiosConfig } = config || {};
    
    const customRetryConfig: RetryConfig = {
      maxAttempts: 5, // 大文件上传重试更多次
      delay: 2000,
      backoff: true,
      retryCondition: (error: any) => {
        // 对于上传，更宽松的重试条件
        if (!error.response) return true; // 网络错误
        if (error.code === 'ECONNABORTED') return true; // 超时
        if (error.response.status >= 500) return true; // 服务器错误
        if (error.response.status === 408) return true; // 请求超时
        if (error.response.status === 429) return true; // 请求过多
        return false;
      },
      ...retryConfig,
    };
    
    return withRetry(
      () => uploadRequest.post(url, formData, {
        ...axiosConfig,
        headers: {
          'Content-Type': 'multipart/form-data',
          ...axiosConfig?.headers,
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
          if (axiosConfig?.onUploadProgress) {
            axiosConfig.onUploadProgress(progressEvent);
          }
        },
      }).then(res => res.data),
      {
        ...customRetryConfig,
        retryCondition: (error: any) => {
          const shouldRetry = customRetryConfig.retryCondition!(error);
          if (shouldRetry && onRetry) {
            // 这里需要获取当前尝试次数，暂时用1代替
            onRetry(1, error);
          }
          return shouldRetry;
        },
      },
      `大文件上传: ${url}`
    );
  },
  
  download: (url: string, config?: AxiosRequestConfig): Promise<Blob> => {
    return request.get(url, {
      ...config,
      responseType: 'blob',
    }).then(res => res.data);
  },
};

// 取消请求的工具
export class RequestCanceler {
  private pendingRequests = new Map<string, AbortController>();
  
  /**
   * 添加请求
   * @param key 请求标识
   * @returns AbortController
   */
  addRequest(key: string): AbortController {
    this.cancelRequest(key); // 取消之前的同类请求
    const controller = new AbortController();
    this.pendingRequests.set(key, controller);
    return controller;
  }
  
  /**
   * 取消指定请求
   * @param key 请求标识
   */
  cancelRequest(key: string): void {
    const controller = this.pendingRequests.get(key);
    if (controller) {
      controller.abort();
      this.pendingRequests.delete(key);
    }
  }
  
  /**
   * 取消所有请求
   */
  cancelAllRequests(): void {
    this.pendingRequests.forEach(controller => {
      controller.abort();
    });
    this.pendingRequests.clear();
  }
  
  /**
   * 移除请求
   * @param key 请求标识
   */
  removeRequest(key: string): void {
    this.pendingRequests.delete(key);
  }
}

// 全局请求取消器实例
export const requestCanceler = new RequestCanceler();

// 重试机制配置
export interface RetryConfig {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
  retryCondition?: (error: any) => boolean;
}

// 默认重试配置
const defaultRetryConfig: Required<RetryConfig> = {
  maxAttempts: 3,
  delay: 1000,
  backoff: true,
  retryCondition: (error: any) => {
    // 只对网络错误、超时和5xx服务器错误进行重试
    if (!error.response) return true; // 网络错误
    if (error.code === 'ECONNABORTED') return true; // 超时
    if (error.response.status >= 500) return true; // 服务器错误
    return false;
  },
};

// 重试函数
export const withRetry = async <T>(
  operation: () => Promise<T>,
  config: RetryConfig = {},
  context: string = 'operation'
): Promise<T> => {
  const finalConfig = { ...defaultRetryConfig, ...config };
  let lastError: any;
  
  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // 检查是否应该重试
      if (!finalConfig.retryCondition(error) || attempt === finalConfig.maxAttempts) {
        break;
      }
      
      // 计算延迟时间（指数退避）
      const delay = finalConfig.backoff 
        ? finalConfig.delay * Math.pow(2, attempt - 1)
        : finalConfig.delay;
      
      console.warn(`${context} 第 ${attempt} 次尝试失败，${delay}ms 后重试:`, error);
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.error(`${context} 在 ${finalConfig.maxAttempts} 次尝试后仍然失败`);
  throw lastError;
};

// 带取消功能的请求方法
export const createCancelableRequest = (key: string) => {
  const controller = requestCanceler.addRequest(key);
  
  return {
    request: {
      get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
        return http.get(url, { ...config, signal: controller.signal });
      },
      
      post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
        return http.post(url, data, { ...config, signal: controller.signal });
      },
      
      put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
        return http.put(url, data, { ...config, signal: controller.signal });
      },
      
      patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
        return http.patch(url, data, { ...config, signal: controller.signal });
      },
      
      delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
        return http.delete(url, { ...config, signal: controller.signal });
      },
    },
    
    cancel: () => {
      requestCanceler.cancelRequest(key);
    },
  };
};

export default request;