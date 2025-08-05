import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Result, Button } from 'antd';
import { usePermissions } from '../hooks/usePermissions';
import type { UserRole } from '../types';

/**
 * 权限包装器组件属性
 */
interface PermissionWrapperProps {
  children: React.ReactNode;
  // 权限检查选项
  permission?: string;
  permissions?: string[];
  role?: UserRole;
  roles?: UserRole[];
  requireLogin?: boolean;
  requireAllPermissions?: boolean; // 是否需要所有权限
  // 自定义检查函数
  customCheck?: () => boolean;
  // 权限不足时的处理
  fallback?: React.ReactNode;
  redirectTo?: string;
  showError?: boolean;
}

/**
 * 权限包装器组件
 * 用于包装需要权限检查的组件或页面
 */
export const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  children,
  permission,
  permissions,
  role,
  roles,
  requireLogin = false,
  requireAllPermissions = false,
  customCheck,
  fallback,
  redirectTo,
  showError = true,
}) => {
  const location = useLocation();
  const {
    isLoggedIn,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
  } = usePermissions();

  // 执行权限检查
  const checkPermissions = (): boolean => {
    // 检查登录状态
    if (requireLogin && !isLoggedIn) {
      return false;
    }

    // 自定义检查函数
    if (customCheck && !customCheck()) {
      return false;
    }

    // 检查单个权限
    if (permission && !hasPermission(permission)) {
      return false;
    }

    // 检查多个权限
    if (permissions) {
      if (requireAllPermissions) {
        if (!hasAllPermissions(permissions)) {
          return false;
        }
      } else {
        if (!hasAnyPermission(permissions)) {
          return false;
        }
      }
    }

    // 检查单个角色
    if (role && !hasRole(role)) {
      return false;
    }

    // 检查多个角色
    if (roles && !hasAnyRole(roles)) {
      return false;
    }

    return true;
  };

  const hasAccess = checkPermissions();

  // 权限检查失败的处理
  if (!hasAccess) {
    // 如果指定了重定向路径
    if (redirectTo) {
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    // 如果提供了自定义fallback
    if (fallback) {
      return <>{fallback}</>;
    }

    // 如果不显示错误页面，返回null
    if (!showError) {
      return null;
    }

    // 默认错误页面
    const getErrorContent = () => {
      if (!isLoggedIn) {
        return {
          status: 'warning' as const,
          title: '请先登录',
          subTitle: '您需要登录后才能访问此页面',
          extra: (
            <Button type="primary" onClick={() => window.location.href = '/login'}>
              去登录
            </Button>
          ),
        };
      }

      return {
        status: 'error' as const,
        title: '权限不足',
        subTitle: '抱歉，您没有权限访问此页面',
        extra: (
          <Button type="primary" onClick={() => window.history.back()}>
            返回上一页
          </Button>
        ),
      };
    };

    const errorContent = getErrorContent();

    return (
      <div style={{ padding: '50px 0', textAlign: 'center' }}>
        <Result
          status={errorContent.status}
          title={errorContent.title}
          subTitle={errorContent.subTitle}
          extra={errorContent.extra}
        />
      </div>
    );
  }

  // 权限检查通过，渲染子组件
  return <>{children}</>;
};

/**
 * 权限路由守卫高阶组件
 */
export const withPermission = (
  Component: React.ComponentType<any>,
  permissionConfig: Omit<PermissionWrapperProps, 'children'>
) => {
  return (props: any) => (
    <PermissionWrapper {...permissionConfig}>
      <Component {...props} />
    </PermissionWrapper>
  );
};

/**
 * 管理员权限包装器
 */
export const AdminWrapper: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => {
  return (
    <PermissionWrapper
      roles={['admin', 'super_admin'] as UserRole[]}
      fallback={fallback}
      requireLogin
    >
      {children}
    </PermissionWrapper>
  );
};

/**
 * 超级管理员权限包装器
 */
export const SuperAdminWrapper: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => {
  return (
    <PermissionWrapper
      role="super_admin"
      fallback={fallback}
      requireLogin
    >
      {children}
    </PermissionWrapper>
  );
};

/**
 * 登录用户权限包装器
 */
export const AuthWrapper: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => {
  return (
    <PermissionWrapper
      requireLogin
      fallback={fallback}
      redirectTo="/login"
    >
      {children}
    </PermissionWrapper>
  );
};

export default PermissionWrapper;