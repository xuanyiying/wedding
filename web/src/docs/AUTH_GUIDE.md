# 认证状态管理指南

## 概述

本项目已重构认证状态管理系统，统一了token和用户信息的存储方式，解决了全局状态不一致的问题。

## 核心组件

### 1. AuthStorage 类 (`utils/auth.ts`)

统一的认证数据存储管理类，提供以下功能：

- **Token管理**：`getAccessToken()`, `setAccessToken()`, `getRefreshToken()`, `setRefreshToken()`
- **用户信息管理**：`getUser()`, `setUser()`
- **批量操作**：`setAuthData()`, `getAuthData()`, `clearAll()`
- **状态检查**：`hasValidAuth()`, `isTokenExpiringSoon()`

### 2. AuthChecker 类 (`utils/auth.ts`)

认证状态检查工具类：

- `isLoggedIn()`：检查用户是否已登录
- `hasPermission(permission)`：检查用户权限
- `isAdmin()`：检查是否为管理员

### 3. useAuthInit Hook (`hooks/useAuthInit.ts`)

应用启动时的认证状态初始化Hook：

- 自动恢复认证状态
- 清理无效数据
- 可选的token过期监控

## 使用方法

### 获取认证信息

**推荐方式（使用Redux状态）：**
```typescript
import { useAppSelector } from '../store/hooks';

const MyComponent = () => {
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const token = useAppSelector((state) => state.auth.token);
  
  // 使用认证信息
};
```

**备用方式（直接从存储获取）：**
```typescript
import { AuthStorage, isLoggedIn } from '../utils/auth';

// 获取用户信息
const user = AuthStorage.getUser();
const token = AuthStorage.getAccessToken();

// 检查登录状态
if (isLoggedIn()) {
  // 用户已登录
}
```

### 设置认证信息

**通过Redux Action（推荐）：**
```typescript
import { useAppDispatch } from '../store/hooks';
import { loginSuccess } from '../store/slices/authSlice';

const dispatch = useAppDispatch();

// 登录成功后
dispatch(loginSuccess({
  user: userData,
  accessToken: token,
  refreshToken: refreshToken
}));
```

### 清除认证信息

**通过Redux Action（推荐）：**
```typescript
import { logout } from '../store/slices/authSlice';

dispatch(logout());
```

**直接清除（特殊情况）：**
```typescript
import { AuthStorage } from '../utils/auth';

AuthStorage.clearAll();
```

## 最佳实践

### 1. 统一使用Redux状态

- 优先使用 `useAppSelector` 获取认证状态
- 通过 Redux actions 更新认证信息
- 避免直接操作 localStorage

### 2. 组件中的认证检查

```typescript
import { useAppSelector } from '../store/hooks';
import { Navigate } from 'react-router-dom';

const ProtectedComponent = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <div>受保护的内容</div>;
};
```

### 3. API请求中的token处理

项目已配置自动token注入：

- RTK Query：自动从Redux状态获取token
- Axios请求：自动从AuthStorage获取token
- 401错误：自动清除认证信息并跳转登录

### 4. 应用初始化

在 `App.tsx` 中已集成 `useAuthInit` Hook，无需额外配置。

## 迁移指南

### 替换直接的localStorage操作

**旧代码：**
```typescript
// ❌ 不推荐
const user = JSON.parse(localStorage.getItem('user') || '{}');
const token = localStorage.getItem('accessToken');
localStorage.setItem('user', JSON.stringify(userData));
```

**新代码：**
```typescript
// ✅ 推荐
import { useAppSelector } from '../store/hooks';

const user = useAppSelector((state) => state.auth.user);
const token = useAppSelector((state) => state.auth.token);

// 或者在非组件中
import { AuthStorage } from '../utils/auth';
const user = AuthStorage.getUser();
const token = AuthStorage.getAccessToken();
```

### 统一错误处理

认证相关的错误处理已统一：

- 401错误自动清除认证信息
- 自动跳转到登录页面
- 统一的错误提示

## 注意事项

1. **避免混用**：不要同时使用Redux状态和直接localStorage操作
2. **状态同步**：AuthStorage会自动与Redux状态保持同步
3. **错误处理**：所有localStorage操作都包含错误处理
4. **类型安全**：所有方法都提供完整的TypeScript类型支持

## 故障排除

### 认证状态丢失

1. 检查localStorage中是否有有效数据
2. 确认Redux状态是否正确初始化
3. 查看控制台是否有解析错误

### Token自动刷新失败

1. 检查refresh token是否有效
2. 确认API端点配置正确
3. 查看网络请求日志

### 权限检查异常

1. 确认用户信息完整
2. 检查角色字段是否正确
3. 验证权限检查逻辑