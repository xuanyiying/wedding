import React, { useEffect, useState } from 'react';
import { Modal, Avatar, Typography, Divider, Tag, Button, Spin, Empty, Image, Tabs } from 'antd';
import { CalendarOutlined, PlayCircleOutlined, UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { type Schedule, type MediaFile, FileType } from '../../types';
import { usePageView } from '../../hooks/usePageView';
import { scheduleService, profileService } from '../../services';
import type { ClientTeamMember } from '../../hooks/useTeamData';
import { PlayButton } from './WorkCardStyles';
import ScheduleCalendar from '../ScheduleCalendar';

const { Title } = Typography;

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
  const [mediaProfiles, setMediaProfiles] = useState<MediaFile[]>([]);
  const [memberSchedules, setMemberSchedules] = useState<Schedule[]>([]);
  const [worksLoading, setWorksLoading] = useState(false);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');

  // 页面访问统计
  const { stats } = usePageView('team_member', member?.userId || '');

  // 加载成员作品
  const loadMediaProfile = async (userId: string) => {
    try {
      setWorksLoading(true);

      const response = await profileService.getUserAvailableFiles(
        userId
      );
      if (response.success) {
        setMediaProfiles(response.data || []);
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
      loadMediaProfile(member.userId);
      loadMemberSchedules(member.userId);
    } else {
      // 清空数据
      setMediaProfiles([]);
      setMemberSchedules([]);
    }
  }, [visible, member?.userId]);

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
                      ) : (
                        <ScheduleCalendar
                          schedules={memberSchedules.map(schedule => ({
                            ...schedule,
                            hostName: member?.name || '未知'
                          }))}
                          loading={schedulesLoading}
                          theme="client"
                          showLegend={false}
                          fullscreen={false}
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
                      {worksLoading ? (
                        <LoadingContainer>
                          <Spin size="small" />
                        </LoadingContainer>
                      ) : mediaProfiles.length > 0 ? (
                        <WorksGrid>
                          {mediaProfiles.map((m) => (
                            <WorkItem key={m.id}>
                              {m.fileType === FileType.VIDEO && m.thumbnailUrl && m.fileUrl ?
                                <div style={{ paddingBottom: '75%', position: 'relative', height: 0 }}>
                                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                                    <img
                                      src={m.thumbnailUrl}
                                      alt={m.filename}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <PlayButton>
                                      <PlayCircleOutlined />
                                    </PlayButton>
                                  </div>
                                </div> :
                                <Image
                                  src={m.fileUrl}
                                  alt={m.filename}
                                  preview={{
                                    mask: <div style={{ fontSize: '12px' }}>{m.filename}</div>
                                  }}
                                />}
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