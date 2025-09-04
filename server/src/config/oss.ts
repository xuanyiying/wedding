import { OssType } from '@/types';
import { OssFactory } from '../services/oss/oss.factory';
import { OssService } from '../services/oss/oss.service';
// 需要先安装依赖: npm install @aws-sdk/client-s3 --save
// 如果使用 TypeScript，还需要安装类型定义: npm install @types/aws-sdk/client-s3 --save-dev
export const ossConfig = {
  region: process.env.OSS_REGION || 'us-east-1',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || process.env.OSS_ACCESS_KEY || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || process.env.OSS_SECRET_KEY || '',
  bucket: process.env.OSS_BUCKET || 'wedding-media',
  endpoint: process.env.OSS_ENDPOINT || 'http://minio:9000',
  secure: process.env.OSS_SECURE === 'true',
  cdnBaseUrl: process.env.OSS_CDN_BASE_URL || process.env.CDN_BASE_URL || '',
  ossType: (process.env.OSS_TYPE as OssType) || OssType.MINIO
};


// 新的存储服务配置和实例
let OssServiceInstance: OssService | null = null;

/**
 * 获取存储服务实例
 * 根据环境变量 Oss_TYPE 选择存储后端
 */
export const getOssService = (): OssService => {
  if (!OssServiceInstance) {
    OssServiceInstance = OssFactory.getInstance(ossConfig);
  }
  return OssServiceInstance;
};

/**
 * 重置存储服务实例（主要用于测试或配置更改）
 */
export const resetOssService = (): void => {
  OssServiceInstance = null;
  OssFactory.reset();
};
