import React from 'react';
import { Row, Col, Avatar, Typography, Spin } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { type Team } from '../../types';
import PageHeader from './PageHeader';
import { TeamCard } from './TeamCardStyles';
import { useTeamData } from '../../hooks/useTeamData';

const { Title, Text } = Typography;

interface TeamListProps {
  onTeamSelect: (team: Team) => void;
  limit?: number;
}

const  TeamList: React.FC<TeamListProps> = ({onTeamSelect, limit }) => {
  const { teams, loading: teamsLoading } = useTeamData({
    includeMembers: false,
    activeOnly: true,
  });

  const displayedTeams = limit ? teams.slice(0, limit) : teams;

  return (
    <>
      <PageHeader 
        title="专业团队"
        description="我们拥有多个专业的婚礼服务团队，每个团队都有丰富的经验和专业技能，为您提供完美的婚礼体验。"
      />
      
      <Spin spinning={teamsLoading}>
        <Row gutter={[24, 24]}>
          {displayedTeams.map((team) => (
          <Col xs={24} sm={12} lg={8} key={team.id}>
            <TeamCard onClick={() => onTeamSelect(team)} loading={teamsLoading}>
              <div className="team-avatar">
                <Avatar 
                  size={64} 
                  src={team.avatar}
                  icon={<TeamOutlined />}
                >
                  {team.name.charAt(0)}
                </Avatar>
              </div>
              
              <Title level={4} className="team-name">
                {team.name}
              </Title>
              
              {team.description && (
                <Text className="team-description">
                  {team.description}
                </Text>
              )}
              
              <div className="team-stats">
                <div className="stat-item">
                  <span className="stat-number">{team.memberCount || 0}</span>
                  <span className="stat-label">团队成员</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{team.completedProjects || 0}</span>
                  <span className="stat-label">完成项目</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{team.rating || 5.0}</span>
                  <span className="stat-label">评分</span>
                </div>
              </div>
            </TeamCard>
          </Col>
        ))}
        </Row>
      </Spin>
    </>
  );
};

export default TeamList;