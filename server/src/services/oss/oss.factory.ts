import { OssService } from './oss.service';
import { MinIOService, MinIOConfig } from './minio.service';
import { AliyunOssService, OSSConfig } from './aliyun-oss.service';

export type OssType = 'minio' | 'aliyun';

export interface OssConfig {
  type: OssType;
  minio?: MinIOConfig;
  oss?: OSSConfig;
}

export class OssFactory {
  private static instance: OssService | null = null;
  private static config: OssConfig | null = null;

  /**
   * 创建存储服务实例
   */
  static createOssService(config: OssConfig): OssService {
    switch (config.type) {
      case 'minio':
        if (!config.minio) {
          throw new Error('MinIO configuration is required when type is "minio"');
        }
        return new MinIOService(config.minio);
      
      case 'aliyun':
        if (!config.oss) {
          throw new Error('OSS configuration is required when type is "aliyun"');
        }
        return new AliyunOssService(config.oss);
      
      default:
        throw new Error(`Unsupported Oss type: ${config.type}`);
    }
  }

  /**
   * 获取单例存储服务实例
   */
  static getInstance(config?: OssConfig): OssService {
    if (!this.instance || (config && JSON.stringify(config) !== JSON.stringify(this.config))) {
      if (!config) {
        throw new Error('Oss configuration is required for first initialization');
      }
      this.instance = this.createOssService(config);
      this.config = config;
    }
    return this.instance;
  }

  /**
   * 重置单例实例（主要用于测试）
   */
  static reset(): void {
    this.instance = null;
    this.config = null;
  }

  /**
   * 从环境变量创建存储配置
   */
  static createConfigFromEnv(): OssConfig {
    const OssType = (process.env.OSS_TYPE || 'minio') as OssType;
    
    const config: OssConfig = {
      type: OssType
    };

    if (OssType === 'minio') {
      config.minio = {
        endpoint: process.env.OSS_ENDPOINT || process.env.MINIO_ENDPOINT || 'http://minio:9000',
        region: process.env.MINIO_REGION || 'us-east-1',
        accessKeyId: process.env.OSS_ACCESS_KEY || process.env.MINIO_ACCESS_KEY || 'rustfsadmin',
        secretAccessKey: process.env.OSS_SECRET_KEY || process.env.MINIO_SECRET_KEY || 'rustfssecret123',
        bucket: process.env.OSS_BUCKET || process.env.MINIO_BUCKET || 'wedding-media'
      };
    } else if (OssType === 'aliyun') {
      config.oss = {
        region: process.env.OSS_REGION || 'oss-cn-hangzhou',
        accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
        accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
        bucket: process.env.OSS_BUCKET || 'wedding-host-bucket',
        endpoint: process.env.OSS_ENDPOINT,
        secure: process.env.OSS_SECURE !== 'false'
      };
    }

    return config;
  }
}