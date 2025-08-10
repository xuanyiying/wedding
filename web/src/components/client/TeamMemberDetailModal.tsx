import React, { useEffect, useState } from 'react';
import { Modal, Avatar, Typography, Divider, Tag, Button, Row, Col, Spin, Empty, Image, Tabs } from 'antd';
import { CalendarOutlined, UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { TeamMemberStatus, type Work, type Schedule } from '../../types';
import { usePageView } from '../../hooks/usePageView';
import { workService, scheduleService } from '../../services';
import type { ClientTeamMember } from '../../hooks/useTeamData';

const { Title, Paragraph } = Typography;

interface TeamMemberDetailModalProps {
  visible: boolean;
  member: ClientTeamMember | null;
  onClose: () => void;
  onContact?: () => void;
}

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

const TeamAvatar = styled(Avatar)`
  &&& {
    background: var(--client-gradient-primary);
    color: var(--client-text-inverse);
  }
`;

const StatusTag = styled(Tag)`
  &&& {
    padding: 6px 12px;
    border-radius: var(--client-border-radius);
    font-size: 0.8rem;
    font-weight: 400;
    border: 1px solid;

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

const SpecialtyTag = styled(Tag)`
  &&& {
    margin: 2px;
    border-radius: var(--client-border-radius);
    font-size: 0.75rem;
    background: var(--client-bg-layout);
    border: 1px solid var(--client-border-color);
    color: var(--client-text-secondary);
  }
`;

const DetailSection = styled.div`
  margin-bottom: 24px;
  
  h4 {
    color: var(--client-text-primary);
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
  }
`;

const WorksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 12px;
`;

const WorkItem = styled.div`
  position: relative;
  border-radius: var(--client-border-radius);
  overflow: hidden;
  aspect-ratio: 1;
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  .ant-image {
    width: 100%;
    height: 100%;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
`;

const ScheduleItem = styled.div`
  padding: 12px;
  border: 1px solid var(--client-border-color);
  border-radius: var(--client-border-radius);
  margin-bottom: 8px;
  background: var(--client-bg-container);
  
  .schedule-title {
    font-weight: 600;
    color: var(--client-text-primary);
    margin-bottom: 4px;
  }
  
  .schedule-date {
    color: var(--client-text-secondary);
    font-size: 0.9rem;
  }
  
  .schedule-status {
    margin-top: 8px;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
`;


const ContactButton = styled(Button)`
  &&& {
    background: var(--client-primary-color);
    border-color: var(--client-primary-color);
    color: var(--client-text-inverse);
    
    &:hover {
      background: var(--client-primary-hover);
      border-color: var(--client-primary-hover);
      color: var(--client-text-inverse);
    }
  }
`;

const StyledTabs = styled(Tabs)`
  &&& {
    .ant-tabs-nav {
      margin-bottom: 24px;
    }
    
    .ant-tabs-tab {
      color: var(--client-text-secondary);
      
      &.ant-tabs-tab-active {
        .ant-tabs-tab-btn {
          color: var(--client-primary-color);
        }
      }
    }
    
    .ant-tabs-ink-bar {
      background: var(--client-primary-color);
    }
  }
`;

const TeamMemberDetailModal: React.FC<TeamMemberDetailModalProps> = ({
  visible,
  member,
  onClose,
  onContact
}) => {
  const [memberWorks, setMemberWorks] = useState<Work[]>([]);
  const [memberSchedules, setMemberSchedules] = useState<Schedule[]>([]);
  const [worksLoading, setWorksLoading] = useState(false);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');

  // 页面访问统计
  const { stats } = usePageView('team_member', member?.userId || '');

  // 加载成员作品
  const loadMemberWorks = async (userId: string) => {
    try {
      setWorksLoading(true);

      const response = await workService.getWorks({
        userId,
        status: 'published',
        limit: 6
      });
      if (response.success) {
        setMemberWorks(response.data?.works || []);
      }
    } catch (error) {
      console.error('Failed to load member works:', error);
    } finally {
      setWorksLoading(false);
    }
  };

  // 加载成员档期
  const loadMemberSchedules = async (userId: string) => {
    try {
      setSchedulesLoading(true);
      const now = new Date();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 未来30天
      const response = await scheduleService.getSchedules({
        userId,
        startDate: now.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        limit: 10
      });
      if (response.success) {
        setMemberSchedules(response.data?.schedules || []);
      }
    } catch (error) {
      console.error('加载成员档期失败:', error);
    } finally {
      setSchedulesLoading(false);
    }
  };

  // 记录页面访问并加载数据
  useEffect(() => {
    if (visible && member?.userId) {
      loadMemberWorks(member.userId);
      loadMemberSchedules(member.userId);
    } else {
      // 清空数据
      setMemberWorks([]);
      setMemberSchedules([]);
    }
  }, [visible, member?.userId]);

  // 获取状态对应的CSS类名
  const getStatusClassName = (status: TeamMemberStatus): string => {
    return status === TeamMemberStatus.ACTIVE ? 'available' : 'busy';
  };

  // 获取状态显示文本
  const getStatusText = (status: TeamMemberStatus): string => {
    return status === TeamMemberStatus.ACTIVE ? '档期充足' : '档期紧张';
  };

  const handleContact = () => {
    if (onContact) {
      onContact();
    }
  };

  return (
    <DetailModal
      title={member?.name}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        <ContactButton key="contact" type="primary" onClick={handleContact}>
          立即预约
        </ContactButton>,
      ]}
      width={600}
    >
      {member && (
        <div>
          {/* 头像和基本信息 */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <TeamAvatar size={100} src={member.avatar} />
            <Title level={3} style={{ marginTop: 16, marginBottom: 8 }}>
              {member.name}
            </Title>
         
            <div style={{ marginTop: 12 }}>
              <StatusTag className={getStatusClassName(member.status)}>
                {getStatusText(member.status)}
              </StatusTag>
            </div>
          </div>

          <Divider />

          {/* Tab切换 */}
          <StyledTabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'schedule',
                label: (
                  <span>
                    <CalendarOutlined />
                    档期
                  </span>
                ),
                children: (
                  <div>
                    <DetailSection>
                      <h4>近期档期</h4>
                      {schedulesLoading ? (
                        <LoadingContainer>
                          <Spin size="small" />
                        </LoadingContainer>
                      ) : memberSchedules.length > 0 ? (
                        <div>
                          {memberSchedules.map((schedule) => (
                            <ScheduleItem key={schedule.id}>
                              <div className="schedule-title">{schedule.title}</div>
                              <div className="schedule-date">
                                {schedule.weddingDate} {schedule.weddingTime === 'lunch' ? '午宴' : '晚宴'}
                              </div>
                              <div className="schedule-status">
                                <Tag color={schedule.status === 'available' ? 'green' : 'orange'}>
                                  {schedule.status === 'available' ? '可预约' : 
                                   schedule.status === 'booked' ? '已预订' : 
                                   schedule.status === 'confirmed' ? '已确认' : '其他'}
                                </Tag>
                              </div>
                            </ScheduleItem>
                          ))}
                          {memberSchedules.length > 10 && (
                            <div style={{ textAlign: 'center', marginTop: '12px', color: 'var(--client-text-secondary)', fontSize: '0.9rem' }}>
                              显示前10个档期，还有更多档期可预约...
                            </div>
                          )}
                        </div>
                      ) : (
                        <Empty 
                          image={Empty.PRESENTED_IMAGE_SIMPLE} 
                          description="暂无档期信息" 
                          style={{ margin: '20px 0' }}
                        />
                      )}
                    </DetailSection>
                  </div>
                )
              },
              {
                key: 'profile',
                label: (
                  <span>
                    <UserOutlined />
                    个人资料
                  </span>
                ),
                children: (
                  <div>
                    <DetailSection>
                      <h4>个人简介</h4>
                      <Paragraph>{member.bio}</Paragraph>
                    </DetailSection>

                    <DetailSection>
                      <h4>专业特长</h4>
                      <div>
                        {member.specialties.map((specialty: string) => (
                          <SpecialtyTag key={specialty}>{specialty}</SpecialtyTag>
                        ))}
                      </div>
                    </DetailSection>

                    <DetailSection>
                      <h4>专业数据</h4>
                      <Row gutter={16}>
                        <Col span={8}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--client-primary-color)' }}>
                              {member.experienceYears}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--client-text-secondary)' }}>年经验</div>
                          </div>
                        </Col>
            
                        <Col span={8}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--client-primary-color)' }}>
                              {stats?.totalViews || 0}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--client-text-secondary)' }}>浏览量</div>
                          </div>
                        </Col>
                        
                        <Col span={8}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--client-primary-color)' }}>
                              {memberWorks.length}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--client-text-secondary)' }}>作品数</div>
                          </div>
                        </Col>
                      </Row>
                    </DetailSection>

                    <DetailSection>
                      <h4>精选作品</h4>
                      {worksLoading ? (
                        <LoadingContainer>
                          <Spin size="small" />
                        </LoadingContainer>
                      ) : memberWorks.length > 0 ? (
                        <WorksGrid>
                          {memberWorks.map((work) => (
                            <WorkItem key={work.id}>
                              <Image
                                src={work.coverUrl || '/placeholder-image.jpg'}
                                alt={work.title}
                                preview={{
                                  mask: <div style={{ fontSize: '12px' }}>{work.title}</div>
                                }}
                              />
                            </WorkItem>
                          ))}
                        </WorksGrid>
                      ) : (
                        <Empty 
                          image={Empty.PRESENTED_IMAGE_SIMPLE} 
                          description="暂无公开作品" 
                          style={{ margin: '20px 0' }}
                        />
                      )}
                    </DetailSection>
                  </div>
                )
              }
            ]}
          />
        </div>
      )}
    </DetailModal>
  );
};

export default TeamMemberDetailModal;
export type { TeamMemberDetailModalProps };