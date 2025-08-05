import React from 'react';
import { Modal, Button, Typography, Divider, Row, Col, Tag, Avatar } from 'antd';
import { PhoneOutlined, MailOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import type { TeamMember } from '../../types';
import { TeamMemberStatus } from '../../types';

const { Title, Paragraph, Text } = Typography;

interface TeamMemberModalProps {
  visible: boolean;
  member: TeamMember | null;
  onClose: () => void;
  onContact?: (member: TeamMember) => void;
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

const DetailSection = styled.div`
  margin-bottom: 24px;
  
  h4 {
    color: var(--client-text-primary);
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
  }
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  color: var(--client-text-secondary);
  
  .anticon {
    margin-right: 8px;
    color: var(--client-primary-color);
  }
`;

const StatusTag = styled(Tag)`
  &&& {
    padding: 6px 12px;
    border-radius: var(--client-border-radius);
    font-size: 0.8rem;
    font-weight: 400;
    border: 1px solid;
    margin-bottom: 16px;

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

const TeamAvatar = styled(Avatar)`
  &&& {
    background: var(--client-primary-color);
    color: var(--client-text-inverse);
  }
`;

const TeamMemberModal: React.FC<TeamMemberModalProps> = ({
  visible,
  member,
  onClose,
  onContact
}) => {
  if (!member) return null;

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
      onContact(member);
    }
  };

  return (
    <DetailModal
      title={member.user.realName}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        <Button 
          key="contact" 
          type="primary"
          onClick={handleContact}
          style={{ 
            background: 'var(--client-primary-color)',
            borderColor: 'var(--client-primary-color)',
            color: 'var(--client-text-inverse)'
          }}
        >
          立即预约
        </Button>,
      ]}
      width={600}
    >
      <div>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <TeamAvatar size={100} src={member.user.avatarUrl}>
            {member.user.realName?.[0] || member.user.username[0]}
          </TeamAvatar>
          <Title level={3} style={{ marginTop: 16, marginBottom: 8 }}>
            {member.user.realName || member.user.username}
          </Title>
          <Text type="secondary" style={{ fontSize: '1rem' }}>
            {member.role === 1 ? '成员' : member.role === 2 ? '管理员' : '所有者'}
          </Text>
          <div style={{ marginTop: 12 }}>
            <StatusTag className={getStatusClassName(member.status)}>
              {getStatusText(member.status)}
            </StatusTag>
          </div>
        </div>

        <Divider />

        <DetailSection>
          <h4>个人简介</h4>
          <Paragraph>{member.user.bio || '暂无个人简介'}</Paragraph>
        </DetailSection>

        <DetailSection>
          <h4>专业特长</h4>
          <div>
            {(member.user.specialties || []).map((specialty: string) => (
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
                  {member.user.experienceYears || 0}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--client-text-secondary)' }}>年经验</div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--client-primary-color)' }}>
                  {member.team?.completedProjects || 0}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--client-text-secondary)' }}>场婚礼</div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--client-primary-color)' }}>
                  {member.team?.rating || 5.0}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--client-text-secondary)' }}>满意度</div>
              </div>
            </Col>
          </Row>
        </DetailSection>

        <DetailSection>
           <h4>联系方式</h4>
           <ContactItem>
             <PhoneOutlined />
             <span>{member.user.phone || '暂无电话'}</span>
           </ContactItem>
           <ContactItem>
             <MailOutlined />
             <span>{member.user.email}</span>
           </ContactItem>
         </DetailSection>
      </div>
    </DetailModal>
  );
};

export default TeamMemberModal;