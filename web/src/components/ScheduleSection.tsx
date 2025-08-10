import React, { useState } from 'react';
import { Typography, Empty } from 'antd';
import styled from 'styled-components';
import { scheduleService } from '../services';
import { useTeamData } from '../hooks/useTeamData';
import QueryBar, { type QueryFilters } from './common/QueryBar';
import TeamMemberCard from './client/TeamMemberCard';
import TeamMemberDetailModal from './client/TeamMemberDetailModal';
import type { ClientTeamMember } from '../hooks/useTeamData';

// 可用团队成员接口
interface AvailableMember {
  userId: string;
  name: string;
  avatar: string;
  status: any;
  specialties: string[];
  experienceYears: number;
}

const { Title } = Typography;

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

const MembersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  margin-top: 32px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;


const SectionDescription = styled(Typography.Paragraph)`
  &&& {
    font-size: 1.1rem;
    color: var(--client-text-secondary);
    text-align: center;
    max-width: 600px;
    margin: 0 auto 48px;
    line-height: 1.6;

    @media (max-width: 768px) {
      font-size: 1rem;
      margin-bottom: 32px;
    }
  }
`;

interface ScheduleSectionProps {
  title: string;
  description: string;
}

const ScheduleSection: React.FC<ScheduleSectionProps> = ({ title, description }) => {
  const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ClientTeamMember | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { teamMembers } = useTeamData();

  // 处理查询
  const handleQuery = async (filters: QueryFilters) => {
    try {
      setLoading(true);
      
      // 获取指定日期范围内的可用日程
      const response = await scheduleService.getSchedules({
        page: 1,
        limit: 100,
        startDate: filters.date?.format('YYYY-MM-DD'),
        endDate: filters.date?.format('YYYY-MM-DD'),
      });

      // 提取有档期的团队成员
      const memberIds = [...new Set(response.data?.schedules.map(schedule => schedule.userId))];
      const available = memberIds.map(userId => {
        const member = teamMembers.find(m => m.userId === userId);
        if (member) {
          return {
            userId: member.userId,
            name: member.name,
            avatar: member.avatar,
            status: member.status,
            specialties: member.specialties || [],
            experienceYears: member.experienceYears || 0
          };
        }
        return null;
      }).filter(Boolean) as AvailableMember[];

      setAvailableMembers(available);
    } catch (error) {
      console.error('查询可用主持人失败:', error);
      setAvailableMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // 处理团队成员卡片点击
  const handleMemberClick = (member: AvailableMember) => {
    const fullMember = teamMembers.find(m => m.userId === member.userId);
    if (fullMember) {
      setSelectedMember(fullMember);
      setModalVisible(true);
    }
  };

  // 关闭详情弹窗
  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedMember(null);
  };

  return (
    <SectionContainer id="schedule">
      <ContentWrapper>
        <SectionHeader>
          <SectionTitle>{title}</SectionTitle>
          <SectionDescription>{description}</SectionDescription>
        </SectionHeader>
        
        <QueryBar
          onQuery={handleQuery}
          onReset={() => setAvailableMembers([])}
          showMealFilter={true}
          showMemberFilter={false}
          loading={loading}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Typography.Text>正在查询可用主持人...</Typography.Text>
          </div>
        ) : availableMembers.length > 0 ? (
          <MembersGrid>
            {availableMembers.map(member => (
              <TeamMemberCard
                key={member.userId}
                userId={member.userId}
                name={member.name}
                avatar={member.avatar}
                status={member.status}
                specialties={member.specialties}
                experienceYears={member.experienceYears}
                onViewDetails={(id) => {
                  const selected = availableMembers.find(m => m.userId === id);
                  if (selected) {
                    handleMemberClick(selected);
                  }
                }}
                onMemberClick={() => handleMemberClick(member)}
              />
            ))}
          </MembersGrid>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Empty
              description="请选择日期范围查询可用的主持人"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        )}

        {selectedMember && (
          <TeamMemberDetailModal
            member={selectedMember}
            visible={modalVisible}
            onClose={handleModalClose}
          />
        )}
      </ContentWrapper>
    </SectionContainer>
  );
};

export default ScheduleSection;