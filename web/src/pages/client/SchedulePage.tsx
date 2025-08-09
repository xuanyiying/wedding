import React, { useState, useEffect, useMemo } from 'react';
import { Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import styled from 'styled-components';
import { scheduleService } from '../../services';
import type { Schedule } from '../../types';
import { useTeamData } from '../../hooks/useTeamData';
import ScheduleCalendar from '../../components/client/ScheduleCalendar';
import ScheduleFilter from '../../components/client/ScheduleFilter';
import ScheduleDetailModal from '../../components/client/ScheduleDetailModal';

const { Title, Paragraph } = Typography;

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 32px;

  @media (max-width: 768px) {
    padding: 60px 16px;
  }
`;

const PageHeader = styled.div`
  text-align: center;
  margin-bottom: 72px;
`;

const PageTitle = styled(Title)`
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
  background: var(--client-background-secondary);
  border-radius: var(--client-border-radius-large);
  padding: 24px;
  border: 1px solid var(--client-border-primary);
  box-shadow: var(--client-shadow-sm);
`;

const SchedulePage: React.FC = () => {
  const [, setSelectedDate] = useState<Dayjs>(dayjs());
  const [selectedEvent, setSelectedEvent] = useState<Schedule | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHost, setSelectedHost] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  

  const { teamMembers } = useTeamData({
    includeMembers: true,
    activeOnly: true,
  });



  useEffect(() => {
    const fetchSchedules = async () => {
      
      try {
        const response = await scheduleService.getSchedules({
          page: 1,
          limit: 100, // Fetch enough for calendar view
        });
        if (response.success && response.data) {
          setSchedules(response.data.schedules);
        }
      } catch (error) {
        console.error('Failed to fetch schedules:', error);
      } finally {
        
      }
    };

    fetchSchedules();
  }, []);

  const filteredSchedules = useMemo(() => {
    return schedules.filter(event => {
      const hostName = teamMembers.find(member => member.id === event.userId)?.name || event.user?.realName || event.user?.nickname || '未知主持人';
      const matchesHost = selectedHost === 'all' || hostName === selectedHost;
      const matchesStatus = selectedStatus === 'all' || event.status === selectedStatus;
      return matchesHost && matchesStatus;
    });
  }, [schedules, selectedHost, selectedStatus, teamMembers]);

  const handleEventClick = (event: Schedule) => {
    setSelectedEvent(event);
    setModalVisible(true);

  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedEvent(null);
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle level={1}>档期查询</PageTitle>
        <Paragraph style={{ fontSize: '1.1rem', color: 'var(--client-text-secondary)', maxWidth: 600, margin: '0 auto' }}>
          查看我们团队的档期安排，选择合适的时间为您的特殊日子预约专业的主持服务。
        </Paragraph>
      </PageHeader>

      <CalendarContainer>
        <ScheduleFilter
          hosts={teamMembers.map(tm => ({ id: tm.userId, realName: tm.name, username: tm.name, email: '', role: 'user', status: 'active', createdAt: new Date(), updatedAt: new Date() }))}
          selectedHost={selectedHost}
          onHostChange={setSelectedHost}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />
        <ScheduleCalendar
          events={filteredSchedules}
          onSelectDate={setSelectedDate}
          onPanelChange={setSelectedDate}
          onEventClick={handleEventClick}
        />
      </CalendarContainer>

      <ScheduleDetailModal
        event={selectedEvent}
        visible={modalVisible}
        onClose={handleModalClose}
      />
    </PageContainer>
  );
};

export default SchedulePage;