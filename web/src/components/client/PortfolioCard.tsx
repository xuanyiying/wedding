import React, { type JSX } from 'react';
import { Card } from 'antd';
import styled from 'styled-components';

interface PortfolioCardProps {
  id: string | number;
  title: string;
  description: string;
  icon: JSX.Element;
  onClick?: (id: string | number) => void;
}

const StyledCard = styled(Card)`
  &&& {
    background: var(--client-bg-container);
    border-radius: var(--client-border-radius);
    border: 1px solid var(--client-border-color);
    transition: all 0.2s ease;
    box-shadow: var(--client-shadow-sm);
    cursor: ${props => props.onClick ? 'pointer' : 'default'};
    height: 100%;

    &:hover {
      border-color: var(--client-primary-color);
      box-shadow: var(--client-shadow-lg);
      transform: translateY(-2px);
    }

    .ant-card-body {
      padding: 20px;
      display: flex;
      align-items: center;
      height: 100%;
    }
  }
`;

const PortfolioIcon = styled.div`
  width: 56px;
  height: 56px;
  background: var(--client-primary-color);
  border-radius: var(--client-border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--client-text-inverse);
  font-size: 1.3rem;
  margin-right: 16px;
  flex-shrink: 0;
`;

const PortfolioContent = styled.div`
  flex: 1;
  
  h3 {
    font-size: 0.95rem;
    font-weight: 600;
    margin-bottom: 4px;
    color: var(--client-text-primary);
  }

  p {
    color: var(--client-text-secondary);
    font-size: 0.8rem;
    line-height: 1.4;
    margin: 0;
  }
`;

const PortfolioCard: React.FC<PortfolioCardProps> = ({
  id,
  title,
  description,
  icon,
  onClick
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(id);
    }
  };

  return (
    <StyledCard onClick={onClick ? handleClick : undefined}>
      <PortfolioIcon>{icon}</PortfolioIcon>
      <PortfolioContent>
        <h3>{title}</h3>
        <p>{description}</p>
      </PortfolioContent>
    </StyledCard>
  );
};

export default PortfolioCard;