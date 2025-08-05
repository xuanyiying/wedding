// Admin主题配色方案 - Ant Design 蓝色系
export const adminTheme = {
  // 主色调 - Ant Design 蓝色系
  primary: {
    main: '#1890ff', // 主色调
    light: '#40a9ff', // 主色调的亮颜色
    dark: '#096dd9', // 主色调的暗颜色
  },
  
  // 功能色彩 - Ant Design 标准色
  functional: {
    success: '#52c41a', // 成功色彩 
    warning: '#faad14', // 警告色彩 
    error: '#ff4d4f', // 错误色彩 
    info: '#1890ff', // 信息色彩 
    purple: '#722ed1', // 紫色色彩 
    cyan: '#13c2c2', // 青色色彩 
  },
  
  // 文字颜色 - Ant Design 规范
  text: {
    primary: '#262626',
    secondary: '#595959',
    tertiary: '#8c8c8c',
    disabled: '#bfbfbf',
  },
  
  // 背景色系 - Ant Design 层次
  background: {
    primary: '#f0f2f5',
    secondary: '#fafafa',
    component: '#ffffff',
  },
  
  // 边框和分割 - Ant Design 精细
  border: {
    primary: '#d9d9d9',
    light: '#f0f0f0',
    divider: '#f0f0f0',
  },
  
  // 阴影效果 - Ant Design 立体感
  shadow: {
    small: '0 2px 8px rgba(0, 0, 0, 0.15)',
    medium: '0 6px 16px rgba(0, 0, 0, 0.08), 0 3px 6px rgba(0, 0, 0, 0.12), 0 9px 28px rgba(0, 0, 0, 0.05)',
  },
  
  // 圆角设计 - Ant Design 标准
  borderRadius: {
    small: '6px',
    medium: '8px',
    large: '12px',
  },
  
  // 侧边栏配色 - Ant Design 深色导航
  sidebar: {
    background: '#001529',
    border: '#002140',
    text: 'rgba(255, 255, 255, 0.65)',
    textActive: '#ffffff',
  },
  
  // 渐变色彩 - Ant Design 风格
  gradient: {
    primary: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
    secondary: 'linear-gradient(135deg, #fafafa 0%, #ffffff 100%)',
    accent: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
  },
  
  // 布局相关
  layout: {
    container: '#ffffff',
    content: '#ffffff',
    header: '#ffffff',
  },
  
  // Logo相关
  logo: {
    background: 'rgba(255, 255, 255, 0.1)',
    text: '#ffffff',
  },
  
  // 特殊状态
  state: {
    inverse: '#ffffff',
    hover: '#f5f5f5',
  },
};

// 深色主题变量 - Ant Design 深色主题
export const adminDarkTheme = {
  // 主色调 - Ant Design 深色蓝
  primary: {
    main: '#177ddc',
    light: '#3c9ae8',
    dark: '#0958d9',
  },
  
  // 功能色彩 - Ant Design 深色适配
  functional: {
    success: '#49aa19',
    warning: '#d89614',
    error: '#dc4446',
    info: '#177ddc',
    purple: '#722ed1',
    cyan: '#13c2c2',
  },
  
  // 文字颜色 - Ant Design 深色规范
  text: {
    primary: 'rgba(255, 255, 255, 0.85)',
    secondary: 'rgba(255, 255, 255, 0.65)',
    tertiary: 'rgba(255, 255, 255, 0.45)',
    disabled: 'rgba(255, 255, 255, 0.25)',
  },
  
  // 背景色系 - Ant Design 深色层次
  background: {
    primary: '#141414',
    secondary: '#1f1f1f',
    component: '#1f1f1f',
  },
  
  // 边框和分割 - Ant Design 深色边框
  border: {
    primary: '#434343',
    light: '#303030',
    divider: '#303030',
  },
  
  // 阴影效果 - Ant Design 深色阴影
  shadow: {
    small: '0 2px 8px rgba(0, 0, 0, 0.45)',
    medium: '0 6px 16px rgba(0, 0, 0, 0.32), 0 3px 6px rgba(0, 0, 0, 0.32), 0 9px 28px rgba(0, 0, 0, 0.2)',
  },
  
  // 圆角设计
  borderRadius: {
    small: '6px',
    medium: '8px',
    large: '12px',
  },
  
  // 侧边栏配色 - Ant Design 深色导航
  sidebar: {
    background: '#000000',
    border: '#1f1f1f',
    text: 'rgba(255, 255, 255, 0.65)',
    textActive: '#ffffff',
  },
  
  // 渐变色彩 - Ant Design 深色版本
  gradient: {
    primary: 'linear-gradient(135deg, #177ddc 0%, #3c9ae8 100%)',
    secondary: 'linear-gradient(135deg, #1f1f1f 0%, #141414 100%)',
    accent: 'linear-gradient(135deg, #49aa19 0%, #5cdbd3 100%)',
  },
  
  // 布局相关
  layout: {
    container: '#1f1f1f',
    content: '#1f1f1f',
    header: '#1f1f1f',
  },
  
  // Logo相关
  logo: {
    background: 'rgba(0, 0, 0, 0.1)',
    text: 'rgba(255, 255, 255, 0.85)',
  },
  
  // 特殊状态
  state: {
    inverse: 'rgba(255, 255, 255, 0.85)',
    hover: '#303030',
  },
};

export type AdminTheme = typeof adminTheme;
export type AdminDarkTheme = typeof adminDarkTheme;