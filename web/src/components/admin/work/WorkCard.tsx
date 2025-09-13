import React from 'react';
import { Card, Tag, Space, Button, Typography, Switch, Tooltip } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined, HeartOutlined, DownloadOutlined, StarOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import dayjs from 'dayjs';
import type { FileInfo } from '../../../types';
import WorkMedia from './WorkMedia';

const { Text, Paragraph } = Typography;
const { Meta } = Card;

const StyledCard = styled(Card)`
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: var(--admin-shadow-lg);
    transform: translateY(-4px);
  }
  
  .ant-card-cover {
    position: relative;
    overflow: hidden;
    
    img {
      transition: transform 0.3s ease;
    }
    
    &:hover img {
      transform: scale(1.05);
    }
  }
  
  .ant-card-body {
    padding: 16px;
  }
  
  .ant-card-actions {
    border-top: 1px solid var(--admin-border-color);
    background: var(--admin-bg-container-light);
  }
`;

const TagContainer = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const TypeBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
`;

const StatsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0;
  padding: 8px 0;
  border-top: 1px solid var(--admin-border-color-light);
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--admin-text-secondary);
  font-size: 12px;
`;

const SwitchContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--admin-border-color-light);
`;

export interface Work {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'image' | 'video';
  tags: string[];
  author: string;
  customer?: string;
  weddingDate?: Date;
  isPublic: boolean;
  isFeatured: boolean;
  views: number;
  likes: number;
  downloads: number;
  shares?: number;
  createdAt: string;
  updatedAt: string;
  files: FileInfo[];
}

interface WorkCardProps {
  work: Work;
  onPreview: (work: Work) => void;
  onEdit: (work: Work) => void;
  onDelete: (id: string) => void;
  onTogglePublic: (id: string, isPublic: boolean) => void;
  onToggleFeatured: (id: string, isFeatured: boolean) => void;
  showFeaturedControl?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const WorkCard: React.FC<WorkCardProps> = ({
  work,
  onPreview,
  onEdit,
  onDelete,
  onTogglePublic,
  onToggleFeatured,
  showFeaturedControl = false,
  className,
  style,
}) => {
  const getTypeIcon = (type: Work['type']) => {
    return type === 'video' ? '🎬' : '📷';
  };
  
  const getTypeText = (type: Work['type']) => {
    return type === 'video' ? '视频' : '图片';
  };
  
  const formatDate = (date: Date | null) => {
    return date ? dayjs(date).format('YYYY-MM-DD') : '未指定';
  };
  
  const handleTogglePublic = (checked: boolean) => {
    onTogglePublic(work.id, checked);
  };
  
  const handleToggleFeatured = (checked: boolean) => {
    onToggleFeatured(work.id, checked);
  };

  return (
    <StyledCard
      className={className}
      style={style}
      cover={
        <div style={{ position: 'relative', height: 100 }}>
          <WorkMedia files={work.files} 
            isFeatured={work.isFeatured}
            title={work.title} 
            onClick={() => onPreview(work)}
          />

          <TagContainer>
            {work.isFeatured && ( 
              <Tag color="gold" icon={<StarOutlined />}>
                精选
              </Tag>
            )}
            {!work.isPublic && (
              <Tag color="red">
                私密
              </Tag>
            )}
          </TagContainer>
          
          <TypeBadge>
            {getTypeIcon(work.type)} {getTypeText(work.type)}
            {work.files.length > 1 && ` (${work.files.length})`}
          </TypeBadge>
        </div>
      }
      actions={[
        <Tooltip title="预览">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => onPreview(work)}
          />
        </Tooltip>,
        <Tooltip title="编辑">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => onEdit(work)}
          />
        </Tooltip>,
        <Tooltip title="删除">
          <Button
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => onDelete(work.id)}
            danger
          />
        </Tooltip>,
      ]}
    >
      <Meta
        title={
          <Tooltip title={work.title}>
            <div style={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap' 
            }}>
              {work.title}
            </div>
          </Tooltip>
        }
        description={
          <div>
            <StatsContainer>
              <StatItem>
                <EyeOutlined />
                {work.views}
              </StatItem>
              <StatItem>
                <HeartOutlined />
                {work.likes}
              </StatItem>
              <StatItem>
                <DownloadOutlined />
                {work.downloads}
              </StatItem>
            </StatsContainer>
            
            <Paragraph
              ellipsis={{ rows: 2, tooltip: work.description }}
              style={{ margin: '8px 0', fontSize: 12, color: 'var(--admin-text-secondary)' }}
            >
              {work.description}
            </Paragraph>
            
            <Space wrap size={[4, 4]} style={{ marginBottom: 8 }}>
              <Tag color="blue">{work.category}</Tag>
              {work.tags.slice(0, 2).map((tag, index) => (
                <Tag key={index}>{tag}</Tag>
              ))}
              {work.tags.length > 2 && (
                <Tag>+{work.tags.length - 2}</Tag>
              )}
            </Space>
            
            <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 8 }}>
              <div>作者: {work.author}</div>
              {work.customer && <div>客户: {work.customer}</div>}
              {work.weddingDate && <div>地点: {formatDate(work.weddingDate)}</div>}
            </div>
            
            <SwitchContainer>
              <Space>
                <Text style={{ fontSize: 12 }}>公开:</Text>
                <Switch
                  size="small"
                  checked={work.isPublic}
                  onChange={handleTogglePublic}
                />
              </Space>
              
              {showFeaturedControl && (
                <Space>
                  <Text style={{ fontSize: 12 }}>精选:</Text>
                  <Switch
                    size="small"
                    checked={work.isFeatured}
                    onChange={handleToggleFeatured}
                  />
                </Space>
              )}
            </SwitchContainer>
          </div>
        }
      />
    </StyledCard>
  );
};

export default WorkCard;