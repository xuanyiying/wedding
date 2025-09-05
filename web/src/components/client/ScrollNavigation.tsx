import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { throttle } from '../../utils/scroll';

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
  const [activeSection, setActiveSection] = useState<string>('');
  
  // 暴露当前活跃section给外部组件
  useEffect(() => {
    if (onSectionChange && activeSection) {
      onSectionChange(activeSection);
    }
  }, [activeSection, onSectionChange]);

  // 优化的滚动处理函数
  const handleScroll = useCallback(() => {
    if (location.pathname !== '/') {
      return;
    }

    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // 如果滚动到页面底部，激活最后一个section
    if (scrollPosition + windowHeight >= documentHeight - 10) {
      const lastSection = sections[sections.length - 1];
      if (lastSection && activeSection !== lastSection.id) {
        setActiveSection(lastSection.id);
        return;
      }
    }

    // 计算每个section的可见性
    let currentSection = '';
    let maxVisibleArea = 0;

    for (const sectionConfig of sections) {
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
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i].id);
        if (section) {
          const sectionTop = section.offsetTop;
          if (adjustedScrollPosition >= sectionTop) {
            currentSection = sections[i].id;
            break;
          }
        }
      }
    }

    // 更新活跃section
    if (currentSection && currentSection !== activeSection) {
      setActiveSection(currentSection);
    }
  }, [location.pathname, sections, activeSection, headerHeight]);

  // 节流处理的滚动监听
  const throttledHandleScroll = useCallback(
    throttle(handleScroll, 16), // 约60fps的更新频率
    [handleScroll]
  );

  useEffect(() => {
    // 只在首页启用滚动监听
    if (location.pathname !== '/') {
      // 重置activeSection当不在首页时
      if (activeSection) {
        setActiveSection('');
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
  }, [location.pathname, throttledHandleScroll, handleScroll, activeSection]);

  return null; // 这是一个逻辑组件，不渲染任何UI
};

export { ScrollNavigation };
export type { ScrollNavigationProps };