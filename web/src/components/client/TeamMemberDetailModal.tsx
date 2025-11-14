import React, { useEffect, useState } from 'react';
import { Modal, Avatar, Typography, Divider, Button, Spin, Tabs, message } from 'antd';
import { CalendarOutlined, UserOutlined, ShareAltOutlined } from '@ant-design/icons';
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
  isStandalonePage?: boolean; // 新增属性
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

// 独立页面样式
const StandaloneContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: var(--client-bg-container);
  border-radius: var(--client-border-radius-lg);
  box-shadow: var(--client-shadow-lg);
  min-height: 100vh;
`;

const BackButton = styled(Button)`
  margin-bottom: 20px;
`;

const TeamMemberDetailModal: React.FC<TeamMemberDetailModalProps> = ({
  visible,
  member,
  onClose,
  isStandalonePage = false
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

      if (response.success && response.data) {
        const files = (response.data as any).files || [];
        setMediaProfiles(files);
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

  // 微信分享功能
  const handleWechatShare = () => {
    if (!member) return;
    
    // 检查是否在微信浏览器中
    const isWechat = /MicroMessenger/i.test(navigator.userAgent);
    
    if (isWechat) {
      // 如果在微信中，使用微信JS SDK进行分享
      message.success('请点击右上角菜单分享给朋友');
    } else {
      // 如果不在微信中，复制链接到剪贴板
      const url = `${window.location.origin}/team-member/${member.userId}`;
      navigator.clipboard.writeText(url).then(() => {
        message.success('链接已复制到剪贴板，请去微信粘贴分享');
      }).catch(() => {
        // 降级方案：显示链接
        message.info(`请复制链接去微信分享: ${url}`);
      });
    }
  };

  // 记录页面访问并加载数据
  useEffect(() => {
    if ((visible || isStandalonePage) && member?.userId) {
      loadMediaProfile(member.userId);
      loadMemberSchedules(member.userId);
    } else {
      // 清空数据
      setMediaProfiles([]);
      setMemberSchedules([]);
    }
  }, [visible, member?.userId, isStandalonePage]);

  // 渲染内容
  const renderContent = () => (
    <>
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
    </>
  );

  // 如果是独立页面模式，渲染为普通页面
  if (isStandalonePage) {
    return (
      <StandaloneContainer>
        <BackButton onClick={onClose} icon={<UserOutlined />}>
          返回团队页面
        </BackButton>
        {renderContent()}
      </StandaloneContainer>
    );
  }

  // 否则渲染为模态框
  return (
    <DetailModal
      title={member?.name}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="share" onClick={handleWechatShare} icon={<ShareAltOutlined />}>
          分享到微信
        </Button>,
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
      width={600}
    >
      {renderContent()}
    </DetailModal>
  );
};

export default TeamMemberDetailModal;
export type { TeamMemberDetailModalProps };