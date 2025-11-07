import React from 'react';
import { Card, Tag, Space, Button, Typography, Divider } from 'antd';
import { EditOutlined, DeleteOutlined, UserOutlined, PhoneOutlined, EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

const StyledCard = styled(Card)`
  margin-bottom: 16px;
  border-radius: 8px;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: var(--admin-shadow-lg);
    transform: translateY(-2px);
  }

`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  
  .anticon {
    margin-right: 8px;
    color: var(--admin-text-secondary);
  }
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--admin-border-color-light);
`;

export interface Schedule {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  clientName: string;
  clientPhone: string;
  weddingDate: string;
  weddingTime: 'lunch' | 'dinner';
  location: string;
  status: 'reserve' | 'booked' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isPaid?: boolean;
}

interface ScheduleCardProps {
  schedule: Schedule;
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (id: string, status: Schedule['status']) => void;
  showActions?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule,
  onEdit,
  onDelete,
  onStatusChange,
  showActions = true,
  className,
  style,
}) => {
  const getStatusTag = (status: Schedule['status']) => {
    const statusConfig = {
      reserve: { color: 'orange', text: '待确认' },
      booked: { color: 'blue', text: '已预订' },    
      completed: { color: 'green', text: '已完成' },
      cancelled: { color: 'red', text: '已取消' },
    };

    const config = statusConfig[status];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const formatDateTime = (dateTime: string) => {
    return dayjs(dateTime).format('YYYY-MM-DD HH:mm');
  };

  const handleStatusChange = (newStatus: Schedule['status']) => {
    if (onStatusChange) {
      onStatusChange(schedule.id, newStatus);
    }
  };

  return (
    <StyledCard
      className={className}
      style={style}
      title={
        <Space>
          <span>{schedule.title}</span>
          {getStatusTag(schedule.status)}
        </Space>
      }
      extra={
        showActions && (
          <Space>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => onEdit(schedule)}
              size="small"
            >
              编辑
            </Button>
            <Button
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => onDelete(schedule.id)}
              danger
              size="small"
            >
              删除
            </Button>
          </Space>
        )
      }
    >
      <InfoRow>
        <UserOutlined />
        <Text strong>主持人：</Text>
        <Text>{schedule.hostName}</Text>
      </InfoRow>

      <InfoRow>
        <UserOutlined />
        <Text strong>客户：</Text>
        <Text>{schedule.clientName}</Text>
      </InfoRow>

      <InfoRow>
        <PhoneOutlined />
        <Text strong>联系电话：</Text>
        <Text>{schedule.clientPhone}</Text>
      </InfoRow>

      <InfoRow>
        <ClockCircleOutlined />
        <Text strong>婚礼日期：</Text>
        <Text>{formatDateTime(schedule.weddingDate)}</Text>
      </InfoRow>

      <InfoRow>
        <EnvironmentOutlined />
        <Text strong>地点：</Text>
        <Text>{schedule.location}</Text>
      </InfoRow>

      {schedule.notes && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Paragraph
            ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
            style={{ margin: 0 }}
          >
            <Text strong>备注：</Text>{schedule.notes}
          </Paragraph>
        </>
      )}

      {showActions && onStatusChange && (
        <ActionBar>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            创建时间：{formatDateTime(schedule.createdAt)}
          </Text>

          <Space>
            {schedule.status === 'reserve' && (
              <Button
                size="small"
                type="primary"
                onClick={() => handleStatusChange('booked')}
              >
                确认
              </Button>
            )}

            {schedule.status === 'booked' && schedule.isPaid && (
              <Button
                size="small"
                type="primary"
                onClick={() => handleStatusChange('completed')}
              >
                完成
              </Button>
            )}

            {['pending', 'confirmed'].includes(schedule.status) && (
              <Button
                size="small"
                danger
                onClick={() => handleStatusChange('cancelled')}
              >
                取消
              </Button>
            )}
          </Space>
        </ActionBar>
      )}
    </StyledCard>
  );
};

export default ScheduleCard;