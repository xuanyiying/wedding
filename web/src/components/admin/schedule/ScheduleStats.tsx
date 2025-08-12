import React from 'react';
import { Row, Col, Card, Segmented, DatePicker, Select, List, Avatar, Space, Tag } from 'antd';
import { BarChartOutlined, TrophyOutlined, DollarOutlined, TeamOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons';
import { StatCard } from '../common';
import { ScheduleStatus, type Schedule, type TeamMember } from '../../../types';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
const { RangePicker } = DatePicker;
const { Option } = Select;

interface ScheduleStatsProps {
  schedules: Schedule[];
  teamMembers: TeamMember[];
  selectedTeam?: any;
  statsTimeRange: 'month' | 'quarter' | 'year' | 'custom';
  statusFilter: string;
  customDateRange: [Dayjs | null, Dayjs | null];
  showDetailedStats: boolean;
  onStatsTimeRangeChange: (value: 'month' | 'quarter' | 'year' | 'custom') => void;
  onStatusFilterChange: (value: string) => void;
  onCustomDateRangeChange: (dates: [Dayjs | null, Dayjs | null]) => void;
  onShowDetailedStatsChange: (show: boolean) => void;
}

const ScheduleStats: React.FC<ScheduleStatsProps> = ({
  schedules,
  teamMembers,
  selectedTeam,
  statsTimeRange,
  statusFilter,
  customDateRange,
  showDetailedStats,
  onStatsTimeRangeChange,
  onStatusFilterChange,
  onCustomDateRangeChange,
  onShowDetailedStatsChange
}) => {
  // 根据时间范围过滤档期数据
  const getFilteredSchedulesByTimeRange = (timeRange: 'month' | 'quarter' | 'year' | 'custom') => {
    const now = dayjs();
    return schedules.filter(s => {
      const scheduleDate = dayjs(s.weddingDate);
      switch (timeRange) {
        case 'month':
          return scheduleDate.isSame(now, 'month');
        case 'quarter':
          const currentQuarter = Math.floor(now.month() / 3);
          const scheduleQuarter = Math.floor(scheduleDate.month() / 3);
          return scheduleDate.year() === now.year() && scheduleQuarter === currentQuarter;
        case 'year':
          return scheduleDate.isSame(now, 'year');
        case 'custom':
          if (!customDateRange[0] || !customDateRange[1]) {
            return true;
          }
          return scheduleDate.isSame(customDateRange[0], 'day') || 
                 scheduleDate.isAfter(customDateRange[0], 'day') &&
                 (scheduleDate.isSame(customDateRange[1], 'day') || 
                 scheduleDate.isBefore(customDateRange[1], 'day'));
        default:
          return false;
      }
    });
  };

  // 统计数据计算
  const filteredSchedules = getFilteredSchedulesByTimeRange(statsTimeRange);
  const statusFilteredSchedules = statusFilter === 'all' 
    ? filteredSchedules 
    : filteredSchedules.filter(s => s.status === statusFilter);
  
  const stats = {
    total: schedules.length,
    current: filteredSchedules.length,
    available: filteredSchedules.filter(s => s.status === ScheduleStatus.AVAILABLE).length,
    confirmed: filteredSchedules.filter(s => s.status === ScheduleStatus.CONFIRMED).length,
    completed: filteredSchedules.filter(s => s.status === ScheduleStatus.COMPLETED).length,
    revenue: Number(filteredSchedules.filter(s => s.status === ScheduleStatus.COMPLETED)
      .reduce((sum, s) => sum + (s.price || 0), 0)).toFixed(2),
    filtered: statusFilteredSchedules.length,
    filteredRevenue: Number(statusFilteredSchedules.filter(s => s.status === ScheduleStatus.COMPLETED)
      .reduce((sum, s) => sum + (s.price || 0), 0)).toFixed(2)
  };

  // 团队统计
  const getTeamStats = () => {
    if (!selectedTeam || teamMembers.length === 0) return [];
    
    return teamMembers.map(member => {
      const memberSchedules = statusFilteredSchedules.filter(s => s.userId === member.id);
      return {
        id: member.id,
        name: member.user.realName || member.user.nickname || '未知',
        avatar: member.user.avatarUrl,
        total: memberSchedules.length,
        completed: memberSchedules.filter(s => s.status === ScheduleStatus.COMPLETED).length,
        revenue: Number(memberSchedules.filter(s => s.status === ScheduleStatus.COMPLETED)
          .reduce((sum, s) => sum + (s.price || 0), 0)).toFixed(2)
      };
    }).sort((a, b) => b.completed - a.completed);
  };

  const teamStats = getTeamStats();

  return (
    <>
      {/* 统计时间范围选择器 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space wrap>
            <Segmented
              value={statsTimeRange}
              onChange={onStatsTimeRangeChange}
              options={[
                { label: '本月', value: 'month' },
                { label: '本季度', value: 'quarter' },
                { label: '本年', value: 'year' },
                { label: '自定义', value: 'custom' }
              ]}
            />
            {statsTimeRange === 'custom' && (
              <RangePicker
                value={customDateRange}
                onChange={(dates) => onCustomDateRangeChange(dates as [Dayjs | null, Dayjs | null])}
                placeholder={['开始日期', '结束日期']}
              />
            )}
          </Space>
        </Col>
        <Col>
          <Space>
            <Select
              value={statusFilter}
              onChange={onStatusFilterChange}
              style={{ width: 120 }}
            >
              <Option value="all">全部状态</Option>
              <Option value={ScheduleStatus.AVAILABLE}>可预约</Option>
              <Option value={ScheduleStatus.BOOKED}>已预订</Option>
              <Option value={ScheduleStatus.CONFIRMED}>已确认</Option>
              <Option value={ScheduleStatus.COMPLETED}>已完成</Option>
              <Option value={ScheduleStatus.CANCELLED}>已取消</Option>
            </Select>
          </Space>
        </Col>
      </Row>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="总档期"
            value={stats.total}
            prefix={<BarChartOutlined style={{ color: '#1890ff' }} />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title={`${statsTimeRange === 'month' ? '本月' : statsTimeRange === 'quarter' ? '本季度' : statsTimeRange === 'year' ? '本年' : '筛选'}档期`}
            value={statusFilter === 'all' ? stats.current : stats.filtered}
            prefix={<CalendarOutlined style={{ color: '#52c41a' }} />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="已完成"
            value={stats.completed}
            prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="总收入"
            value={`¥${statusFilter === 'all' ? stats.revenue : stats.filteredRevenue}`}
            prefix={<DollarOutlined style={{ color: '#f5222d' }} />}
          />
        </Col>
      </Row>

      {/* 团队统计 */}
      {selectedTeam && teamStats.length > 0 && (
        <Card 
          title={(
            <Space>
              <TeamOutlined />
              <span>{selectedTeam.name} 团队统计</span>
            </Space>
          )}
          style={{ marginBottom: 24 }}
          extra={
            <a onClick={() => onShowDetailedStatsChange(!showDetailedStats)}>
              {showDetailedStats ? '收起' : '展开'}
            </a>
          }
        >
          {showDetailedStats && (
            <List
              dataSource={teamStats}
              renderItem={member => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar src={member.avatar} icon={<UserOutlined />} />}
                    title={member.name}
                    description={
                      <Space>
                        <Tag color="blue">总档期: {member.total}</Tag>
                        <Tag color="green">已完成: {member.completed}</Tag>
                        <Tag color="orange">收入: ¥{member.revenue}</Tag>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      )}
    </>
  );
};

export default ScheduleStats;