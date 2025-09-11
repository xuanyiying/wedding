import React, { useState, useEffect } from 'react';
import {
  Modal,
  Descriptions,
  Tag,
  Button,
  Space,
  message,
  Typography,
  Divider,
  Avatar,
  Form,
  Input
} from 'antd';
import {
  CloseOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  MessageOutlined
} from '@ant-design/icons';
import type { Issue } from '../../../types/issue';
import { IssueStatus, IssueType, IssuePriority } from '../../../types/issue';


const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface IssueDetailModalProps {
  visible: boolean;
  issue: Issue | null;
  onCancel: () => void;
  onUpdate: () => void;
}



const IssueDetailModal: React.FC<IssueDetailModalProps> = ({
  visible,
  issue,
  onCancel,
  onUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentForm] = Form.useForm();

  const loadComments = async () => {
    try {
      // 评论功能暂未实现，先设置为空数组
      setComments([]);
    } catch (error) {
      console.error('加载评论失败:', error);
    }
  };

  useEffect(() => {
    if (visible && issue) {
      loadComments();
    }
  }, [visible, issue]);

  const handleStatusChange = async () => {
    if (!issue) return;

    setLoading(true);
    try {
      // 状态更新功能暂未实现
      message.info('状态更新功能暂未实现');
      onUpdate();
    } catch (error: any) {
      message.error(error.message || '状态更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!issue) return;

    setCommentLoading(true);
    try {
      // 评论功能暂未实现
      message.info('评论功能暂未实现');
      commentForm.resetFields();
    } catch (error: any) {
      message.error(error.message || '添加评论失败');
    } finally {
      setCommentLoading(false);
    }
  };

  const getTypeText = (type: IssueType) => {
    switch (type) {
      case IssueType.BUG: return '缺陷';
      case IssueType.FEATURE: return '功能需求';
      case IssueType.ENHANCEMENT: return '优化建议';
      case IssueType.DOCUMENTATION: return '文档问题';
      case IssueType.OTHER: return '其他';
      default: return type;
    }
  };

  const getPriorityText = (priority: IssuePriority) => {
    switch (priority) {
      case IssuePriority.LOW: return '低';
      case IssuePriority.MEDIUM: return '中';
      case IssuePriority.HIGH: return '高';
      case IssuePriority.CRITICAL: return '紧急';
      default: return priority;
    }
  };

  const getStatusText = (status: IssueStatus) => {
    switch (status) {
      case IssueStatus.OPEN: return '待处理';
      case IssueStatus.IN_PROGRESS: return '处理中';
      case IssueStatus.RESOLVED: return '已解决';
      case IssueStatus.CLOSED: return '已关闭';
      case IssueStatus.REJECTED: return '已拒绝';
      default: return status;
    }
  };

  const getTypeColor = (type: IssueType) => {
    const colors = {
      [IssueType.BUG]: 'red',
      [IssueType.FEATURE]: 'blue',
      [IssueType.ENHANCEMENT]: 'green',
      [IssueType.DOCUMENTATION]: 'purple',
      [IssueType.OTHER]: 'default'
    };
    return colors[type];
  };

  const getPriorityColor = (priority: IssuePriority) => {
    const colors = {
      [IssuePriority.LOW]: 'blue',
      [IssuePriority.MEDIUM]: 'orange',
      [IssuePriority.HIGH]: 'red',
      [IssuePriority.CRITICAL]: 'magenta'
    };
    return colors[priority];
  };

  const getStatusColor = (status: IssueStatus) => {
    const colors = {
      [IssueStatus.OPEN]: 'blue',
      [IssueStatus.IN_PROGRESS]: 'orange',
      [IssueStatus.RESOLVED]: 'green',
      [IssueStatus.CLOSED]: 'default',
      [IssueStatus.REJECTED]: 'red'
    };
    return colors[status];
  };

  if (!issue) return null;

  return (
    <Modal
      title="问题详情"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      style={{ top: 20 }}
    >
      {/* 基本信息 */}
      <Descriptions
        title="基本信息"
        bordered
        column={2}
        style={{ marginBottom: 24 }}
      >
        <Descriptions.Item label="问题标题">
          <Text strong>{issue.title}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="问题类型">
          <Tag color={getTypeColor(issue.type)}>
            {getTypeText(issue.type)}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="优先级">
          <Tag color={getPriorityColor(issue.priority)}>
            {getPriorityText(issue.priority)}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="当前状态">
          <Tag color={getStatusColor(issue.status)}>
            {getStatusText(issue.status)}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="报告人" span={2}>
          {issue.reporter?.username}
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {new Date(issue.createdAt).toLocaleString()}
        </Descriptions.Item>
        <Descriptions.Item label="更新时间">
          {new Date(issue.updatedAt).toLocaleString()}
        </Descriptions.Item>
      </Descriptions>

      {/* 问题描述 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>问题描述</Title>
        <Paragraph>{issue.description}</Paragraph>
      </div>

      {/* 期望行为 vs 实际行为 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>行为对比</Title>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <Text strong>期望行为:</Text>
            <Paragraph>{issue.expectedBehavior || '未提供'}</Paragraph>
          </div>
          <div style={{ flex: 1 }}>
            <Text strong>实际行为:</Text>
            <Paragraph>{issue.actualBehavior || '未提供'}</Paragraph>
          </div>
        </div>
      </div>

      {/* 重现步骤 */}
      {issue.stepsToReproduce && (
        <div style={{ marginBottom: 24 }}>
          <Title level={5}>重现步骤</Title>
          <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
            {issue.stepsToReproduce}
          </Paragraph>
        </div>
      )}

      {/* 环境信息 */}
      {issue.environment && (
        <div style={{ marginBottom: 24 }}>
          <Title level={5}>环境信息</Title>
          <Paragraph>{issue.environment}</Paragraph>
        </div>
      )}

      {/* 状态操作按钮 */}
      <Divider />
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>状态操作</Title>
        <Space>
          {issue.status !== IssueStatus.IN_PROGRESS && (
            <Button
              icon={<ClockCircleOutlined />}
              onClick={handleStatusChange}
              loading={loading}
            >
              开始处理
            </Button>
          )}
          {issue.status !== IssueStatus.RESOLVED && (
            <Button
              icon={<CheckOutlined />}
              type="primary"
              onClick={handleStatusChange}
              loading={loading}
            >
              标记为已解决
            </Button>
          )}
          {issue.status !== IssueStatus.CLOSED && (
            <Button
              icon={<CloseOutlined />}
              onClick={handleStatusChange}
              loading={loading}
            >
              关闭问题
            </Button>
          )}
        </Space>
      </div>

      {/* 评论区域 */}
      <Divider />
      <div>
        <Title level={5}>评论 ({comments.length})</Title>
        
        {/* 评论列表 */}
        <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
          {comments.map((comment) => (
            <div key={comment.id} style={{ marginBottom: 16, padding: 12, border: '1px solid #f0f0f0', borderRadius: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <Avatar src={comment.author?.avatar} alt={comment.author?.username} size="small">
                  {comment.author?.username?.charAt(0).toUpperCase()}
                </Avatar>
                <span style={{ marginLeft: 8, fontWeight: 'bold' }}>
                  {comment.author?.username}
                </span>
                <span style={{ marginLeft: 'auto', color: '#999', fontSize: 12 }}>
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <Paragraph style={{ margin: 0 }}>{comment.content}</Paragraph>
            </div>
          ))}
        </div>

        {/* 添加评论表单 */}
        <Form
          form={commentForm}
          onFinish={() => handleAddComment()}
        >
          <Form.Item
            name="content"
            rules={[
              { required: true, message: '请输入评论内容' },
              { max: 1000, message: '评论内容不能超过1000个字符' }
            ]}
          >
            <TextArea
              rows={3}
              placeholder="请输入您的评论..."
              maxLength={1000}
              showCount
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={commentLoading}
              icon={<MessageOutlined />}
            >
              添加评论
            </Button>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export { IssueDetailModal };