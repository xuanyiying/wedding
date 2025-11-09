import React, { useEffect, useState } from 'react';
import { Modal, Avatar, Typography, Divider, Button, Spin, Tabs } from 'antd';
import { CalendarOutlined, UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { type Schedule, type MediaFile } from '../../types';
import { scheduleService, profileService } from '../../services';
import type { ClientTeamMember } from '../../hooks/useTeamData';
import ScheduleCalendar from '../ScheduleCalendar';
import MediaGallery from './MediaGallery';

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

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
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
}) => {
  const [mediaProfiles, setMediaProfiles] = useState<MediaFile[]>([]);
  const [memberSchedules, setMemberSchedules] = useState<Schedule[]>([]);
  const [worksLoading, setWorksLoading] = useState(false);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // 加载成员作品
  const loadMediaProfile = async (userId: string) => {
    try {
      setWorksLoading(true);
      const response = await profileService.getUserProfile(userId);
      if (response.success && response.data?.files) {
        setMediaProfiles(response.data.files || []);
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
        limit: 100
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

  return (
    <DetailModal
      title={member?.name}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
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
            items={[{
              key: 'profile',
              label: (
                <span>
                  <UserOutlined />
                  个人资料
                </span>
              ),
              children: (
                <div>
                  <MediaGallery
                    mediaProfiles={mediaProfiles}
                    loading={worksLoading}
                    emptyDescription="暂无公开案例"
                  />
                </div>
              )
            },
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