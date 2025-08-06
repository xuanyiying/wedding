import { OssFactory, OssConfig } from '../services/oss/oss.factory';
import { OssService } from '../services/oss/oss.service';
// 需要先安装依赖: npm install @aws-sdk/client-s3 --save
// 如果使用 TypeScript，还需要安装类型定义: npm install @types/aws-sdk/client-s3 --save-dev
import { S3Client } from '@aws-sdk/client-s3';

export type MinIOConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  secure?: boolean;
};

export interface OSSConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint?: string | undefined;
  secure?: boolean | undefined;
}

// MinIO配置 (兼容S3)
export const minioConfig: MinIOConfig = {
  endpoint: process.env.OSS_ENDPOINT || process.env.MINIO_ENDPOINT || 'http://minio:9000',
  region: process.env.MINIO_REGION || 'us-east-1',
  accessKeyId: process.env.OSS_ACCESS_KEY || process.env.MINIO_ACCESS_KEY || 'rustfsadmin',
  secretAccessKey: process.env.OSS_SECRET_KEY || process.env.MINIO_SECRET_KEY || 'rustfssecret123',
  bucket: process.env.OSS_BUCKET || process.env.MINIO_BUCKET || 'wedding-media',
};

// 阿里云OSS配置
export const ossConfig: OSSConfig = {
  region: process.env.OSS_REGION || 'cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  bucket: process.env.OSS_BUCKET || 'wedding-host-bucket',
  endpoint: process.env.OSS_ENDPOINT,
  secure: process.env.OSS_SECURE !== 'false',
};

// 为了保持向后兼容性，导出别名
export const rustfsConfig = minioConfig;

// 创建S3客户端实例（向后兼容）
export const createS3Client = (): S3Client => {
  return new S3Client({
    endpoint: minioConfig.endpoint,
    region: minioConfig.region,
    credentials: {
      accessKeyId: minioConfig.accessKeyId,
      secretAccessKey: minioConfig.secretAccessKey,
    },
    forcePathStyle: true, // MinIO需要路径样式访问
  });
};

// 单例S3客户端（向后兼容）
let s3ClientInstance: S3Client | null = null;

export const getS3Client = (): S3Client => {
  if (!s3ClientInstance) {
    s3ClientInstance = createS3Client();
  }
  return s3ClientInstance;
};

// 新的存储服务配置和实例
let OssServiceInstance: OssService | null = null;

/**
 * 获取存储服务实例
 * 根据环境变量 Oss_TYPE 选择存储后端
 */
export const getOssService = (): OssService => {
  if (!OssServiceInstance) {
    const config = OssFactory.createConfigFromEnv();
    OssServiceInstance = OssFactory.getInstance(config);
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

/**
 * 获取当前存储配置
 */
export const getOssConfig = (): OssConfig => {
  return OssFactory.createConfigFromEnv();
};
