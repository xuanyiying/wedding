import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Typography, Tag, Select, Spin, Row, Col } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, EnvironmentOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import styled from 'styled-components';
import { scheduleService } from '../services';
import { ScheduleStatus } from '../types';
import type { Schedule, EventType } from '../types';
import { useTeamData } from '../hooks/useTeamData';
import { getEventTypeColor } from '../utils/styleUtils';
import ScheduleCalendar from './ScheduleCalendar';

// 扩展Schedule类型以包含hostName及日历所需字段
interface ScheduleEvent extends Schedule {
  hostName: string;
  start: string;
  end: string;
  type: EventType;
}

const { Title, Paragraph } = Typography;

const SectionContainer = styled.div`
  padding: 80px 0;
  background: var(--client-bg-secondary);
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;

  @media (max-width: 768px) {
    padding: 0 16px;
  }
`;

const SectionHeader = styled.div`
  text-align: center;
  margin-bottom: 72px;
`;

const SectionTitle = styled(Title)`
  &&& {
    font-size: 2.8rem;
    color: var(--client-text-primary);
    font-weight: 200;
    letter-spacing: -0.02em;
    position: relative;
    line-height: 1.2;
    margin-bottom: 24px;

    &::after {
      content: '';
      position: absolute;
      bottom: -24px;
      left: 50%;
      transform: translateX(-50%);
      width: 80px;
      height: 3px;
      background: var(--client-gradient-accent);
      border-radius: var(--client-border-radius);
    }

    @media (max-width: 768px) {
      font-size: 2.2rem;
    }
  }
`;

const CalendarContainer = styled.div`
  background: var(--client-bg-container);
  border-radius: var(--client-border-radius-lg);
  padding: 24px;
  border: 1px solid var(--client-border-color);
  box-shadow: var(--client-shadow-sm);
`;

const FilterBar = styled(Row)`
  margin-bottom: 24px;
`;

const DetailModal = styled(Modal)`
  .ant-modal-content {
    border-radius: var(--client-border-radius-lg);
    background: var(--client-bg-container);
  }
  
  .ant-modal-header {
    border-radius: var(--client-border-radius-lg) var(--client-border-radius-lg) 0 0;
    background: var(--client-bg-container);
    border-bottom: 1px solid var(--client-border-color);
  }
  
  .ant-modal-title {
    color: var(--client-text-primary);
  }
`;

const DetailSection = styled.div`
  margin-bottom: 20px;
  
  h4 {
    color: var(--client-text-primary);
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
  }
`;

const ScheduleSection: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHost, setSelectedHost] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const { teamMembers, loading: teamLoading } = useTeamData({
    includeMembers: true,
    activeOnly: true,
    limit: 100, // 获取所有主持人用于筛选
  });

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoading(true);
        const response = await scheduleService.getSchedules({
          page: 1,
          pageSize: 100, // 获取足够多的数据
        });
        
        if (response.success && response.data) {
          const eventsWithHost: ScheduleEvent[] = response.data.schedules.map(schedule => {
            const weddingDate = dayjs(schedule.weddingDate);
            let start, end;

            // 根据午宴或晚宴设置大致时间
            if (schedule.weddingTime === 'lunch') {
              start = weddingDate.hour(12).minute(0).second(0).toISOString();
              end = weddingDate.hour(14).minute(0).second(0).toISOString();
            } else { // dinner
              start = weddingDate.hour(18).minute(0).second(0).toISOString();
              end = weddingDate.hour(20).minute(0).second(0).toISOString();
            }

            return {
              ...schedule,
              hostName: teamMembers.find(member => member.id === schedule.userId)?.name || 
                       schedule.user?.realName || schedule.user?.nickname || '未知主持人',
              start,
              end,
              type: schedule.eventType, // 将eventType映射到type
            };
          });
          setScheduleEvents(eventsWithHost);
        }
      } catch (error) {
        console.error('获取档期数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    if (teamMembers.length > 0) {
      fetchSchedules();
    }
  }, [teamMembers]);

  const filteredSchedules = useMemo(() => {
    return scheduleEvents.filter(event => {
      const hostMatch = selectedHost === 'all' || event.userId === selectedHost;
      const statusMatch = selectedStatus === 'all' || event.status === selectedStatus;
      return hostMatch && statusMatch;
    });
  }, [scheduleEvents, selectedHost, selectedStatus]);

  const handleEventClick = (event: ScheduleEvent) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const getStatusText = (status: ScheduleStatus) => {
    switch (status) {
      case 'available': return '可预约';
      case 'booked': return '已预订';
      case 'confirmed': return '已确认';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      case 'busy': return '忙碌';
      case 'vacation': return '休假';
      default: return '未知';
    }
  };

  const getEventTypeTag = (type: EventType) => {
    const typeMap: { [key in EventType]: string } = {
      wedding: '婚礼',
      engagement: '订婚',
      anniversary: '周年庆',
      consultation: '咨询',
      other: '其他',
    };
    const text = typeMap[type] || '其他';
    const color = getEventTypeColor(type);
    return <Tag color={color}>{text}</Tag>;
  };

  return (
    <SectionContainer id="schedule">
      <ContentWrapper>
        <SectionHeader>
          <SectionTitle>档期查询</SectionTitle>
          <Paragraph style={{ fontSize: '1.1rem', color: 'var(--client-text-secondary)' }}>
            查看我们团队的档期安排，计划您的重要日子。
          </Paragraph>
        </SectionHeader>
        
        <Spin spinning={loading || teamLoading}>
          <CalendarContainer>
            <FilterBar gutter={[16, 16]}>
              <Col>
                <Select
                  value={selectedHost}
                  onChange={setSelectedHost}
                  style={{ width: 150 }}
                  placeholder="选择主持人"
                >
                  <Select.Option value="all">所有主持人</Select.Option>
                  {teamMembers.map(member => (
                    <Select.Option key={member.id} value={member.id}>{member.name}</Select.Option>
                  ))}
                </Select>
              </Col>
              <Col>
                <Select
                  value={selectedStatus}
                  onChange={setSelectedStatus}
                  style={{ width: 150 }}
                  placeholder="筛选状态"
                >
                  <Select.Option value="all">所有状态</Select.Option>
                  {Object.values(ScheduleStatus).map((status: ScheduleStatus) => (
                    <Select.Option key={status} value={status}>{getStatusText(status)}</Select.Option>
                  ))}
                </Select>
              </Col>
            </FilterBar>
            <ScheduleCalendar 
              schedules={filteredSchedules} 
              onEventClick={(event) => handleEventClick(event as ScheduleEvent)} 
            />
          </CalendarContainer>
        </Spin>

        {selectedEvent && (
          <DetailModal
            title="档期详情"
            visible={modalVisible}
            onCancel={() => setModalVisible(false)}
            footer={null}
            width={600}
          >
            <DetailSection>
              <h4>{selectedEvent.title}</h4>
              <Paragraph><UserOutlined style={{ marginRight: 8 }} />主持人: {(selectedEvent as ScheduleEvent).hostName}</Paragraph>
              <Paragraph><CalendarOutlined style={{ marginRight: 8 }} />日期: {dayjs(selectedEvent.start).format('YYYY-MM-DD')}</Paragraph>
              <Paragraph><ClockCircleOutlined style={{ marginRight: 8 }} />时间: {dayjs(selectedEvent.start).format('HH:mm')} - {dayjs(selectedEvent.end).format('HH:mm')}</Paragraph>
              {selectedEvent.location && <Paragraph><EnvironmentOutlined style={{ marginRight: 8 }} />地点: {selectedEvent.location}</Paragraph>}
            </DetailSection>
            <DetailSection>
              <h4>活动信息</h4>
              <Paragraph>类型: {getEventTypeTag(selectedEvent.type)}</Paragraph>
              <Paragraph>状态: <Tag>{getStatusText(selectedEvent.status)}</Tag></Paragraph>
            </DetailSection>
            {selectedEvent.description && (
              <DetailSection>
                <h4>备注</h4>
                <Paragraph>{selectedEvent.description}</Paragraph>
              </DetailSection>
            )}
          </DetailModal>
        )}
      </ContentWrapper>
    </SectionContainer>
  );
};

export default ScheduleSection;