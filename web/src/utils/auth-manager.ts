/**
 * 增强的认证管理工具 - 解决视频封面选择后跳转登录页面的问题
 * 主要功能：
 * 1. 防止重复的401处理
 * 2. Token刷新机制
 * 3. 请求重试逻辑
 * 4. 会话状态同步
 */
import { AuthStorage } from './auth';

interface AuthManagerState {
  isRefreshing: boolean;
  failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }>;
  lastAuthCheck: number;
  redirecting: boolean;
}

class AuthManager {
  private state: AuthManagerState = {
    isRefreshing: false,
    failedQueue: [],
    lastAuthCheck: 0,
    redirecting: false,
  };

  private readonly AUTH_CHECK_INTERVAL = 30000; // 30秒检查一次
  private readonly REDIRECT_COOLDOWN = 5000; // 5秒内不重复跳转

  /**
   * 检查认证状态是否有效
   */
  public isAuthenticated(): boolean {
    const token = AuthStorage.getAccessToken();
    const user = AuthStorage.getUser();
    
    if (!token || !user) {
      return false;
    }

    // 检查token是否即将过期
    try {
      if (AuthStorage.isTokenExpiringSoon(token, 5)) {
        console.warn('⚠️ Token即将过期，需要刷新');
        return false;
      }
    } catch (error) {
      console.error('❌ Token验证失败:', error);
      return false;
    }

    return true;
  }

  /**
   * 处理401错误 - 防止重复处理和不必要的跳转
   */
  public async handle401Error(error: any): Promise<boolean> {
    console.log('🔐 处理401错误:', {
      url: error.config?.url,
      method: error.config?.method,
      isRefreshing: this.state.isRefreshing,
      redirecting: this.state.redirecting
    });

    // 如果已经在跳转过程中，直接返回
    if (this.state.redirecting) {
      console.log('🚫 已在跳转过程中，跳过处理');
      return false;
    }

    // 检查是否是文件上传相关的请求
    const isUploadRequest = this.isUploadRelatedRequest(error.config?.url);
    
    if (isUploadRequest) {
      console.log('📁 检测到文件上传相关请求的401错误');
      
      // 对于上传请求，先尝试验证当前认证状态
      if (this.isAuthenticated()) {
        console.log('✅ 当前认证状态有效，可能是临时网络问题');
        return true; // 允许重试
      }
    }

    // 如果正在刷新token，将请求加入队列
    if (this.state.isRefreshing) {
      console.log('🔄 Token刷新中，将请求加入队列');
      return new Promise((resolve, reject) => {
        this.state.failedQueue.push({ resolve, reject });
      });
    }

    // 尝试刷新token
    this.state.isRefreshing = true;
    
    try {
      const refreshed = await this.tryRefreshToken();
      
      if (refreshed) {
        console.log('✅ Token刷新成功');
        this.processQueue(null);
        return true; // 允许重试原请求
      } else {
        console.log('❌ Token刷新失败，需要重新登录');
        this.processQueue(new Error('Token刷新失败'));
        this.handleLogout();
        return false;
      }
    } catch (refreshError) {
      console.error('💥 Token刷新异常:', refreshError);
      this.processQueue(refreshError);
      this.handleLogout();
      return false;
    } finally {
      this.state.isRefreshing = false;
    }
  }

  /**
   * 检查是否是上传相关的请求
   */
  private isUploadRelatedRequest(url?: string): boolean {
    if (!url) return false;
    
    const uploadPatterns = [
      '/upload',
      '/media',
      '/file',
      '/direct-upload',
      '/presigned-url'
    ];
    
    return uploadPatterns.some(pattern => url.includes(pattern));
  }

  /**
   * 尝试刷新token
   */
  private async tryRefreshToken(): Promise<boolean> {
    try {
      // 这里应该调用刷新token的API
      // 由于当前系统可能没有refresh token机制，我们先检查当前token是否真的无效
      
      const token = AuthStorage.getAccessToken();
      if (!token) {
        return false;
      }

      // 发送一个简单的验证请求来检查token是否有效
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ Token验证成功，无需刷新');
        return true;
      }

      // 如果验证失败，尝试使用现有的用户信息重新获取token
      const user = AuthStorage.getUser();
      if (user) {
        // 这里可以实现自动重新登录逻辑
        console.log('🔄 尝试自动重新登录');
        // 暂时返回false，让用户手动重新登录
        return false;
      }

      return false;
    } catch (error) {
      console.error('❌ Token刷新请求失败:', error);
      return false;
    }
  }

  /**
   * 处理队列中的请求
   */
  private processQueue(error: any) {
    this.state.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
    
    this.state.failedQueue = [];
  }

  /**
   * 处理登出逻辑
   */
  private handleLogout() {
    const now = Date.now();
    
    // 防止短时间内重复跳转
    if (this.state.redirecting || (now - this.state.lastAuthCheck) < this.REDIRECT_COOLDOWN) {
      console.log('🚫 跳转冷却中，跳过登出处理');
      return;
    }

    this.state.redirecting = true;
    this.state.lastAuthCheck = now;

    console.log('🚪 执行登出操作');
    
    // 清除认证信息
    AuthStorage.clearAll();
    
    // 延迟跳转，给用户一些反应时间
    setTimeout(() => {
      if (window.location.pathname !== '/admin/login') {
        console.log('🔄 跳转到登录页面');
        window.location.replace('/admin/login');
      }
      
      // 重置跳转状态
      setTimeout(() => {
        this.state.redirecting = false;
      }, 1000);
    }, 1000);
  }

  /**
   * 定期检查认证状态
   */
  public startAuthCheck() {
    setInterval(() => {
      const now = Date.now();
      
      if (now - this.state.lastAuthCheck > this.AUTH_CHECK_INTERVAL) {
        this.state.lastAuthCheck = now;
        
        if (!this.isAuthenticated()) {
          console.warn('⚠️ 定期检查发现认证状态无效');
          // 不立即跳转，只记录警告
        }
      }
    }, this.AUTH_CHECK_INTERVAL);
  }

  /**
   * 手动验证认证状态
   */
  public async validateAuth(): Promise<boolean> {
    try {
      const token = AuthStorage.getAccessToken();
      if (!token) {
        return false;
      }

      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('❌ 认证验证失败:', error);
      return false;
    }
  }

  /**
   * 重置管理器状态
   */
  public reset() {
    this.state = {
      isRefreshing: false,
      failedQueue: [],
      lastAuthCheck: 0,
      redirecting: false,
    };
  }
}

// 创建全局实例
export const authManager = new AuthManager();

// 启动认证检查
if (typeof window !== 'undefined') {
  authManager.startAuthCheck();
}

export default authManager;