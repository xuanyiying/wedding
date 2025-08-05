import React from 'react';
import { Modal, Typography, Tag, Row, Col } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, EnvironmentOutlined, UserOutlined } from '@ant-design/icons';
import type { Schedule, EventType } from '../../types';
import { getEventTypeColor } from '../../utils/styleUtils';
import styled from 'styled-components';

const { Title, Paragraph, Text } = Typography;

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
  margin-bottom: 20px;
  
  h4 {
    color: var(--client-text-primary);
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
  }
`;

interface ScheduleDetailModalProps {
  event: Schedule | null;
  visible: boolean;
  onClose: () => void;
}

const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({ event, visible, onClose }) => {
  if (!event) return null;

    const getEventTypeTag = (type: EventType) => {
    const typeMap: { [key: string]: string } = {
      wedding: '婚礼',
      engagement: '订婚',
      anniversary: '周年庆',
      other: '其他',
    };

    const text = typeMap[type] || '其他';
    const color = getEventTypeColor(type);

    return <Tag color={color}>{text}</Tag>;
  };

  return (
    <DetailModal
      title="档期详情"
      visible={visible}
      onCancel={onClose}
      footer={null}
      centered
    >
      <Title level={4}>{event.title}</Title>
      <DetailSection>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <UserOutlined /> <Text strong>主持人:</Text> {event.user?.realName || event.user?.nickname}
          </Col>
          <Col span={12}>
            <CalendarOutlined /> <Text strong>日期:</Text> {event.weddingDate}
          </Col>
          <Col span={12}>
            <ClockCircleOutlined /> <Text strong>时间:</Text> {event.weddingTime === 'lunch' ? '午宴' : '晚宴'}
          </Col>
          <Col span={24}>
            <EnvironmentOutlined /> <Text strong>地点:</Text> {event.location}
          </Col>
        </Row>
      </DetailSection>
      <DetailSection>
        <h4>描述</h4>
        <Paragraph>{event.description || '暂无描述'}</Paragraph>
      </DetailSection>
      <DetailSection>
        <h4>类型</h4>
        {getEventTypeTag(event.eventType)}
      </DetailSection>
    </DetailModal>
  );
};

export default ScheduleDetailModal;