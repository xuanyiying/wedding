import React, { useState, useEffect } from 'react';
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
import { useTheme } from '../../hooks/useTheme';
import { applyThemeSettings } from '../../utils/themeUtils';
import TeamMemberList from '../../components/client/TeamMemberList';
import { useTeamData } from '../../hooks/useTeamData';
import useAppSettings from '../../hooks/useAppSettings';

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

const TeamSectionWrapper = styled.div`
  padding: 2rem 0;
`;

const HomePage: React.FC = () => {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ClientTeamMember | null>(null);

  // 使用站点设置和主题钩子
  const { settings, loading } = useAppSettings();
  const { initTheme } = useTheme();

  const { setActiveSection } = useOutletContext<OutletContextType>();

  // 获取团队成员数据
  const { teamMembers, loading: membersLoading } = useTeamData({
    teamId: selectedTeam?.id,
    includeMembers: !!selectedTeam,
  });

  // 应用主题设置
  useEffect(() => {
    // 初始化客户端主题
    initTheme('client');

    // 如果有自定义主题设置，应用它们
    if (settings?.theme) {
      // 确保 theme 对象包含所有必需的属性
      const themeWithDefaults = {
        ...settings.theme,
        colors: settings.theme.colors ? {
          ...settings.theme.colors,
          accent: settings.theme.colors.accent || settings.theme.colors.primary || '#D4A574'
        } : undefined
      };
      applyThemeSettings(themeWithDefaults);
    }
  }, [settings?.theme, initTheme]);

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
  };

  const handleBackToTeams = () => {
    setSelectedTeam(null);
  };

  const handleCloseModal = () => {
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

  const handleMemberClick = (member: ClientTeamMember) => {
    setSelectedMember(member);
    setModalVisible(true);
  };

  // 处理加载状态
  if (loading || !settings) {
    return <div>加载中...</div>;
  }

  // 从新的设置结构中提取数据
  const heroSectionSettings = settings?.homepage?.hero;
  const portfolioSectionSettings = settings?.homepage?.portfolio;
  const scheduleSectionSettings = settings?.homepage?.schedule;
  const contactSectionSettings = settings?.homepage?.contact;

  // 安全访问设置属性
  const teamSection = settings?.homepage?.team;
  const teamShowcaseSection = settings?.homepage?.teamShowcase;

  return (
    <PageContainer>
      <ScrollNavigation
        sections={[
          { id: 'hero', path: '/' },
          { id: 'team', path: '/team' },
          { id: 'portfolio', path: '/works' },
          { id: 'schedule', path: '/schedule' },
          { id: 'contact', path: '/contact' }
        ]}
        onSectionChange={setActiveSection}
        headerHeight={64}
      />

      {/* Hero Section */}
      {settings?.homepage?.hero?.visible !== false && (
        <HeroSectionWrapper id="hero">
          <HeroSection
            title={heroSectionSettings?.title || '完美婚礼，从这里开始'}
            description={heroSectionSettings?.description || '专业的婚礼策划团队，为您打造独一无二的梦想婚礼'}
            ctaText={heroSectionSettings?.ctaText || '开始策划您的婚礼'}
            ctaLink={heroSectionSettings?.ctaLink || '/contact'}
          />
        </HeroSectionWrapper>
      )}

      {/* Team Section */}
      {teamSection?.visible !== false && (
        <SectionWrapper id="team">
          {!selectedTeam ? (
            <TeamList
              title={teamSection?.title || '我们的团队'}
              description={teamSection?.description || '专业的婚礼策划团队，为您打造独一无二的梦想婚礼'}
              onTeamSelect={handleTeamSelect}
            />
          ) : (
            <TeamSectionWrapper>
              <TeamMemberList
                team={selectedTeam}
                members={teamMembers}
                loading={membersLoading}
                onBack={handleBackToTeams}
                onViewDetails={handleViewDetails}
                onMemberClick={handleMemberClick}
              />
            </TeamSectionWrapper>
          )}
        </SectionWrapper>
      )}

      {/* Team Showcase */}
      {(teamShowcaseSection?.visible ?? true) !== false && !selectedTeam && selectedTeam && (
        <TeamShowcaseSection
          team={selectedTeam}
          title={teamShowcaseSection?.title || '团队展示'}
          description={teamShowcaseSection?.description || '了解我们的专业团队'}
          visible={(teamShowcaseSection?.visible ?? true) !== false}
        />
      )}

      {/* Portfolio Showcase */}
      {settings?.homepage?.portfolio?.visible !== false && !selectedTeam && (
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
      {settings?.homepage?.schedule?.visible !== false && !selectedTeam && selectedTeam && (
        <SectionWrapper id="schedule">
          <ScheduleSection
            team={selectedTeam}
            title={scheduleSectionSettings?.title || "我们的档期"}
            description={scheduleSectionSettings?.description || "查看我们团队的档期安排，计划您的重要日子。"}
          />
        </SectionWrapper>
      )}

      {/* Contact Section */}
      {settings?.homepage?.contact?.visible !== false && !selectedTeam && (
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