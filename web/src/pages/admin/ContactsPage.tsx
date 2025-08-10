import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  Input,
  message,
  Row,
  Col,
  Descriptions,
  Badge,
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import styled from 'styled-components';
import { PageHeader, StatCard, FilterBar, ContentCard } from '../../components/admin/common';
import { contactService } from '../../services';
import { useTheme } from '../../hooks/useTheme';
import type { ContactForm } from '../../types';

const { Option } = Select;
const { TextArea } = Input;

const ContactsContainer = styled.div`
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


interface ContactsPageState {
  contacts: ContactForm[];
  loading: boolean;
  total: number;
  current: number;
  pageSize: number;
  selectedContact: ContactForm | null;
  detailModalVisible: boolean;
  statusModalVisible: boolean;
  filters: {
    status?: string;
    dateRange?: [Dayjs, Dayjs];
    search?: string;
  };
}

const ContactsPage: React.FC = () => {
  const [state, setState] = useState<ContactsPageState>({
    contacts: [],
    loading: false,
    total: 0,
    current: 1,
    pageSize: 10,
    selectedContact: null,
    detailModalVisible: false,
    statusModalVisible: false,
    filters: {},
  });
  
  const [form] = Form.useForm();
  const { initTheme } = useTheme();
  
  useEffect(() => {
    initTheme('admin');
  }, [initTheme]);
  
  useEffect(() => {
    loadContacts();
  }, [state.current, state.pageSize, state.filters]);
  
  const loadContacts = async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const params: any = {
        page: state.current,
        limit: state.pageSize,
      };
      
      if (state.filters.status) {
        params.status = state.filters.status;
      }
      
      if (state.filters.dateRange) {
        params.startDate = state.filters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = state.filters.dateRange[1].format('YYYY-MM-DD');
      }
      
      if (state.filters.search) {
        params.search = state.filters.search;
      }
      
      const response = await contactService.getContacts(params);
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          contacts: response.data?.contacts || [],
          total: response.data?.total || 0,
          loading: false,
        }));
      }
    } catch (error) {
      message.error('加载联系表单失败');
      setState(prev => ({ ...prev, loading: false }));
    }
  };
  
  const handleStatusUpdate = async (values: { status: string; notes?: string }) => {
    if (!state.selectedContact) return;
    
    try {
      const response = await contactService.updateContactStatus(
        state.selectedContact.id || '',
        values.status
      );
      
      if (response.success) {
        message.success('状态更新成功');
        setState(prev => ({ ...prev, statusModalVisible: false, selectedContact: null }));
        loadContacts();
      }
    } catch (error) {
      message.error('状态更新失败');
    }
  };
  

  const resetFilters = () => {
    setState(prev => ({
      ...prev,
      filters: {},
      current: 1,
    }));
  };
  
  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'orange',
      contacted: 'blue',
      completed: 'green',
      cancelled: 'red',
    };
    return statusMap[status] || 'default';
  };
  
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待处理',
      contacted: '已联系',
      completed: '已完成',
      cancelled: '已取消',
    };
    return statusMap[status] || status;
  };
  
  const columns: ColumnsType<ContactForm> = [
    {
      title: '客户信息',
      key: 'customer',
      width: 200,
      fixed: 'left',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{record.name}</div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-tertiary)' }}>
            <PhoneOutlined style={{ marginRight: 4 }} />
            {record.phone}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-tertiary)' }}>
            <MailOutlined style={{ marginRight: 4 }} />
            {record.email}
          </div>
        </div>
      ),
    },
    {
      title: '婚礼信息',
      key: 'wedding',
      width: 250,
      render: (_, record) => (
        <div>
          <div style={{ marginBottom: 4 }}>
            <CalendarOutlined style={{ marginRight: 4, color: 'var(--admin-primary-color)' }} />
            {record.weddingDate} {record.weddingTime}
          </div>
          <div style={{ marginBottom: 4 }}>
            <EnvironmentOutlined style={{ marginRight: 4, color: 'var(--admin-primary-color)' }} />
            {record.location}
          </div>
          <div>
            <TeamOutlined style={{ marginRight: 4, color: 'var(--admin-primary-color)' }} />
            {record.guestCount} 人
          </div>
        </div>
      ),
    },
    {
      title: '服务类型',
      dataIndex: 'serviceType',
      key: 'serviceType',
      width: 100,
      render: (serviceType: string) => {
        const typeMap: Record<string, string> = {
          wedding: '婚礼主持',
          engagement: '订婚仪式',
          anniversary: '周年庆典',
          other: '其他',
        };
        return <Tag color="blue">{typeMap[serviceType] || serviceType}</Tag>;
      },
    },
    {
      title: '预算',
      dataIndex: 'budget',
      key: 'budget',
      width: 120,
      render: (budget: string) => (
        <div>
          <DollarOutlined style={{ marginRight: 4, color: 'var(--admin-success-color)' }} />
          {budget}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status || 'pending')}>{getStatusText(status || 'pending')}</Tag>
      ),
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (createdAt: string) => dayjs(createdAt).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => {
              setState(prev => ({
                ...prev,
                selectedContact: record,
                detailModalVisible: true,
              }));
            }}
          >
            查看
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setState(prev => ({
                ...prev,
                selectedContact: record,
                statusModalVisible: true,
              }));
              form.setFieldsValue({ status: record.status });
            }}
          >
            处理
          </Button>
        </Space>
      ),
    },
  ];
  
  return (
    <ContactsContainer>
      <PageHeader title="联系表单管理" />
      
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="总表单数"
            value={state.total}
            prefix={<MailOutlined />}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="待处理"
            value={state.contacts.filter(c => (c.status || 'pending') === 'pending').length}
            prefix={<Badge status="warning" />}
            valueStyle={{ color: '#faad14' }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="已联系"
            value={state.contacts.filter(c => (c.status || 'pending') === 'contacted').length}
            prefix={<Badge status="processing" />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="已完成"
            value={state.contacts.filter(c => (c.status || 'pending') === 'completed').length}
            prefix={<Badge status="success" />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
      </Row>
      
      {/* 筛选器 */}
      <FilterBar
        filters={[
          {
            key: 'status',
            type: 'select',
            placeholder: '选择状态',
            options: [
              { label: '待处理', value: 'pending' },
              { label: '已联系', value: 'contacted' },
              { label: '已完成', value: 'completed' },
              { label: '已取消', value: 'cancelled' }
            ]
          },
          {
            key: 'dateRange',
            type: 'dateRange',
            placeholder: '选择时间范围'
          },
          {
            key: 'search',
            type: 'search',
            placeholder: '客户姓名、电话、邮箱'
          }
        ]}
        values={{
          status: state.filters.status,
          dateRange: state.filters.dateRange,
          search: state.filters.search
        }}
        onChange={(key, value) => {
           setState(prev => ({
             ...prev,
             filters: { ...prev.filters, [key]: value },
             current: 1
           }));
           if (key === 'search') {
             loadContacts();
           }
         }}
         onReset={resetFilters}
      />
      
      {/* 表格 */}
      <ContentCard>
        <Table
          columns={columns}
          dataSource={state.contacts}
          rowKey="id"
          loading={state.loading}
          pagination={{
            current: state.current,
            pageSize: state.pageSize,
            total: state.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, size) => {
              setState(prev => ({
                ...prev,
                current: page,
                pageSize: size || 10,
              }));
            },
          }}
          scroll={{ x: 1200, y: 600 }}
          size="small"
        />
      </ContentCard>
      
      {/* 详情模态框 */}
      <Modal
        title="联系表单详情"
        open={state.detailModalVisible}
        onCancel={() => setState(prev => ({ ...prev, detailModalVisible: false, selectedContact: null }))}
        footer={[
          <Button key="close" onClick={() => setState(prev => ({ ...prev, detailModalVisible: false, selectedContact: null }))}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {state.selectedContact && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="客户姓名" span={1}>
              {state.selectedContact?.name}
            </Descriptions.Item>
            <Descriptions.Item label="联系电话" span={1}>
              {state.selectedContact?.phone}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱地址" span={2}>
              {state.selectedContact?.email}
            </Descriptions.Item>
            <Descriptions.Item label="婚礼日期" span={1}>
              {state.selectedContact?.weddingDate}
            </Descriptions.Item>
            <Descriptions.Item label="婚礼时间" span={1}>
              {state.selectedContact?.weddingTime}
            </Descriptions.Item>
            <Descriptions.Item label="婚礼地点" span={2}>
              {state.selectedContact?.location}
            </Descriptions.Item>
            <Descriptions.Item label="宾客人数" span={1}>
              {state.selectedContact?.guestCount} 人
            </Descriptions.Item>
            <Descriptions.Item label="服务类型" span={1}>
              {(() => {
                const typeMap: Record<string, string> = {
                  wedding: '婚礼主持',
                  engagement: '订婚仪式',
                  anniversary: '周年庆典',
                  other: '其他',
                };
                return typeMap[state.selectedContact?.serviceType || 'other'] || state.selectedContact?.serviceType;
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="预算范围" span={1}>
              {state.selectedContact?.budget}
            </Descriptions.Item>
            <Descriptions.Item label="当前状态" span={1}>
              <Tag color={getStatusColor(state.selectedContact?.status || 'pending')}>
                {getStatusText(state.selectedContact?.status || 'pending')}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="特殊要求" span={2}>
              {state.selectedContact.requirements || '无'}
            </Descriptions.Item>
            <Descriptions.Item label="提交时间" span={1}>
              {dayjs(state.selectedContact.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间" span={1}>
              {dayjs(state.selectedContact.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
      
      {/* 状态更新模态框 */}
      <Modal
        title="更新处理状态"
        open={state.statusModalVisible}
        onCancel={() => {
          setState(prev => ({ ...prev, statusModalVisible: false, selectedContact: null }));
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleStatusUpdate}
        >
          <Form.Item
            name="status"
            label="处理状态"
            rules={[{ required: true, message: '请选择处理状态' }]}
          >
            <Select placeholder="请选择状态">
              <Option value="pending">待处理</Option>
              <Option value="contacted">已联系</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="notes"
            label="处理备注"
          >
            <TextArea
              rows={4}
              placeholder="请输入处理备注..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </ContactsContainer>
  );
};

export default ContactsPage;