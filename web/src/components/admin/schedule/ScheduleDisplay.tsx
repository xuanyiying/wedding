import React from 'react';
import { Row, Col, Button, Space, List, Avatar, Tooltip, Popconfirm, Tag, Typography } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  UserOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { ContentCard } from '../common';
import { ScheduleStatus, type Schedule } from '../../../types';
import type { Dayjs } from 'dayjs';
import ScheduleCalendar from '../../ScheduleCalendar';
import styled from 'styled-components';

const DisplayContainer = styled.div`
  .calendar-col {
    @media (max-width: 992px) {
      order: 2;
    }
  }
  
  .schedule-list-col {
    @media (max-width: 992px) {
      order: 1;
      margin-bottom: 24px;
    }
  }
`;

const { Title } = Typography;

interface ScheduleWithHost extends Schedule {
  hostName: string;
}

interface ScheduleDisplayProps {
  schedules: ScheduleWithHost[];
  selectedDate: Dayjs;
  selectedDateSchedules: ScheduleWithHost[];
  loading: boolean;
  onDateSelect: (date: Dayjs) => void;
  onEventClick: (schedule: Schedule) => void;
  onEditSchedule: (schedule: Schedule) => void;
  onDeleteSchedule: (scheduleId: string) => Promise<void>;
}

// 状态颜色映射
const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    [ScheduleStatus.AVAILABLE]: '#90EE90',
    [ScheduleStatus.BOOKED]: '#1890ff',
    [ScheduleStatus.RESERVE]: '#FFB366',
    [ScheduleStatus.COMPLETED]: '#52c41a',
    [ScheduleStatus.CANCELLED]: '#ff4d4f',
  };
  return colorMap[status] || '#90EE90';
};

// 状态标签映射
const getStatusTag = (status: string): React.ReactNode => {
  const tagMap: Record<string, { text: string; color: string }> = {
    [ScheduleStatus.AVAILABLE]: { text: '可预约', color: '#90EE90' },
    [ScheduleStatus.BOOKED]: { text: '已预订', color: '#1890ff' },
    [ScheduleStatus.RESERVE]: { text: '待确认', color: '#FFB366' },
    [ScheduleStatus.COMPLETED]: { text: '已完成', color: '#52c41a' },
    [ScheduleStatus.CANCELLED]: { text: '已取消', color: '#ff4d4f' },
  };
  
  const tag = tagMap[status] || { text: status, color: '#90EE90' };
  return <Tag style={{ color: tag.color, borderColor: tag.color }}>{tag.text}</Tag>;
};

// 格式化餐次时间
const formatTimeSlot = (time: 'lunch' | 'dinner'): string => {
  return time === 'lunch' ? '午宴' : '晚宴';
};

const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({
  schedules,
  selectedDate,
  selectedDateSchedules,
  loading,
  onDateSelect,
  onEventClick,
  onEditSchedule,
  onDeleteSchedule
}) => {
  return (
    <DisplayContainer>
      <Row gutter={[32, 16]}>
        {/* 日历展示 */}
        <Col xs={24} lg={18} className="calendar-col">
          <ContentCard>
            <ScheduleCalendar
              schedules={schedules}
              selectedDate={selectedDate}
              onDateSelect={onDateSelect}
              onEventClick={onEventClick}
              loading={loading}
              theme="admin"
            />
          </ContentCard>
        </Col>

        {/* 选中日期的档期列表 */}
        <Col xs={24} lg={6} className="schedule-list-col">
          <ContentCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Title level={4} style={{ margin: 0 }}>
                {selectedDate.format('YYYY年MM月DD日')}
              </Title>
            </div>

            {selectedDateSchedules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--admin-text-tertiary)' }}>
                <CalendarOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <div>该日期暂无档期安排</div>
              </div>
            ) : (
              <List
                dataSource={selectedDateSchedules}
                renderItem={schedule => (
                  <List.Item
                    actions={[
                      <Tooltip key="edit" title="编辑">
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => onEditSchedule(schedule)}
                        />
                      </Tooltip>,
                      <Popconfirm
                        key="delete"
                        title="确定删除这个档期吗？"
                        description="删除后将无法恢复"
                        onConfirm={() => onDeleteSchedule(schedule.id)}
                        okText="确定"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                      >
                        <Tooltip title="删除">
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                          />
                        </Tooltip>
                      </Popconfirm>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          style={{ backgroundColor: getStatusColor(schedule.status) }}
                          icon={<UserOutlined />}
                        />
                      }
                      title={
                        <Space>
                          <span>{schedule.customerName || schedule.title || '未命名'}</span>
                          {getStatusTag(schedule.status)}
                        </Space>
                      }
                      description={
                        <div style={{ fontSize: '12px' }}>
                          {schedule.hostName && (
                            <div style={{ marginBottom: '4px' }}>
                              <UserOutlined /> 主持人: {schedule.hostName}
                            </div>
                          )}
                          {schedule.customerPhone && (
                            <div style={{ marginBottom: '4px' }}>
                              <PhoneOutlined /> {schedule.customerPhone}
                            </div>
                          )}
                          {schedule.timeSlot && (
                            <div style={{ marginBottom: '4px' }}>
                              <ClockCircleOutlined /> {formatTimeSlot(schedule.timeSlot)}
                            </div>
                          )}
                          {schedule.location && (
                            <div style={{ marginBottom: '4px' }}>
                              <EnvironmentOutlined /> {schedule.location}
                            </div>
                          )}
                          {schedule.price && (
                            <div style={{ color: '#f5222d', fontWeight: 'bold', marginTop: '8px' }}>
                              ¥{schedule.price.toLocaleString()}
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </ContentCard>
        </Col>
      </Row>
    </DisplayContainer>
  );
};

export default ScheduleDisplay;