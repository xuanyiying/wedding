import React, { useState, useEffect } from 'react';
import { Card, Form, Switch, InputNumber, Button, message, Tabs, Table, Progress, Space, Tag, Tooltip } from 'antd';
import { ReloadOutlined, SettingOutlined, CloudUploadOutlined, HistoryOutlined } from '@ant-design/icons';
import { uploadConfigService } from '../../services/upload-config.service';
import { useUploadStore } from '../../store/upload-state';
import { formatFileSize, formatSpeed, formatTimeRemaining } from '../../utils/upload-utils';

// 添加类型定义
interface UploadConfig {
  uploadMode?: 'direct' | 'server';
  resumableEnabled?: boolean;
  autoRetryEnabled?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  concurrentUploads?: number;
  chunkSize?: number;
}

const { TabPane } = Tabs;

/**
 * 上传设置页面
 * 用于管理上传配置和查看上传历史
 */
const UploadSettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [uploadStats, setUploadStats] = useState<any>(null);

  // 从全局状态获取上传会话
  const {
    uploadMode,
    resumableEnabled,
    autoRetryEnabled,
    maxRetries,
    retryDelay,
    concurrentUploads,
    chunkSize,
    updateConfig,
    getActiveSessions,
    getCompletedSessions,
    getFailedSessions,
    cleanupSessions
  } = useUploadStore();

  // 获取上传配置
  const fetchUploadConfig = async () => {
    try {
      setLoading(true);
      const response = await uploadConfigService.getUploadConfig();
      const config = response as UploadConfig;

      // 更新表单
      form.setFieldsValue({
        uploadMode: config.uploadMode || uploadMode,
        resumableEnabled: config.resumableEnabled ?? resumableEnabled,
        autoRetryEnabled: config.autoRetryEnabled ?? autoRetryEnabled,
        maxRetries: config.maxRetries || maxRetries,
        retryDelay: config.retryDelay || retryDelay,
        concurrentUploads: config.concurrentUploads || concurrentUploads,
        chunkSize: (config.chunkSize || chunkSize) / (1024 * 1024) // 转换为MB
      });

      // 更新全局状态
      updateConfig({
        uploadMode: config.uploadMode || uploadMode,
        resumableEnabled: config.resumableEnabled ?? resumableEnabled,
        autoRetryEnabled: config.autoRetryEnabled ?? autoRetryEnabled,
        maxRetries: config.maxRetries || maxRetries,
        retryDelay: config.retryDelay || retryDelay,
        concurrentUploads: config.concurrentUploads || concurrentUploads,
        chunkSize: config.chunkSize || chunkSize
      });
    } catch (error) {
      console.error('获取上传配置失败:', error);
      message.error('获取上传配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取上传统计信息
  const fetchUploadStats = async () => {
    try {
      setStatsLoading(true);
      const stats = await uploadConfigService.getUploadStats();
      setUploadStats(stats);
    } catch (error) {
      console.error('获取上传统计信息失败:', error);
      message.error('获取上传统计信息失败');
    } finally {
      setStatsLoading(false);
    }
  };

  // 保存上传配置
  const handleSaveConfig = async (values: any) => {
    try {
      setLoading(true);

      // 转换分片大小为字节
      const configToSave = {
        ...values,
        chunkSize: values.chunkSize * 1024 * 1024 // MB转换为字节
      };

      await uploadConfigService.updateUploadConfig(configToSave);

      // 更新全局状态
      updateConfig({
        uploadMode: values.uploadMode,
        resumableEnabled: values.resumableEnabled,
        autoRetryEnabled: values.autoRetryEnabled,
        maxRetries: values.maxRetries,
        retryDelay: values.retryDelay,
        concurrentUploads: values.concurrentUploads,
        chunkSize: values.chunkSize * 1024 * 1024 // MB转换为字节
      });

      message.success('上传配置已保存');
    } catch (error) {
      console.error('保存上传配置失败:', error);
      message.error('保存上传配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 清理过期会话
  const handleCleanupSessions = () => {
    cleanupSessions();
    message.success('已清理过期上传会话');
  };

  // 初始化
  useEffect(() => {
    fetchUploadConfig();
    fetchUploadStats();
  }, []);

  // 活跃上传会话列表列定义
  const activeSessionColumns = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true
    },
    {
      title: '大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      render: (size: number) => formatFileSize(size)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          preparing: { color: 'blue', text: '准备中' },
          uploading: { color: 'processing', text: '上传中' },
          paused: { color: 'warning', text: '已暂停' },
          completed: { color: 'success', text: '已完成' },
          failed: { color: 'error', text: '失败' }
        };

        const { color, text } = statusMap[status] || { color: 'default', text: status };
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: any) => (
        <Tooltip title={`${formatSpeed(progress.speed)}/s - 剩余时间: ${formatTimeRemaining(progress.remainingTime)}`}>
          <Progress percent={Math.round(progress.percent * 100)} size="small" />
        </Tooltip>
      )
    },
    {
      title: '上传模式',
      dataIndex: 'uploadMode',
      key: 'uploadMode',
      render: (mode: string) => (
        mode === 'direct' ? '直传OSS' : '服务端上传'
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: number) => new Date(time).toLocaleString()
    }
  ];

  // 已完成上传会话列表列定义
  const completedSessionColumns = [
    ...activeSessionColumns.slice(0, 3),
    {
      title: '文件URL',
      dataIndex: 'result',
      key: 'fileUrl',
      render: (result: any) => (
        result?.url ? (
          <a href={result.url} target="_blank" rel="noopener noreferrer">
            查看文件
          </a>
        ) : '无URL'
      )
    },
    {
      title: '完成时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (time: number) => new Date(time).toLocaleString()
    }
  ];

  // 失败上传会话列表列定义
  const failedSessionColumns = [
    ...activeSessionColumns.slice(0, 3),
    {
      title: '错误信息',
      dataIndex: 'error',
      key: 'error',
      render: (error: Error) => (
        <Tooltip title={error?.message || '未知错误'}>
          <span className="text-red-500">{error?.message || '未知错误'}</span>
        </Tooltip>
      )
    },
    {
      title: '失败时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (time: number) => new Date(time).toLocaleString()
    }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">上传设置</h1>

      <Tabs defaultActiveKey="settings">
        <TabPane
          tab={
            <span>
              <SettingOutlined />
              上传配置
            </span>
          }
          key="settings"
        >
          <Card title="上传配置" extra={<Button icon={<ReloadOutlined />} onClick={fetchUploadConfig}>刷新</Button>}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveConfig}
              initialValues={{
                uploadMode,
                resumableEnabled,
                autoRetryEnabled,
                maxRetries,
                retryDelay,
                concurrentUploads,
                chunkSize: chunkSize / (1024 * 1024) // 转换为MB
              }}
            >
              <Form.Item
                label="上传模式"
                name="uploadMode"
                tooltip="选择文件上传的方式"
              >
                <Form.Item name="uploadMode" valuePropName="checked" noStyle>
                  <Switch
                    checkedChildren="直传OSS"
                    unCheckedChildren="服务端上传"
                    checked={form.getFieldValue('uploadMode') === 'direct'}
                    onChange={(checked) => form.setFieldsValue({ uploadMode: checked ? 'direct' : 'server' })}
                  />
                </Form.Item>
                <span className="ml-2">
                  {form.getFieldValue('uploadMode') === 'direct' ? '直传OSS' : '服务端上传'}
                </span>
              </Form.Item>

              <Form.Item
                label="断点续传"
                name="resumableEnabled"
                valuePropName="checked"
                tooltip="启用后，上传中断可以从断点处继续"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="自动重试"
                name="autoRetryEnabled"
                valuePropName="checked"
                tooltip="启用后，上传失败会自动重试"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="最大重试次数"
                name="maxRetries"
                tooltip="上传失败后最多重试的次数"
              >
                <InputNumber min={1} max={10} />
              </Form.Item>

              <Form.Item
                label="重试延迟(毫秒)"
                name="retryDelay"
                tooltip="重试之间的延迟时间"
              >
                <InputNumber min={100} max={10000} step={100} />
              </Form.Item>

              <Form.Item
                label="并发上传数"
                name="concurrentUploads"
                tooltip="同时上传的文件数量"
              >
                <InputNumber min={1} max={10} />
              </Form.Item>

              <Form.Item
                label="分片大小(MB)"
                name="chunkSize"
                tooltip="文件分片上传的大小"
              >
                <InputNumber min={1} max={50} />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存配置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <CloudUploadOutlined />
              活跃上传
            </span>
          }
          key="active"
        >
          <Card title="活跃上传会话">
            <Table
              rowKey="id"
              dataSource={getActiveSessions()}
              columns={activeSessionColumns}
              pagination={false}
            />
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <HistoryOutlined />
              上传历史
            </span>
          }
          key="history"
        >
          <Card
            title="上传历史"
            extra={
              <Space>
                <Button onClick={handleCleanupSessions}>清理过期会话</Button>
              </Space>
            }
          >
            <Tabs defaultActiveKey="completed">
              <TabPane tab="已完成" key="completed">
                <Table
                  rowKey="id"
                  dataSource={getCompletedSessions()}
                  columns={completedSessionColumns}
                  pagination={{ pageSize: 10 }}
                />
              </TabPane>

              <TabPane tab="失败" key="failed">
                <Table
                  rowKey="id"
                  dataSource={getFailedSessions()}
                  columns={failedSessionColumns}
                  pagination={{ pageSize: 10 }}
                />
              </TabPane>
            </Tabs>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <ReloadOutlined />
              上传统计
            </span>
          }
          key="stats"
        >
          <Card
            title="上传统计"
            extra={
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchUploadStats}
                loading={statsLoading}
              >
                刷新
              </Button>
            }
          >
            {uploadStats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-blue-50">
                  <div className="text-center">
                    <p className="text-lg font-medium">总上传文件数</p>
                    <p className="text-3xl font-bold">{uploadStats.totalUploads || 0}</p>
                  </div>
                </Card>

                <Card className="bg-green-50">
                  <div className="text-center">
                    <p className="text-lg font-medium">成功上传数</p>
                    <p className="text-3xl font-bold">{uploadStats.successfulUploads || 0}</p>
                  </div>
                </Card>

                <Card className="bg-red-50">
                  <div className="text-center">
                    <p className="text-lg font-medium">失败上传数</p>
                    <p className="text-3xl font-bold">{uploadStats.failedUploads || 0}</p>
                  </div>
                </Card>

                <Card className="bg-purple-50">
                  <div className="text-center">
                    <p className="text-lg font-medium">总上传大小</p>
                    <p className="text-3xl font-bold">{formatFileSize(uploadStats.totalUploadSize || 0)}</p>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8">
                <p>暂无统计数据</p>
              </div>
            )}
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default UploadSettingsPage;