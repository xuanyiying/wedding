// Client主题配色方案 - 黑白色系
export const clientTheme = {
  // 主色调 - 黑白色系
  primary: {
    main: '#000000',
    light: '#F5F5F5',
    dark: '#333333',
  },
  
  // 功能色彩 - 彩色功能状态
  functional: {
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    info: '#1890ff',
    purple: '#722ed1',
    cyan: '#13c2c2',
  },
  
  // 文字颜色 - 黑白层次
  text: {
    primary: '#000000',
    secondary: '#666666',
    tertiary: '#888888',
    light: '#666666',
  },
  
  // 背景色系 - 纯净黑白
  background: {
    primary: '#FFFFFF',
    secondary: '#F8F8F8',
    tertiary: '#F0F0F0',
  },
  
  // 边框和交互
  border: {
    primary: '#E0E0E0',
    light: '#F0F0F0',
    divider: '#E0E0E0',
  },
  
  // 交互色彩
  interaction: {
    hover: '#F0F0F0',
    accent: '#555555',
  },
  
  // 圆角设计 - 现代化
  borderRadius: {
    small: '8px',
    medium: '12px',
    large: '16px',
  },
  
  // 阴影效果 - 黑白柔和
  shadow: {
    small: '0 2px 8px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05)',
    medium: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1)',
    large: '0 20px 40px rgba(0, 0, 0, 0.2), 0 10px 15px rgba(0, 0, 0, 0.15)',
  },
  
  // 渐变色彩 - 黑白基调
  gradient: {
    primary: 'linear-gradient(135deg, #000000 0%, #333333 100%)',
    secondary: 'linear-gradient(135deg, #F8F8F8 0%, #F0F0F0 100%)',
    accent: 'linear-gradient(135deg, #333333 0%, #000000 100%)',
    hero: 'linear-gradient(135deg, #FFFFFF 0%, #F8F8F8 50%, #FFFFFF 100%)',
    overlay1: 'linear-gradient(135deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.05) 100%)',
    overlay2: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
    shine: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
    primaryHover: 'linear-gradient(135deg, #333333 0%, #555555 100%)',
  },
  
  // 布局相关
  layout: {
    container: '#FFFFFF',
    content: '#FFFFFF',
    header: 'rgba(255, 255, 255, 0.85)',
    headerDark: 'rgba(0, 0, 0, 0.85)',
    footer: '#F8F8F8',
  },
  
  // 特殊状态
  state: {
    inverse: '#FFFFFF',
    primaryHover: '#333333',
  },
};

// 深色主题变量 - 深邃黑白系
export const clientDarkTheme = {
  // 主色调 - 深邃黑白系
  primary: {
    main: '#FFFFFF',
    light: '#333333',
    dark: '#CCCCCC',
  },
  
  // 功能色彩 - 暗色适配
  functional: {
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    info: '#1890ff',
    purple: '#722ed1',
    cyan: '#13c2c2',
  },
  
  // 文字颜色 - 优雅对比
  text: {
    primary: '#FFFFFF',
    secondary: '#CCCCCC',
    tertiary: '#AAAAAA',
    light: '#CCCCCC',
  },
  
  // 背景色系 - 深邃黑色
  background: {
    primary: '#000000',
    secondary: '#1A1A1A',
    tertiary: '#333333',
  },
  
  // 边框和交互
  border: {
    primary: '#333333',
    light: '#1A1A1A',
    divider: '#333333',
  },
  
  // 交互色彩
  interaction: {
    hover: '#1A1A1A',
    accent: '#666666',
  },
  
  // 圆角设计
  borderRadius: {
    small: '8px',
    medium: '12px',
    large: '16px',
  },
  
  // 阴影效果 - 深色调
  shadow: {
    small: '0 4px 12px rgba(255, 255, 255, 0.1), 0 2px 6px rgba(255, 255, 255, 0.05)',
    medium: '0 10px 25px rgba(255, 255, 255, 0.15), 0 4px 10px rgba(255, 255, 255, 0.1)',
    large: '0 20px 40px rgba(255, 255, 255, 0.2), 0 10px 15px rgba(255, 255, 255, 0.15)',
  },
  
  // 渐变色彩 - 深色调
  gradient: {
    primary: 'linear-gradient(135deg, #FFFFFF 0%, #CCCCCC 100%)',
    secondary: 'linear-gradient(135deg, #1A1A1A 0%, #000000 100%)',
    accent: 'linear-gradient(135deg, #CCCCCC 0%, #FFFFFF 100%)',
    hero: 'linear-gradient(135deg, #000000 0%, #1A1A1A 50%, #000000 100%)',
    overlay1: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
    overlay2: 'linear-gradient(135deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.05) 100%)',
    shine: 'linear-gradient(135deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.1) 100%)',
    primaryHover: 'linear-gradient(135deg, #CCCCCC 0%, #AAAAAA 100%)',
  },
  
  // 布局相关
  layout: {
    container: '#000000',
    content: '#000000',
    header: 'rgba(0, 0, 0, 0.85)',
    headerDark: 'rgba(255, 255, 255, 0.85)',
    footer: '#1A1A1A',
  },
  
  // 特殊状态
  state: {
    inverse: '#000000',
    primaryHover: '#CCCCCC',
  },
};

// Client红色主题配色方案 - 以f55d54为主色
export const clientRedTheme = {
  // 主色调 - 红色系
  primary: {
    main: '#f55d54',
    light: '#ff8a80',
    dark: '#d32f2f',
  },
  
  // 功能色彩 - 彩色功能状态
  functional: {
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    info: '#1890ff',
    purple: '#722ed1',
    cyan: '#13c2c2',
  },
  
  // 文字颜色 - 深色层次
  text: {
    primary: '#2c2c2c',
    secondary: '#666666',
    tertiary: '#888888',
    light: '#666666',
  },
  
  // 背景色系 - 温暖白色
  background: {
    primary: '#FFFFFF',
    secondary: '#fafafa',
    tertiary: '#f5f5f5',
  },
  
  // 边框和交互
  border: {
    primary: '#f0f0f0',
    light: '#f5f5f5',
    divider: '#f0f0f0',
  },
  
  // 交互色彩
  interaction: {
    hover: '#fff5f5',
    accent: '#f55d54',
  },
  
  // 圆角设计 - 现代化
  borderRadius: {
    small: '8px',
    medium: '12px',
    large: '16px',
  },
  
  // 阴影效果 - 红色柔和
  shadow: {
    small: '0 2px 8px rgba(245, 93, 84, 0.1), 0 1px 3px rgba(245, 93, 84, 0.05)',
    medium: '0 10px 25px rgba(245, 93, 84, 0.15), 0 4px 10px rgba(245, 93, 84, 0.1)',
    large: '0 20px 40px rgba(245, 93, 84, 0.2), 0 10px 15px rgba(245, 93, 84, 0.15)',
  },
  
  // 渐变色彩 - 红色基调
  gradient: {
    primary: 'linear-gradient(135deg, #f55d54 0%, #d32f2f 100%)',
    secondary: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
    accent: 'linear-gradient(135deg, #ff8a80 0%, #f55d54 100%)',
    hero: 'linear-gradient(135deg, #FFFFFF 0%, #fff5f5 50%, #FFFFFF 100%)',
    overlay1: 'linear-gradient(135deg, rgba(245, 93, 84, 0.1) 0%, rgba(245, 93, 84, 0.05) 100%)',
    overlay2: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
    shine: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
    primaryHover: 'linear-gradient(135deg, #ff8a80 0%, #ff5722 100%)',
  },
  
  // 布局相关
  layout: {
    container: '#FFFFFF',
    content: '#FFFFFF',
    header: 'rgba(255, 255, 255, 0.85)',
    headerDark: 'rgba(245, 93, 84, 0.85)',
    footer: '#fafafa',
  },
  
  // 特殊状态
  state: {
    inverse: '#FFFFFF',
    primaryHover: '#ff8a80',
  },
};

// 红色深色主题变量
export const clientRedDarkTheme = {
  // 主色调 - 深红色系
  primary: {
    main: '#ff8a80',
    light: '#ffab91',
    dark: '#f55d54',
  },
  
  // 功能色彩 - 暗色适配
  functional: {
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    info: '#1890ff',
    purple: '#722ed1',
    cyan: '#13c2c2',
  },
  
  // 文字颜色 - 优雅对比
  text: {
    primary: '#FFFFFF',
    secondary: '#CCCCCC',
    tertiary: '#AAAAAA',
    light: '#CCCCCC',
  },
  
  // 背景色系 - 深邃红黑
  background: {
    primary: '#1a0e0d',
    secondary: '#2d1b1a',
    tertiary: '#3d2b2a',
  },
  
  // 边框和交互
  border: {
    primary: '#3d2b2a',
    light: '#2d1b1a',
    divider: '#3d2b2a',
  },
  
  // 交互色彩
  interaction: {
    hover: '#2d1b1a',
    accent: '#ff8a80',
  },
  
  // 圆角设计 - 现代化
  borderRadius: {
    small: '8px',
    medium: '12px',
    large: '16px',
  },
  
  // 阴影效果 - 红色柔和
  shadow: {
    small: '0 4px 12px rgba(255, 138, 128, 0.1), 0 2px 6px rgba(255, 138, 128, 0.05)',
    medium: '0 10px 25px rgba(255, 138, 128, 0.15), 0 4px 10px rgba(255, 138, 128, 0.1)',
    large: '0 20px 40px rgba(255, 138, 128, 0.2), 0 10px 15px rgba(255, 138, 128, 0.15)',
  },
  
  // 渐变色彩 - 深红基调
  gradient: {
    primary: 'linear-gradient(135deg, #ff8a80 0%, #f55d54 100%)',
    secondary: 'linear-gradient(135deg, #2d1b1a 0%, #1a0e0d 100%)',
    accent: 'linear-gradient(135deg, #ffab91 0%, #ff8a80 100%)',
    hero: 'linear-gradient(135deg, #1a0e0d 0%, #2d1b1a 50%, #1a0e0d 100%)',
    overlay1: 'linear-gradient(135deg, rgba(255, 138, 128, 0.1) 0%, rgba(255, 138, 128, 0.05) 100%)',
    overlay2: 'linear-gradient(135deg, rgba(26, 14, 13, 0.1) 0%, rgba(26, 14, 13, 0.05) 100%)',
    shine: 'linear-gradient(135deg, rgba(26, 14, 13, 0.2) 0%, rgba(26, 14, 13, 0.1) 100%)',
    primaryHover: 'linear-gradient(135deg, #ffab91 0%, #ff5722 100%)',
  },
  
  // 布局相关
  layout: {
    container: '#1a0e0d',
    content: '#1a0e0d',
    header: 'rgba(26, 14, 13, 0.85)',
    headerDark: 'rgba(255, 138, 128, 0.85)',
    footer: '#2d1b1a',
  },
  
  // 特殊状态
  state: {
    inverse: '#1a0e0d',
    primaryHover: '#ffab91',
  },
};

export type ClientTheme = typeof clientTheme;
export type ClientDarkTheme = typeof clientDarkTheme;
export type ClientRedTheme = typeof clientRedTheme;
export type ClientRedDarkTheme = typeof clientRedDarkTheme;