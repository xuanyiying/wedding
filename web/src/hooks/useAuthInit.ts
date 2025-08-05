/**
 * 认证初始化Hook
 * 用于在应用启动时恢复认证状态
 */
import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { restoreAuth } from '../store/slices/authSlice';
import { AuthStorage } from '../utils/auth';

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

  useEffect(() => {
    // 定期检查token是否即将过期
    const checkTokenExpiry = () => {
      const token = AuthStorage.getAccessToken();
      if (token && AuthStorage.isTokenExpiringSoon(token, 5)) {
        // Token即将过期，可以在这里触发刷新逻辑
        console.warn('Token即将过期，建议刷新');
        // 这里可以调用refresh token的逻辑
      }
    };

    // 每分钟检查一次
    const interval = setInterval(checkTokenExpiry, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [dispatch]);
};