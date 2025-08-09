import { message } from 'antd';
import React, { useState, useCallback } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { type Team } from '../../types';
import HeroSection from '../../components/client/HeroSection';
import ShowcaseSection from '../../components/client/ShowcaseSection';
import { useOutletContext } from 'react-router-dom';
import WorksList from '../../components/client/WorksList';
import TeamList from '../../components/client/TeamList';
import TeamMemberList from '../../components/client/TeamMemberList';
import ContactForm from '../../components/client/ContactForm';
import { ScrollNavigation } from '../../components/client/ScrollNavigation';
import TeamMemberDetailModal from '../../components/client/TeamMemberDetailModal';
import ScheduleSection from '../../components/ScheduleSection';
import { worksService } from '../../services';
import { useTeamData, type ClientTeamMember } from '../../hooks/useTeamData';
import styled from 'styled-components';

interface OutletContextType {
  setActiveSection: (sectionId: string) => void;
}

const SectionWrapper = styled.section`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const HomePage: React.FC = () => {
  const [homepageBackgroundImage, setHomepageBackgroundImage] = useState<string | undefined>(undefined);
  
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ClientTeamMember | null>(null);

  const { teamMembers, loading: membersLoading } = useTeamData({
    teamId: selectedTeam?.id,
    includeMembers: !!selectedTeam,
  });

  const { setActiveSection } = useOutletContext<OutletContextType>();
  const { } = useTheme();

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

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedMember(null);
  };

  // 获取作品数据
  const fetchPortfolioItems = useCallback(async () => {
    try {
      
      await worksService.getWorks();
    } catch (error) {
      console.error('Failed to fetch portfolio items:', error);
      message.error('获取作品信息失败');
    } finally {
      
    }
  }, []);


  
  return (
    <div>
      <ScrollNavigation 
        sections={[
          { id: 'hero', path: '/' }, 
          { id: 'team', path: '/' }, 
          { id: 'schedule', path: '/schedule' }, 
          { id: 'portfolio', path: '/works' }, 
          { id: 'contact', path: '/contact' }
        ]} 
        onSectionChange={setActiveSection} 
      />
      
      {/* Hero Section */}
      <section id="hero">
        <HeroSection
          title="完美婚礼，从这里开始"
          description="专业的婚礼策划团队，为您打造独一无二的梦想婚礼"
          ctaText="开始策划您的婚礼"
          ctaLink="/contact"
          backgroundImage={homepageBackgroundImage}
        />
      </section>

      {/* Team Showcase */}
      <SectionWrapper id="team">
          {selectedTeam ? (
            <TeamMemberList 
              team={selectedTeam} 
              members={teamMembers}
              loading={membersLoading}
              onBack={handleBackToTeams} 
              onViewDetails={handleViewDetails}
              onMemberClick={handleMemberClick}
            />
          ) : (
            <TeamList onTeamSelect={handleTeamSelect} limit={3} />
          )}
      </SectionWrapper>

      {/* Portfolio Showcase */}
      <SectionWrapper id="portfolio">
        <ShowcaseSection
          title="精选作品"
          moreText="查看更多作品"
          moreLink="/works"
          id="portfolio"
        >
          <WorksList showFilters={false} showPagination={false} limit={3} />
        </ShowcaseSection>
      </SectionWrapper>

      {/* Schedule Section */}
      <SectionWrapper id="schedule">
        <ScheduleSection />
      </SectionWrapper>

      {/* Contact Section */}
      <SectionWrapper id="contact">
        <ShowcaseSection
          title="联系我们"
          moreText="获取详细联系方式"
          moreLink="/contact"
          id="contact"
        >
          <ContactForm />
        </ShowcaseSection>
      </SectionWrapper>

      {selectedMember && (
        <TeamMemberDetailModal
          member={selectedMember}
          visible={modalVisible}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default HomePage;