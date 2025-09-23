import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Typography,
  Row,
  Col,
  Statistic,
  App
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import type { Issue, IssueStats } from '../../types/issue';
import { IssueType, IssuePriority, IssueStatus } from '../../types/issue';
import issueService from '../../services/issueService';
import { CreateIssueModal } from '../../components/admin/issues/CreateIssueModal';
import { IssueDetailModal } from '../../components/admin/issues/IssueDetailModal';

const { Title } = Typography;
const { Option } = Select;


const IssuesPage: React.FC = () => {
  const { message: messageApi } = App.useApp();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<IssueStats | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    type: undefined as string | undefined,
    priority: undefined as string | undefined,
    status: undefined as string | undefined
  });
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const loadIssues = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const response = await issueService.getIssues({
        page,
        pageSize,
        search: filters.search,
        type: filters.type,
        priority: filters.priority,
        status: filters.status
      });

      // 检查响应数据结构
      if (response && response.data) {
        setIssues(response.data.issues);
        setPagination({
          page: response.data.pagination.page,
          pageSize: response.data.pagination.pageSize,
          total: response.data.pagination.total
        });
      } else {
        // 如果响应结构不正确，设置默认值
        setIssues([]);
        setPagination({
          page: 1,
          pageSize: 20,
          total: 0
        });
        console.warn('API响应数据结构不正确:', response);
      }
    } catch (error) {
      messageApi.error('加载问题列表失败');
      console.error('加载问题列表失败:', error);
      // 出错时也设置默认值
      setIssues([]);
      setPagination({
        page: 1,
        pageSize: 20,
        total: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await issueService.getIssueStats();
      setStats(response);
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  };

  useEffect(() => {
    loadIssues();
    loadStats();
  }, []);

  const handleTableChange = (pagination: any) => {
    loadIssues(pagination.current, pagination.pageSize);
  };

  const handleSearch = () => {
    loadIssues(1, pagination.pageSize);
  };

  const handleReset = () => {
    setFilters({
      search: '',
      type: undefined,
      priority: undefined,
      status: undefined
    });
    loadIssues(1, pagination.pageSize);
  };

  const handleCreateSuccess = () => {
    setCreateModalVisible(false);
    loadIssues();
    loadStats();
    messageApi.success('问题创建成功');
  };

  const handleViewDetail = (issue: Issue) => {
    setSelectedIssue(issue);
    setDetailModalVisible(true);
  };

  const getTypeColor = (type: IssueType) => {
    const colors = {
      [IssueType.BUG]: 'red',
      [IssueType.FEATURE]: 'blue',
      [IssueType.ENHANCEMENT]: 'green',
      [IssueType.DOCUMENTATION]: 'purple',
      [IssueType.OTHER]: 'default'
    };
    return colors[type];
  };

  const getPriorityColor = (priority: IssuePriority) => {
    const colors = {
      [IssuePriority.LOW]: 'blue',
      [IssuePriority.MEDIUM]: 'orange',
      [IssuePriority.HIGH]: 'red',
      [IssuePriority.CRITICAL]: 'magenta'
    };
    return colors[priority];
  };

  const getStatusColor = (status: IssueStatus) => {
    const colors = {
      [IssueStatus.OPEN]: 'blue',
      [IssueStatus.IN_PROGRESS]: 'orange',
      [IssueStatus.RESOLVED]: 'green',
      [IssueStatus.CLOSED]: 'default',
      [IssueStatus.REJECTED]: 'red'
    };
    return colors[status];
  };

  const columns: ColumnsType<Issue> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 300,
      render: (text, record) => (
        <Button type="link" onClick={() => handleViewDetail(record)}>
          {text}
        </Button>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: IssueType) => (
        <Tag color={getTypeColor(type)}>
          {type === IssueType.BUG ? '缺陷' :
            type === IssueType.FEATURE ? '功能' :
              type === IssueType.ENHANCEMENT ? '优化' :
                type === IssueType.DOCUMENTATION ? '文档' : '其他'}
        </Tag>
      )
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: IssuePriority) => (
        <Tag color={getPriorityColor(priority)}>
          {priority === IssuePriority.LOW ? '低' :
            priority === IssuePriority.MEDIUM ? '中' :
              priority === IssuePriority.HIGH ? '高' : '紧急'}
        </Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: IssueStatus) => (
        <Tag color={getStatusColor(status)}>
          {status === IssueStatus.OPEN ? '待处理' :
            status === IssueStatus.IN_PROGRESS ? '处理中' :
              status === IssueStatus.RESOLVED ? '已解决' :
                status === IssueStatus.CLOSED ? '已关闭' : '已拒绝'}
        </Tag>
      )
    },
    {
      title: '报告人',
      dataIndex: 'reporter',
      key: 'reporter',
      width: 120,
      render: (reporter) => reporter?.username
    },
    {
      title: '投票数',
      dataIndex: 'voteCount',
      key: 'voteCount',
      width: 80,
      align: 'center'
    },
    {
      title: '评论数',
      dataIndex: 'commentCount',
      key: 'commentCount',
      width: 80,
      align: 'center'
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => new Date(date).toLocaleString()
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Title level={2}>问题管理</Title>

      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总问题数"
                value={stats.total}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="待处理"
                value={stats.open}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="处理中"
                value={stats.inProgress}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已解决"
                value={stats.resolved}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 搜索筛选区域 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle" style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索问题标题或描述"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{ width: 250 }}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="问题类型"
            value={filters.type}
            onChange={(value) => setFilters({ ...filters, type: value })}
            style={{ width: 120 }}
            allowClear
          >
            <Option value="bug">缺陷</Option>
            <Option value="feature">功能</Option>
            <Option value="enhancement">优化</Option>
            <Option value="documentation">文档</Option>
            <Option value="other">其他</Option>
          </Select>
          <Select
            placeholder="优先级"
            value={filters.priority}
            onChange={(value) => setFilters({ ...filters, priority: value })}
            style={{ width: 120 }}
            allowClear
          >
            <Option value="low">低</Option>
            <Option value="medium">中</Option>
            <Option value="high">高</Option>
            <Option value="critical">紧急</Option>
          </Select>
          <Select
            placeholder="状态"
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
            style={{ width: 120 }}
            allowClear
          >
            <Option value="open">待处理</Option>
            <Option value="in_progress">处理中</Option>
            <Option value="resolved">已解决</Option>
            <Option value="closed">已关闭</Option>
            <Option value="rejected">已拒绝</Option>
          </Select>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
          >
            搜索
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
          >
            重置
          </Button>
        </Space>

        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            新建问题
          </Button>
        </Space>
      </Card>

      {/* 问题列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={issues}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 创建问题模态框 */}
      <CreateIssueModal
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* 问题详情模态框 */}
      <IssueDetailModal
        visible={detailModalVisible}
        issue={selectedIssue}
        onCancel={() => setDetailModalVisible(false)}
        onUpdate={() => {
          loadIssues();
          loadStats();
        }}
      />
    </div>
  );
};

export default IssuesPage;