import React from 'react';
import { Row, Col, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { type Team } from '../../types';
import PageHeader from './PageHeader';
import TeamMemberCard from './TeamMemberCard';
import type { ClientTeamMember } from '../../hooks/useTeamData';

const BackButton = styled(Button)`
  &&& {
    margin-bottom: 24px;
    border-color: var(--client-primary-main);
    color: var(--client-primary-main);
    
    &:hover {
      background: var(--client-primary-main);
      color: var(--client-state-inverse);
    }
  }
`;

interface TeamMemberListProps {
  team: Team;
  members: ClientTeamMember[];
  loading: boolean;
  onBack: () => void;
  onViewDetails: (userId: string) => void;
  onMemberClick: (member: ClientTeamMember) => void;
}

const TeamMemberList: React.FC<TeamMemberListProps> = ({ team, members, loading, onBack, onViewDetails, onMemberClick }) => {
  return (
    <>
      <BackButton 
        icon={<ArrowLeftOutlined />} 
        onClick={onBack}
      >
        返回团队列表
      </BackButton>
      
      <PageHeader 
        title={`${team.name} - 团队成员`}
        description={team.description || "查看我们专业团队的成员信息，每一位成员都致力于为您打造完美的婚礼体验。"}
      />
      
      <Row gutter={[30, 30]}>
        {members.map((member) => (
          <Col xs={24} sm={12} lg={8} key={member.id}>
            <TeamMemberCard
              userId={member.userId}
              name={member.name}
              avatar={member.avatar || ''}
              status={member.status}
              specialties={member.specialties || []}
              experienceYears={member.experienceYears || 0}
              onViewDetails={() => onViewDetails(member.userId)}
              onMemberClick={() => onMemberClick(member)}
              loading={loading}
            />
          </Col>
        ))}
      </Row>
    </>
  );
};

export default TeamMemberList;