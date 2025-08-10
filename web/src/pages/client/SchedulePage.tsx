import React, { useState } from 'react';
import { Typography, Row, Col, Spin, Empty } from 'antd';
import styled from 'styled-components';
import { scheduleService } from '../../services';
import { useTeamData } from '../../hooks/useTeamData';
import QueryBar, { type QueryFilters } from '../../components/common/QueryBar';
import TeamMemberCard from '../../components/client/TeamMemberCard';
import TeamMemberDetailModal from '../../components/client/TeamMemberDetailModal';
import type { ClientTeamMember } from '../../hooks/useTeamData';

const { Title, Paragraph } = Typography;

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  @media (max-width: 768px) {
    padding: 1rem;
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
  const [availableMembers, setAvailableMembers] = useState<ClientTeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<ClientTeamMember | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  

  const { teamMembers } = useTeamData({
    includeMembers: true,
    activeOnly: true,
  });

  // 查询有档期的团队成员
  const handleQuery = async (filters: QueryFilters) => {
    setLoading(true);
    try {
      const response = await scheduleService.getSchedules({
        userId: filters.memberId,
        startDate: filters.date?.format('YYYY-MM-DD'),
        endDate: filters.date?.format('YYYY-MM-DD'),
        status: 'available',
        page: 1,
        limit: 100,
      });
      
      if (response.success && response.data) {
        // 从档期数据中提取有档期的团队成员
        const memberIds = [...new Set(response.data.schedules.map(schedule => schedule.userId))];
        const availableTeamMembers = teamMembers.filter(member => 
          memberIds.includes(member.userId)
        );
        setAvailableMembers(availableTeamMembers);
      }
    } catch (error) {
      console.error('查询档期失败:', error);
      setAvailableMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // 重置查询
  const handleReset = () => {
    setAvailableMembers([]);
  };

  // 查看团队成员详情
  const handleViewDetails = (userId: string) => {
    const member = teamMembers.find(m => m.userId === userId);
    if (member) {
      setSelectedMember(member);
      setModalVisible(true);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedMember(null);
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
        <QueryBar
          onQuery={handleQuery}
          onReset={handleReset}
          showMealFilter={true}
          loading={loading}
        />
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: 'var(--client-text-secondary)' }}>正在查询档期...</div>
          </div>
        ) : availableMembers.length > 0 ? (
          <div style={{ marginTop: 24 }}>
            <Typography.Title level={4} style={{ marginBottom: 16, color: 'var(--client-text-primary)' }}>
              查询结果 ({availableMembers.length}位主持人有档期)
            </Typography.Title>
            <Row gutter={[24, 24]}>
              {availableMembers.map((member) => (
                <Col key={member.userId} xs={24} sm={12} md={8} lg={6}>
                  <TeamMemberCard
                    userId={member.userId}
                    name={member.name}
                    avatar={member.avatar}
                    status={member.status}
                    specialties={member.specialties}
                    experienceYears={member.experienceYears}
                    onViewDetails={handleViewDetails}
                  />
                </Col>
              ))}
            </Row>
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="请使用上方查询条件查找有档期的主持人"
            style={{ margin: '60px 0', color: 'var(--client-text-secondary)' }}
          />
        )}
      </CalendarContainer>

      <TeamMemberDetailModal
        member={selectedMember}
        visible={modalVisible}
        onClose={handleModalClose}
      />
    </PageContainer>
  );
};

export default SchedulePage;