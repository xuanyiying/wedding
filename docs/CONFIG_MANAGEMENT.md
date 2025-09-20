# 配置管理系统

## 概述

本项目实现了一个完整的配置管理系统，支持前后端配置的统一管理和动态更新。系统采用分层架构，提供了灵活的配置存储、缓存和同步机制。

## 架构设计

### 前端架构

```
web/src/
├── contexts/
│   └── ConfigContext.tsx          # 配置上下文
├── hooks/
│   └── useConfig.ts              # 配置管理 Hook
├── services/
│   └── configService.ts          # 配置服务
├── components/admin/config/
│   ├── ThemeConfig.tsx           # 主题配置组件
│   ├── EmailConfig.tsx           # 邮件配置组件
│   ├── SiteConfig.tsx            # 网站配置组件
│   ├── HomepageConfig.tsx        # 首页配置组件
│   └── index.ts                  # 统一导出
├── pages/admin/
│   └── SettingsPage.tsx          # 重构后的设置页面
└── utils/
    └── configUtils.ts            # 配置工具函数
```

### 后端架构

```
server/src/
├── models/
│   └── SystemConfig.ts           # 配置数据模型
├── services/
│   ├── configService.ts          # 配置服务
│   └── settings.service.ts       # 设置服务（重构）
├── controllers/
│   └── settings.controller.ts    # 设置控制器
├── routes/
│   └── settings.ts              # 设置路由
└── scripts/
    └── initializeConfigs.ts      # 配置初始化脚本
```

## 核心功能

### 1. 配置分类管理

系统支持以下配置分类：

- **site**: 网站基本信息（名称、描述、Logo等）
- **theme**: 主题配置（颜色、字体、间距等）
- **seo**: SEO配置（标题、描述、关键词）
- **homepage**: 首页各区块配置
- **email**: 邮件服务配置
- **navigation**: 导航菜单配置
- **security**: 安全相关配置

### 2. 配置类型支持

- **string**: 字符串类型
- **number**: 数字类型
- **boolean**: 布尔类型
- **json**: JSON对象类型
- **text**: 长文本类型

### 3. 权限控制

- **公开配置**: 客户端可访问的配置（如主题、首页内容）
- **私有配置**: 仅管理员可访问的配置（如邮件密码、安全设置）

## 使用指南

### 前端使用

#### 1. 在组件中使用配置

```tsx
import { useConfig } from '../hooks/useConfig';

const MyComponent: React.FC = () => {
  const { config, loading, error, updateConfig } = useConfig(false); // false表示获取公开配置
  
  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;
  
  return (
    <div>
      <h1>{config.site?.name}</h1>
      <p>{config.site?.description}</p>
    </div>
  );
};
```

#### 2. 获取特定配置项

```tsx
import { useConfigValue } from '../hooks/useConfig';

const MyComponent: React.FC = () => {
  const { value: siteName, loading } = useConfigValue('site.name', '默认网站名');
  
  return <h1>{siteName}</h1>;
};
```

#### 3. 更新配置（管理员）

```tsx
const AdminComponent: React.FC = () => {
  const { updateConfig } = useConfig(true); // true表示管理员模式
  
  const handleUpdateTheme = async () => {
    await updateConfig('theme', {
      theme: {
        colors: {
          primary: '#ff0000'
        }
      }
    });
  };
  
  return <button onClick={handleUpdateTheme}>更新主题</button>;
};
```

### 后端使用

#### 1. 获取配置

```typescript
import { ConfigService } from '../services/configService';

// 获取公开配置
const publicConfig = await ConfigService.getPublicConfigs();

// 获取所有配置（管理员）
const allConfig = await ConfigService.getAllConfigs();

// 获取特定配置项
const siteName = await ConfigService.getConfigValue('site.name', '默认值');
```

#### 2. 更新配置

```typescript
// 更新配置分类
await ConfigService.updateConfigs('theme', {
  colors: {
    primary: '#ff0000'
  }
});

// 设置单个配置项
await ConfigService.setConfigValue('site.name', '新网站名', 'site', true);
```

## 配置组件

### 1. ThemeConfig 组件

负责主题相关配置：
- 颜色配置（主色、次色、背景色等）
- 字体配置
- 间距配置
- 暗色模式切换

### 2. EmailConfig 组件

负责邮件服务配置：
- SMTP服务器设置
- 邮件认证信息
- 发件人信息
- 邮件测试功能

### 3. SiteConfig 组件

负责网站基本信息配置：
- 网站名称和描述
- SEO设置
- Logo和Favicon
- 关键词配置

### 4. HomepageConfig 组件

负责首页各区块配置：
- Hero区块设置
- 团队介绍区块
- 作品展示区块
- 联系方式区块

## API 接口

### 公开接口

```
GET /api/settings/site-config
```
获取公开配置，无需认证。

### 管理员接口

```
GET /api/settings                    # 获取所有配置
PUT /api/settings/site              # 更新网站设置
PUT /api/settings/email             # 更新邮件设置
PUT /api/settings/site-config       # 更新网站配置
PUT /api/settings/homepage-sections # 更新首页配置
POST /api/settings/test-email       # 测试邮件发送
```

## 缓存机制

### 前端缓存

- 使用 Map 实现内存缓存
- 缓存时间：5分钟
- 支持手动清除缓存

### 后端缓存

- 可扩展支持 Redis 缓存
- 配置更新时自动清除相关缓存

## 初始化配置

### 运行初始化脚本

```bash
# 在服务端目录下运行
npm run init-configs
```

或者在代码中调用：

```typescript
import { ConfigService } from '../services/configService';

await ConfigService.initializeDefaultConfigs();
```

## 配置迁移

当需要添加新的配置项时：

1. 在 `ConfigService.initializeDefaultConfigs()` 中添加默认值
2. 运行初始化脚本更新数据库
3. 更新前端类型定义
4. 在相应的配置组件中添加UI

## 最佳实践

### 1. 配置命名规范

- 使用点分隔的层级结构：`category.subcategory.key`
- 使用驼峰命名法：`homepageSections.hero.backgroundImage`
- 保持命名的一致性和可读性

### 2. 类型安全

- 在 TypeScript 中定义完整的配置类型
- 使用泛型确保类型安全
- 提供默认值避免运行时错误

### 3. 性能优化

- 合理使用缓存减少API调用
- 按需加载配置组件
- 避免频繁的配置更新

### 4. 错误处理

- 提供友好的错误提示
- 实现配置验证机制
- 支持配置回滚功能

## 故障排除

### 常见问题

1. **配置更新不生效**
   - 检查缓存是否需要清除
   - 确认配置分类是否正确
   - 验证权限设置

2. **类型错误**
   - 更新 TypeScript 类型定义
   - 检查配置值的数据类型
   - 确保前后端类型一致

3. **性能问题**
   - 检查缓存配置
   - 优化配置查询逻辑
   - 减少不必要的配置更新

## 扩展开发

### 添加新的配置分类

1. 在 `SystemConfig` 模型中定义新分类
2. 在 `ConfigService` 中添加相应的处理逻辑
3. 创建对应的前端配置组件
4. 更新路由和权限设置

### 自定义配置组件

```tsx
import React from 'react';
import { useConfig } from '../../hooks/useConfig';

const CustomConfig: React.FC = () => {
  const { config, updateConfig } = useConfig(true);
  
  // 实现自定义配置逻辑
  
  return (
    <div>
      {/* 自定义配置UI */}
    </div>
  );
};

export default CustomConfig;