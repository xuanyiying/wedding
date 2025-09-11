import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Avatar,
  Popconfirm,
  message,
  Row,
  Col,
  Tooltip
} from 'antd';


import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  SearchOutlined,
  EyeOutlined,
  PhoneOutlined,
  MailOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import styled from 'styled-components';
import type { User } from '../../types';
import { UserRole, UserStatus } from '../../types';
import { userService } from '../../services';
import { useTheme } from '../../hooks/useTheme';
import { PageHeader, StatCard, ContentCard } from '../../components/admin/common';

const { Option } = Select;



const SearchBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    gap: 8px;
    margin-bottom: 8px;
  }
  
  .ant-input {
    width: 200px;
    
    @media (max-width: 768px) {
      width: 150px;
    }
  }
  
  .ant-select {
    width: 150px;
    
    @media (max-width: 768px) {
      width: 120px;
    }
  }
`;

const UserAvatar = styled(Avatar)`
  margin-right: 8px;
`;

const PageContainer = styled.div`
  background: var(--admin-bg-layout);
  min-height: 100vh;
  padding: 16px;
  
  @media (max-width: 768px) {
    padding: 8px;
  }
  
  .ant-typography-title {
    color: var(--admin-text-primary);
  }
  
  .ant-typography {
    color: var(--admin-text-secondary);
  }
`;


interface UserFormData {
  username: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  realName: string;
  description?: string;
  password?: string;
}

// 扩展User类型以包含前端特有的字段
interface ExtendedUser extends User {
  joinDate: string;
  lastLogin: string;
  loginCount: number;
  description?: string;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<ExtendedUser | null>(null);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [form] = Form.useForm();
  const [usernameError, setUsernameError] = useState<string>('');

  // 转换User数据为ExtendedUser格式
  const transformUserData = (user: User): ExtendedUser => {
    return {
      ...user,
      joinDate: dayjs(user.createdAt).format('YYYY-MM-DD'),
      lastLogin: user.lastLoginAt ? dayjs(user.lastLoginAt).format('YYYY-MM-DD HH:mm:ss') : '-',
      loginCount: 0, // 这个字段需要后端提供
      description: user.bio || ''
    };
  };

  // 加载数据
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await userService.getUsers({
        search: searchText || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined
      });
      
      if (response && response.data) {
        const transformedUsers = response.data.users.map(transformUserData);
        setUsers(transformedUsers);
      } else {
        message.error('获取用户列表失败');
      }
    } catch (error) {
      message.error('加载用户数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 过滤用户
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchText || 
      user.username.toLowerCase().includes(searchText.toLowerCase()) ||
      user.realName?.toLowerCase().includes(searchText.toLowerCase()) ||
      user.email.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus = !statusFilter || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // 初始化admin主题
  const { initTheme } = useTheme();
  
  useEffect(() => {
    initTheme('admin');
  }, [initTheme]);

  // 角色标签
  const getRoleTag = (role: UserRole) => {
    const roleMap = {
      [UserRole.ADMIN]: { color: 'var(--admin-error-color)', text: '管理员' },
      [UserRole.USER]: { color: 'var(--admin-primary-color)', text: '用户' },
      [UserRole.SUPER_ADMIN]: { color: 'var(--admin-success-color)', text: '超级管理员' },
    };
    
    const config = roleMap[role];
    if (!config) {
      return <Tag style={{ color: 'var(--admin-text-tertiary)', borderColor: 'var(--admin-border-color)' }}>未知角色</Tag>;
    }
    return <Tag style={{ color: config.color, borderColor: config.color }}>{config.text}</Tag>;
  };

  // 状态标签
  const getStatusTag = (status: UserStatus) => {
    const statusMap = {
      [UserStatus.ACTIVE]: { color: 'var(--admin-success-color)', text: '正常' },
      [UserStatus.INACTIVE]: { color: 'var(--admin-warning-color)', text: '未激活' },
      [UserStatus.SUSPENDED]: { color: 'var(--admin-error-color)', text: '已暂停' },
      [UserStatus.DELETED]: { color: 'var(--admin-error-color)', text: '已删除' }
    };
    
    const config = statusMap[status];
    if (!config) {
      return <Tag style={{ color: 'var(--admin-text-tertiary)', borderColor: 'var(--admin-border-color)' }}>未知状态</Tag>;
    }
    return <Tag style={{ color: config.color, borderColor: config.color }}>{config.text}</Tag>;
  };

  // 打开添加/编辑模态框
  const openModal = (user?: ExtendedUser) => {
    setEditingUser(user || null);
    setModalVisible(true);
    setUsernameError(''); // 清除之前的错误状态
    
    if (user) {
      form.setFieldsValue({
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        realName: user.realName,
        description: user.description
      });
    } else {
      form.resetFields();
    }
  };

  // 保存用户
  const handleSave = async (values: UserFormData) => {
    console.log('🚀 [UsersPage] 开始保存用户操作');

    try {
      setLoading(true);
      console.log('📝 [UsersPage] 表单数据:', values);
      console.log('✏️ [UsersPage] 编辑模式:', !!editingUser?.id, editingUser?.id ? `用户ID: ${editingUser.id}` : '新建用户');
      
      if (editingUser?.id) {
        // 编辑用户
        const updateData = {
          username: values.username,
          email: values.email,
          phone: values.phone,
          role: values.role as UserRole,
          status: values.status as UserStatus,
          realName: values.realName,
          bio: values.description,
        };
        console.log('📤 [UsersPage] 发送更新用户请求:', updateData);
        
        const response = await userService.updateUser(editingUser.id, updateData);
        console.log('📥 [UsersPage] 更新用户响应:', response);
        
        if (response.success && response.data) {
          const updatedUser = transformUserData(response.data);
          console.log('✅ [UsersPage] 用户更新成功，转换后数据:', updatedUser);
          setUsers(prev => prev.map(user => 
            user.id === editingUser.id ? updatedUser : user
          ));
          message.success('用户信息更新成功');
        } else {
          console.error('❌ [UsersPage] 用户更新失败:', response.message || '未知错误');
          message.error(response.message || '更新用户失败');
        }
      } else {
        // 添加用户
        const createData = {
          username: values.username,
          email: values.email,
          phone: values.phone,
          role: values.role as UserRole,
          status: values.status as UserStatus,
          realName: values.realName,
          bio: values.description,
          password: values.password,
        };
        console.log('📤 [UsersPage] 发送创建用户请求:', { ...createData, password: '***' }); // 隐藏密码
        
        const response = await userService.createUser(createData);
        console.log('📥 [UsersPage] 创建用户响应:', response);
        
        if (response.success && response.data) {
          const newUser = transformUserData(response.data);
          console.log('✅ [UsersPage] 用户创建成功，转换后数据:', newUser);
          setUsers(prev => [newUser, ...prev]);
          message.success('用户添加成功');
        } else {
          console.error('❌ [UsersPage] 用户创建失败:', response.message || '未知错误');
          message.error(response.message || '添加用户失败');
        }
      }
      
      console.log('🎉 [UsersPage] 用户保存操作完成，关闭模态框');
      setModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      console.error('💥 [UsersPage] 用户保存操作异常:', error);
      console.error('📊 [UsersPage] 错误详情:', {
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
        formValues: values,
        editingUserId: editingUser?.id
      });
      
      // 处理用户名验证错误
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.message || error.response.data?.error;
        if (errorMessage && errorMessage.includes('用户名只能包含字母和数字')) {
          setUsernameError(errorMessage);
          // 聚焦到用户名输入框
          form.setFields([{
            name: 'username',
            errors: [errorMessage]
          }]);
          return; // 不显示通用错误消息
        }
      }
      
      message.error('操作失败，请重试');
    } finally {
      setLoading(false);
      console.log('🏁 [UsersPage] 用户保存操作结束，loading状态已重置');
    }
  };

  // 删除用户
  const handleDelete = async (userId: string) => {
    try {
      const response = await userService.deleteUser(userId);
      
      if (response.success) {
        setUsers(prev => prev.filter(user => user.id !== userId));
        message.success('用户删除成功');
      } else {
        message.error(response.message || '删除用户失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败，请重试');
    }
  };

  // 切换用户状态
  const toggleUserStatus = async (userId: string, currentStatus: UserStatus) => {
    try {
      const newStatus = currentStatus === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;
      
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, status: newStatus }
          : user
      ));
      
      message.success(`用户状态已${newStatus === UserStatus.ACTIVE ? '启用' : '禁用'}`);
    } catch (error) {
      message.error('状态切换失败');
    }
  };

  // 表格列配置
  const columns: ColumnsType<ExtendedUser> = [
    {
      title: '用户信息',
      key: 'userInfo',
      fixed: 'left' as const,
      width: 150,
      render: (_, record) => (
        <Space>
          <UserAvatar 
            src={record.avatarUrl} 
            icon={<UserOutlined />}
            style={{ backgroundColor: 'var(--admin-primary-color)' }}
          >
            {record.realName?.charAt(0) || record.username.charAt(0)}
          </UserAvatar>
          <div>
            <div style={{ fontWeight: 500, color: 'var(--admin-text-primary)' }}>{record.realName || record.username}</div>
            <div style={{ fontSize: '12px', color: 'var(--admin-text-tertiary)' }}>@{record.username}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '联系方式',
      key: 'contact',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ marginBottom: 4, color: 'var(--admin-text-primary)' }}>
            <MailOutlined style={{ marginRight: 4, color: 'var(--admin-primary-color)' }} />
            {record.email}
          </div>
          <div style={{ color: 'var(--admin-text-primary)' }}>
            <PhoneOutlined style={{ marginRight: 4, color: 'var(--admin-success-color)' }} />
            {record.phone}
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: UserRole) => getRoleTag(role),
      filters: [
        { text: '管理员', value: UserRole.ADMIN },
        { text: '用户', value: UserRole.USER },
      ],
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: UserStatus) => getStatusTag(status),
      filters: [
        { text: '正常', value: UserStatus.ACTIVE },
        { text: '未激活', value: UserStatus.INACTIVE },
        { text: '已暂停', value: UserStatus.SUSPENDED },
        { text: '已删除', value: UserStatus.DELETED },
      ],
    },
    {
      title: '加入时间',
      dataIndex: 'joinDate',
      key: 'joinDate',
      width: 120,
      sorter: (a, b) => dayjs(a.joinDate).unix() - dayjs(b.joinDate).unix(),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      width: 150,
      render: (lastLogin: string) => (
        <Tooltip title={lastLogin}>
          {lastLogin === '-' ? '从未登录' : dayjs(lastLogin).format('MM-DD HH:mm')}
        </Tooltip>
      ),
    },
    {
      title: '登录次数',
      dataIndex: 'loginCount',
      key: 'loginCount',
      width: 100,
      sorter: (a, b) => a.loginCount - b.loginCount,
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => openModal(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => openModal(record)}
            />
          </Tooltip>
          <Tooltip title={record.status === UserStatus.ACTIVE ? '禁用' : '启用'}>
            <Switch
              size="small"
              checked={record.status === UserStatus.ACTIVE}
              onChange={() => toggleUserStatus(record.id, record.status)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 统计数据
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === UserStatus.ACTIVE).length,
    users: users.filter(u => u.role === UserRole.USER).length,
    newThisMonth: users.filter(u => dayjs(u.joinDate).isAfter(dayjs().subtract(1, 'month'))).length
  };

  return (
    <PageContainer>
      <PageHeader 
        title="用户管理" 
        subtitle="管理系统用户、主持人和客户信息" 
      />
      
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <StatCard 
            title="总用户数" 
            value={stats.total} 
            prefix={<UserOutlined />} 
          />
        </Col>
        <Col xs={24} sm={6}>
          <StatCard 
            title="活跃用户" 
            value={stats.active} 
            valueStyle={{ color: "var(--admin-success-color)" }} 
          />
        </Col>
        <Col xs={24} sm={6}>
          <StatCard 
            title="用户数" 
            value={stats.users} 
            valueStyle={{ color: "var(--admin-primary-color)" }} 
          />
        </Col>
        <Col xs={24} sm={6}>
          <StatCard 
            title="本月新增" 
            value={stats.newThisMonth} 
            valueStyle={{ color: "var(--admin-warning-color)" }} 
          />
        </Col>
      </Row>
      
      {/* 搜索和操作栏 */}
      <ContentCard>
        <SearchBar>
          <Input
            placeholder="搜索用户名、姓名或邮箱"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Select
            placeholder="角色筛选"
            value={roleFilter}
            onChange={setRoleFilter}
            allowClear
          >
            <Option value={UserRole.ADMIN}>管理员</Option>
            <Option value={UserRole.USER}>用户</Option>
          </Select>
          <Select
            placeholder="状态筛选"
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
          >
            <Option value={UserStatus.ACTIVE}>正常</Option>
            <Option value={UserStatus.INACTIVE}>未激活</Option>
            <Option value={UserStatus.SUSPENDED}>已暂停</Option>
            <Option value={UserStatus.DELETED}>已删除</Option>
          </Select>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => openModal()}
          >
            添加用户
          </Button>
        </SearchBar>
        
        {/* 用户表格 */}
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            total: filteredUsers.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
        />
      </ContentCard>
      
      {/* 添加/编辑用户模态框 */}
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setUsernameError(''); // 关闭模态框时清除错误状态
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 2, max: 20, message: '用户名只能包含字母和数字，长度为2-20个字符' }
                ]}
                validateStatus={usernameError ? 'error' : ''}
                help={usernameError || ''}
              >
                <Input 
                  placeholder="请输入用户名" 
                  onChange={() => setUsernameError('')} // 用户开始输入时清除错误
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="realName"
                label="真实姓名"
                rules={[{ required: true, message: '请输入真实姓名' }]}
              >
                <Input placeholder="请输入真实姓名" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="邮箱"
                rules={[
                  { required: false, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="手机号"
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
                ]}
              >
                <Input placeholder="请输入手机号" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="角色"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select placeholder="请选择角色">
                  <Option value={UserRole.ADMIN}>管理员</Option>
                  <Option value={UserRole.USER}>用户</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  <Option value={UserStatus.ACTIVE}>正常</Option>
                  <Option value={UserStatus.INACTIVE}>未激活</Option>
                  <Option value={UserStatus.SUSPENDED}>已暂停</Option>
                  <Option value={UserStatus.DELETED}>已删除</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' }
              ]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}
          
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea 
              placeholder="请输入用户描述" 
              rows={3}
              maxLength={200}
              showCount
            />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? '更新' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default UsersPage;