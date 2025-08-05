import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Space,
  Row,
  Col,
  Avatar,
  Tag,
  Tooltip,
  InputNumber,
  Checkbox,
  List,
  Empty,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  TeamOutlined,
  UserAddOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  UsergroupDeleteOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import type {
  Team,
  TeamStatus,
  User,
} from '../../types';
import {
  TeamStatus as TeamStatusEnum,
  TeamMemberRole as TeamMemberRoleEnum,
} from '../../types';
import { teamService } from '../../services';
import { PageHeader, ContentCard } from '../../components/admin/common';
import dayjs from 'dayjs';
import AvatarUploader from '../../components/AvatarUploader';

const { Option } = Select;
const { TextArea } = Input;


const TeamContainer = styled.div`
  padding: 24px;
`;



const SearchBar = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
`;


const TeamManagePage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<TeamStatus | undefined>();
  const [form] = Form.useForm();
  const [inviteForm] = Form.useForm();

  // 团队成员管理相关状态
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // 用户列表相关状态
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [avatarUploading, setAvatarUploading] = useState(false);

  const [userSearchText, setUserSearchText] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPagination, setUsersPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // 获取团队列表
  const fetchTeams = async () => {
    setLoading(true);
    try {
      const response = await teamService.getTeams({
        search: searchText || undefined,
        status: statusFilter,
      });
      if (response.success) {
        setTeams(response.data?.teams || []);
      }
    } catch (error) {
      message.error('获取团队列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [searchText, statusFilter]);

  // 获取可邀请的用户列表
  const fetchAvailableUsers = async (teamId: string, page = 1, search = '') => {
    setUsersLoading(true);
    try {
      const response = await teamService.getAvailableUsers(teamId, {
        page,
        limit: usersPagination.pageSize,
        search: search || undefined,
      });
      if (response.success) {
        setAvailableUsers(response.data?.users || []);
        setUsersPagination(prev => ({
          ...prev,
          current: page,
          total: response.data?.total || 0,
        }));
      }
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setUsersLoading(false);
    }
  };
  const handleAvatarChange = async (avatarUrl: string) => {
    if (!selectedTeam?.id) {
      message.error('请先选择一个团队');
      return;
    }
    setAvatarUploading(true);
    try {
      // 头像URL已通过表单字段保存，这里可以添加额外的处理逻辑
      await teamService.updateTeamAvatar(selectedTeam?.id, avatarUrl);
      console.log('团队头像更新:', avatarUrl);
      message.success('头像上传成功');
    } catch (error) {
      console.error('Failed to update team avatar:', error);
      message.error('头像上传失败');
    } finally {
      setAvatarUploading(false);
    }
  };

  // 处理用户选择
  const handleUserSelect = (userId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedUserIds(prev => [...prev, userId]);
    } else {
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
    }
  };
  // 打开模态框
  const openModal = (team?: Team) => {
    setEditingTeam(team || null);
    setModalVisible(true);
    if (team) {
      form.setFieldsValue({
        ...team,
        serviceAreas: team.serviceAreas?.join(', '),
        specialties: team.specialties?.join(', '),
      });
    } else {
      form.resetFields();
    }
  };

  // 保存团队
  const handleSave = async (values: any) => {
    try { 
      const teamData = {
        ...values,
        serviceAreas: values.serviceAreas ? values.serviceAreas.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        specialties: values.specialties ? values.specialties.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      };

      let response;
      if (editingTeam) {
        response = await teamService.updateTeam(editingTeam.id, teamData);
      } else {
        response = await teamService.createTeam(teamData);
      }

      if (response.success) {
        message.success(editingTeam ? '团队更新成功' : '团队创建成功');
        setModalVisible(false);
        form.resetFields();
        fetchTeams();
      } else {
        message.error(response.message || (editingTeam ? '团队更新失败' : '团队创建失败'));
      }
    } catch (error) {
      console.error('📊 [TeamManagePage] 错误详情:', {
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
        formValues: values,
        editingTeamId: editingTeam?.id,
        isEditing: !!editingTeam
      });
      message.error(editingTeam ? '团队更新失败' : '团队创建失败');
    }
  };

  // 删除团队
  const handleDelete = async (id: string) => {
    try {
      const response = await teamService.deleteTeam(id);
      if (response.success) {
        message.success('团队删除成功');
        fetchTeams();
      }
    } catch (error) {
      message.error('团队删除失败');
    }
  };
  const handleInviteCancel = () => {
    setInviteModalVisible(false);
    inviteForm.resetFields();
    setSelectedUserIds([]);
    setAvailableUsers([]);
    setUserSearchText('');
  };
  // 邀请成员
  const handleInvite = async (values: any) => {
    if (!selectedTeam || selectedUserIds.length === 0) {
      message.warning('请选择要邀请的用户');
      return;
    }

    try {
      const response = await teamService.inviteTeamMember({
        userIds: selectedUserIds,
        role: values.role,
        teamId: selectedTeam.id,
      });
      if (response.success) {
        message.success(`成功邀请 ${selectedUserIds.length} 位用户`);
        setInviteModalVisible(false);
        inviteForm.resetFields();
        setSelectedUserIds([]);
        setAvailableUsers([]);
        setUserSearchText('');
        fetchTeams();
      }
    } catch (error) {
      message.error('邀请发送失败');
    }
  };

  // 打开邀请模态框
  const openInviteModal = (team: Team) => {
    setSelectedTeam(team);
    setInviteModalVisible(true);
    setSelectedUserIds([]);
    setUserSearchText('');
    fetchAvailableUsers(team.id);
  };

  // 获取团队成员列表
  const fetchTeamMembers = async (teamId: string) => {
    setMembersLoading(true);
    try {
      const response = await teamService.getTeamMembers(teamId);
      if (response.success) {
        setTeamMembers(response.data?.members || []);
      }
    } catch (error) {
      message.error('获取团队成员失败');
    } finally {
      setMembersLoading(false);
    }
  };

  // 打开成员管理模态框
  const openMembersModal = (team: Team) => {
    setSelectedTeam(team);
    setMembersModalVisible(true);
    setSelectedMemberIds([]);
    fetchTeamMembers(team.id);
  };

  // 删除单个成员
  const handleDeleteMember = async (memberId: string) => {
    try {
      const response = await teamService.deleteTeamMember(memberId);
      if (response.success) {
        message.success('成员删除成功');
        if (selectedTeam) {
          fetchTeamMembers(selectedTeam.id);
          fetchTeams(); // 刷新团队列表以更新成员数量
        }
      }
    } catch (error) {
      message.error('删除成员失败');
    }
  };

  // 批量删除成员
  const handleBatchDeleteMembers = async () => {
    if (selectedMemberIds.length === 0) {
      message.warning('请选择要删除的成员');
      return;
    }

    try {
      const response = await teamService.batchDeleteMembers(selectedMemberIds);
      if (response.success) {
        message.success(`成功删除 ${selectedMemberIds.length} 位成员`);
        setSelectedMemberIds([]);
        if (selectedTeam) {
          fetchTeamMembers(selectedTeam.id);
          fetchTeams(); // 刷新团队列表以更新成员数量
        }
      }
    } catch (error) {
      message.error('批量删除成员失败');
    }
  };

  // 处理成员选择
  const handleMemberSelect = (memberId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedMemberIds(prev => [...prev, memberId]);
    } else {
      setSelectedMemberIds(prev => prev.filter(id => id !== memberId));
    }
  };

  // 获取角色中文名
  const getRoleName = (role: string) => {
    const names: Record<string, string> = {
      [TeamMemberRoleEnum.ADMIN]: '管理员',
      [TeamMemberRoleEnum.MEMBER]: '成员',
    };
    return names[role] || role;
  };

  // 获取状态标签颜色
  const getStatusColor = (status: TeamStatus) => {
    const colors: Record<TeamStatus, string> = {
      [TeamStatusEnum.ACTIVE]: 'green',
      [TeamStatusEnum.DISABLED]: 'red',
      [TeamStatusEnum.PENDING]: 'orange',
    };
    return colors[status] || 'default';
  };

  // 获取状态中文名
  const getStatusName = (status: TeamStatus) => {
    const names: Record<TeamStatus, string> = {
      [TeamStatusEnum.ACTIVE]: '正常',
      [TeamStatusEnum.DISABLED]: '禁用',
      [TeamStatusEnum.PENDING]: '待审核',
    };
    return names[status] || String(status);
  };

  // 表格列配置
  const columns = [
    {
      title: '团队信息',
      key: 'info',
      width: 400,
      render: (record: Team) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar
            size={48}
            src={record.avatar}
            icon={<TeamOutlined />}
            shape="square"
            style={{ marginRight: 8 }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{record.name}</div>
            <div style={{ color: 'var(--admin-text-secondary)', fontSize: 12, whiteSpace: 'break-word' }}>{record.description}</div>
            <div style={{ marginTop: 4 }}>
              <Tag color={getStatusColor(record.status)}>
                {getStatusName(record.status)}
              </Tag>
              {record.isVerified && (
                <Tag color="blue">已认证</Tag>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '联系方式',
      key: 'contact',
      width: 200,
      render: (record: Team) => (
        <div>
          {record.contactPhone && (
            <div style={{ marginBottom: 4 }}>
              <PhoneOutlined style={{ marginRight: 4, color: 'var(--admin-primary-color)' }} />
              {record.contactPhone}
            </div>
          )}
          {record.contactEmail && (
            <div style={{ marginBottom: 4 }}>
              <MailOutlined style={{ marginRight: 4, color: 'var(--admin-primary-color)' }} />
              {record.contactEmail}
            </div>
          )}
          {record.address && (
            <div>
              <EnvironmentOutlined style={{ marginRight: 4, color: 'var(--admin-primary-color)' }} />
              {record.address}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a: Team, b: Team) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (record: Team) => (
        <Space>
          <Tooltip title="邀请成员">
            <Button
              type="text"
              icon={<UserAddOutlined />}
              size="small"
              onClick={() => openInviteModal(record)}
            />
          </Tooltip>
          <Tooltip title="成员管理">
            <Button
              type="text"
              icon={<UsergroupDeleteOutlined />}
              size="small"
              onClick={() => openMembersModal(record)}
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
          <Popconfirm
            title="确定要删除这个团队吗？"
            description="删除后将无法恢复，且会影响团队成员"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                size="small"
                danger
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <TeamContainer>
      <PageHeader
        title="团队管理"
        subtitle="管理团队信息，邀请成员，设置团队权限"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openModal()}
          >
            创建团队
          </Button>
        }
      />

      {/* 搜索和操作栏 */}
      <ContentCard>
        <SearchBar>
          <Input
            placeholder="搜索团队名称或描述"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Select
            placeholder="状态筛选"
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            style={{ width: 120 }}
          >
            <Option value={TeamStatusEnum.ACTIVE}>正常</Option>
            <Option value={TeamStatusEnum.DISABLED}>禁用</Option>
            <Option value={TeamStatusEnum.PENDING}>待审核</Option>
          </Select>
        </SearchBar>
      </ContentCard>

      {/* 团队列表 */}
      <ContentCard>
        <Table
          columns={columns}
          dataSource={teams}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个团队`,
          }}
        />
      </ContentCard>

      {/* 创建/编辑团队模态框 */}
      <Modal
        title={editingTeam ? '编辑团队' : '创建团队'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="团队名称"
                rules={[{ required: true, message: '请输入团队名称' }]}
              >
                <Input placeholder="请输入团队名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  <Option value={TeamStatusEnum.ACTIVE}>正常</Option>
                  <Option value={TeamStatusEnum.DISABLED}>禁用</Option>
                  <Option value={TeamStatusEnum.PENDING}>待审核</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="团队描述"
          >
            <TextArea rows={3} placeholder="请输入团队描述" />
          </Form.Item>

          <Form.Item
            name="avatar"
            label="团队头像"
          >
            <AvatarUploader
              value={form.getFieldValue('avatar')}
              onChange={(avatarUrl: string) => {
                form.setFieldsValue({ avatar: avatarUrl });
                handleAvatarChange(avatarUrl);
              }}
              disabled={avatarUploading}
              size={120}
              shape="square"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="contactPhone"
                label="联系电话"
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="contactEmail"
                label="联系邮箱"
              >
                <Input placeholder="请输入联系邮箱" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="contactWechat"
                label="微信号"
              >
                <Input placeholder="请输入微信号" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label="团队地址"
          >
            <Input placeholder="请输入团队地址" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="serviceAreas"
                label="服务区域"
                help="多个区域用逗号分隔"
              >
                <Input placeholder="如：北京,上海,深圳" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="specialties"
                label="专业特长"
                help="多个特长用逗号分隔"
              >
                <Input placeholder="如：婚礼摄影,婚礼策划,化妆造型" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="priceRange"
                label="价格区间"
              >
                <Input placeholder="如：5000-20000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="establishedYear"
                label="成立年份"
              >
                <InputNumber
                  placeholder="请输入成立年份"
                  style={{ width: '100%' }}
                  min={1900}
                  max={new Date().getFullYear()}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingTeam ? '更新' : '创建'}
              </Button>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 邀请成员模态框 */}
      <Modal
        title={`邀请成员加入 ${selectedTeam?.name}`}
        open={inviteModalVisible}
        onCancel={() => {
          setInviteModalVisible(false);
          inviteForm.resetFields();
          setSelectedUserIds([]);
          setAvailableUsers([]);
          setUserSearchText('');
        }}
        footer={null}
        width={700}
      >
        <Form
          form={inviteForm}
          layout="vertical"
          onFinish={handleInvite}
        >
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value={TeamMemberRoleEnum.MEMBER}>成员</Option>
              <Option value={TeamMemberRoleEnum.ADMIN}>管理员</Option>
            </Select>
          </Form.Item>

          <Form.Item label="选择用户">
            <div style={{ marginBottom: 16 }}>
              <Input
                placeholder="搜索用户姓名或邮箱"
                prefix={<SearchOutlined />}
                value={userSearchText}
                onChange={(e) => {
                  setUserSearchText(e.target.value);
                  if (selectedTeam) {
                    fetchAvailableUsers(selectedTeam.id, 1, e.target.value);
                  }
                }}
                style={{ marginBottom: 8 }}
              />
              <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                已选择 {selectedUserIds.length} 位用户
                {selectedUserIds.length > 0 && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setSelectedUserIds([])}
                    style={{ padding: 0, marginLeft: 8 }}
                  >
                    清空选择
                  </Button>
                )}
              </div>
            </div>

            <div style={{ border: '1px solid var(--admin-border-color)', borderRadius: 6, maxHeight: 300, overflow: 'auto' }}>
              <Spin spinning={usersLoading}>
                {availableUsers.length > 0 ? (
                  <List
                    dataSource={availableUsers}
                    renderItem={(user) => (
                      <List.Item
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          backgroundColor: selectedUserIds.includes(user.id) ? 'var(--admin-functional-success-bg)' : 'transparent'
                        }}
                      >
                        <List.Item.Meta
                          avatar={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Checkbox
                                checked={selectedUserIds.includes(user.id)}
                                onChange={(e) => handleUserSelect(user.id, e.target.checked)}
                              />
                              <Avatar src={user.avatarUrl} size={32}>
                                {(user.realName || user.nickname)?.charAt(0)}
                              </Avatar>
                            </div>
                          }
                          title={user.realName || user.nickname || user.username}
                          description={
                            <div>
                              <div>{user.email}</div>
                              {user.phone && <div style={{ fontSize: 12, color: 'var(--admin-text-tertiary)' }}>{user.phone}</div>}
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty
                    description={usersLoading ? '加载中...' : '暂无可邀请的用户'}
                    style={{ padding: '40px 0' }}
                  />
                )}
              </Spin>
            </div>

            {usersPagination.total > usersPagination.pageSize && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Button
                  size="small"
                  disabled={usersPagination.current * usersPagination.pageSize >= usersPagination.total}
                  onClick={() => {
                    if (selectedTeam) {
                      fetchAvailableUsers(selectedTeam.id, usersPagination.current + 1, userSearchText);
                    }
                  }}
                >
                  加载更多 ({usersPagination.current * usersPagination.pageSize}/{usersPagination.total})
                </Button>
              </div>
            )}
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                disabled={selectedUserIds.length === 0}
              >
                邀请{selectedUserIds.length > 0 ? ` ${selectedUserIds.length} 位用户` : ''}
              </Button>
              <Button onClick={handleInviteCancel}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 成员管理模态框 */}
      <Modal
        title={`管理团队成员 - ${selectedTeam?.name}`}
        open={membersModalVisible}
        onCancel={() => {
          setMembersModalVisible(false);
          setSelectedMemberIds([]);
          setTeamMembers([]);
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setMembersModalVisible(false);
            setSelectedMemberIds([]);
            setTeamMembers([]);
          }}>
            关闭
          </Button>,
          selectedMemberIds.length > 0 && (
            <Popconfirm
              key="batchDelete"
              title={`确定要删除选中的 ${selectedMemberIds.length} 位成员吗？`}
              description="删除后将无法恢复"
              onConfirm={handleBatchDeleteMembers}
              okText="确定"
              cancelText="取消"
            >
              <Button type="primary" danger>
                批量删除 ({selectedMemberIds.length})
              </Button>
            </Popconfirm>
          )
        ]}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
            已选择 {selectedMemberIds.length} 位成员
            {selectedMemberIds.length > 0 && (
              <Button
                type="link"
                size="small"
                onClick={() => setSelectedMemberIds([])}
                style={{ padding: 0, marginLeft: 8 }}
              >
                清空选择
              </Button>
            )}
          </div>
        </div>

        <div style={{ border: '1px solid var(--admin-border-color)', borderRadius: 6, maxHeight: 400, overflow: 'auto' }}>
          <Spin spinning={membersLoading}>
            {teamMembers.length > 0 ? (
              <List
                dataSource={teamMembers}
                renderItem={(member) => (
                  <List.Item
                    style={{
                      padding: '12px 16px',
                      backgroundColor: selectedMemberIds.includes(member.id) ? 'var(--admin-functional-success-bg)' : 'transparent'
                    }}
                    actions={[
                      <Popconfirm
                        key="delete"
                        title="确定要删除这位成员吗？"
                        description="删除后将无法恢复"
                        onConfirm={() => handleDeleteMember(member.id)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button
                          type="text"
                          icon={<UserDeleteOutlined />}
                          size="small"
                          danger
                        />
                      </Popconfirm>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Checkbox
                            checked={selectedMemberIds.includes(member.id)}
                            onChange={(e) => handleMemberSelect(member.id, e.target.checked)}
                          />
                          <Avatar src={member.user?.avatarUrl} size={32}>
                            {(member.user?.realName || member.user?.nickname || member.user?.username)?.charAt(0)}
                          </Avatar>
                        </div>
                      }
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{member.user?.realName || member.user?.nickname || member.user?.username}</span>
                          <Tag color={member.role === TeamMemberRoleEnum.ADMIN ? 'red' : 'blue'}>
                            {getRoleName(member.role)}
                          </Tag>
                          {member.status && (
                            <Tag color={member.status === 'ACTIVE' ? 'green' : 'orange'}>
                              {member.status === 'ACTIVE' ? '正常' : member.status}
                            </Tag>
                          )}
                        </div>
                      }
                      description={
                        <div>
                          <div>{member.user?.email}</div>
                          {member.user?.phone && (
                            <div style={{ fontSize: 12, color: 'var(--admin-text-tertiary)' }}>
                              {member.user?.phone}
                            </div>
                          )}
                          {member.joinedAt && (
                            <div style={{ fontSize: 12, color: 'var(--admin-text-tertiary)' }}>
                              加入时间: {dayjs(member.joinedAt).format('YYYY-MM-DD')}
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty
                description={membersLoading ? '加载中...' : '暂无团队成员'}
                style={{ padding: '40px 0' }}
              />
            )}
          </Spin>
        </div>
      </Modal>
    </TeamContainer>
  );
};

export default TeamManagePage;