import React from 'react';
import { Row, Col } from 'antd';
import { CalendarOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import StatCard from './common/StatCard';
import type { Schedule, Team, TeamMember } from '../../types';
import { ScheduleStatus } from '../../types';

interface ScheduleStatsProps {
  schedules: Schedule[];
  selectedTeam?: Team | null;
  teamMembers: TeamMember[];
  statsTimeRange: string;
  statusFilter: string;
  customDateRange: [any, any];
}

const ScheduleStats: React.FC<ScheduleStatsProps> = ({
  schedules,
  selectedTeam,
  teamMembers,
  statsTimeRange,
  statusFilter,
  customDateRange
}) => {
  // 计算统计数据
  const getFilteredSchedules = () => {
    let filtered = schedules;

    // 时间范围过滤
    if (statsTimeRange === 'week') {
      const startOfWeek = dayjs().startOf('week');
      const endOfWeek = dayjs().endOf('week');
      filtered = filtered.filter(s => {
        const date = dayjs(s.weddingDate);
        return date.isAfter(startOfWeek) && date.isBefore(endOfWeek);
      });
    } else if (statsTimeRange === 'month') {
      const startOfMonth = dayjs().startOf('month');
      const endOfMonth = dayjs().endOf('month');
      filtered = filtered.filter(s => {
        const date = dayjs(s.weddingDate);
        return date.isAfter(startOfMonth) && date.isBefore(endOfMonth);
      });
    } else if (statsTimeRange === 'custom' && customDateRange[0] && customDateRange[1]) {
      filtered = filtered.filter(s => {
        const date = dayjs(s.weddingDate);
        return date.isAfter(customDateRange[0]) && date.isBefore(customDateRange[1]);
      });
    }

    // 状态过滤
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    // 团队过滤
    if (selectedTeam && teamMembers.length > 0) {
      const teamMemberIds = teamMembers.map(member => member.userId);
      filtered = filtered.filter(s => teamMemberIds.includes(s.userId));
    }

    return filtered;
  };

  const filteredSchedules = getFilteredSchedules();
  const totalSchedules = filteredSchedules.length;
  const confirmedSchedules = filteredSchedules.filter(s => s.status === ScheduleStatus.CONFIRMED).length;
  const bookedSchedules = filteredSchedules.filter(s => s.status === ScheduleStatus.BOOKED).length;
  const cancelledSchedules = filteredSchedules.filter(s => s.status === ScheduleStatus.CANCELLED).length;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={6}>
        <StatCard
          title="总档期数"
          value={totalSchedules}
          prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
        />
      </Col>
      <Col xs={24} sm={12} md={6}>
        <StatCard
          title="已确认"
          value={confirmedSchedules}
          prefix={<CalendarOutlined style={{ color: '#52c41a' }} />}
        />
      </Col>
      <Col xs={24} sm={12} md={6}>
        <StatCard
          title="已预订"
          value={bookedSchedules}
          prefix={<CalendarOutlined style={{ color: '#faad14' }} />}
        />
      </Col>
      <Col xs={24} sm={12} md={6}>
        <StatCard
          title="已取消"
          value={cancelledSchedules}
          prefix={<CalendarOutlined style={{ color: '#ff4d4f' }} />}
        />
      </Col>
      {selectedTeam && (
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="团队成员"
            value={teamMembers.length}
            prefix={<UserOutlined style={{ color: '#722ed1' }} />}
          />
        </Col>
      )}
    </Row>
  );
};

export default ScheduleStats;