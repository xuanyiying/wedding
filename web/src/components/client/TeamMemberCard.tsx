import React from 'react';
import { Card, Avatar, Tag, Button, Typography } from 'antd';
import styled from 'styled-components';
import { TeamMemberStatus } from '../../types';

const { Title } = Typography;

interface TeamMemberCardProps {
  userId: string;
  name: string;
  avatar: string;
  status?: TeamMemberStatus;
  specialties: string[];
  experienceYears: number;
  onViewDetails: (id: string) => void;
  onMemberClick?: () => void;
  loading?: boolean;
}

const StyledCard = styled(Card)`
  &&& {
    background: var(--client-bg-container);
    border-radius: var(--client-border-radius-lg);
    padding: 24px 16px; /* 减小内边距 */
    text-align: center;
    border: 1px solid var(--client-border-color);
    transition: all 0.3s ease;
    box-shadow: var(--client-shadow-sm);
    height: 100%;
    cursor: pointer;

    &:hover {
      border-color: var(--client-primary-color);
      box-shadow: var(--client-shadow-lg);
      transform: translateY(-2px); /* 减小悬停效果 */
    }

    .ant-card-body {
      padding: 0;
    }
  }
`;

const TeamAvatar = styled(Avatar)`
  &&& {
    width: 64px; /* 减小头像大小 */
    height: 64px;
    margin: 0 auto 16px; /* 减小间距 */
    background: var(--client-gradient-primary);
    font-size: 1.2rem; /* 调整字体大小 */
    font-weight: 500;
    box-shadow: var(--client-shadow-sm);
    color: var(--client-text-inverse);
  }
`;

const TeamName = styled(Title)`
  &&& {
    font-size: 1rem; /* 减小字体大小 */
    font-weight: 600;
    margin-bottom: 6px; /* 减小间距 */
    color: var(--client-text-primary);
  }
`;


const StatusTag = styled(Tag)`
  &&& {
    padding: 4px 8px; /* 减小内边距 */
    border-radius: var(--client-border-radius);
    font-size: 0.75rem; /* 减小字体大小 */
    font-weight: 400;
    border: 1px solid;
    margin-bottom: 12px; /* 减小间距 */

    &.available {
      background: var(--client-bg-container);
      color: var(--client-functional-success);
      border-color: var(--client-functional-success);
    }

    &.busy {
      background: var(--client-bg-container);
      color: var(--client-functional-error);
      border-color: var(--client-functional-error);
    }
  }
`;


const DetailButton = styled(Button)`
  &&& {
    background: var(--client-primary-color);
    border-color: var(--client-primary-color);
    color: var(--client-text-inverse);
    font-size: 0.8rem; /* 减小字体大小 */
    padding: 4px 12px; /* 减小按钮大小 */
    
    &:hover {
      background: var(--client-primary-hover);
      border-color: var(--client-primary-hover);
      color: var(--client-text-inverse);
    }
  }
`;

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  userId,
  name,
  avatar,
  status,
  onViewDetails,
  onMemberClick,
  loading = false
}) => {
  // 获取状态对应的CSS类名
  const getStatusClassName = (status: TeamMemberStatus): string => {
    return status === TeamMemberStatus.ACTIVE ? 'available' : 'busy';
  };

  // 获取状态显示文本
  const getStatusText = (status: TeamMemberStatus): string => {
    return status === TeamMemberStatus.ACTIVE ? '档期充足' : '档期紧张';
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡
    onViewDetails(userId);
  };

  return (
    <StyledCard loading={loading} onClick={onMemberClick}>
      <TeamAvatar>{avatar}</TeamAvatar>
      <TeamName level={4}>{name}</TeamName>
      {status && (
        <StatusTag className={getStatusClassName(status)}>
          {getStatusText(status)}
        </StatusTag>
      )}

      <DetailButton type="primary" onClick={handleViewDetails}>
        查看详情
      </DetailButton>
    </StyledCard>
  );
};

export default TeamMemberCard;
export type { TeamMemberCardProps };