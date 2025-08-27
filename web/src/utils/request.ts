import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig, AxiosError } from 'axios';
import { API_BASE_URL, ERROR_MESSAGES } from '../constants';
import type { ApiResponse } from '../types';
import { AuthStorage } from './auth';
import { authManager } from './auth-manager';

// 获取message实例的函数
let messageApi: {
  error: (content: string) => void;
  success: (content: string) => void;
  warning: (content: string) => void;
  info: (content: string) => void;
} | null = null;

// 设置message API实例
export const setMessageApi = (api: typeof messageApi) => {
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
  timeout: 300000, // 增加到300秒
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
  (response: AxiosResponse<ApiResponse<unknown>>) => {
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
      case 401: {
        // 优化401错误处理 - 避免频繁重定向
        console.error('🔐 上传请求401错误 - 使用认证管理器处理');

        // 先检查是否是文件上传相关的请求
        const isUploadRequest = error.config?.url?.includes('/upload') ||
          error.config?.url?.includes('/files');

        if (isUploadRequest) {
          // 文件上传401错误，可能是token已过期，但不立即跳转
          console.warn('⚠️ 文件上传认证失败，请重新登录');
          safeMessage.error('登录状态已过期，请重新登录后再试');

          // 延迟清理认证状态，给用户时间看到错误信息
          setTimeout(() => {
            const shouldRetry = authManager.handle401Error(error);
            if (!shouldRetry) {
              window.location.reload(); // 刻新页面而不是跳转
            }
          }, 2000);
        } else {
          // 非文件上传请求的401错误
          const shouldRetry = await authManager.handle401Error(error);
          if (!shouldRetry) {
            safeMessage.error('登录已过期，请重新登录');
          }
        }
        break;
      }
      case 413:
        safeMessage.error('文件大小超出限制，请选择较小的文件');
        break;
      case 415:
        safeMessage.error('不支持的文件类型');
        break;
      case 429:
        safeMessage.error('上传请求过于频繁，请稍后重试');
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

    // 使用统一的认证工具获取token
    const token = AuthStorage.getAccessToken()

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
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
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    const { data } = response;


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
      case 401: {
        // 使用认证管理器处理401错误，避免视频封面选择时的误跳转
        console.error('🔐 401错误 - 使用认证管理器处理:', {
          url: error.config?.url,
          method: error.config?.method,
          currentToken: AuthStorage.getAccessToken(),
          responseData: response.data
        });

        const canRetry = await authManager.handle401Error(error);

        if (!canRetry) {
          safeMessage.error('登录已过期，请重新登录');
        }
        break;
      }

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

      case 429:
        // 请求过多错误
        safeMessage.error('请求过于频繁，请稍后重试');
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
  get: <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return request.get(url, config).then(res => res.data);
  },

  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return request.post(url, data, config).then(res => res.data);
  },

  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return request.put(url, data, config).then(res => res.data);
  },

  patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return request.patch(url, data, config).then(res => res.data);
  },

  delete: <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return request.delete(url, config).then(res => res.data);
  },

  upload: <T = unknown>(url: string, formData: FormData, config?: AxiosRequestConfig & { retryConfig?: RetryConfig }): Promise<ApiResponse<T>> => {
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
  uploadWithRetry: <T = unknown>(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig & {
      retryConfig?: RetryConfig;
      onProgress?: (progress: number) => void;
      onRetry?: (attempt: number, error: AxiosError) => void;
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
        retryCondition: (error: AxiosError) => {
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
  retryCondition?: (error: AxiosError) => boolean;
}

// 默认重试配置
const defaultRetryConfig: Required<RetryConfig> = {
  maxAttempts: 3,
  delay: 2000, // 增加基础延迟到2秒
  backoff: true,
  retryCondition: (error: any) => {
    // 只对网络错误、超时和5xx服务器错误进行重试
    if (!error.response) return true; // 网络错误
    if (error.code === 'ECONNABORTED') return true; // 超时
    if (error.response.status >= 500) return true; // 服务器错误
    if (error.response.status === 408) return true; // 请求超时
    if (error.response.status === 429) return true; // 请求过多
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
  let lastError: AxiosError | undefined;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as AxiosError;

      // 检查是否应该重试
      if (!finalConfig.retryCondition(error as AxiosError) || attempt === finalConfig.maxAttempts) {
        break;
      }

      // 计算延迟时间（指数退避）
      let delay = finalConfig.backoff
        ? finalConfig.delay * Math.pow(2, attempt - 1)
        : finalConfig.delay;

      // 对429错误使用更长的延迟
      if ((error as AxiosError).response?.status === 429) {
        delay = Math.max(delay, 5000); // 至少5秒延迟
      }

      console.warn(`${context} 第 ${attempt} 次尝试失败，${delay}ms 后重试:`, error);

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error('未知错误');
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

export { uploadRequest };
export default request;