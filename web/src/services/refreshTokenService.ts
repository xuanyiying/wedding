import { AuthStorage } from '../utils/auth';
import { store } from '../store';
import { logout, refreshTokenSuccess } from '../store/slices/authSlice';
import { authService } from './index';

// 刷新令牌的API端点

// 刷新令牌服务类
class RefreshTokenService {
    private isRefreshing = false;
    private failedQueue: Array<{
        resolve: (value: string | PromiseLike<string | null> | null) => void;
        reject: (reason?: any) => void;
    }> = [];

    // 处理队列中的请求
    private processQueue(error: any, token: string | null = null) {
        this.failedQueue.forEach(({ resolve, reject }) => {
            if (error) {
                reject(error);
            } else {
                resolve(token);
            }
        });

        this.failedQueue = [];
    }

    // 刷新访问令牌
    async refreshAccessToken(): Promise<string | null> {
        try {
            // 如果正在刷新，则将请求加入队列
            if (this.isRefreshing) {
                return new Promise<string | null>((resolve, reject) => {
                    this.failedQueue.push({ resolve, reject });
                });
            }

            this.isRefreshing = true;

            // 获取存储的刷新令牌
            const refreshToken = AuthStorage.getRefreshToken();

            if (!refreshToken) {
                const error = new Error('No refresh token available');
                this.processQueue(error, null);
                throw error;
            }

            // 调用刷新令牌API
            const response = await authService.refreshToken(refreshToken);

            // 检查响应数据是否存在
            if (!response.data) {
                const error = new Error('No data in response');
                this.processQueue(error, null);
                throw error;
            }

            const { accessToken, refreshToken: newRefreshToken } = response.data;
            // 更新存储的令牌
            AuthStorage.setAccessToken(accessToken);
            if (newRefreshToken) {
                AuthStorage.setRefreshToken(newRefreshToken);
            }

            // 更新Redux状态
            store.dispatch(refreshTokenSuccess({
                accessToken,
                refreshToken: newRefreshToken
            }));

            // 处理队列中的请求
            this.processQueue(null, accessToken);

            return accessToken;
        } catch (error) {
            console.error('Token refresh failed:', error);

            // 处理队列中的请求
            this.processQueue(error, null);

            // 刷新失败，清除认证信息
            AuthStorage.clearAll();

            // 清除Redux状态
            store.dispatch(logout());

            // 重定向到登录页面
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }

            return null;
        } finally {
            this.isRefreshing = false;
        }
    }

    // 检查访问令牌是否即将过期
    isTokenExpiringSoon(token: string, thresholdMinutes: number = 5): boolean {
        try {
            // 简单的JWT解析（仅用于获取过期时间）
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000; // 转换为毫秒
            const now = Date.now();
            const threshold = thresholdMinutes * 60 * 1000; // 转换为毫秒

            return (exp - now) <= threshold;
        } catch (error) {
            console.error('Failed to parse token:', error);
            return true; // 解析失败时认为即将过期
        }
    }

    // 获取访问令牌，如果即将过期则刷新
    async getValidAccessToken(): Promise<string | null> {
        const token = AuthStorage.getAccessToken();

        if (!token) {
            return null;
        }

        // 检查令牌是否即将过期
        if (this.isTokenExpiringSoon(token, 5)) {
            // 令牌即将过期，刷新令牌
            return await this.refreshAccessToken();
        }

        return token;
    }
}

// 导出单例实例
export const refreshTokenService = new RefreshTokenService();

// 导出便捷函数
export const refreshAccessToken = () => refreshTokenService.refreshAccessToken();
export const getValidAccessToken = () => refreshTokenService.getValidAccessToken();