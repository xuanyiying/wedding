# ResponsiveMediaGallery 自适应媒体展示组件

## 概述

ResponsiveMediaGallery 是一个高性能的自适应媒体展示组件，专为现代Web应用设计，能够完美适配PC端和移动端设备。

## 核心特性

### 🎯 自适应布局
- **响应式网格系统**：根据屏幕尺寸自动调整列数和间距
- **保持长宽比**：所有媒体项保持1:1的长宽比，避免变形
- **等比缩放**：根据视图尺寸进行等比缩放，确保内容完整显示

### 📱 设备适配
- **PC端**：280px最小宽度，16px间距，悬停效果
- **平板端**：240px最小宽度，12px间距，优化触摸体验
- **移动端**：2列固定布局，8px间距，触摸优化

### 🎨 视觉效果
- **平滑动画**：淡入、缩放、悬停等多种过渡动画
- **加载状态**：优雅的骨架屏加载效果
- **错误处理**：友好的错误状态显示
- **空状态**：美观的空数据提示

### 👆 交互体验
- **触摸手势**：支持触摸屏设备的手势操作
- **防误触**：智能识别点击和滑动操作
- **快速响应**：防抖处理，优化性能

### ⚡ 性能优化
- **懒加载**：图片按需加载，减少初始加载时间
- **内存管理**：智能的图片状态管理
- **渲染优化**：使用React.memo和useMemo优化重渲染

## 响应式断点

```typescript
const breakpoints = {
  xs: 480,   // 小屏移动设备
  sm: 768,   // 移动设备
  md: 1024,  // 平板设备
  lg: 1200,  // 桌面设备
  xl: 1600,  // 大屏设备
}
```

## 布局规则

### 桌面端 (≥1024px)
- 网格列数：`repeat(auto-fill, minmax(280px, 1fr))`
- 间距：16px
- 悬停效果：启用
- 操作按钮：36px

### 平板端 (768px - 1023px)
- 网格列数：`repeat(auto-fill, minmax(240px, 1fr))`
- 间距：12px
- 悬停效果：部分启用
- 操作按钮：36px

### 移动端 (<768px)
- 网格列数：`repeat(2, 1fr)`
- 间距：8px
- 悬停效果：禁用
- 操作按钮：32px

## 使用方法

```tsx
import ResponsiveMediaGallery from './ResponsiveMediaGallery';

const MyComponent = () => {
  const handlePreview = (file: MediaFile) => {
    // 处理预览逻辑
  };

  const handleDelete = (fileId: string) => {
    // 处理删除逻辑
  };

  return (
    <ResponsiveMediaGallery
      mediaFiles={mediaFiles}
      onPreview={handlePreview}
      onDelete={handleDelete}
      loading={false}
    />
  );
};
```

## Props 接口

```typescript
interface ResponsiveMediaGalleryProps {
  mediaFiles: MediaFile[];           // 媒体文件数组
  onPreview: (file: MediaFile) => void;  // 预览回调
  onDelete: (fileId: string) => void;    // 删除回调
  loading?: boolean;                     // 加载状态
}
```

## 技术实现

### 响应式检测
使用自定义Hook `useResponsive` 实时监测屏幕尺寸变化：

```typescript
const responsive = useResponsive();
const { isMobile, isTablet, isDesktop } = responsive;
```

### 触摸设备检测
使用 `useTouchDevice` Hook检测触摸设备：

```typescript
const isTouchDevice = useTouchDevice();
```

### 性能优化策略

1. **图片状态管理**
   ```typescript
   const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
   const [errorImages, setErrorImages] = useState<Set<string>>(new Set());
   ```

2. **防抖处理**
   ```typescript
   const debouncedUpdateSize = useCallback(
     debounce(updateSize, 150),
     [updateSize]
   );
   ```

3. **内存优化**
   ```typescript
   const validMediaFiles = useMemo(() => {
     return mediaFiles.filter(file => file && file.id && file.fileUrl);
   }, [mediaFiles]);
   ```

## 动画效果

### 入场动画
```css
const scaleIn = keyframes`
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
`;
```

### 悬停效果
```css
&:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}
```

### 加载动画
```css
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;
```

## 兼容性

- **现代浏览器**：Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **移动浏览器**：iOS Safari 12+, Chrome Mobile 60+
- **触摸支持**：支持所有触摸屏设备
- **响应式**：支持所有屏幕尺寸

## 最佳实践

1. **图片优化**：建议使用WebP格式，提供多种尺寸
2. **懒加载**：对于大量图片，建议实现虚拟滚动
3. **缓存策略**：合理设置图片缓存策略
4. **错误处理**：提供友好的错误提示和重试机制

## 扩展功能

- 支持拖拽排序
- 支持批量操作
- 支持全屏预览
- 支持键盘导航
- 支持无障碍访问

## 更新日志

### v1.0.0
- 初始版本发布
- 支持响应式布局
- 支持触摸手势
- 支持加载和错误状态
- 性能优化