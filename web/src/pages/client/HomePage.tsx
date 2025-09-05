import React, { useState } from 'react';
import styled from 'styled-components';

import { type Team } from '../../types';
import HeroSection from '../../components/client/HeroSection';
import ShowcaseSection from '../../components/client/ShowcaseSection';
import { useOutletContext } from 'react-router-dom';
import WorksList from '../../components/client/WorksList';
import ContactForm from '../../components/client/ContactForm';
import { ScrollNavigation } from '../../components/client/ScrollNavigation';
import TeamMemberDetailModal from '../../components/client/TeamMemberDetailModal';
import ScheduleSection from '../../components/ScheduleSection';
import { type ClientTeamMember } from '../../hooks/useTeamData';
import TeamList from '../../components/client/TeamList';
import TeamShowcaseSection from '../../components/client/TeamShowcaseSection';
import { useSiteSettings } from '../../hooks';

interface OutletContextType {
  setActiveSection: (sectionId: string) => void;
}

const PageContainer = styled.div`
  position: relative;
`;

const SectionWrapper = styled.section`
  max-width: 1200px;
  margin: 0 auto;
  padding: 4rem 2rem;
  min-height: 60vh;
  scroll-margin-top: 64px; /* 为固定导航栏预留空间 */
  
  /* 确保section有足够的高度用于滚动检测 */
  &:first-child {
    padding-top: 0;
    min-height: 100vh;
  }
  
  &:last-child {
    min-height: 80vh;
    padding-bottom: 6rem;
  }

  @media (max-width: 768px) {
    padding: 3rem 1rem;
    min-height: 50vh;
    
    &:first-child {
      min-height: 90vh;
    }
    
    &:last-child {
      min-height: 70vh;
      padding-bottom: 4rem;
    }
  }
`;

const HeroSectionWrapper = styled.section`
  scroll-margin-top: 64px;
  min-height: 100vh;
  position: relative;
`;

const HomePage: React.FC = () => {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ClientTeamMember | null>(null);

  // 使用站点设置钩子
  const { settings } = useSiteSettings();

  const { setActiveSection } = useOutletContext<OutletContextType>();

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
  };
  
  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedMember(null);
  };

  const heroSectionSettings = settings?.homepageSections?.hero;
  const portfolioSectionSettings = settings?.homepageSections?.portfolio;
  const scheduleSectionSettings = settings?.homepageSections?.schedule;
  const contactSectionSettings = settings?.homepageSections?.contact;

  return (
    <PageContainer>
      <ScrollNavigation
        sections={[
          { id: 'hero', path: '/' },
          { id: 'team', path: '/' },
          { id: 'portfolio', path: '/works' },
          { id: 'schedule', path: '/schedule' },
          { id: 'contact', path: '/contact' }
        ]}
        onSectionChange={setActiveSection}
        headerHeight={64}
      />

      {/* Hero Section */}
      <HeroSectionWrapper id="hero">
        <HeroSection
          title={heroSectionSettings?.title || '完美婚礼，从这里开始'}
          description={heroSectionSettings?.description || '专业的婚礼策划团队，为您打造独一无二的梦想婚礼'}
          ctaText={heroSectionSettings?.ctaText || '开始策划您的婚礼'}
          ctaLink={heroSectionSettings?.ctaLink || '/contact'}
        />
      </HeroSectionWrapper>

      {/* Team Section */}
      {settings?.homepageSections?.team?.visible && (
        <SectionWrapper id="team">
          <TeamList
            title={settings.homepageSections.team.title}
            description={settings.homepageSections.team.description}
            onTeamSelect={handleTeamSelect}
          />
        </SectionWrapper>
      )}

      {/* Team Showcase */}
      {settings?.homepageSections?.teamShowcase?.visible && (
        <TeamShowcaseSection
          team={selectedTeam as Team}
          title={settings.homepageSections.teamShowcase.title}
          description={settings.homepageSections.teamShowcase.description}
          visible={settings.homepageSections.teamShowcase.visible}
        />
      )}

      {/* Portfolio Showcase */}
      {settings?.homepageSections?.portfolio?.visible && (
        <SectionWrapper id="portfolio">
          <ShowcaseSection
            title={portfolioSectionSettings?.title || "精选作品"}
            moreText="查看更多作品"
            moreLink="/works"
            id="portfolio"
          >
            <WorksList showFilters={false} showPagination={false} limit={3} />
          </ShowcaseSection>
        </SectionWrapper>
      )}

      {/* Schedule Section */}
      {settings?.homepageSections?.schedule?.visible && (
        <SectionWrapper id="schedule">
          <ScheduleSection
            team={selectedTeam as Team}
            title={scheduleSectionSettings?.title || "我们的档期"}
            description={scheduleSectionSettings?.description || "查看我们团队的档期安排，计划您的重要日子。"}
          />
        </SectionWrapper>
      )}

      {/* Contact Section */}
      {settings?.homepageSections?.contact?.visible && (
        <SectionWrapper id="contact">
          <ShowcaseSection
            title={contactSectionSettings?.title || "联系我们"}
            moreText="获取详细联系方式"
            moreLink="/contact"
            id="contact"
          >
            <ContactForm />
          </ShowcaseSection>
        </SectionWrapper>
      )}

      {selectedMember && (
        <TeamMemberDetailModal
          member={selectedMember}
          visible={modalVisible}
          onClose={handleCloseModal}
        />
      )}
    </PageContainer>
  );
};

export default HomePage;