import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { AuthStorage } from '../../utils/auth';

// 基础查询配置
const baseQuery = fetchBaseQuery({
  baseUrl: '/api/v1',
  prepareHeaders: (headers, { getState }) => {
    // 优先从state中获取token，如果没有则从存储中获取
    const stateToken = (getState() as RootState).auth.token;
    const token = stateToken || AuthStorage.getAccessToken();

    if (token) {
      console.log('🔑 添加认证头:', { tokenPreview: `${token.substring(0, 15)}...` });
      headers.set('Authorization', `Bearer ${token}`);
    }

    headers.set('Content-Type', 'application/json');
    return headers;
  },
  credentials: 'include', // 确保跨域请求包含凭证
});

// 带错误处理的查询
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {

    // 清除认证状态
    api.dispatch({ type: 'auth/logout' });
    AuthStorage.clearAll();

    // 跳转到登录页面
    window.location.href = '/admin/login';
  }

  return result;
};

// 创建API slice
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Schedule', 'Work', 'Booking', 'File'],
  endpoints: () => ({}),
});