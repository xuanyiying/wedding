import type { SiteSettings } from '../types';
import request from '../utils/request';

export interface SystemConfig {
  configKey: string;
  configValue: string | null;
  configType: 'string' | 'number' | 'boolean' | 'json' | 'text';
  category: string;
  isPublic: boolean;
}

class ConfigService {
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 获取公开配置（客户端可访问）
   */
  async getPublicConfig(): Promise<SiteSettings> {
    const cacheKey = 'public_config';

    if (this.isValidCache(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await request.get('/settings/site-config');
      // 后端已经返回转换好的设置对象，无需再次转换
      const config = response.data;

      this.setCache(cacheKey, config);
      return config;
    } catch (error) {
      console.error('获取公开配置失败:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * 获取管理员配置（需要认证）
   */
  async getAdminConfig(): Promise<SiteSettings> {
    const cacheKey = 'admin_config';

    if (this.isValidCache(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await request.get('/settings');
      // 后端已经返回转换好的设置对象，无需再次转换
      const config = response.data;

      this.setCache(cacheKey, config);
      return config;
    } catch (error) {
      console.error('获取管理员配置失败:', error);
      throw error;
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(category: string, config: Partial<SiteSettings>): Promise<void> {
    try {
      let endpoint = '';
      switch (category) {
        case 'site':
          endpoint = '/settings/site';
          break;
        case 'email':
          endpoint = '/settings/email';
          break;
        case 'theme':
          endpoint = '/settings/site-config';
          break;
        case 'homepage':
          endpoint = '/settings/homepage-sections';
          break;
        default:
          endpoint = '/settings/site-config';
      }

      await request.put(endpoint, config);

      // 清除相关缓存
      this.clearCache();
    } catch (error) {
      console.error('更新配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取特定配置项
   */
  async getConfigValue<T = any>(key: string, defaultValue?: T): Promise<T> {
    try {
      const config = await this.getPublicConfig();
      return this.getNestedValue(config, key) ?? defaultValue;
    } catch (error) {
      console.error(`获取配置项 ${key} 失败:`, error);
      return defaultValue as T;
    }
  }

  /**
   * 清除缓存
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * 预加载配置
   */
  async preloadConfig(): Promise<void> {
    try {
      await this.getPublicConfig();
    } catch (error) {
      console.warn('预加载配置失败:', error);
    }
  }

  private isValidCache(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  private setCache(key: string, value: any): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;

    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, obj);

    target[lastKey] = value;
  }

  private getDefaultConfig(): SiteSettings {
    return {
      site: {
        name: '婚礼主持工作室',
        description: '专业的婚礼主持服务',
        keywords: '婚礼主持',
        logo: '',
        favicon: ''
      },
      theme: {
        darkMode: false,
        colors: {
          primary: '#d4af37',
          secondary: '#8b7355',
          background: '#ffffff',
          text: '#333333',
          accent: '#f5f5f5'
        },
        fonts: {
          primary: 'Inter, sans-serif',
          secondary: 'Playfair Display, serif'
        },
        spacing: {
          containerPadding: '20px',
          sectionPadding: '80px 0'
        }
      },
      homepageSections: {
        hero: {
          visible: true,
          title: '完美婚礼，从这里开始',
          description: '专业团队为您打造梦想中的婚礼',
          backgroundImage: '',
          ctaText: '了解更多',
          ctaLink: '#portfolio'
        },
        team: {
          visible: true,
          title: '专业团队',
          subtitle: '经验丰富的婚礼主持人',
          description: '我们的团队拥有多年婚礼主持经验'
        },
        portfolio: {
          visible: true,
          title: '作品展示',
          subtitle: '精选案例',
          description: '查看我们的精选婚礼主持作品'
        },
        contact: {
          visible: true,
          title: '联系我们',
          subtitle: '预约咨询',
          description: '联系我们获取专业的婚礼主持服务',
          address: '',
          phone: '',
          email: '',
          wechat: '',
          xiaohongshu: '',
          douyin: ''
        }
      }
    };
  }
}

export const configService = new ConfigService();