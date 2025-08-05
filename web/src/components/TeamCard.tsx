import React from 'react';
import { Card, Avatar, Typography, Tag, Space } from 'antd';
import { TeamOutlined, UserOutlined } from '@ant-design/icons';
import type { Team } from '../types';

const { Title, Text } = Typography;

interface TeamCardProps {
  team: Team;
  onClick?: () => void;
  showMembers?: boolean;
  memberCount?: number;
}

const TeamCard: React.FC<TeamCardProps> = ({ 
  team, 
  onClick, 
  showMembers = true, 
  memberCount = 0 
}) => {
  return (
    <Card
      hoverable
      onClick={onClick}
      style={{ 
        height: '100%',
        cursor: onClick ? 'pointer' : 'default'
      }}
      cover={
        <div style={{ 
          padding: '24px', 
          textAlign: 'center', 
          background: 'var(--client-primary-color)'
        }}>
          <Avatar
            size={80}
            src={team.avatar}
            icon={<TeamOutlined />}
            style={{ 
              border: '4px solid rgba(255, 255, 255, 0.3)',
              marginBottom: '16px'
            }}
          />
          <Title level={4} style={{ color: 'white', margin: 0 }}>
            {team.name}
          </Title>
        </div>
      }
    >
      <div style={{ minHeight: '120px' }}>
        <Text type="secondary" style={{ fontSize: '14px', lineHeight: '1.6' }}>
          {team.description || '暂无描述'}
        </Text>
        
        {showMembers && (
          <div style={{ marginTop: '16px' }}>
            <Space>
              <Tag icon={<UserOutlined />} color="blue">
                {memberCount} 位成员
              </Tag>
              <Tag color="green">
                活跃团队
              </Tag>
            </Space>
          </div>
        )}
        
        {team?.specialties && Array.isArray(team.specialties) && team.specialties.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <Text strong style={{ fontSize: '12px', color: '#666' }}>专业领域：</Text>
            <div style={{ marginTop: '4px' }}>
              {team.specialties.slice(0, 3).map((specialty, index) => (
                <Tag key={index} style={{ marginBottom: '4px', fontSize: '12px' }}>
                  {specialty}
                </Tag>
              ))}
              {team.specialties.length > 3 && (
                <Tag style={{ marginBottom: '4px', fontSize: '12px' }}>+{team.specialties.length - 3}</Tag>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TeamCard;