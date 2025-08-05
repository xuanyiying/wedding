import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, theme, Breadcrumb } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  CalendarOutlined,
  PictureOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  LockOutlined,
  ContactsOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout, restoreAuth } from '../store/slices/authSlice';
import { useLogoutMutation } from '../store/api/authApi';

const { Header, Sider, Content } = Layout;

const StyledLayout = styled(Layout)`
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
`;

const StyledSider = styled(Sider)`
  .ant-layout-sider-children {
    display: flex;
    flex-direction: column;
  }
`;

const Logo = styled.div`
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--admin-logo-bg);
  margin: 16px;
  border-radius: var(--admin-border-radius);
  color: var(--admin-text-inverse);
  font-size: 20px;
  font-weight: bold;
  transition: all 0.3s;
  
  &.collapsed {
    margin: 16px 8px;
  }
`;

const StyledHeader = styled(Header)`
  background: var(--admin-bg-container);
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--admin-shadow-sm);
  position: sticky;
  top: 0;
  z-index: 10;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const StyledContent = styled(Content)`
  margin: 0;
  padding: 24px;
  background: var(--admin-bg-container);
  min-height: calc(100vh - 64px);
  overflow-x: auto;
  width: 100%;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: var(--admin-bg-layout);
  }
  
  .username {
    font-weight: 500;
  }
`;

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [logoutMutation] = useLogoutMutation();

  // 恢复认证状态
  useEffect(() => {
    dispatch(restoreAuth());
  }, [dispatch]);

  // 检查登录状态
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, navigate]);

  // 根据用户角色过滤菜单项
  const getMenuItems = () => {
    const allMenuItems = [
      {
        key: '/admin/dashboard',
        icon: <DashboardOutlined />,
        label: '仪表盘',
        roles: ['super_admin', 'admin'], // 仅管理员可见
      },
      {
        key: '/admin/profile',
        icon: <UserOutlined />,
        label: '个人资料',
        roles: ['super_admin', 'admin', 'user'], // 所有用户可见
      },
      {
        key: '/admin/users',
        icon: <UserOutlined />,
        label: '用户管理',
        roles: ['super_admin', 'admin'], // 仅管理员可见
      },
      {
        key: '/admin/team-manage',
        icon: <TeamOutlined />,
        label: '团队管理',
        roles: ['super_admin', 'admin'], // 仅管理员可见
      },
      {
        key: '/admin/schedules',
        icon: <CalendarOutlined />,
        label: '档期管理',
        roles: ['super_admin', 'admin', 'user'], // 所有用户可见
      },
      {
        key: '/admin/works',
        icon: <PictureOutlined />,
        label: '作品管理',
        roles: ['super_admin', 'admin', 'user'], // 所有用户可见
      },
      {
        key: '/admin/contacts',
        icon: <ContactsOutlined />,
        label: '客户管理',
        roles: ['super_admin', 'admin'], // 仅管理员可见
      },
      {
        key: '/admin/settings',
        icon: <SettingOutlined />,
        label: '系统设置',
        roles: ['super_admin', 'admin'], // 仅管理员可见
      },
    ];

    // 根据用户角色过滤菜单项
    return allMenuItems.filter(item => 
      item.roles.includes(user?.role || 'user')
    ).map(({ roles, ...item }) => item); // 移除roles属性
  };

  const menuItems = getMenuItems();

  // 面包屑配置
  const getBreadcrumbItems = () => {
    const pathMap: Record<string, string> = {
      '/admin': '管理后台',
      '/admin/dashboard': '仪表盘',
      '/admin/profile': '个人资料',
      '/admin/users': '用户管理',
      '/admin/team': '团队成员',
      '/admin/team-manage': '团队管理',
      '/admin/schedules': '档期管理',
      '/admin/works': '作品管理',
      '/admin/contacts': '联系人管理',
      '/admin/settings': '系统设置',
    };

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbItems = [];
    let currentPath = '';

    for (const segment of pathSegments) {
      currentPath += `/${segment}`;
      const title = pathMap[currentPath];
      if (title) {
        breadcrumbItems.push({
          title,
          key: currentPath,
        });
      }
    }

    return breadcrumbItems;
  };

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  // 处理登出
  const handleLogout = async () => {
    try {
      // 调用登出API
      await logoutMutation().unwrap();
    } catch (error) {
      // 即使API调用失败，也要清除本地状态
      console.error('Logout API failed:', error);
    } finally {
      // 清除Redux状态和localStorage
      dispatch(logout());
      navigate('/admin/login');
    }
  };

  // 处理用户菜单点击
  const handleUserMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'profile':
        navigate('/admin/profile');
        break;
      case 'change-password':
        navigate('/admin/change-password');
        break;
      case 'logout':
        handleLogout();
        break;
      default:
        break;
    }
  };

  // 用户下拉菜单
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'change-password',
      icon: <LockOutlined />,
      label: '修改密码',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];


  return (
    <StyledLayout>
      <StyledSider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={256}
      >
        <Logo className={collapsed ? 'collapsed' : ''}>
          {collapsed ? 'LH' : '婚礼主持俱乐部'}
        </Logo>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ flex: 1, borderRight: 0 }}
        />
      </StyledSider>
      
      <Layout>
        <StyledHeader style={{ background: colorBgContainer }}>
          <HeaderLeft>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 64,
                height: 64,
              }}
            />
            
            <Breadcrumb items={getBreadcrumbItems()} />
          </HeaderLeft>
          
          <HeaderRight>
            <Button
              type="text"
              icon={<BellOutlined />}
              style={{ fontSize: '16px' }}
            />
            
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              placement="bottomRight"
              arrow
            >
              <UserInfo>
                <Avatar
                  size="small"
                  icon={<UserOutlined />}
                  style={{ backgroundColor: 'var(--admin-primary-color)' }}
                  src={user?.avatarUrl}
                >
                  {user?.username?.charAt(0).toUpperCase()}
                </Avatar>
                <span className="username">{user?.username || '用户'}</span>
              </UserInfo>
            </Dropdown>
          </HeaderRight>
        </StyledHeader>
        
        <StyledContent>
          <Outlet />
        </StyledContent>
      </Layout>
    </StyledLayout>
  );
};

export default AdminLayout;