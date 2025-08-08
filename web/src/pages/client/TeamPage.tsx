import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useTheme } from '../../hooks/useTheme';
import { useTeamData, type ClientTeamMember } from '../../hooks/useTeamData';
import { type Team } from '../../types';
import TeamList from '../../components/client/TeamList';
import TeamMemberList from '../../components/client/TeamMemberList';
import TeamMemberDetailModal from '../../components/client/TeamMemberDetailModal';

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 32px;

  @media (max-width: 768px) {
    padding: 60px 16px;
  }
`;

const TeamPage: React.FC = () => {
  const [selectedMember, setSelectedMember] = useState<ClientTeamMember | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const navigate = useNavigate();

  const { teamMembers, loading: membersLoading } = useTeamData({
    teamId: selectedTeam?.id,
    includeMembers: !!selectedTeam,
  });

  const { initTheme } = useTheme();

  useEffect(() => {
    initTheme('client');
  }, [initTheme]);

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
  };

  const handleBackToTeams = () => {
    setSelectedTeam(null);
  };

  const handleViewDetails = (userId: string) => {
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
        <TeamList 
          onTeamSelect={handleTeamSelect} 
        />
      ) : (
        <TeamMemberList 
          team={selectedTeam} 
          members={teamMembers} 
          loading={membersLoading} 
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
      />
    </PageContainer>
  );
};

export default TeamPage;