# 权限管理系统使用指南

本文档详细介绍了婚庆管理系统的权限管理功能，包括权限定义、角色配置、使用方法和最佳实践。

## 目录

1. [权限系统概述](#权限系统概述)
2. [角色和权限定义](#角色和权限定义)
3. [核心组件](#核心组件)
4. [使用方法](#使用方法)
5. [最佳实践](#最佳实践)
6. [示例代码](#示例代码)

## 权限系统概述

权限系统基于角色的访问控制（RBAC）模型，通过以下几个层次来管理用户权限：

- **用户（User）**：系统中的实际用户
- **角色（Role）**：用户的身份类型
- **权限（Permission）**：具体的操作权限

### 权限检查流程

1. 用户登录后，系统获取用户角色
2. 根据角色映射获取用户权限列表
3. 在需要权限检查的地方调用相应的权限检查方法
4. 根据检查结果决定是否允许访问或操作

## 角色和权限定义

### 用户角色

```typescript
export const UserRole = {
  SUPER_ADMIN: 'super_admin',  // 超级管理员
  ADMIN: 'admin',              // 管理员
  USER: 'user',                // 普通用户
  GUEST: 'guest'               // 访客
} as const;
```

### 权限定义

权限按功能模块划分：

#### 用户管理权限
- `user:view` - 查看用户
- `user:create` - 创建用户
- `user:update` - 更新用户
- `user:delete` - 删除用户

#### 档期管理权限
- `schedule:view` - 查看档期
- `schedule:create` - 创建档期
- `schedule:update` - 更新档期
- `schedule:delete` - 删除档期
- `schedule:view_all` - 查看所有用户的档期

#### 作品管理权限
- `work:view` - 查看作品
- `work:create` - 创建作品
- `work:update` - 更新作品
- `work:delete` - 删除作品
- `work:view_all` - 查看所有用户的作品

#### 预订管理权限
- `booking:view` - 查看预订
- `booking:create` - 创建预订
- `booking:update` - 更新预订
- `booking:delete` - 删除预订
- `booking:view_all` - 查看所有预订

#### 系统管理权限
- `system:config` - 系统配置
- `system:logs` - 系统日志
- `system:backup` - 系统备份

### 角色权限映射

| 角色 | 权限范围 |
|------|----------|
| **超级管理员** | 拥有所有权限 |
| **管理员** | 除系统管理外的所有权限，可查看所有用户数据 |
| **普通用户** | 只能管理自己的档期、作品和预订 |
| **访客** | 只能查看公开作品和创建预订 |

## 核心组件

### 1. AuthChecker 类

提供基础的权限检查功能：

```typescript
import { AuthChecker, PERMISSIONS } from '../utils/auth';

// 检查是否已登录
AuthChecker.isLoggedIn();

// 检查是否有特定权限
AuthChecker.hasPermission(PERMISSIONS.USER_VIEW);

// 检查是否是管理员
AuthChecker.isAdmin();

// 检查是否可以访问资源
AuthChecker.canAccessResource(userId, PERMISSIONS.SCHEDULE_UPDATE);
```

### 2. usePermissions Hook

在 React 组件中使用权限检查：

```typescript
import { usePermissions } from '../hooks/usePermissions';

const MyComponent = () => {
  const { isAdmin, can, hasPermission } = usePermissions();
  
  return (
    <div>
      {isAdmin && <AdminPanel />}
      {can.createSchedule() && <CreateButton />}
      {hasPermission(PERMISSIONS.USER_VIEW) && <UserList />}
    </div>
  );
};
```

### 3. PermissionWrapper 组件

用于包装需要权限检查的组件：

```typescript
import { PermissionWrapper } from '../components/PermissionWrapper';

<PermissionWrapper permission={PERMISSIONS.USER_VIEW}>
  <UserManagement />
</PermissionWrapper>
```

### 4. PermissionUtils 工具类

提供常用的权限检查工具方法：

```typescript
import { PermissionUtils } from '../utils/permissionUtils';

// 检查是否可以管理用户
PermissionUtils.canManageUsers();

// 获取可访问的菜单
PermissionUtils.getAccessibleMenus();

// 获取默认首页路径
PermissionUtils.getDefaultHomePath();
```

## 使用方法

### 1. 在组件中进行权限检查

#### 使用 Hook

```typescript
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../utils/auth';

const ScheduleList = () => {
  const { hasPermission, can, canAccessResource } = usePermissions();
  
  const handleEdit = (schedule) => {
    if (canAccessResource(schedule.userId, PERMISSIONS.SCHEDULE_UPDATE)) {
      // 执行编辑操作
    }
  };
  
  return (
    <div>
      {can.createSchedule() && (
        <Button onClick={handleCreate}>创建档期</Button>
      )}
      
      {schedules.map(schedule => (
        <div key={schedule.id}>
          <span>{schedule.title}</span>
          {canAccessResource(schedule.userId, PERMISSIONS.SCHEDULE_UPDATE) && (
            <Button onClick={() => handleEdit(schedule)}>编辑</Button>
          )}
        </div>
      ))}
    </div>
  );
};
```

#### 使用权限包装器

```typescript
import { PermissionWrapper, AdminWrapper } from '../components/PermissionWrapper';
import { PERMISSIONS } from '../utils/auth';

const Dashboard = () => {
  return (
    <div>
      <h1>仪表盘</h1>
      
      {/* 只有管理员可以看到用户管理 */}
      <AdminWrapper>
        <UserManagementCard />
      </AdminWrapper>
      
      {/* 需要特定权限才能看到 */}
      <PermissionWrapper permission={PERMISSIONS.SCHEDULE_VIEW_ALL}>
        <AllSchedulesCard />
      </PermissionWrapper>
      
      {/* 需要多个权限中的任意一个 */}
      <PermissionWrapper 
        permissions={[PERMISSIONS.WORK_CREATE, PERMISSIONS.WORK_UPDATE]}
      >
        <WorkManagementCard />
      </PermissionWrapper>
    </div>
  );
};
```

### 2. 在路由中进行权限保护

```typescript
import { PermissionWrapper } from '../components/PermissionWrapper';
import { PERMISSIONS } from '../utils/auth';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      
      {/* 需要登录的路由 */}
      <Route 
        path="/dashboard" 
        element={
          <PermissionWrapper requireLogin redirectTo="/login">
            <Dashboard />
          </PermissionWrapper>
        } 
      />
      
      {/* 需要管理员权限的路由 */}
      <Route 
        path="/admin/*" 
        element={
          <PermissionWrapper 
            roles={['admin', 'super_admin']}
            redirectTo="/403"
          >
            <AdminRoutes />
          </PermissionWrapper>
        } 
      />
      
      {/* 需要特定权限的路由 */}
      <Route 
        path="/users" 
        element={
          <PermissionWrapper 
            permission={PERMISSIONS.USER_VIEW}
            showError={true}
          >
            <UserManagement />
          </PermissionWrapper>
        } 
      />
    </Routes>
  );
};
```

### 3. 在菜单中根据权限显示项目

```typescript
import { usePermissions } from '../hooks/usePermissions';
import { PermissionUtils } from '../utils/permissionUtils';

const Sidebar = () => {
  const { can, isAdmin } = usePermissions();
  const accessibleMenus = PermissionUtils.getAccessibleMenus();
  
  const menuItems = [
    {
      key: 'dashboard',
      label: '仪表盘',
      icon: <DashboardOutlined />,
      show: accessibleMenus.includes('dashboard'),
    },
    {
      key: 'schedules',
      label: '档期管理',
      icon: <CalendarOutlined />,
      show: can.viewSchedules(),
    },
    {
      key: 'works',
      label: '作品管理',
      icon: <PictureOutlined />,
      show: can.viewWorks(),
    },
    {
      key: 'users',
      label: '用户管理',
      icon: <UserOutlined />,
      show: isAdmin,
    },
  ];
  
  return (
    <Menu>
      {menuItems
        .filter(item => item.show)
        .map(item => (
          <Menu.Item key={item.key} icon={item.icon}>
            {item.label}
          </Menu.Item>
        ))
      }
    </Menu>
  );
};
```

### 4. 在 API 请求中进行权限检查

```typescript
import { AuthChecker, PERMISSIONS } from '../utils/auth';

const scheduleService = {
  async createSchedule(data) {
    // 在发送请求前检查权限
    if (!AuthChecker.hasPermission(PERMISSIONS.SCHEDULE_CREATE)) {
      throw new Error('没有创建档期的权限');
    }
    
    return api.post('/schedules', data);
  },
  
  async updateSchedule(id, data, ownerId) {
    // 检查是否可以编辑指定用户的档期
    if (!AuthChecker.canAccessResource(ownerId, PERMISSIONS.SCHEDULE_UPDATE)) {
      throw new Error('没有编辑此档期的权限');
    }
    
    return api.put(`/schedules/${id}`, data);
  },
};
```

## 最佳实践

### 1. 权限检查原则

- **最小权限原则**：用户只应该拥有完成其工作所需的最小权限
- **前后端双重检查**：前端权限检查用于用户体验，后端权限检查用于安全保障
- **资源所有权检查**：用户通常只能操作自己的资源，除非有特殊权限

### 2. 代码组织

- **集中管理权限定义**：所有权限常量定义在一个地方
- **复用权限检查逻辑**：使用工具类和 Hook 避免重复代码
- **清晰的权限命名**：使用描述性的权限名称，如 `user:view` 而不是 `p1`

### 3. 用户体验

- **优雅降级**：权限不足时显示友好的提示信息
- **隐藏不可用功能**：不显示用户无权访问的按钮和菜单
- **提供权限说明**：在适当的地方说明需要什么权限

### 4. 性能优化

- **缓存权限检查结果**：在组件中使用 `useMemo` 缓存权限检查结果
- **批量权限检查**：一次检查多个权限而不是逐个检查
- **避免过度检查**：不要在每次渲染时都进行权限检查

## 示例代码

### 完整的权限保护组件示例

```typescript
import React from 'react';
import { Card, Button, Space, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { usePermissions } from '../hooks/usePermissions';
import { PermissionWrapper } from '../components/PermissionWrapper';
import { PERMISSIONS } from '../utils/auth';

interface ScheduleCardProps {
  schedule: {
    id: number;
    title: string;
    userId: number;
    // ... 其他属性
  };
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({ 
  schedule, 
  onEdit, 
  onDelete 
}) => {
  const { canAccessResource } = usePermissions();
  
  const canEdit = canAccessResource(schedule.userId, PERMISSIONS.SCHEDULE_UPDATE);
  const canDelete = canAccessResource(schedule.userId, PERMISSIONS.SCHEDULE_DELETE);
  
  return (
    <Card
      title={schedule.title}
      extra={
        <Space>
          {canEdit && (
            <Button 
              type="text" 
              icon={<EditOutlined />}
              onClick={() => onEdit(schedule.id)}
            >
              编辑
            </Button>
          )}
          
          {canDelete && (
            <Popconfirm
              title="确定要删除这个档期吗？"
              onConfirm={() => onDelete(schedule.id)}
            >
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      }
    >
      {/* 档期内容 */}
    </Card>
  );
};

// 使用权限包装器保护整个组件
const ProtectedScheduleCard = (props: ScheduleCardProps) => (
  <PermissionWrapper 
    permission={PERMISSIONS.SCHEDULE_VIEW}
    fallback={<div>您没有权限查看此档期</div>}
  >
    <ScheduleCard {...props} />
  </PermissionWrapper>
);

export default ProtectedScheduleCard;
```

### 动态菜单示例

```typescript
import React from 'react';
import { Menu } from 'antd';
import { 
  DashboardOutlined, 
  CalendarOutlined, 
  PictureOutlined,
  UserOutlined,
  SettingOutlined 
} from '@ant-design/icons';
import { usePermissions } from '../hooks/usePermissions';
import { PermissionUtils } from '../utils/permissionUtils';

const DynamicMenu: React.FC = () => {
  const { can, isAdmin, isSuperAdmin } = usePermissions();
  
  const menuItems = React.useMemo(() => {
    const items = [];
    
    // 仪表盘 - 所有登录用户
    items.push({
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    });
    
    // 档期管理
    if (can.viewSchedules()) {
      items.push({
        key: 'schedules',
        icon: <CalendarOutlined />,
        label: '档期管理',
      });
    }
    
    // 作品管理
    if (can.viewWorks()) {
      items.push({
        key: 'works',
        icon: <PictureOutlined />,
        label: '作品管理',
      });
    }
    
    // 用户管理 - 仅管理员
    if (isAdmin) {
      items.push({
        key: 'users',
        icon: <UserOutlined />,
        label: '用户管理',
      });
    }
    
    // 系统设置 - 仅超级管理员
    if (isSuperAdmin) {
      items.push({
        key: 'system',
        icon: <SettingOutlined />,
        label: '系统设置',
      });
    }
    
    return items;
  }, [can, isAdmin, isSuperAdmin]);
  
  return <Menu items={menuItems} />;
};

export default DynamicMenu;
```

通过以上权限管理系统，您可以灵活地控制用户对系统各个功能的访问权限，确保系统的安全性和用户体验。