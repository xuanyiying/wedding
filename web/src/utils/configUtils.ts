import type { SiteSettings } from '../types';

/**
 * 配置工具函数
 */

/**
 * 获取嵌套配置值
 */
export const getNestedConfigValue = (config: any, path: string, defaultValue?: any): any => {
  return path.split('.').reduce((current, key) => current?.[key], config) ?? defaultValue;
};

/**
 * 设置嵌套配置值
 */
export const setNestedConfigValue = (config: any, path: string, value: any): any => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  
  const target = keys.reduce((current, key) => {
    if (!current[key]) {
      current[key] = {};
    }
    return current[key];
  }, config);

  target[lastKey] = value;
  return config;
};

/**
 * 合并配置对象
 */
export const mergeConfigs = (target: any, source: any): any => {
  const result = { ...target };
  
  Object.keys(source).forEach(key => {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeConfigs(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  });
  
  return result;
};

/**
 * 验证配置完整性
 */
export const validateConfig = (config: SiteSettings): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // 验证必需的配置项
  if (!config.site?.name) {
    errors.push('网站名称不能为空');
  }
  
  if (!config.site?.description) {
    errors.push('网站描述不能为空');
  }
  
  // 验证邮件配置
  if (config.email?.smtpHost && !config.email?.smtpUser) {
    errors.push('配置了SMTP主机但未配置用户名');
  }
  
  // 验证主题配置
  if (config.theme?.colors) {
    const { primary, secondary, background, text } = config.theme.colors;
    if (!primary || !secondary || !background || !text) {
      errors.push('主题颜色配置不完整');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 获取默认配置
 */
export const getDefaultConfig = (): SiteSettings => {
  return {
    site: {
      name: '婚礼摄影工作室',
      description: '专业的婚礼摄影服务',
      keywords: '婚礼摄影,婚纱摄影,摄影工作室',
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
    seo: {
      title: '婚礼摄影工作室',
      description: '专业的婚礼摄影服务',
      keywords: '婚礼摄影,婚纱摄影,摄影工作室'
    },
    homepageSections: {
      hero: {
        visible: true,
        title: '捕捉永恒瞬间',
        description: '专业婚礼摄影，记录您最美好的时刻',
        backgroundImage: '',
        ctaText: '了解更多',
        ctaLink: '#portfolio'
      },
      team: {
        visible: true,
        title: '专业团队',
        subtitle: '经验丰富的摄影师',
        description: '我们的团队拥有多年婚礼摄影经验'
      },
      portfolio: {
        visible: true,
        title: '作品展示',
        subtitle: '精选案例',
        description: '查看我们的精选婚礼摄影作品'
      },
      contact: {
        visible: true,
        title: '联系我们',
        subtitle: '预约咨询',
        description: '联系我们获取专业的婚礼摄影服务',
        address: '',
        phone: '',
        email: '',
        wechat: '',
        xiaohongshu: '',
        douyin: ''
      }
    },
    navigation: {
      menuItems: [
        { key: 'home', label: '首页', path: '/', visible: true, order: 1 },
        { key: 'portfolio', label: '作品展示', path: '/works', visible: true, order: 2 },
        { key: 'team', label: '团队介绍', path: '/team', visible: true, order: 3 },
        { key: 'schedule', label: '档期查询', path: '/schedule', visible: true, order: 4 },
        { key: 'contact', label: '联系我们', path: '/contact', visible: true, order: 5 }
      ]
    }
  };
};

/**
 * 配置缓存管理
 */
class ConfigCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5分钟

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;

    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

export const configCache = new ConfigCache();