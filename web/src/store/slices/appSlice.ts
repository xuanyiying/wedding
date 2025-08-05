import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ThemeMode } from '../../types';
import { Language, NotificationType } from '../../types';

interface AppState {
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  loading: boolean;
  error: string | null;
  language: Language;
  breadcrumbs: Array<{
    title: string;
    path?: string;
  }>;
  notifications: Array<{
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
  }>;
}

const initialState: AppState = {
  theme: (localStorage.getItem('theme') as ThemeMode) || 'light',
  sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',
  loading: false,
  error: null,
  language: (localStorage.getItem('language') as Language) || Language.ZH,
  breadcrumbs: [],
  notifications: [],
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    // 切换主题
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.theme);
    },
    
    // 设置主题
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },
    
    // 切换侧边栏折叠状态
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      localStorage.setItem('sidebarCollapsed', state.sidebarCollapsed.toString());
    },
    
    // 设置侧边栏状态
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
      localStorage.setItem('sidebarCollapsed', action.payload.toString());
    },
    
    // 设置全局加载状态
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    // 设置全局错误
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // 清除错误
    clearError: (state) => {
      state.error = null;
    },
    
    // 设置语言
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload;
      localStorage.setItem('language', action.payload);
    },
    
    // 设置面包屑
    setBreadcrumbs: (state, action: PayloadAction<Array<{
      title: string;
      path?: string;
    }>>) => {
      state.breadcrumbs = action.payload;
    },
    
    // 添加通知
    addNotification: (state, action: PayloadAction<{
      type: NotificationType;
      title: string;
      message: string;
    }>) => {
      const notification = {
        id: Date.now().toString(),
        ...action.payload,
        timestamp: Date.now(),
        read: false,
      };
      state.notifications.unshift(notification);
      
      // 限制通知数量
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },
    
    // 标记通知为已读
    markNotificationRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    
    // 标记所有通知为已读
    markAllNotificationsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
    },
    
    // 删除通知
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    
    // 清除所有通知
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const {
  toggleTheme,
  setTheme,
  toggleSidebar,
  setSidebarCollapsed,
  setLoading,
  setError,
  clearError,
  setLanguage,
  setBreadcrumbs,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
  removeNotification,
  clearNotifications,
} = appSlice.actions;

export default appSlice.reducer;

// Selectors
export const selectApp = (state: { app: AppState }) => state.app;
export const selectTheme = (state: { app: AppState }) => state.app.theme;
export const selectSidebarCollapsed = (state: { app: AppState }) => state.app.sidebarCollapsed;
export const selectAppLoading = (state: { app: AppState }) => state.app.loading;
export const selectAppError = (state: { app: AppState }) => state.app.error;
export const selectLanguage = (state: { app: AppState }) => state.app.language;
export const selectBreadcrumbs = (state: { app: AppState }) => state.app.breadcrumbs;
export const selectNotifications = (state: { app: AppState }) => state.app.notifications;
export const selectUnreadNotifications = (state: { app: AppState }) => 
  state.app.notifications.filter(n => !n.read);