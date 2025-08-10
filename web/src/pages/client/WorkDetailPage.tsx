import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Button, Spin, Space } from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined, PauseCircleOutlined, SoundOutlined, AudioMutedOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { workService } from '../../services';
import { usePageView } from '../../hooks/usePageView';
import type { Work } from '../../types';
import { WorkType } from '../../types';
const { Title, Paragraph } = Typography;

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const BackButton = styled(Button)`
  margin-bottom: 24px;
`;

const WorkTitle = styled(Title)`
  &&& {
    color: var(--text-primary);
    margin-bottom: 24px;
  }
`;

const MediaContainer = styled.div`
  position: relative;
  width: 100%;
  margin-bottom: 32px;
  border-radius: var(--border-radius-large);
  overflow: hidden;
  background: var(--background-secondary);
`;

const StyledImage = styled.img`
  width: 100%;
  height: auto;
  display: block;
`;

const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 宽高比 */
`;

const StyledVideo = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const VideoControls = styled.div`
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 16px;
  background: var(--overlay-light);
  padding: 8px 16px;
  border-radius: var(--border-radius-medium);
  z-index: 1;
`;

const ControlButton = styled(Button)`
  &&& {
    color: var(--text-inverse);
    &:hover {
      color: var(--primary-main);
    }
  }
`;

const WorkDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // 页面访问统计
  usePageView('work', id || '');

  useEffect(() => {
    const fetchWorkDetail = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await workService.getWork(id);
        setWork(response.data || null);
      } catch (error) {
        console.error('获取作品详情失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkDetail();
  }, [id]);

  const handleBack = () => {
    navigate(-1);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  if (!work) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Title level={4}>作品不存在或已被删除</Title>
          <BackButton type="primary" onClick={handleBack}>
            返回作品列表
          </BackButton>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BackButton icon={<ArrowLeftOutlined />} onClick={handleBack}>
        返回作品列表
      </BackButton>

      <WorkTitle level={2}>{work.title}</WorkTitle>

      <MediaContainer>
        {work.type === WorkType.VIDEO && work.contentUrls?.[0] ? (
          <>
            <VideoContainer>
              <StyledVideo
                ref={videoRef}
                src={work.contentUrls[0]}
                poster={work.coverUrl || ''}
                controls={false}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </VideoContainer>
            <VideoControls>
              <ControlButton
                type="text"
                icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={togglePlay}
              />
              <ControlButton
                type="text"
                icon={isMuted ? <AudioMutedOutlined /> : <SoundOutlined />}
                onClick={toggleMute}
              />
            </VideoControls>
          </>
        ) : (
          <StyledImage src={work.coverUrl || ''} alt={work.title} />
        )}
      </MediaContainer>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {work.description && (
          <Paragraph style={{ color: 'var(--client-text-secondary)' }}>
            {work.description}
          </Paragraph>
        )}

        <div>
          <Title level={4}>分类</Title>
          <Paragraph>{work.category}</Paragraph>
        </div>

        {work.tags && work.tags.length > 0 && (
          <div>
            <Title level={4}>标签</Title>
            <Paragraph>{work.tags.join(', ')}</Paragraph>
          </div>
        )}

        {work.location && (
          <div>
            <Title level={4}>拍摄地点</Title>
            <Paragraph>{work.location}</Paragraph>
          </div>
        )}

        {work.weddingDate && (
          <div>
            <Title level={4}>婚礼日期</Title>
            {new Date(work.weddingDate).toLocaleDateString()}
          </div>
        )}
      </Space>
    </PageContainer>
  );
};

export default WorkDetailPage;