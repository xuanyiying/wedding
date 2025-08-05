import React, { useEffect } from 'react';
import { Modal, Avatar, Typography, Divider, Tag, Button, Row, Col } from 'antd';
import styled from 'styled-components';
import { TeamMemberStatus } from '../../types';
import { usePageView } from '../../hooks/usePageView';
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

const TeamMemberDetailModal: React.FC<TeamMemberDetailModalProps> = ({
  visible,
  member,
  onClose,
  onContact
}) => {
  // 页面访问统计
  const { stats } = usePageView('team_member', member?.userId || '');

  // 记录页面访问（当模态框打开且有成员信息时）
  useEffect(() => {
    if (visible && member?.userId) {
      // usePageView hook 会自动记录访问
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
  
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--client-primary-color)' }}>
                    {stats?.totalViews || 0}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--client-text-secondary)' }}>浏览量</div>
                </div>
              </Col>
            </Row>
          </DetailSection>
        </div>
      )}
    </DetailModal>
  );
};

export default TeamMemberDetailModal;
export type { TeamMemberDetailModalProps };