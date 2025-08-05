import React from 'react';
import { Space, Button, Breadcrumb, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding: 16px 0;
  border-bottom: 1px solid var(--admin-border-color);
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
`;

const HeaderLeft = styled.div`
  flex: 1;
`;

const HeaderRight = styled.div`
  display: flex;
  gap: 8px;
  
  @media (max-width: 768px) {
    justify-content: flex-end;
  }
`;

const TitleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
`;

interface BreadcrumbItem {
  title: string;
  href?: string;
}

interface ActionButton {
  key: string;
  label: string;
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  icon?: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  danger?: boolean;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: BreadcrumbItem[];
  actions?: ActionButton[];
  showBack?: boolean;
  onBack?: () => void;
  extra?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumb,
  actions = [],
  showBack = false,
  onBack,
  extra,
  className,
  style,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <HeaderContainer className={className} style={style}>
      <HeaderLeft>
        {breadcrumb && breadcrumb.length > 0 && (
          <Breadcrumb
            style={{ marginBottom: 8 }}
            items={breadcrumb.map(item => ({
              title: item.href ? (
                <a href={item.href}>{item.title}</a>
              ) : (
                item.title
              ),
            }))}
          />
        )}
        
        <TitleContainer>
          {showBack && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              size="small"
            />
          )}
          
          <Title level={2} style={{ margin: 0 }}>
            {title}
          </Title>
        </TitleContainer>
        
        {subtitle && (
          <Typography.Text type="secondary">
            {subtitle}
          </Typography.Text>
        )}
        
        {extra && (
          <div style={{ marginTop: 12 }}>
            {extra}
          </div>
        )}
      </HeaderLeft>
      
      {actions.length > 0 && (
        <HeaderRight>
          <Space>
            {actions.map((action) => (
              <Button
                key={action.key}
                type={action.type || 'default'}
                icon={action.icon}
                onClick={action.onClick}
                loading={action.loading}
                disabled={action.disabled}
                danger={action.danger}
              >
                {action.label}
              </Button>
            ))}
          </Space>
        </HeaderRight>
      )}
    </HeaderContainer>
  );
};

export default PageHeader;