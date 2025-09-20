import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { settingsService } from '../services';
import type { SiteSettings } from '../types';

// 配置状态类型
interface ConfigState {
  settings: SiteSettings | null;
  loading: boolean;
  error: string | null;
  isDirty: boolean; // 是否有未保存的更改
}

// 配置动作类型
type ConfigAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SETTINGS'; payload: SiteSettings }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<SiteSettings> }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'RESET_SETTINGS' };

// 配置上下文类型
interface ConfigContextType {
  state: ConfigState;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<SiteSettings>) => void;
  saveSettings: (section?: keyof SiteSettings) => Promise<boolean>;
  resetSettings: () => void;
  markDirty: () => void;
}

const initialState: ConfigState = {
  settings: null,
  loading: false,
  error: null,
  isDirty: false,
};

// 配置 reducer
function configReducer(state: ConfigState, action: ConfigAction): ConfigState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload, loading: false, error: null, isDirty: false };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: state.settings ? { ...state.settings, ...action.payload } : action.payload as SiteSettings,
        isDirty: true,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_DIRTY':
      return { ...state, isDirty: action.payload };
    case 'RESET_SETTINGS':
      return initialState;
    default:
      return state;
  }
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

// 配置提供者组件
export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(configReducer, initialState);

  // 加载设置
  const loadSettings = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await settingsService.getSettings();
      dispatch({ type: 'SET_SETTINGS', payload: response.data || {} });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载设置失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      message.error(errorMessage);
    }
  }, []);

  // 更新设置（本地状态）
  const updateSettings = useCallback((updates: Partial<SiteSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: updates });
  }, []);

  // 保存设置到服务器
  const saveSettings = useCallback(async (section?: keyof SiteSettings): Promise<boolean> => {
    if (!state.settings) return false;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      let saveData: Partial<SiteSettings>;
      
      if (section) {
        // 保存特定部分
        saveData = { [section]: state.settings[section] };
      } else {
        // 保存所有设置
        saveData = state.settings;
      }

      await settingsService.updateSiteSettings(saveData);
      dispatch({ type: 'SET_DIRTY', payload: false });
      message.success('设置保存成功');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存设置失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      message.error(errorMessage);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.settings]);

  // 重置设置
  const resetSettings = useCallback(() => {
    dispatch({ type: 'RESET_SETTINGS' });
  }, []);

  // 标记为已修改
  const markDirty = useCallback(() => {
    dispatch({ type: 'SET_DIRTY', payload: true });
  }, []);

  // 初始化时加载设置
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const contextValue: ConfigContextType = {
    state,
    loadSettings,
    updateSettings,
    saveSettings,
    resetSettings,
    markDirty,
  };

  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
};

// 使用配置的钩子
export const useConfig = (): ConfigContextType => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

// 特定配置部分的钩子
export const useThemeConfig = () => {
  const { state, updateSettings, saveSettings } = useConfig();
  
  const updateTheme = useCallback((themeUpdates: Partial<SiteSettings['theme']>) => {
    updateSettings({
      theme: {
        ...state.settings?.theme,
        ...themeUpdates,
      } as SiteSettings['theme'],
    });
  }, [state.settings?.theme, updateSettings]);

  const saveTheme = useCallback(() => saveSettings('theme'), [saveSettings]);

  return {
    theme: state.settings?.theme,
    loading: state.loading,
    isDirty: state.isDirty,
    updateTheme,
    saveTheme,
  };
};

export const useEmailConfig = () => {
  const { state, updateSettings, saveSettings } = useConfig();
  
  const updateEmail = useCallback((emailUpdates: Partial<SiteSettings['email']>) => {
    updateSettings({
      email: {
        ...state.settings?.email,
        ...emailUpdates,
      } as SiteSettings['email'],
    });
  }, [state.settings?.email, updateSettings]);

  const saveEmail = useCallback(() => saveSettings('email'), [saveSettings]);

  return {
    email: state.settings?.email,
    loading: state.loading,
    isDirty: state.isDirty,
    updateEmail,
    saveEmail,
  };
};