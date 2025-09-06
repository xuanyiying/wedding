import { OssFactory, OssConfig } from '../services/oss/oss.factory';
import { OssService } from '../services/oss/oss.service';
import { S3Client } from '@aws-sdk/client-s3';

export interface OSSConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint?: string;
  secure?: boolean;
  cdnBaseUrl?: string;
}

// 统一OSS配置
export const ossConfig: OSSConfig = {
  region: process.env.OSS_REGION || 'us-east-1',
  accessKeyId: process.env.OSS_ACCESS_KEY || '',
  accessKeySecret: process.env.OSS_SECRET_KEY || '',
  bucket: process.env.OSS_BUCKET || 'wedding-prod',
  endpoint: process.env.OSS_ENDPOINT || 'http://localhost:9000',
  secure: process.env.OSS_USE_SSL === 'true',
  cdnBaseUrl: process.env.OSS_PUBLIC_ENDPOINT || 'http://localhost:9000',
};

// 创建S3客户端实例
export const createS3Client = (): S3Client => {
  return new S3Client({
    endpoint: ossConfig.endpoint || '',
    region: ossConfig.region,
    credentials: {
      accessKeyId: ossConfig.accessKeyId,
      secretAccessKey: ossConfig.accessKeySecret,
    },
    forcePathStyle: process.env.OSS_PATH_STYLE === 'true',
  });
};

// 单例S3客户端
let s3ClientInstance: S3Client | null = null;

export const getS3Client = (): S3Client => {
  if (!s3ClientInstance) {
    s3ClientInstance = createS3Client();
  }
  return s3ClientInstance;
};

// OSS服务实例管理
let OssServiceInstance: OssService | null = null;

/**
 * 获取存储服务实例
 * 根据环境变量 OSS_TYPE 选择存储后端
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