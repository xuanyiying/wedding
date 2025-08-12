import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useTeamData, type ClientTeamMember } from '../../hooks/useTeamData';
import { type Team } from '../../types';
import TeamList from '../../components/client/TeamList';
import TeamMemberList from '../../components/client/TeamMemberList';
import TeamMemberDetailModal from '../../components/client/TeamMemberDetailModal';
import { useSiteSettings } from '../../hooks';

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
  const navigate = useNavigate();
const { settings} = useSiteSettings();
  const { teamMembers, loading: membersLoading } = useTeamData({
    teamId: selectedTeam?.id,
    includeMembers: !!selectedTeam,
  });



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
          limit={3} title={settings?.homepageSections?.team?.title || ''} 
          description={settings?.homepageSections?.team?.description || ''}        />
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