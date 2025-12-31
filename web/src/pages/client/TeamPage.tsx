import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useTeamData, type ClientTeamMember } from '../../hooks/useTeamData';
import { type Team } from '../../types';
import TeamList from '../../components/client/TeamList';
import TeamMemberList from '../../components/client/TeamMemberList';
import TeamMemberDetailModal from '../../components/client/TeamMemberDetailModal';
import { useAppSettings } from '../../hooks';
import { usePageView } from '../../hooks/usePageView';
import { PageViewService } from '../../services/page-view.ts';
import { teamService } from '../../services';

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const TeamPage: React.FC = () => {
  const [selectedMember, setSelectedMember] = useState<ClientTeamMember | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { settings } = useAppSettings();

  // 团队页面整体访问统计
  usePageView('team_page', 'main');

  // 选中团队的访问统计
  React.useEffect(() => {
    if (selectedTeam) {
      PageViewService.recordPageView('team', selectedTeam.id);
    }
  }, [selectedTeam?.id]);

  const { teamMembers, loading: membersLoading } = useTeamData({
    teamId: selectedTeam?.id,
    includeMembers: !!selectedTeam,
  });

  // 如果URL中有团队ID，直接加载该团队信息
  useEffect(() => {
    if (id) {
      const loadTeam = async () => {
        setTeamsLoading(true);
        try {
          const response = await teamService.getTeamById(id);
          setSelectedTeam(response.data || null);
        } catch (error) {
          console.error('Failed to load team:', error);
        } finally {
          setTeamsLoading(false);
        }
      };

      loadTeam();
    }
  }, [id]);

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    // 记录团队页面访问
    PageViewService.recordPageView('team', team.id);
    // 更新URL但不刷新页面
    navigate(`/team/${team.id}`, { replace: true });
  };

  const handleBackToTeams = () => {
    setSelectedTeam(null);
    // 返回到团队列表页面
    navigate('/team', { replace: true });
  };

  const handleViewDetails = (userId: string) => {
    // 优先从 teamMembers 中查找
    const member = teamMembers.find(m => m.userId === userId);
    if (member) {
      setSelectedMember(member);
      setModalVisible(true);
    }
  };

  const handleMemberClick = (member: ClientTeamMember) => {
    setSelectedMember(member);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedMember(null);
  };

  return (
    <PageContainer>
      {!selectedTeam ? (
        settings?.homepage?.team?.visible && (
          <TeamList
            onTeamSelect={handleTeamSelect}
            title={settings?.homepage?.team?.title || ''}
            description={settings?.homepage?.team?.description || ''}
          />
        )
      ) : (
        <TeamMemberList
          team={selectedTeam}
          members={teamMembers}
          loading={membersLoading || teamsLoading}
          onBack={handleBackToTeams}
          onViewDetails={handleViewDetails}
          onMemberClick={handleMemberClick}
        />
      )}

      <TeamMemberDetailModal
        visible={modalVisible}
        member={selectedMember}
        onClose={handleModalClose}
        onContact={() => navigate('/contact')}
        isStandalonePage={false}
      />
    </PageContainer>
  );
};

export default TeamPage;