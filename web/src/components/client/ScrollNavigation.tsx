import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { throttle } from '../../utils/scroll';
import useAppSettings from '../../hooks/useAppSettings';

interface ScrollNavigationProps {
  sections: Array<{
    id: string;
    path: string;
  }>;
  onSectionChange?: (sectionId: string) => void;
  headerHeight?: number;
}

const ScrollNavigation: React.FC<ScrollNavigationProps> = ({
  sections,
  onSectionChange,
  headerHeight = 64
}) => {
  const location = useLocation();
  const { settings, loading } = useAppSettings();
  const [activeSection, setActiveSection] = useState<string>('');
  const activeSectionRef = useRef<string>('');

  // 根据homepageSections的可见性过滤sections
  const visibleSections = useMemo(() => {
    if (loading || !settings?.homepage) {
      return sections;
    }

    return sections.filter(section => {
      switch (section.id) {
        case 'hero':
          return settings.homepage.hero?.visible !== false;
        case 'team':
          return settings.homepage.team?.visible !== false;
        case 'portfolio':
          return settings.homepage.portfolio?.visible !== false;
        case 'schedule':
          return settings.homepage.schedule?.visible !== false;
        case 'contact':
          return settings.homepage.contact?.visible !== false;
        default:
          return true;
      }
    });
  }, [loading, settings?.homepage, sections]);

  // 暴露当前活跃section给外部组件
  useEffect(() => {
    if (onSectionChange && activeSection) {
      onSectionChange(activeSection);
    }
  }, [activeSection, onSectionChange]);

  // 优化的滚动处理函数 - 使用ref避免依赖activeSection
  const handleScroll = useCallback(() => {
    if (location.pathname !== '/' || visibleSections.length === 0) {
      return;
    }

    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // 如果滚动到页面底部，激活最后一个section
    if (scrollPosition + windowHeight >= documentHeight - 10) {
      const lastSection = visibleSections[visibleSections.length - 1];
      if (lastSection && activeSectionRef.current !== lastSection.id) {
        activeSectionRef.current = lastSection.id;
        setActiveSection(lastSection.id);
        return;
      }
    }

    // 计算每个section的可见性
    let currentSection = '';
    let maxVisibleArea = 0;

    for (const sectionConfig of visibleSections) {
      const section = document.getElementById(sectionConfig.id);
      if (!section) continue;

      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top + scrollPosition;
      const sectionBottom = sectionTop + rect.height;

      // 计算section在视窗中的可见区域
      const viewportTop = scrollPosition + headerHeight;
      const viewportBottom = scrollPosition + windowHeight;

      const visibleTop = Math.max(sectionTop, viewportTop);
      const visibleBottom = Math.min(sectionBottom, viewportBottom);
      const visibleArea = Math.max(0, visibleBottom - visibleTop);

      // 选择可见面积最大的section作为当前活跃section
      if (visibleArea > maxVisibleArea) {
        maxVisibleArea = visibleArea;
        currentSection = sectionConfig.id;
      }
    }

    // 如果没有找到可见的section，使用传统的偏移量方法作为后备
    if (!currentSection) {
      const adjustedScrollPosition = scrollPosition + headerHeight + 50;

      for (let i = visibleSections.length - 1; i >= 0; i--) {
        const section = document.getElementById(visibleSections[i].id);
        if (section) {
          const sectionTop = section.offsetTop;
          if (adjustedScrollPosition >= sectionTop) {
            currentSection = visibleSections[i].id;
            break;
          }
        }
      }
    }

    // 更新活跃section（只有当确实发生变化时才更新）
    if (currentSection && activeSectionRef.current !== currentSection) {
      activeSectionRef.current = currentSection;
      setActiveSection(currentSection);
    }
  }, [location.pathname, visibleSections, headerHeight]);

  // 节流处理的滚动监听
  const throttledHandleScroll = useMemo(
    () => throttle(handleScroll, 16), // 约60fps的更新频率
    [handleScroll]
  );

  // 同步ref和state
  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  useEffect(() => {
    // 只在首页启用滚动监听
    if (location.pathname !== '/' || visibleSections.length === 0) {
      // 重置activeSection当不在首页时
      if (activeSection) {
        setActiveSection('');
        activeSectionRef.current = '';
      }
      return;
    }

    // 初始检查
    handleScroll();

    // 添加滚动监听
    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // 清理函数
    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [location.pathname, throttledHandleScroll, visibleSections.length, handleScroll]);

  // 处理加载状态 - 移到组件末尾，确保所有Hooks都被调用
  if (loading) {
    return null;
  }

  return null; // 这是一个逻辑组件，不渲染任何UI
};

export { ScrollNavigation };
export type { ScrollNavigationProps };