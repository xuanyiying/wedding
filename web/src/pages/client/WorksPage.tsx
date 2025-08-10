import React from 'react';
import { Typography } from 'antd';
import styled from 'styled-components';
import WorksList from '../../components/client/WorksList';

const { Title, Paragraph } = Typography;

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const PageHeader = styled.div`
  text-align: center;
  margin-bottom: 72px;
`;

const PageTitle = styled(Title)`
  &&& {
    font-size: 2.8rem;
    color: var(--client-text-primary);
    font-weight: 200;
    letter-spacing: -0.02em;
    position: relative;
    line-height: 1.2;
    margin-bottom: 24px;

    &::after {
      content: '';
      position: absolute;
      bottom: -24px;
      left: 50%;
      transform: translateX(-50%);
      width: 80px;
      height: 3px;
      background: var(--client-gradient-accent);
      border-radius: var(--client-border-radius);
    }

    @media (max-width: 768px) {
      font-size: 2.2rem;
    }
  }
`;

const WorksPage: React.FC = () => {


  return (
    <PageContainer>
      <PageHeader>
        <PageTitle level={1}>作品展示</PageTitle>
        <Paragraph style={{ fontSize: '1.1rem', color: 'var(--client-text-secondary)', maxWidth: 600, margin: '0 auto' }}>
          精选婚礼作品集，展示我们为每一对新人打造的独特婚礼体验。每一场婚礼都是一个美丽的故事。
        </Paragraph>
      </PageHeader>

      <WorksList showFilters={true} showPagination={true} />
    </PageContainer>
  );
};

export default WorksPage;