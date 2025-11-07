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

// 添加响应式样式
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

interface ScheduleEvent extends Schedule {
  hostName: string;
}

interface ScheduleDisplayProps {
  filteredEvents: ScheduleEvent[];
  selectedDate: Dayjs;
  selectedDateSchedules: Schedule[];
  loading: boolean;
  onDateSelect: (date: Dayjs) => void;
  onEventClick: (event: ScheduleEvent) => void;
  onAddSchedule: () => void;
  onEditSchedule: (schedule: Schedule) => void;
  onDeleteSchedule: (scheduleId: string) => void;
}

const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({
  filteredEvents,
  selectedDate,
  selectedDateSchedules,
  loading,
  onDateSelect,
  onEventClick,
  onEditSchedule,
  onDeleteSchedule
}) => {
  // 状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case ScheduleStatus.AVAILABLE:
        return '#90EE90';
      case ScheduleStatus.BOOKED:
        return '#1890ff';
      case ScheduleStatus.RESERVE:
        return '#FFB366';
      case ScheduleStatus.COMPLETED:
        return '#52c41a';
      case ScheduleStatus.CANCELLED:
        return '#ff4d4f';
      default:
        return '#90EE90';
    }
  };

  // 状态标签
  const getStatusTag = (status: string) => {
    switch (status) {
      case ScheduleStatus.AVAILABLE:
        return <Tag style={{ color: '#90EE90', borderColor: '#90EE90' }}>可预约</Tag>;
      case ScheduleStatus.BOOKED:
        return <Tag style={{ color: '#1890ff', borderColor: '#1890ff' }}>已预订</Tag>;
      case ScheduleStatus.RESERVE:
        return <Tag style={{ color: '#FFB366', borderColor: '#FFB366' }}>待确认</Tag>;
      case ScheduleStatus.COMPLETED:
        return <Tag style={{ color: '#52c41a', borderColor: '#52c41a' }}>已完成</Tag>;
      case ScheduleStatus.CANCELLED:
        return <Tag style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}>已取消</Tag>;
      default:
        return <Tag style={{ color: '#90EE90', borderColor: '#90EE90' }}>{status}</Tag>;
    }
  };

  return (
    <DisplayContainer>
      <Row gutter={[32, 16]}>
        {/* 日历展示 xs lg 24 18 - 8:2比例显示 */}
        <Col xs={24} lg={18} className="calendar-col">
          <ContentCard>
            {/* 使用ScheduleCalendar组件 */}
            <ScheduleCalendar
              schedules={filteredEvents}
              selectedDate={selectedDate}
              onDateSelect={onDateSelect}
              onEventClick={onEventClick}
              loading={loading}
              theme="admin"
            />
          </ContentCard>
        </Col>

        {/* 选中日期的档期列表 - 8:2比例显示 */}
        <Col xs={24} lg={6} className="schedule-list-col">
          <ContentCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Title level={4} style={{ margin: 0 }}>
                {selectedDate.format('YYYY年MM月DD日')} 档期
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
                      <Tooltip title="编辑">
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => onEditSchedule(schedule)}
                        />
                      </Tooltip>,
                      <Popconfirm
                        title="确定删除这个档期吗？"
                        onConfirm={() => onDeleteSchedule(schedule.id)}
                        okText="确定"
                        cancelText="取消"
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
                          <span>{schedule.title || schedule.customerName}</span>
                          {getStatusTag(schedule.status)}
                        </Space>
                      }
                      description={
                        <div>
                          {schedule.customerName && (
                            <div>
                              <UserOutlined /> {schedule.customerName}
                            </div>
                          )}
                          {schedule.customerPhone && (
                            <div>
                              <PhoneOutlined /> {schedule.customerPhone}
                            </div>
                          )}
                          {schedule.weddingTime && (
                            <div>
                              <ClockCircleOutlined /> {schedule.weddingTime === 'lunch' ? '午宴' : '晚宴'}
                            </div>
                          )}
                          {schedule.location && (
                            <div>
                              <EnvironmentOutlined /> {schedule.location}
                            </div>
                          )}
                          {schedule.price && (
                            <div style={{ color: '#f5222d', fontWeight: 'bold' }}>
                              ¥{schedule.price}
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