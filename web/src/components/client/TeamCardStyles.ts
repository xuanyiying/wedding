import styled from 'styled-components';
import { Card } from 'antd';

export const TeamCard = styled(Card)`
  &&& {
    background: var(--client-bg-container);
    border-radius: var(--client-border-radius-lg);
    border: 1px solid var(--client-border-color);
    box-shadow: var(--client-shadow-sm);
    transition: all 0.3s ease;
    cursor: pointer;
    height: 100%;
    
    &:hover {
      transform: translateY(-4px);
      box-shadow: var(--client-shadow-lg);
      border-color: var(--client-primary-color);
    }
    
    .ant-card-body {
      padding: 24px;
      text-align: center;
    }
    
    .team-avatar {
      margin-bottom: 16px;
      
      .ant-avatar {
        background: var(--client-primary-color);
        font-size: 24px;
        font-weight: 600;
      }
    }
    
    .team-name {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--client-text-primary);
    }
    
    .team-description {
      color: var(--client-text-secondary);
      margin-bottom: 16px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .team-stats {
      display: flex;
      justify-content: space-around;
      margin-top: 16px;
      
      .stat-item {
        text-align: center;
        
        .stat-number {
          font-size: 20px;
          font-weight: 600;
          color: var(--client-primary-color);
          display: block;
        }
        
        .stat-label {
          font-size: 12px;
          color: var(--client-text-secondary);
        }
      }
    }
  }
`;