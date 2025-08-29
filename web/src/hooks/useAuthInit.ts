/**
 * 认证初始化Hook
 * 用于在应用启动时恢复认证状态
 */
import { useEffect, useCallback } from 'react';
import { useAppDispatch } from '../store/hooks';
import { restoreAuth, logout } from '../store/slices/authSlice';
import { AuthStorage } from '../utils/auth';
import { refreshTokenService } from '../services/refreshTokenService';

/**
 * 认证初始化Hook
 * 在应用启动时自动恢复认证状态
 */
export const useAuthInit = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // 检查是否有有效的认证信息
    if (AuthStorage.hasValidAuth()) {
      // 恢复认证状态到Redux store
      dispatch(restoreAuth());
    } else {
      // 如果没有有效认证信息，确保清除所有数据
      AuthStorage.clearAll();
    }
  }, [dispatch]);
};

/**
 * 认证状态监听Hook
 * 监听认证状态变化，自动处理token过期等情况
 */
export const useAuthMonitor = () => {
  const dispatch = useAppDispatch();

  // 刷新令牌的回调函数
  const handleTokenRefresh = useCallback(async () => {
    try {
      const newToken = await refreshTokenService.refreshAccessToken();
      if (newToken) {
        // 刷新成功，更新Redux状态
        // 注意：这里我们不直接更新Redux状态，因为Redux状态会在下次页面加载时通过useAuthInit自动恢复
        console.debug('Token refreshed successfully');
      } else {
        // 刷新失败，登出用户
        dispatch(logout());
        console.debug('Token refresh failed, user logged out');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      dispatch(logout());
    }
  }, [dispatch]);

  useEffect(() => {
    // 定期检查token是否即将过期
    const checkTokenExpiry = async () => {
      const token = AuthStorage.getAccessToken();
      if (token && AuthStorage.isTokenExpiringSoon(token, 5)) {
        // Token即将过期，静默刷新
        try {
          await handleTokenRefresh();
        } catch (error) {
          console.error('Failed to refresh token:', error);
          // 刷新失败时的错误处理
          dispatch(logout());
        }
      }
    };

    // 每5分钟检查一次token过期情况
    const interval = setInterval(checkTokenExpiry, 5 * 60 * 1000);

    // 组件挂载时立即检查一次
    checkTokenExpiry();

    return () => {
      clearInterval(interval);
    };
  }, [dispatch, handleTokenRefresh]);
};