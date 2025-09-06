import { OssService } from './oss.service';
import { MinIOService, MinIOConfig } from './minio.service';
import { AliyunOssService, OSSConfig } from './aliyun-oss.service';

export type OssType = 'minio' | 'aliyun' | 'tencent' | 'aws';

export interface OssConfig {
  type: OssType;
  config: MinIOConfig | OSSConfig;
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
        return new MinIOService(config.config as MinIOConfig);

      case 'aliyun':
        return new AliyunOssService(config.config as OSSConfig);

      default:
        throw new Error(`Unsupported OSS type: ${config.type}`);
    }
  }

  /**
   * 获取单例存储服务实例
   */
  static getInstance(config?: OssConfig): OssService {
    if (!this.instance || (config && JSON.stringify(config) !== JSON.stringify(this.config))) {
      if (!config) {
        throw new Error('OSS configuration is required for first initialization');
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
    const ossType = (process.env.OSS_TYPE || 'minio') as OssType;

    if (ossType === 'minio') {
      return {
        type: ossType,
        config: {
          endpoint: process.env.OSS_ENDPOINT || 'http://localhost:9000',
          region: process.env.OSS_REGION || 'us-east-1',
          accessKeyId: process.env.OSS_ACCESS_KEY || 'ossadmin',
          secretAccessKey: process.env.OSS_SECRET_KEY || 'osspassword',
          bucket: process.env.OSS_BUCKET || 'wedding-prod'
        } as MinIOConfig
      };
    } else if (ossType === 'aliyun') {
      return {
        type: ossType,
        config: {
          region: process.env.OSS_REGION || 'oss-cn-hangzhou',
          accessKeyId: process.env.OSS_ACCESS_KEY || '',
          accessKeySecret: process.env.OSS_SECRET_KEY || '',
          bucket: process.env.OSS_BUCKET || 'wedding-prod',
          endpoint: process.env.OSS_ENDPOINT,
          secure: process.env.OSS_USE_SSL === 'true'
        } as OSSConfig
      };
    }

    throw new Error(`Unsupported OSS type: ${ossType}`);
  }
}