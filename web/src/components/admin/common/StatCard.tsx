import React from 'react';
import { Card, Statistic } from 'antd';
import type { StatisticProps } from 'antd';
import styled from 'styled-components';

const StyledCard = styled(Card)`
  .ant-card-body {
    padding: 16px;
  }
  
  &:hover {
    box-shadow: var(--admin-shadow-lg);
    transform: translateY(-2px);
    transition: all 0.3s ease;
  }
  
  .ant-statistic-title {
    color: var(--admin-text-secondary);
    font-size: 14px;
    margin-bottom: 8px;
  }
  
  .ant-statistic-content {
    color: var(--admin-text-primary);
  }
`;

interface StatCardProps extends Omit<StatisticProps, 'title'> {
  title: string;
  loading?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  loading = false,
  bordered = true,
  hoverable = true,
  className,
  style,
  ...statisticProps
}) => {
  return (
    <StyledCard
      hoverable={hoverable}
      loading={loading}
      variant={bordered ? 'outlined' : 'borderless'}
      className={className}
      style={{
        ...style,
        cursor: hoverable ? 'pointer' : 'default',
      }}
    >
      <Statistic
        title={title}
        {...statisticProps}
      />
    </StyledCard>
  );
};

export default StatCard;