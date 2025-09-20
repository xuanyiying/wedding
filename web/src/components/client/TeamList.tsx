import React from 'react';
import { Row, Col, Avatar, Typography, Spin } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { type Team } from '../../types';
import PageHeader from './PageHeader';
import { TeamCard } from './TeamCardStyles';
import { useTeamData } from '../../hooks/useTeamData';
import { useSiteSettings } from '../../hooks/useSiteSettings';

const { Title, Text } = Typography;

interface TeamListProps {
  onTeamSelect: (team: Team) => void;
  limit?: number;
  title?: string;
  description?: string;
}

const TeamList: React.FC<TeamListProps> = ({ onTeamSelect, limit, title, description }) => {
  const { teams, loading: teamsLoading } = useTeamData({
    includeMembers: false,
    activeOnly: true,
  });
  
  const { settings } = useSiteSettings();

  const displayedTeams = limit ? teams.slice(0, limit) : teams;

  // 使用动态配置的标题和描述，如果没有传入props则使用默认值
  const pageTitle = title || settings?.homepageSections?.team?.title || '专业团队';
  const pageDescription = description || settings?.homepageSections?.team?.description || '我们拥有多个专业的婚礼服务团队，每个团队都有丰富的经验和专业技能，为您提供完美的婚礼体验。';

  return (
    <>
      <PageHeader
        title={pageTitle}
        description={pageDescription}
      />

      <Spin spinning={teamsLoading}>
        <Row gutter={[48, 48]}>
          {displayedTeams.map((team) => (
            <Col xs={24} sm={36} lg={12} key={team.id}>
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
              </TeamCard>
            </Col>
          ))}
        </Row>
      </Spin>
    </>
  );
};

export default TeamList;