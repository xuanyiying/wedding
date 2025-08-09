import { adminTheme, adminDarkTheme, type AdminTheme, type AdminDarkTheme } from './admin';
import { 
  clientTheme, 
  clientDarkTheme, 
  type ClientTheme, 
  type ClientDarkTheme,
} from './client';


// 主题类型定义
export type ThemeMode = 'light' | 'dark';
export type ThemeType = 'admin' | 'client';

// 统一主题接口
export interface Theme {
  primary: {
    main: string;
    light: string;
    dark: string;
  };
  functional: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    [key: string]: string;
  };
  background: {
    primary: string;
    secondary: string;
    [key: string]: string;
  };
  border: {
    primary: string;
    light: string;
    divider: string;
  };
  borderRadius: {
    small: string;
    medium: string;
    large: string;
  };
  shadow: {
    small: string;
    medium: string;
    [key: string]: string;
  };
  gradient: {
    primary: string;
    secondary: string;
    accent: string;
    [key: string]: string;
  };
}

// 主题配置
export const themes = {
  admin: {
    light: adminTheme,
    dark: adminDarkTheme,
  },
  client: {
    light: clientTheme,
    dark: clientDarkTheme,
  },
} as const;

// 主题管理器
export class ThemeManager {
  private static instance: ThemeManager;
  private currentThemeType: ThemeType = 'admin';
  private currentThemeMode: ThemeMode = 'light';
  private listeners: Array<(theme: Theme) => void> = [];

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  // 获取当前主题
  getCurrentTheme(): Theme {
    if (this.currentThemeType === 'admin') {
      return themes.admin[this.currentThemeMode] as Theme;
    }
    return themes.client[this.currentThemeMode] as Theme;
  }

  // 设置主题类型（admin/client）
  setThemeType(type: ThemeType): void {
    this.currentThemeType = type;
    this.notifyListeners();
  }

  // 设置主题模式（light/dark）
  setThemeMode(mode: ThemeMode): void {
    this.currentThemeMode = mode;
    this.notifyListeners();
  }

  // 获取当前主题类型
  getThemeType(): ThemeType {
    return this.currentThemeType;
  }

  // 获取当前主题模式
  getThemeMode(): ThemeMode {
    return this.currentThemeMode;
  }

  // 切换主题模式
  toggleThemeMode(): void {
    this.currentThemeMode = this.currentThemeMode === 'light' ? 'dark' : 'light';
    this.notifyListeners();
  }

  // 添加主题变化监听器
  addListener(listener: (theme: Theme) => void): void {
    this.listeners.push(listener);
  }

  // 移除主题变化监听器
  removeListener(listener: (theme: Theme) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // 通知所有监听器
  private notifyListeners(): void {
    const currentTheme = this.getCurrentTheme();
    this.listeners.forEach(listener => listener(currentTheme));
  }

  // 应用主题到CSS变量
  applyThemeToCSS(): void {
    const theme = this.getCurrentTheme();
    const root = document.documentElement;
    const themePrefix = this.currentThemeType;

    // 主色调
    root.style.setProperty(`--${themePrefix}-primary-color`, theme.primary.main);
    root.style.setProperty(`--${themePrefix}-primary-light`, theme.primary.light);
    root.style.setProperty(`--${themePrefix}-primary-dark`, theme.primary.dark);

    // 功能色彩
    root.style.setProperty(`--${themePrefix}-functional-success`, theme.functional.success);
    root.style.setProperty(`--${themePrefix}-functional-warning`, theme.functional.warning);
    root.style.setProperty(`--${themePrefix}-functional-error`, theme.functional.error);
    root.style.setProperty(`--${themePrefix}-functional-info`, theme.functional.info);
    
    // 扩展功能色彩
    if ('purple' in theme.functional && theme.functional.purple) {
      root.style.setProperty(`--${themePrefix}-functional-purple`, theme.functional.purple as string);
    }
    if ('cyan' in theme.functional && theme.functional.cyan) {
      root.style.setProperty(`--${themePrefix}-functional-cyan`, theme.functional.cyan as string);
    }
    
    // 兼容旧版本变量名
    root.style.setProperty(`--${themePrefix}-success-color`, theme.functional.success);
    root.style.setProperty(`--${themePrefix}-warning-color`, theme.functional.warning);
    root.style.setProperty(`--${themePrefix}-error-color`, theme.functional.error);
    root.style.setProperty(`--${themePrefix}-info-color`, theme.functional.info);

    // 文字颜色
    root.style.setProperty(`--${themePrefix}-text-primary`, theme.text.primary);
    root.style.setProperty(`--${themePrefix}-text-secondary`, theme.text.secondary);
    root.style.setProperty(`--${themePrefix}-text-tertiary`, theme.text.tertiary);

    // 背景色
    root.style.setProperty(`--${themePrefix}-bg-layout`, theme.background.primary);
    root.style.setProperty(`--${themePrefix}-bg-container`, theme.background.secondary);

    // 边框
    root.style.setProperty(`--${themePrefix}-border-primary`, theme.border.primary);
    root.style.setProperty(`--${themePrefix}-border-light`, theme.border.light);
    root.style.setProperty(`--${themePrefix}-border-divider`, theme.border.divider);
    
    // 兼容旧版本变量名
    root.style.setProperty(`--${themePrefix}-border-color`, theme.border.primary);

    // 圆角
    root.style.setProperty(`--${themePrefix}-border-radius`, theme.borderRadius.small);
    root.style.setProperty(`--${themePrefix}-border-radius-lg`, theme.borderRadius.medium);
    root.style.setProperty(`--${themePrefix}-border-radius-xl`, theme.borderRadius.large);

    // 阴影
    root.style.setProperty(`--${themePrefix}-shadow-sm`, theme.shadow.small);
    root.style.setProperty(`--${themePrefix}-shadow-lg`, theme.shadow.medium);
    if ('large' in theme.shadow) {
      root.style.setProperty(`--${themePrefix}-shadow-xl`, theme.shadow.large);
    }

    // 渐变
    root.style.setProperty(`--${themePrefix}-gradient-primary`, theme.gradient.primary);
    root.style.setProperty(`--${themePrefix}-gradient-secondary`, theme.gradient.secondary);
    root.style.setProperty(`--${themePrefix}-gradient-accent`, theme.gradient.accent);

    // Admin主题特殊属性
    if ('sidebar' in theme) {
      const adminTheme = theme as AdminTheme;
      root.style.setProperty('--admin-sidebar-bg', adminTheme.sidebar.background);
      root.style.setProperty('--admin-sidebar-border', adminTheme.sidebar.border);
      root.style.setProperty('--admin-sidebar-text', adminTheme.sidebar.text);
      root.style.setProperty('--admin-sidebar-text-active', adminTheme.sidebar.textActive);
      
      // Admin布局
      if ('layout' in adminTheme) {
        root.style.setProperty('--admin-bg-container', adminTheme.layout.container);
        root.style.setProperty('--admin-bg-layout', adminTheme.layout.content);
        root.style.setProperty('--admin-header-bg', adminTheme.layout.header);
      }
      
      // Admin Logo
      if ('logo' in adminTheme) {
        root.style.setProperty('--admin-logo-bg', adminTheme.logo.background);
        root.style.setProperty('--admin-text-inverse', adminTheme.logo.text);
      }
      
      // Admin状态
      if ('state' in adminTheme) {
        root.style.setProperty('--admin-text-inverse', adminTheme.state.inverse);
        root.style.setProperty('--admin-interaction-hover', adminTheme.state.hover);
      }
    }

    // 始终应用客户端主题变量（无论当前主题类型如何）
    const clientThemeForCSS = themes.client[this.currentThemeMode] as ClientTheme;
    if ('interaction' in clientThemeForCSS) {
      root.style.setProperty('--client-interaction-hover', clientThemeForCSS.interaction.hover);
      root.style.setProperty('--client-interaction-accent', clientThemeForCSS.interaction.accent);
      
      // Client渐变扩展
      if ('hero' in clientThemeForCSS.gradient) {
        root.style.setProperty('--client-gradient-hero', clientThemeForCSS.gradient.hero);
      }
      if ('overlay1' in clientThemeForCSS.gradient) {
        root.style.setProperty('--client-gradient-overlay-1', clientThemeForCSS.gradient.overlay1);
        root.style.setProperty('--client-gradient-overlay-2', clientThemeForCSS.gradient.overlay2);
        root.style.setProperty('--client-gradient-shine', clientThemeForCSS.gradient.shine);
        root.style.setProperty('--client-gradient-primary-hover', clientThemeForCSS.gradient.primaryHover);
      }
      
      // Client布局
      if ('layout' in clientThemeForCSS) {
        root.style.setProperty('--client-bg-container', clientThemeForCSS.layout.container);
        root.style.setProperty('--client-bg-layout', clientThemeForCSS.layout.content);
        root.style.setProperty('--client-header-bg', clientThemeForCSS.layout.header);
        root.style.setProperty('--client-header-bg-dark', clientThemeForCSS.layout.headerDark);
        root.style.setProperty('--client-footer-bg', clientThemeForCSS.layout.footer);
      }
      
      // Client状态
      if ('state' in clientThemeForCSS) {
        root.style.setProperty('--client-text-inverse', clientThemeForCSS.state.inverse);
        root.style.setProperty('--client-primary-hover', clientThemeForCSS.state.primaryHover);
      }
      
      // Client主色调变量（用于在admin页面预览客户端主题效果）
      root.style.setProperty('--client-primary-color', clientThemeForCSS.primary.main);
      root.style.setProperty('--client-primary-light', clientThemeForCSS.primary.light);
      root.style.setProperty('--client-primary-dark', clientThemeForCSS.primary.dark);
    }
  }

  public applyCustomSettings(settings: any) {
    if (!settings) return;

    const root = document.documentElement;

    if (settings.primary_color) {
      if (this.currentThemeType === 'admin') {
        root.style.setProperty('--admin-primary-color', settings.primary_color);
      } else {
        root.style.setProperty('--client-primary-color', settings.primary_color);
      }
    }
    if (settings.border_radius) {
      root.style.setProperty('--border-radius', `${settings.border_radius}px`);
    }
    if (settings.font_size) {
      root.style.setProperty('--font-size-base', `${settings.font_size}px`);
    }
  }
}

// 导出主题实例
export const themeManager = ThemeManager.getInstance();

// 导出主题
export { 
  adminTheme, 
  adminDarkTheme, 
  clientTheme, 
  clientDarkTheme, 
};
export type { 
  AdminTheme, 
  AdminDarkTheme, 
  ClientTheme, 
  ClientDarkTheme,
};