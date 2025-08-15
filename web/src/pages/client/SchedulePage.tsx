import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Spin, Empty } from 'antd';
import styled from 'styled-components';
import { scheduleService } from '../../services';
import { useTeamData } from '../../hooks/useTeamData';
import QueryBar, { type QueryFilters } from '../../components/common/QueryBar';
import TeamMemberCard from '../../components/client/TeamMemberCard';
import TeamMemberDetailModal from '../../components/client/TeamMemberDetailModal';
import type { ClientTeamMember } from '../../hooks/useTeamData';
import { useSiteSettings } from '../../hooks';
import dayjs from 'dayjs';

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
  const { settings} = useSiteSettings();

  const { teamMembers } = useTeamData({
    includeMembers: true,
    activeOnly: true,
  });

  // 页面加载时自动查询当天档期
  useEffect(() => {
    const today = dayjs();
    handleQuery({ date: today });
  }, [teamMembers]);

  // 查询没有档期的团队成员
  const handleQuery = async (filters: QueryFilters) => {
    setLoading(true);
    try {
      const response = await scheduleService.getSchedules({
        userId: filters.userId,
        startDate: filters.date?.format('YYYY-MM-DD') || undefined,
        endDate: filters.date?.format('YYYY-MM-DD') || undefined,
        status: 'available',
        page: 1,
        limit: 100,
      });
      
      if (response.success && response.data) {
        // 从档期数据中提取有档期的团队成员ID
        const busyMemberIds = [...new Set(response.data.schedules.map(schedule => schedule.userId))];
        // 筛选出没有档期的团队成员
        const availableTeamMembers = teamMembers.filter(member => 
          !busyMemberIds.includes(member.userId)
        );
        setAvailableMembers(availableTeamMembers);
      } else {
        // 如果没有档期数据，说明所有成员都可用
        setAvailableMembers(teamMembers);
      }
    } catch (error) {
      // 出错时显示所有成员
      setAvailableMembers(teamMembers);
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
        <PageTitle level={1}>{settings?.homepageSections?.schedule?.title || '档期查询'}</PageTitle>
        <Paragraph style={{ fontSize: '1.1rem', color: 'var(--client-text-secondary)', maxWidth: 600, margin: '0 auto' }}>
          {settings?.homepageSections?.schedule?.description || '查看我们团队的档期安排，选择合适的时间为您的特殊日子预约专业的主持服务。'}
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
            description={loading ? "正在加载..." : "当前日期暂无可预约的主持人"}
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