import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../types';
import { AuthStorage } from '../../utils/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: AuthStorage.getAccessToken(),
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 设置加载状态
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    // 设置错误信息
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // 登录成功
    loginSuccess: (state, action: PayloadAction<{
      user: User;
      accessToken: string;
    }>) => {
      console.log('🔄 Redux loginSuccess action 被调用:', action.payload);
      
      const { user, accessToken } = action.payload;
      
      console.log('📝 更新Redux状态前:', {
        currentToken: state.token,
        currentUser: state.user,
        isAuthenticated: state.isAuthenticated
      });
      
      state.user = user;
      state.token = accessToken;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      
      console.log('📝 更新Redux状态后:', {
        newToken: state.token,
        newUser: state.user,
        isAuthenticated: state.isAuthenticated
      });
      
      console.log('💾 准备调用 AuthStorage.setAuthData:', { user, accessToken });
      
      // 使用统一的认证存储工具
      AuthStorage.setAuthData({ user, accessToken });
      
      console.log('✅ AuthStorage.setAuthData 调用完成');
    },
    
    // 登录失败
    loginFailure: (state, action: PayloadAction<string>) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = action.payload;
      
      // 使用统一的认证存储工具清除数据
      AuthStorage.clearAll();
    },
    
    // 登出
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      
      // 使用统一的认证存储工具清除数据
      AuthStorage.clearAll();
    },
    
    // 更新用户信息
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      AuthStorage.setUser(action.payload);
    },
    

    
    // 从存储恢复认证状态
    restoreAuth: (state) => {
      const authData = AuthStorage.getAuthData();
      
      if (AuthStorage.hasValidAuth()) {
        state.user = authData.user;
        state.token = authData.accessToken;
        state.isAuthenticated = true;
      } else {
        // 如果数据无效，确保清除所有认证信息
        AuthStorage.clearAll();
      }
    },
    
    // 清除错误
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setError,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  restoreAuth,
  clearError,
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;