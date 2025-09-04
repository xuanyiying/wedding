# 增强上传功能文档

## 概述

本文档详细说明了Wedding Client项目中增强上传功能的实现和使用方法。增强上传功能支持直传OSS和服务端上传两种模式，并提供了断点续传、自动重试、超时配置等高级特性。

## 功能特点

1. **双模式上传**
   - 直传OSS模式：文件直接从浏览器上传到OSS服务，减轻服务器负担
   - 服务端上传模式：文件先上传到服务器，再由服务器传输到OSS

2. **断点续传**
   - 支持大文件分片上传
   - 网络中断后可从断点处继续上传
   - 浏览器刷新或关闭后可恢复上传

3. **自动重试机制**
   - 可配置重试次数和间隔时间
   - 支持线性、指数和固定三种退避策略
   - 内置智能重试条件判断

4. **超时配置**
   - 可自定义上传超时阈值
   - 针对不同网络环境灵活调整

5. **上传进度监控**
   - 实时显示上传进度、速度和剩余时间
   - 支持暂停、恢复和取消操作

6. **批量上传**
   - 支持多文件同时上传
   - 可配置并发上传数量

## 组件使用方法

### 基本用法

```tsx
import React from 'react';
import { EnhancedUploader } from '../components/common/EnhancedUploader';

const UploadDemo: React.FC = () => {
  const handleUploadSuccess = (result) => {
    console.log('上传成功:', result);
  };

  const handleUploadError = (error) => {
    console.error('上传失败:', error);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">文件上传演示</h1>
      
      <EnhancedUploader
        accept="image/*,video/*"
        multiple
        maxSize={100 * 1024 * 1024} // 100MB
        onSuccess={handleUploadSuccess}
        onError={handleUploadError}
      />
    </div>
  );
};

export default UploadDemo;
```

### 高级配置

```tsx
import React from 'react';
import { EnhancedUploader } from '../components/common/EnhancedUploader';

const AdvancedUploadDemo: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">高级上传演示</h1>
      
      <EnhancedUploader
        accept="image/*,video/*"
        multiple
        maxSize={1024 * 1024 * 1024} // 1GB
        uploadMode="server" // 'direct' 或 'server'
        resumable={true}
        autoRetry={true}
        maxRetries={5}
        retryDelay={2000}
        chunkSize={5 * 1024 * 1024} // 5MB
        timeout={60000} // 60秒
        onSuccess={(result) => console.log('上传成功:', result)}
        onError={(error) => console.error('上传失败:', error)}
        onProgress={(progress) => console.log('上传进度:', progress)}
      />
    </div>
  );
};

export default AdvancedUploadDemo;
```

## Hook 使用方法

除了使用组件，还可以直接使用Hook在自定义组件中实现上传功能：

```tsx
import React, { useState } from 'react';
import { Button, Progress, message } from 'antd';
import { useEnhancedUpload } from '../hooks/useEnhancedUpload';

const CustomUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  
  const { 
    upload, 
    progress, 
    status, 
    pauseUpload, 
    resumeUpload, 
    cancelUpload 
  } = useEnhancedUpload({
    uploadMode: 'direct',
    resumable: true,
    autoRetry: true,
    maxRetries: 3
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleUpload = async () => {
    if (!file) {
      message.error('请先选择文件');
      return;
    }
    
    try {
      const result = await upload(file);
      message.success('上传成功');
      console.log('上传结果:', result);
    } catch (error) {
      message.error('上传失败');
      console.error('上传错误:', error);
    }
  };
  
  return (
    <div className="p-4 border rounded">
      <input type="file" onChange={handleFileChange} />
      
      <div className="mt-4 flex gap-2">
        <Button type="primary" onClick={handleUpload}>
          上传
        </Button>
        
        <Button onClick={pauseUpload} disabled={status !== 'uploading'}>
          暂停
        </Button>
        
        <Button onClick={resumeUpload} disabled={status !== 'paused'}>
          恢复
        </Button>
        
        <Button danger onClick={cancelUpload} disabled={!['uploading', 'paused'].includes(status)}>
          取消
        </Button>
      </div>
      
      {progress && (
        <div className="mt-4">
          <Progress 
            percent={Math.round(progress.percent * 100)} 
            status={status === 'failed' ? 'exception' : undefined}
          />
          <div className="text-sm text-gray-500 mt-1">
            已上传: {Math.round(progress.loaded / 1024 / 1024 * 100) / 100}MB / 
            总大小: {Math.round(progress.total / 1024 / 1024 * 100) / 100}MB
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomUploader;
```

## 批量上传器使用方法

对于需要批量上传多个文件的场景，可以使用BatchUploader类：

```tsx
import React, { useState } from 'react';
import { Button, Table, Tag, Progress } from 'antd';
import { BatchUploader } from '../utils/batch-uploader';
import { formatFileSize, formatSpeed } from '../utils/upload-utils';

const BatchUploadDemo: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploader, setUploader] = useState<BatchUploader | null>(null);
  const [uploadStatus, setUploadStatus] = useState<Record<string, any>>({});
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };
  
  const handleStartUpload = () => {
    if (files.length === 0) {
      return;
    }
    
    // 创建批量上传器
    const batchUploader = new BatchUploader({
      uploadMode: 'direct',
      resumable: true,
      autoRetry: true,
      maxRetries: 3,
      concurrentUploads: 3
    });
    
    // 设置事件监听
    batchUploader.on('progress', (fileId, progress) => {
      setUploadStatus(prev => ({
        ...prev,
        [fileId]: { ...prev[fileId], progress }
      }));
    });
    
    batchUploader.on('success', (fileId, result) => {
      setUploadStatus(prev => ({
        ...prev,
        [fileId]: { ...prev[fileId], status: 'completed', result }
      }));
    });
    
    batchUploader.on('error', (fileId, error) => {
      setUploadStatus(prev => ({
        ...prev,
        [fileId]: { ...prev[fileId], status: 'failed', error }
      }));
    });
    
    batchUploader.on('statusChange', (fileId, status) => {
      setUploadStatus(prev => ({
        ...prev,
        [fileId]: { ...prev[fileId], status }
      }));
    });
    
    // 添加文件到上传队列
    files.forEach(file => {
      const fileId = batchUploader.addFile(file);
      setUploadStatus(prev => ({
        ...prev,
        [fileId]: { 
          fileName: file.name,
          fileSize: file.size,
          status: 'pending',
          progress: { loaded: 0, total: file.size, percent: 0 }
        }
      }));
    });
    
    // 开始上传
    batchUploader.startUpload();
    setUploader(batchUploader);
  };
  
  const handlePauseAll = () => {
    uploader?.pauseAll();
  };
  
  const handleResumeAll = () => {
    uploader?.resumeAll();
  };
  
  const handleCancelAll = () => {
    uploader?.cancelAll();
    setUploader(null);
  };
  
  const columns = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName'
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
          pending: { color: 'default', text: '等待中' },
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
      key: 'progress',
      render: (_: any, record: any) => (
        record.progress && (
          <div>
            <Progress percent={Math.round(record.progress.percent * 100)} size="small" />
            {record.progress.speed && (
              <div className="text-xs text-gray-500">
                {formatSpeed(record.progress.speed)}/s
              </div>
            )}
          </div>
        )
      )
    }
  ];
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">批量上传演示</h1>
      
      <div className="mb-4">
        <input type="file" multiple onChange={handleFileChange} />
      </div>
      
      <div className="mb-4 flex gap-2">
        <Button type="primary" onClick={handleStartUpload} disabled={files.length === 0 || !!uploader}>
          开始上传
        </Button>
        
        <Button onClick={handlePauseAll} disabled={!uploader}>
          全部暂停
        </Button>
        
        <Button onClick={handleResumeAll} disabled={!uploader}>
          全部恢复
        </Button>
        
        <Button danger onClick={handleCancelAll} disabled={!uploader}>
          全部取消
        </Button>
      </div>
      
      <Table
        rowKey={(record, index) => index.toString()}
        dataSource={Object.entries(uploadStatus).map(([id, data]) => ({ id, ...data }))}
        columns={columns}
        pagination={false}
      />
    </div>
  );
};

export default BatchUploadDemo;
```

## 上传配置管理

系统提供了上传配置管理页面，管理员可以在此页面配置上传相关参数：

1. 访问路径：`/admin/upload-settings`
2. 可配置项：
   - 上传模式（直传OSS/服务端上传）
   - 断点续传开关
   - 自动重试开关
   - 最大重试次数
   - 重试延迟时间
   - 并发上传数
   - 分片大小

## 最佳实践

1. **大文件上传**
   - 启用断点续传
   - 使用服务端上传模式
   - 适当增加分片大小（5-10MB）

2. **多文件上传**
   - 使用BatchUploader
   - 限制并发上传数（3-5个）
   - 启用自动重试

3. **弱网环境**
   - 减小分片大小（1-2MB）
   - 增加超时阈值
   - 增加重试次数

4. **高可靠性要求**
   - 启用断点续传
   - 配置指数退避重试策略
   - 使用服务端上传模式

## 故障排除

1. **上传失败**
   - 检查网络连接
   - 查看浏览器控制台错误信息
   - 确认文件大小是否超过限制

2. **上传速度慢**
   - 减小并发上传数
   - 检查网络带宽
   - 考虑切换上传模式

3. **无法恢复上传**
   - 确认浏览器支持断点续传
   - 检查服务器临时文件是否被清理
   - 尝试重新初始化上传会话

## API参考

详细的API文档请参考：
- `EnhancedUploader` 组件文档
- `useEnhancedUpload` Hook文档
- `BatchUploader` 类文档
- `enhanced-upload.api.ts` 服务文档