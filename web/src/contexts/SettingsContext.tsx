import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { settingsService } from '../services';
import type { EmailSettings, HomepageSettings, SiteSettings, ThemeSettings } from '../types';

// 默认设置值
const defaultSettings = {
  site: {
    name: '婚礼服务平台',
    description: '专业的婚礼策划与服务平台，为您打造完美的婚礼体验',
    keywords: '婚礼策划,婚礼摄影,婚礼主持,婚礼服务,婚庆公司',
    logo: './assets/images/logo.png',
    favicon: './assets/images/favicon.ico',
    contactEmail: 'contact@wedding.com',
    contactPhone: '400-123-4567',
    address: '',
    icp: '',
    copyright: '',
    seo: {
      title: '婚礼服务平台 - 专业婚礼策划与服务',
      description: '专业的婚礼策划与服务平台，提供婚礼摄影、婚礼主持、婚礼策划等一站式服务',
      keywords: '婚礼策划,婚礼摄影,婚礼主持,婚礼服务,婚庆公司'
    }
  },
  homepage: {
    hero: {
      backgroundImage: '/images/hero-bg.jpg',
      visible: true,
      title: '完美婚礼，从这里开始',
      subtitle: '',
      description: '专业团队为您打造梦想中的婚礼',
      ctaText: '立即咨询',
      ctaLink: '/contact'
    },
    team: {
      visible: true,
      title: '专业团队',
      subtitle: '经验丰富的婚礼策划师',
      description: '专业团队为您打造梦想中的婚礼'
    },
    teamShowcase: {
      visible: true,
      title: '团队风采',
      subtitle: '展示我们的专业实力',
      description: '查看我们团队的精彩瞬间'
    },
    portfolio: {
      visible: true,
      title: '精选作品',
      subtitle: '见证每一个美好时刻',
      description: '浏览我们的婚礼摄影作品集'
    },
    schedule: {
      visible: true,
      title: '档期查询',
      subtitle: '查询可预约的主持人',
      description: '查询可预约的主持人'
    },
    contact: {
      visible: true,
      title: '联系我们',
      subtitle: '随时为您提供咨询',
      description: '多种方式联系我们的团队',
      backgroundImage: '',
      address: '北京市朝阳区婚礼大厦',
      phone: '400-123-4567',
      email: 'contact@wedding.com',
      wechat: 'wedding_service',
      xiaohongshu: 'wedding_xiaohongshu',
      douyin: 'wedding_douyin'
    }
  } as HomepageSettings,
  theme: {
    colors: {
      primary: '#1890ff',
      secondary: '#52c41a',
      accent: '#722ed1',
      background: '#ffffff',
      text: '#000000'
    },
    fonts: {
      primary: 'Arial, sans-serif',
      secondary: 'Georgia, serif'
    },
    spacing: {
      containerPadding: '20px',
      sectionPadding: '40px'
    },
    borderRadius: 4,
    fontSize: 14,
    compactMode: false,
    darkMode: false,
    clientThemeVariant: 'default'
  },
  email: {
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: true,
    emailFrom: 'noreply@wedding.com',
    emailFromName: '婚礼服务平台'
  },
  loading: false,
  error: null,
  isDirty: {
    site: false,
    homepage: false,
    theme: false,
    email: false
  }
};

// 设置状态接口
interface SettingsState {
  site: SiteSettings;
  homepage: HomepageSettings;
  theme: ThemeSettings;
  email: EmailSettings;
  loading: boolean;
  error: string | null;
  isDirty: {
    site: boolean;
    homepage: boolean;
    theme: boolean;
    email: boolean;
  };
}

// 设置动作类型
type SettingsAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SITE_SETTINGS'; payload: SiteSettings }
  | { type: 'SET_HOMEPAGE_SETTINGS'; payload: HomepageSettings }
  | { type: 'SET_THEME_SETTINGS'; payload: ThemeSettings }
  | { type: 'SET_EMAIL_SETTINGS'; payload: EmailSettings }
  | { type: 'UPDATE_SITE_SETTINGS'; payload: Partial<SiteSettings> }
  | { type: 'UPDATE_HOMEPAGE_SETTINGS'; payload: Partial<HomepageSettings> }
  | { type: 'UPDATE_THEME_SETTINGS'; payload: Partial<ThemeSettings> }
  | { type: 'UPDATE_EMAIL_SETTINGS'; payload: Partial<EmailSettings> }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'MARK_CLEAN'; payload: keyof SettingsState['isDirty'] }
  | { type: 'RESET_SETTINGS' };

// 设置上下文类型
interface SettingsContextType {
  state: SettingsState;
  loadSettings: () => Promise<void>;
  updateSiteSettings: (updates: Partial<SiteSettings>) => void;
  updateHomepageSettings: (updates: Partial<HomepageSettings>) => void;
  updateThemeSettings: (updates: Partial<ThemeSettings>) => void;
  updateEmailSettings: (updates: Partial<EmailSettings>) => void;
  saveSiteSettings: () => Promise<boolean>;
  saveHomepageSettings: () => Promise<boolean>;
  saveThemeSettings: () => Promise<boolean>;
  saveEmailSettings: () => Promise<boolean>;
  resetSettings: () => void;
}

// 深度合并对象的辅助函数
function deepMerge(target: any, source: any): any {
  if (!source || typeof source !== 'object') return source;
  if (!target || typeof target !== 'object') return source;

  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }

  return result;
}

// 设置 reducer
function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_SITE_SETTINGS':
      console.log('🔄 SET_SITE_SETTINGS:', action.payload);
      return {
        ...state,
        site: action.payload,
        loading: false,
        error: null,
        isDirty: { ...state.isDirty, site: false },
      };

    case 'SET_HOMEPAGE_SETTINGS':
      console.log('🔄 SET_HOMEPAGE_SETTINGS:', action.payload);
      return {
        ...state,
        homepage: action.payload,
        loading: false,
        error: null,
        isDirty: { ...state.isDirty, homepage: false },
      };

    case 'SET_THEME_SETTINGS':
      console.log('🔄 SET_THEME_SETTINGS:', action.payload);
      return {
        ...state,
        theme: action.payload,
        loading: false,
        error: null,
        isDirty: { ...state.isDirty, theme: false },
      };

    case 'SET_EMAIL_SETTINGS':
      console.log('🔄 SET_EMAIL_SETTINGS:', action.payload);
      return {
        ...state,
        email: action.payload,
        loading: false,
        error: null,
        isDirty: { ...state.isDirty, email: false },
      };

    case 'UPDATE_SITE_SETTINGS':
      console.log('🔄 UPDATE_SITE_SETTINGS:', action.payload);
      return {
        ...state,
        site: deepMerge(state.site, action.payload),
        isDirty: { ...state.isDirty, site: true },
      };

    case 'UPDATE_HOMEPAGE_SETTINGS':
      console.log('🔄 UPDATE_HOMEPAGE_SETTINGS:', action.payload);
      return {
        ...state,
        homepage: deepMerge(state.homepage, action.payload),
        isDirty: { ...state.isDirty, homepage: true },
      };

    case 'UPDATE_THEME_SETTINGS':
      console.log('🔄 UPDATE_THEME_SETTINGS:', action.payload);
      return {
        ...state,
        theme: deepMerge(state.theme, action.payload),
        isDirty: { ...state.isDirty, theme: true },
      };

    case 'UPDATE_EMAIL_SETTINGS':
      console.log('🔄 UPDATE_EMAIL_SETTINGS:', action.payload);
      return {
        ...state,
        email: { ...state.email, ...action.payload },
        isDirty: { ...state.isDirty, email: true },
      };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'MARK_CLEAN':
      return {
        ...state,
        isDirty: { ...state.isDirty, [action.payload]: false },
      };

    case 'RESET_SETTINGS':
      return defaultSettings;

    default:
      return state;
  }
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// 设置提供者组件
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(settingsReducer, defaultSettings);

  // 加载设置 - 分别加载各个模块的设置
  const loadSettings = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // 使用新的分离API分别加载各个模块的设置
      const [siteResponse, homepageResponse, themeResponse, emailResponse] = await Promise.all([
        settingsService.getSiteSettings(),
        settingsService.getHomepageSettings(),
        settingsService.getThemeSettings(),
        settingsService.getEmailSettings()
      ]);

      const siteData = {
        ...defaultSettings.site,
        ...(siteResponse.data || {})
      };

      const homepageData = {
        ...defaultSettings.homepage,
        ...(homepageResponse.data || {})
      };

      const themeData = {
        ...defaultSettings.theme,
        ...(themeResponse.data || {})
      };

      const emailData = {
        ...defaultSettings.email,
        ...(emailResponse.data || {})
      };

      console.log('🔍 解析后的设置数据:', {
        site: siteData,
        homepage: homepageData,
        theme: themeData,
        email: emailData,
      });

      // 分别设置各个模块的数据
      dispatch({ type: 'SET_SITE_SETTINGS', payload: siteData });
      dispatch({ type: 'SET_HOMEPAGE_SETTINGS', payload: homepageData });
      dispatch({ type: 'SET_THEME_SETTINGS', payload: themeData });
      dispatch({ type: 'SET_EMAIL_SETTINGS', payload: emailData });

      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载设置失败';
      console.error('❌ 加载设置失败:', error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      message.error(errorMessage);
    }
  }, []);

  // 更新网站设置
  const updateSiteSettings = useCallback((updates: Partial<SiteSettings>) => {
    dispatch({ type: 'UPDATE_SITE_SETTINGS', payload: updates });
  }, []);

  // 更新首页设置
  const updateHomepageSettings = useCallback((updates: Partial<HomepageSettings>) => {
    dispatch({ type: 'UPDATE_HOMEPAGE_SETTINGS', payload: updates });
  }, []);

  // 更新主题设置
  const updateThemeSettings = useCallback((updates: Partial<ThemeSettings>) => {
    dispatch({ type: 'UPDATE_THEME_SETTINGS', payload: updates });
  }, []);

  // 更新邮件设置
  const updateEmailSettings = useCallback((updates: Partial<EmailSettings>) => {
    dispatch({ type: 'UPDATE_EMAIL_SETTINGS', payload: updates });
  }, []);

  // 保存网站设置 - 使用新的分离API
  const saveSiteSettings = useCallback(async (): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      console.log('💾 保存网站设置 (全量更新):', state.site);

      // 使用新的分离API进行全量更新
      await settingsService.createSiteSettings(state.site);

      dispatch({ type: 'MARK_CLEAN', payload: 'site' });
      message.success('网站设置保存成功');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存网站设置失败';
      console.error('❌ 保存网站设置失败:', error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      message.error(errorMessage);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.site]);

  // 保存首页设置 - 使用新的分离API
  const saveHomepageSettings = useCallback(async (): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      console.log('💾 保存首页设置 (全量更新):', state.homepage);

      // 使用新的分离API进行全量更新
      await settingsService.createHomepageSettings(state.homepage);

      dispatch({ type: 'MARK_CLEAN', payload: 'homepage' });
      message.success('首页设置保存成功');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存首页设置失败';
      console.error('❌ 保存首页设置失败:', error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      message.error(errorMessage);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.homepage]);

  // 保存主题设置 - 使用新的分离API
  const saveThemeSettings = useCallback(async (): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      console.log('💾 保存主题设置 (全量更新):', state.theme);

      // 使用新的分离API进行全量更新
      await settingsService.createThemeSettings(state.theme);

      dispatch({ type: 'MARK_CLEAN', payload: 'theme' });
      message.success('主题设置保存成功');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存主题设置失败';
      console.error('❌ 保存主题设置失败:', error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      message.error(errorMessage);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.theme]);

  // 保存邮件设置 - 使用新的分离API
  const saveEmailSettings = useCallback(async (): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      console.log('💾 保存邮件设置 (全量更新):', state.email);

      // 使用新的分离API进行全量更新
      await settingsService.createEmailSettings(state.email);

      dispatch({ type: 'MARK_CLEAN', payload: 'email' });
      message.success('邮件设置保存成功');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存邮件设置失败';
      console.error('❌ 保存邮件设置失败:', error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      message.error(errorMessage);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.email]);

  // 重置设置
  const resetSettings = useCallback(() => {
    dispatch({ type: 'RESET_SETTINGS' });
  }, []);

  // 初始化时加载设置
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const contextValue: SettingsContextType = {
    state,
    loadSettings,
    updateSiteSettings,
    updateHomepageSettings,
    updateThemeSettings,
    updateEmailSettings,
    saveSiteSettings,
    saveHomepageSettings,
    saveThemeSettings,
    saveEmailSettings,
    resetSettings,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

// 使用设置的钩子
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};