import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { settingsService } from '../services';

// 网站设置接口
interface SiteSettings {
  name: string;
  description: string;
  keywords: string;
  logo: string;
  favicon: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  icp: string;
  copyright: string;
  // SEO设置合并到网站设置中
  seo: {
    title: string;
    description: string;
    keywords: string;
    ogImage: string;
  };
}

// 首页设置接口
interface HomepageSettings {
  hero: {
    title: string;
    subtitle: string;
    backgroundImage: string;
    ctaText: string;
    ctaLink: string;
    visible: boolean;
  };
  about: {
    title: string;
    content: string;
    image: string;
    visible: boolean;
  };
  services: {
    title: string;
    visible: boolean;
    items: Array<{
      title: string;
      description: string;
      icon: string;
      image: string;
    }>;
  };
  gallery: {
    title: string;
    visible: boolean;
    images: string[];
  };
  testimonials: {
    title: string;
    visible: boolean;
    items: Array<{
      name: string;
      content: string;
      avatar: string;
      rating: number;
    }>;
  };
  contact: {
    title: string;
    subtitle: string;
    backgroundImage: string;
    email: string;
    phone: string;
    address: string;
    wechat: string;
    douyin: string;
    visible: boolean;
  };
}

// 主题设置接口
interface ThemeSettings {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    primary: string;
    secondary: string;
  };
  spacing: {
    containerPadding: string;
    sectionPadding: string;
  };
  borderRadius: number;
  fontSize: number;
  compactMode: boolean;
  darkMode: boolean;
  clientThemeVariant: string;
}

// 邮件设置接口
interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
  emailFrom: string;
  emailFromName: string;
}

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

// 默认设置值
const defaultSettings: SettingsState = {
  site: {
    name: '',
    description: '',
    keywords: '',
    logo: '',
    favicon: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    icp: '',
    copyright: '',
    seo: {
      title: '',
      description: '',
      keywords: '',
      ogImage: '',
    },
  },
  homepage: {
    hero: {
      title: '',
      subtitle: '',
      backgroundImage: '',
      ctaText: '',
      ctaLink: '',
      visible: true,
    },
    about: {
      title: '',
      content: '',
      image: '',
      visible: true,
    },
    services: {
      title: '',
      visible: true,
      items: [],
    },
    gallery: {
      title: '',
      visible: true,
      images: [],
    },
    testimonials: {
      title: '',
      visible: true,
      items: [],
    },
    contact: {
      title: '',
      subtitle: '',
      backgroundImage: '',
      email: '',
      phone: '',
      address: '',
      wechat: '',
      douyin: '',
      visible: true,
    },
  },
  theme: {
    colors: {
      primary: '#D4A574',
      secondary: '#F5E6D3',
      accent: '#B8956A',
      background: '#FEFCF9',
      text: '#5D4E37',
    },
    fonts: {
      primary: 'Arial, sans-serif',
      secondary: 'Georgia, serif',
    },
    spacing: {
      containerPadding: '16px',
      sectionPadding: '24px',
    },
    borderRadius: 8,
    fontSize: 14,
    compactMode: false,
    darkMode: false,
    clientThemeVariant: 'elegant-rose',
  },
  email: {
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: false,
    emailFrom: '',
    emailFromName: '',
  },
  loading: false,
  error: null,
  isDirty: {
    site: false,
    homepage: false,
    theme: false,
    email: false,
  },
};

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
      // 暂时使用兼容接口，后续需要后端支持分离的API
      const response = await settingsService.getSettings();
      const serverData = response.data || {};
      
      // 解析分离的数据结构
      const siteData = {
        ...defaultSettings.site,
        ...serverData.site,
        seo: {
          ...defaultSettings.site.seo,
          ...serverData.seo
        }
      };
      
      const homepageData = {
        ...defaultSettings.homepage,
        ...serverData.homepage,
        ...serverData.homepageSections
      };
      
      const themeData = {
        ...defaultSettings.theme,
        ...serverData.theme
      };
      
      const emailData = {
        ...defaultSettings.email,
        ...serverData.email
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

  // 保存网站设置 - 全量更新
  const saveSiteSettings = useCallback(async (): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      console.log('💾 保存网站设置 (全量更新):', state.site);
      
      // 暂时使用兼容接口进行全量更新
      await settingsService.updateSiteSettings(state.site);
      
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

  // 保存首页设置 - 全量更新
  const saveHomepageSettings = useCallback(async (): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      console.log('💾 保存首页设置 (全量更新):', state.homepage);
      
      // 暂时使用兼容接口进行全量更新
      await settingsService.updateHomepageSettings(state.homepage);
      
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

  // 保存主题设置 - 全量更新
  const saveThemeSettings = useCallback(async (): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      console.log('💾 保存主题设置 (全量更新):', state.theme);
      
      // 暂时使用兼容接口进行全量更新
      await settingsService.updateThemeSettings(state.theme);
      
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

  // 保存邮件设置 - 全量更新
  const saveEmailSettings = useCallback(async (): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      console.log('💾 保存邮件设置 (全量更新):', state.email);
      
      // 暂时使用兼容接口进行全量更新
      await settingsService.updateEmailSettings(state.email);
      
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