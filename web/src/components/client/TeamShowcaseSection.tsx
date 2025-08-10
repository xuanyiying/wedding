import React, { useState, useEffect } from 'react';
import { Row, Col, Image, Spin, Typography } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { workService } from '../../services';
import type { Work } from '../../types';

const { Title, Paragraph } = Typography;

interface TeamShowcaseSectionProps {
  title?: string;
  description?: string;
  visible?: boolean;
}

const SectionContainer = styled.section`
  padding: 80px 0;
  background: var(--client-bg-secondary);
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;

  @media (max-width: 768px) {
    padding: 0 16px;
  }
`;

const SectionTitle = styled(Title)`
  &&& {
    text-align: center;
    font-size: 2.8rem;
    color: var(--client-text-primary);
    font-weight: 200;
    letter-spacing: -0.02em;
    position: relative;
    line-height: 1.2;
    margin-bottom: 24px;

    &::after {
      content: '';
      position: absolute;
      bottom: -24px;
      left: 50%;
      transform: translateX(-50%);
      width: 80px;
      height: 3px;
      background: var(--client-gradient-accent);
      border-radius: var(--client-border-radius);
    }

    @media (max-width: 768px) {
      font-size: 2.2rem;
    }
  }
`;

const SectionDescription = styled(Paragraph)`
  &&& {
    text-align: center;
    font-size: 1.1rem;
    color: var(--client-text-secondary);
    margin-bottom: 72px;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;

    @media (max-width: 768px) {
      font-size: 1rem;
      margin-bottom: 48px;
    }
  }
`;

const ImageCard = styled.div`
  position: relative;
  border-radius: var(--client-border-radius-lg);
  overflow: hidden;
  background: var(--client-bg-container);
  box-shadow: var(--client-shadow-sm);
  transition: all 0.3s ease;
  cursor: pointer;
  height: 300px;

  &:hover {
    transform: translateY(-8px);
    box-shadow: var(--client-shadow-lg);
  }

  .ant-image {
    width: 100%;
    height: 100%;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
  }

  &:hover .ant-image img {
    transform: scale(1.05);
  }

  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover .overlay {
    opacity: 1;
  }

  .view-icon {
    color: white;
    font-size: 24px;
  }
`;

const TeamShowcaseSection: React.FC<TeamShowcaseSectionProps> = ({
  title = '团队风采',
  description = '记录我们团队的精彩瞬间，展现专业与热情',
  visible = true
}) => {
  const [teamImages, setTeamImages] = useState<Work[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTeamImages = async () => {
      try {
        setLoading(true);
        // 获取团队建设分类的图片
        const response = await workService.getWorks({
          category: 'team_building',
          limit: 6, // 限制显示6张图片
          page: 1
        });
        
        if (response.success && response.data) {
          setTeamImages(response.data.works);
        }
      } catch (error) {
        console.error('获取团队风采图片失败:', error);
      } finally {
        setLoading(false);
      }
    };

    if (visible) {
      fetchTeamImages();
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <SectionContainer>
      <Container>
        <SectionTitle level={2}>{title}</SectionTitle>
        <SectionDescription>{description}</SectionDescription>
        
        <Spin spinning={loading}>
          <Row gutter={[24, 24]}>
            {teamImages.map((image) => (
              <Col xs={24} sm={12} md={8} key={image.id}>
                <ImageCard>
                  <Image
                    src={image.contentUrls?.[0]}
                    alt={image.title}
                    preview={{
                      mask: (
                        <div className="overlay">
                          <EyeOutlined className="view-icon" />
                        </div>
                      )
                    }}
                  />
                </ImageCard>
              </Col>
            ))}
          </Row>
        </Spin>
      </Container>
    </SectionContainer>
  );
};

export default TeamShowcaseSection;