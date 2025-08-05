import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface ScrollNavigationProps {
  sections: Array<{
    id: string;
    path: string;
  }>;
  onSectionChange?: (sectionId: string) => void;
}

const ScrollNavigation: React.FC<ScrollNavigationProps> = ({
  sections,
  onSectionChange
}) => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<string>('');
  
  // 暴露当前活跃section给外部组件
  useEffect(() => {
    if (onSectionChange && activeSection) {
      onSectionChange(activeSection);
    }
  }, [activeSection, onSectionChange]);

  useEffect(() => {
    // 只在首页启用滚动监听
    if (location.pathname !== '/') {
      return;
    }

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100; // 偏移量，考虑固定导航栏高度
      
      // 查找当前滚动位置对应的section
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i].id);
        if (section) {
          const sectionTop = section.offsetTop;
          if (scrollPosition >= sectionTop) {
            if (activeSection !== sections[i].id) {
              setActiveSection(sections[i].id);
              if (onSectionChange) {
                onSectionChange(sections[i].id);
              }
            }
            break;
          }
        }
      }
    };

    // 初始检查
    handleScroll();
    
    // 添加滚动监听
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // 清理函数
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname, sections, activeSection, onSectionChange]);

    return null; // 这是一个逻辑组件，不渲染任何UI
};

export { ScrollNavigation };
export type { ScrollNavigationProps };