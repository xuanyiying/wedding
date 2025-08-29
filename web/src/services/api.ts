import axios from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getToken } from './auth';
import { refreshTokenService } from './refreshTokenService';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';

// 存储正在刷新令牌的Promise，避免并发请求重复刷新
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: any) => {
    const originalRequest = error.config;

    // 如果是401未授权错误且不是刷新令牌请求本身
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // 如果正在刷新令牌，则将请求加入队列
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshTokenService.refreshAccessToken();

        if (newToken) {
          processQueue(null, newToken);
          // 重新设置请求头中的token
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          // 刷新失败，清空队列并拒绝所有请求
          processQueue(new Error('Token refresh failed'));
          store.dispatch(logout());
          window.location.href = '/login';
          return Promise.reject(new Error('Token refresh failed'));
        }
      } catch (refreshError) {
        // 刷新令牌失败，清空队列并拒绝所有请求
        processQueue(refreshError);
        store.dispatch(logout());
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;