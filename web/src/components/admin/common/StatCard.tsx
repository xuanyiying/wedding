import React from 'react';
import { Card, Typography, Space } from 'antd';
import styled from 'styled-components';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { TrendType } from '../../../types';

const { Text } = Typography;

const StyledCard = styled(Card)`
  &.ant-card {
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    height: 100%;
  }

  .ant-card-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  @media (max-width: 768px) {
    &.ant-card {
      height: 110px !important;
      min-height: 110px !important;
      max-height: 110px !important;
    }
    
    .ant-card-body {
      padding: 12px !important;
      justify-content: space-between;
    }
  }
`;

const ValueContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  flex: 1;

  @media (max-width: 768px) {
    margin-bottom: 4px;
  }
`;

const ValueText = styled(Text)`
  font-size: 24px;
  font-weight: 600;
  margin-right: 8px;

  @media (max-width: 768px) {
    font-size: 20px;
  }
`;

const TrendContainer = styled.span`
  display: flex;
  align-items: center;
  font-size: 12px;
`;

interface StatCardProps {
  title: string;
  value: number;
  prefix?: React.ReactNode;
  suffix?: string;
  trend?: TrendType;
  trendValue?: number;
  loading?: boolean;
  valueStyle?: React.CSSProperties;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  prefix,
  suffix,
  trend,
  trendValue,
  loading = false,
  valueStyle,
}) => {
  const renderTrend = () => {
    if (trend === undefined || trendValue === undefined) return null;

    const isUp = trend === TrendType.UP;
    return (
      <TrendContainer style={{ color: isUp ? '#52c41a' : '#ff4d4f' }}>
        {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        {trendValue}%
      </TrendContainer>
    );
  };

  return (
    <StyledCard loading={loading}>
      <Text
        type="secondary"
        style={{
          fontSize: 14,
          marginBottom: 8,
          display: 'block',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {title}
      </Text>
      <ValueContainer>
        <Space size="small">
          {prefix}
          <ValueText>
            {value}
            {suffix && <span style={{ fontSize: 14, fontWeight: 400, ...valueStyle }}>{suffix}</span>}
          </ValueText>
        </Space>
      </ValueContainer>
      {renderTrend()}
    </StyledCard>
  );
};

export default StatCard;