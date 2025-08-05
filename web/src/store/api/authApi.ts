import { api } from './index';
import type { User, LoginForm, RegisterForm, ApiResponse } from '../../types';

interface LoginResponse {
  user: User;
  tokens: {
    accessToken: string;
    expiresIn: number;
  };
}

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // 用户登录
    login: builder.mutation<ApiResponse<LoginResponse>, LoginForm>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),
    
    // 用户注册
    register: builder.mutation<ApiResponse<User>, RegisterForm>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    
    // 用户登出
    logout: builder.mutation<ApiResponse<void>, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),
    

    
    // 获取当前用户信息
    getCurrentUser: builder.query<ApiResponse<User>, void>({
      query: () => '/auth/profile',
      providesTags: ['User'],
    }),
    
    // 更新用户资料
    updateProfile: builder.mutation<ApiResponse<User>, Partial<User>>({
      query: (userData) => ({
        url: '/auth/profile',
        method: 'PUT',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),
    
    // 修改密码
    changePassword: builder.mutation<ApiResponse<void>, {
      currentPassword: string;
      newPassword: string;
    }>({
      query: (passwordData) => ({
        url: '/auth/change-password',
        method: 'PUT',
        body: passwordData,
      }),
    }),
    
    // 忘记密码
    forgotPassword: builder.mutation<ApiResponse<void>, { email: string }>({
      query: (data) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: data,
      }),
    }),
    
    // 重置密码
    resetPassword: builder.mutation<ApiResponse<void>, {
      token: string;
      newPassword: string;
    }>({
      query: (data) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetCurrentUserQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;