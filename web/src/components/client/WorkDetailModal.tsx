import React from 'react';
import { Modal, Tag, Typography, Avatar } from 'antd';
import { EyeOutlined, HeartOutlined, MessageOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { type Work } from '../../types';
import { formatDate } from '../../utils';

const { Paragraph, Text } = Typography;

const DetailModal = styled(Modal)`
  .ant-modal-content {
    border-radius: var(--client-border-radius-lg);
    background: var(--client-bg-container);
  }

  .ant-modal-header {
    border-radius: var(--client-border-radius-lg) var(--client-border-radius-lg) 0 0;
    background: var(--client-bg-container);
    border-bottom: 1px solid var(--client-border-color);
  }

  .ant-modal-title {
    color: var(--client-text-primary);
  }
`;

const DetailImage = styled.div`
  width: 100%;
  height: 300px;
  background: var(--client-bg-layout);
  border-radius: var(--client-border-radius);
  overflow: hidden;
  margin-bottom: 24px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const MetaInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  color: var(--client-text-secondary);
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const AuthorInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
`;

interface WorkDetailModalProps {
  work: Work | null;
  visible: boolean;
  onClose: () => void;
}

const WorkDetailModal: React.FC<WorkDetailModalProps> = ({ work, visible, onClose }) => {
  if (!work) return null;

  return (
    <DetailModal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      title={work.title}
    >
      <DetailImage>
        <img src={work.coverUrl ?? ''} alt={work.title} />
      </DetailImage>

      <Paragraph>{work.description}</Paragraph>

      <MetaInfo>
        <MetaItem>
          <HeartOutlined /> {work.likeCount}
        </MetaItem>
        <MetaItem>
          <MessageOutlined /> {work.shareCount}
        </MetaItem>
        <MetaItem>
          <EyeOutlined /> {work.viewCount}
        </MetaItem>
        {work.weddingDate && (
          <MetaItem>
            <CalendarOutlined /> {formatDate(work.weddingDate)}
          </MetaItem>
        )}
      </MetaInfo>

      <div>
        {(work.tags ?? []).map(tag => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>

      {work.user && (
        <AuthorInfo>
          <Avatar src={work.user.avatarUrl} icon={<UserOutlined />} />
          <Text strong>{work.user.realName ?? work.user.username}</Text>
        </AuthorInfo>
      )}
    </DetailModal>
  );
};

export default WorkDetailModal;