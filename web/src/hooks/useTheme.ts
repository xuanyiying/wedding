import { useState, useEffect, useCallback } from 'react';
import { themeManager, type Theme, type ThemeType, type ThemeMode, type ClientThemeVariant } from '../styles/themes';

// 主题Hook
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(themeManager.getCurrentTheme());
  const [themeType, setThemeType] = useState<ThemeType>(themeManager.getThemeType());
  const [themeMode, setThemeMode] = useState<ThemeMode>(themeManager.getThemeMode());
  const [clientVariant, setClientVariant] = useState<ClientThemeVariant>(themeManager.getClientVariant());

  // 主题变化处理函数
  const handleThemeChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    setThemeType(themeManager.getThemeType());
    setThemeMode(themeManager.getThemeMode());
    setClientVariant(themeManager.getClientVariant());
  }, []);

  // 设置主题类型
  const changeThemeType = useCallback((type: ThemeType) => {
    themeManager.setThemeType(type);
    themeManager.applyThemeToCSS();
  }, []);

  // 设置客户端主题变体
  const changeClientVariant = useCallback((variant: ClientThemeVariant) => {
    themeManager.setClientVariant(variant);
    setClientVariant(variant);
    themeManager.applyThemeToCSS();
  }, []);

  // 设置主题模式
  const changeThemeMode = useCallback((mode: ThemeMode) => {
    themeManager.setThemeMode(mode);
    themeManager.applyThemeToCSS();
  }, []);

  // 切换主题模式
  const toggleThemeMode = useCallback(() => {
    themeManager.toggleThemeMode();
    themeManager.applyThemeToCSS();
  }, []);

  // 初始化主题
  const initTheme = useCallback((type: ThemeType, mode?: ThemeMode) => {
    themeManager.setThemeType(type);
    if (mode) {
      themeManager.setThemeMode(mode);
    }
    themeManager.applyThemeToCSS();
  }, [themeMode, clientVariant]);

  const applyThemeSettings = (settings: any) => {
    themeManager.applyCustomSettings(settings);
  };

  return { 
    theme, 
    themeType, 
    themeMode, 
    clientVariant,
    changeThemeType,
    changeClientVariant, 
    changeThemeMode, 
    toggleThemeMode,
    initTheme,
    applyThemeSettings,
  };
};

// 主题上下文Hook（用于获取当前主题而不订阅变化）
export const useCurrentTheme = () => {
  return themeManager.getCurrentTheme();
};

// 主题类型Hook
export const useThemeType = () => {
  return themeManager.getThemeType();
};

// 主题模式Hook
export const useThemeMode = () => {
  return themeManager.getThemeMode();
};