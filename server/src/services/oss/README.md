# 存储服务抽象层

本项目支持多种存储后端，包括 MinIO 和阿里云 OSS，通过统一的接口提供文件存储服务。

## 功能特性

- 🔄 **多存储后端支持**: 支持 MinIO 和阿里云 OSS
- 🔧 **统一接口**: 提供一致的 API，无需修改业务代码即可切换存储后端
- 🏭 **工厂模式**: 通过配置自动选择存储实现
- 🔀 **混合存储**: 支持同时使用多个存储后端，根据规则路由文件
- ⚙️ **环境配置**: 通过环境变量轻松配置

## 快速开始

### 1. 环境配置

在 `.env` 文件中配置存储类型和相关参数：

```bash
# 存储类型选择: minio 或 oss
STORAGE_TYPE=minio

# MinIO 配置
MINIO_ENDPOINT=http://localhost:9000
MINIO_REGION=us-east-1
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=your-bucket

# 阿里云 OSS 配置
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET=your-bucket
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
OSS_SECURE=true
```

### 2. 基本使用

```typescript
import { getStorageService } from '../config/oss';

// 获取存储服务实例
const storageService = getStorageService();

// 初始化存储桶
await storageService.initializeBucket();

// 上传文件
const result = await storageService.uploadFile(
  fileBuffer,
  'example.jpg',
  'image/jpeg',
  'images' // 可选的文件夹
);

console.log('文件上传成功:', result.url);

// 下载文件
const fileBuffer = await storageService.downloadFile(result.key);

// 获取文件信息
const fileInfo = await storageService.getFileInfo(result.key);

// 删除文件
await storageService.deleteFile(result.key);
```

### 3. 使用现有的 RustFSService（向后兼容）

```typescript
import { rustfsService } from '../services/FSService';

// 现有代码无需修改，自动使用配置的存储后端
const result = await rustfsService.uploadFile(
  fileBuffer,
  'example.jpg',
  'image/jpeg'
);
```

## 高级用法

### 混合存储

可以同时使用多个存储后端，根据文件类型或其他条件选择不同的存储：

```typescript
import { HybridStorageService } from './StorageFactory';
import { MinIOStorageService } from './MinIOStorageService';
import { OSSStorageService } from './OSSStorageService';

// 创建存储实例
const minioStorage = new MinIOStorageService(minioConfig);
const ossStorage = new OSSStorageService(ossConfig);

// 创建混合存储服务
const hybridStorage = new HybridStorageService(minioStorage, ossStorage);

// 添加路由规则：图片使用 OSS，视频使用 MinIO
hybridStorage.addRoutingRule(
  (key, contentType) => contentType?.startsWith('image/') || false,
  'secondary' // OSS
);

hybridStorage.addRoutingRule(
  (key, contentType) => contentType?.startsWith('video/') || false,
  'primary' // MinIO
);

// 使用混合存储
const imageResult = await hybridStorage.uploadFile(
  imageBuffer,
  'photo.jpg',
  'image/jpeg'
); // 自动路由到 OSS

const videoResult = await hybridStorage.uploadFile(
  videoBuffer,
  'video.mp4',
  'video/mp4'
); // 自动路由到 MinIO
```

### 直接使用特定存储

```typescript
import { StorageFactory } from './StorageFactory';

// 直接创建 MinIO 存储
const minioStorage = StorageFactory.createStorageService({
  type: 'minio',
  minio: {
    endpoint: 'http://localhost:9000',
    region: 'us-east-1',
    accessKeyId: 'your-key',
    secretAccessKey: 'your-secret',
    bucket: 'your-bucket'
  }
});

// 直接创建 OSS 存储
const ossStorage = StorageFactory.createStorageService({
  type: 'oss',
  oss: {
    region: 'oss-cn-hangzhou',
    accessKeyId: 'your-key',
    accessKeySecret: 'your-secret',
    bucket: 'your-bucket'
  }
});
```

## 存储后端对比

| 特性 | MinIO | 阿里云 OSS |
|------|-------|------------|
| 部署方式 | 自托管 | 云服务 |
| 成本 | 服务器成本 | 按使用量付费 |
| 性能 | 取决于硬件 | 高性能 |
| 可用性 | 取决于部署 | 99.9% SLA |
| 扩展性 | 手动扩展 | 自动扩展 |
| API 兼容性 | S3 兼容 | 原生 API |
| 批量操作 | 支持 | 原生支持 |
| CDN 集成 | 需要配置 | 内置 CDN |

## 配置说明

### MinIO 配置项

- `MINIO_ENDPOINT`: MinIO 服务端点
- `MINIO_REGION`: 区域设置
- `MINIO_ACCESS_KEY`: 访问密钥
- `MINIO_SECRET_KEY`: 密钥
- `MINIO_BUCKET`: 存储桶名称

### OSS 配置项

- `OSS_REGION`: OSS 区域
- `OSS_ACCESS_KEY_ID`: 访问密钥 ID
- `OSS_ACCESS_KEY_SECRET`: 访问密钥
- `OSS_BUCKET`: 存储桶名称
- `OSS_ENDPOINT`: 自定义域名（可选）
- `OSS_SECURE`: 是否使用 HTTPS（默认 true）

## 最佳实践

1. **开发环境**: 使用 MinIO 进行本地开发
2. **生产环境**: 根据需求选择 OSS 或 MinIO
3. **混合部署**: 图片等小文件使用 OSS（CDN 加速），大文件使用 MinIO（成本控制）
4. **备份策略**: 使用混合存储实现多重备份
5. **监控**: 监控存储使用量和性能指标

## 故障排除

### 常见问题

1. **连接失败**: 检查网络连接和端点配置
2. **权限错误**: 验证访问密钥和权限设置
3. **存储桶不存在**: 确保存储桶已创建或有创建权限
4. **文件上传失败**: 检查文件大小限制和网络稳定性

### 调试技巧

```typescript
// 启用详细日志
process.env.DEBUG = 'storage:*';

// 检查存储配置
import { getStorageConfig } from '../config/oss';
console.log('当前存储配置:', getStorageConfig());

// 测试连接
const storageService = getStorageService();
try {
  await storageService.initializeBucket();
  console.log('存储服务连接成功');
} catch (error) {
  console.error('存储服务连接失败:', error);
}
```

## 迁移指南

### 从单一存储迁移到混合存储

1. 备份现有数据
2. 配置新的存储后端
3. 设置路由规则
4. 逐步迁移数据
5. 验证数据完整性

### 切换存储后端

1. 修改 `STORAGE_TYPE` 环境变量
2. 配置新存储后端的参数
3. 重启应用服务
4. 验证功能正常

## 扩展开发

要添加新的存储后端，需要：

1. 实现 `IStorageService` 接口
2. 在 `StorageFactory` 中添加新的存储类型
3. 更新配置接口和环境变量
4. 添加相应的测试用例

```typescript
// 示例：添加新的存储后端
export class CustomStorageService implements IStorageService {
  // 实现所有接口方法
  async uploadFile(file: Buffer, originalName: string, contentType: string, folder?: string): Promise<UploadResult> {
    // 自定义实现
  }
  
  // ... 其他方法
}
```