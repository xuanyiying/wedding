import React from 'react';
import { Typography } from 'antd';
import styled from 'styled-components';
import ContactForm from '../../components/client/ContactForm';

const { Title, Paragraph } = Typography;
import { useSiteSettings } from '../../hooks/useSiteSettings';
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

const ContactPage: React.FC = () => {
const { settings} = useSiteSettings();

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle level={1}>{settings?.homepageSections?.contact?.title || '联系我们'}</PageTitle>
        <Paragraph style={{ fontSize: '1.1rem', color: 'var(--client-text-secondary)', maxWidth: 600, margin: '0 auto' }}>
          {settings?.homepageSections?.contact?.description || '我们期待为您的特殊时刻提供专业的主持服务。请通过以下方式联系我们，或填写咨询表单。'}
        </Paragraph>
      </PageHeader>
      <ContactForm />
    </PageContainer>
  );
};

export default ContactPage;