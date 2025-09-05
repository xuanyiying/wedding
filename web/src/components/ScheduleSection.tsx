import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Typography, Empty, Col, Row, message } from 'antd';
import styled from 'styled-components';
import dayjs from 'dayjs';
import { scheduleService } from '../services';
import { useTeamData } from '../hooks/useTeamData';
import QueryBar, { type QueryFilters } from './common/QueryBar';
import TeamMemberCard from './client/TeamMemberCard';
import TeamMemberDetailModal from './client/TeamMemberDetailModal';
import type { ClientTeamMember } from '../hooks/useTeamData';
import type { Team } from '../types';
import { transformTeamMember } from '../utils/team';


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
  team?: Team;

}

const ScheduleSection: React.FC<ScheduleSectionProps> = ({ title, description, team }) => {
  const [availableMembers, setAvailableMembers] = useState<ClientTeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasQueried, setHasQueried] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ClientTeamMember | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { teamMembers } = useTeamData();
  
  // 使用useMemo确保today对象不会在每次渲染时重新创建
  const today = useMemo(() => dayjs(), []);
  
  // 使用ref跟踪请求状态，避免重复请求
  const isRequestingRef = useRef(false);

  // 稳定initialFilters对象，避免每次渲染时创建新对象
  const initialFilters = useMemo(() => ({
    teamId: 'all',
    date: today,
    mealType: 'lunch' as const
  }), [today]);

  // 处理查询
  const handleQuery = useCallback(async (filters: QueryFilters) => {
    // 防止重复请求
    if (isRequestingRef.current) {
      return;
    }

    try {
      isRequestingRef.current = true;
      setLoading(true);
      setError(null);
      setAvailableMembers([]);

      const queryParams = {
        teamId: team?.id || 'all',
        weddingDate: filters.date?.format('YYYY-MM-DD') || today.format('YYYY-MM-DD'),
        weddingTime: filters.mealType as string || 'lunch',
      };

      const result = await scheduleService.getAvailableHosts(queryParams);

      if (result.data && Array.isArray(result.data.hosts)) {
        const available = result.data.hosts.map(host => transformTeamMember(host));
        setAvailableMembers(available);
        setHasQueried(true);
        
        if (available.length === 0) {
          message.info('当前时间段暂无可用主持人');
        }
      } else {
        setAvailableMembers([]);
        setError('数据格式异常');
        message.error('获取数据失败，请稍后重试');
      }
    } catch (error: any) {
      setAvailableMembers([]);
      setError(error?.message || '查询失败');
      message.error('查询可用主持人失败，请检查网络连接后重试');
    } finally {
      setLoading(false);
      isRequestingRef.current = false;
    }
  }, [team?.id]);

  // 页面加载时自动查询当天可预约的团队成员
  useEffect(() => {
    let isMounted = true;
    
    const initQuery = async () => {
      if (!isMounted) return;
      await handleQuery({ date: today, mealType: 'lunch' });
    };
    
    const timer = setTimeout(initQuery, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  // 当team变化时重新查询
  useEffect(() => {
    if (team?.id && hasQueried) {
      handleQuery({ date: today, mealType: 'lunch' });
    }
  }, [team?.id]);

  // 处理团队成员卡片点击
  const handleMemberClick = (member: ClientTeamMember) => {
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
  const handleViewDetails = (userId: string) => {
    const member = teamMembers.find(m => m.userId === userId);
    if (member) {
      setSelectedMember(member);
      setModalVisible(true);
    }
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
          initialFilters={initialFilters}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Typography.Text>正在查询可用主持人...</Typography.Text>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Empty
              description={`查询失败: ${error}`}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : availableMembers.length > 0 ? (
          <Row gutter={[30, 30]}>
            {availableMembers.map((member) => (
              <Col xs={24} sm={12} lg={8} key={member.id}>
                <TeamMemberCard
                  userId={member.userId}
                  name={member?.name || '匿名'}
                  avatar={member.avatar || ''}
                  status={member.status}
                  specialties={member.specialties || []}
                  experienceYears={member.experienceYears || 0}
                  onViewDetails={() => handleViewDetails(member.userId)}
                  onMemberClick={() => handleMemberClick(member)}
                  loading={loading}
                />
              </Col>
            ))}
          </Row>
        ) : hasQueried ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Empty
              description="当前日期所有团队成员都已有档期安排"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Typography.Text type="secondary">请选择日期和时段查询可用主持人</Typography.Text>
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