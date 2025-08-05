import { FileInfo, OssService, UploadResult } from './oss.service';
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
        endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
        region: process.env.MINIO_REGION || 'us-east-1',
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'rustfsadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'rustfssecret123',
        bucket: process.env.MINIO_BUCKET || 'wedding-media'
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

/**
 * 混合存储服务
 * 支持同时使用多个存储后端，可以根据文件类型或其他条件选择不同的存储
 */
export class HybridOssService implements OssService {
  private primaryOss: OssService;
  private secondaryOss?: OssService;
  private routingRules: Array<{
    condition: (key: string, contentType?: string) => boolean;
    Oss: 'primary' | 'secondary';
  }> = [];

  constructor(
    primaryOss: OssService,
    secondaryOss: OssService
  ) {
    this.primaryOss = primaryOss;
    // 确保 secondaryOss 为 OssService 类型或 undefined
    this.secondaryOss = secondaryOss;
  }

  /**
   * 添加路由规则
   */
  addRoutingRule(
    condition: (key: string, contentType?: string) => boolean,
    Oss: 'primary' | 'secondary'
  ): void {
    this.routingRules.push({ condition, Oss });
  }

  /**
   * 根据路由规则选择存储服务
   */
  private selectOss(key: string, contentType?: string): OssService {
    for (const rule of this.routingRules) {
      if (rule.condition(key, contentType)) {
        if (rule.Oss === 'secondary' && this.secondaryOss) {
          return this.secondaryOss;
        }
        return this.primaryOss;
      }
    }
    return this.primaryOss;
  }

  async initializeBucket(): Promise<void> {
    await this.primaryOss.initializeBucket();
    if (this.secondaryOss) {
      await this.secondaryOss.initializeBucket();
    }
  }

  async uploadFile(
    file: Buffer,
    originalName: string,
    contentType: string,
    folder?: string
  ): Promise<UploadResult> {
    const key = folder ? `${folder}/${originalName}` : originalName;
    const Oss = this.selectOss(key, contentType);
    return Oss.uploadFile(file, originalName, contentType, folder);
  }

  async downloadFile(key: string): Promise<Buffer> {
    const Oss = this.selectOss(key);
    return Oss.downloadFile(key);
  }

  async deleteFile(key: string): Promise<void> {
    const Oss = this.selectOss(key);
    return Oss.deleteFile(key);
  }

  async getFileInfo(key: string): Promise<FileInfo> {
    const Oss = this.selectOss(key);
    return Oss.getFileInfo(key);
  }

  async listFiles(prefix?: string, maxKeys?: number): Promise<FileInfo[]> {
    // 对于列表操作，同时查询两个存储并合并结果
    const primaryFiles = await this.primaryOss.listFiles(prefix, maxKeys);
    
    if (!this.secondaryOss) {
      return primaryFiles;
    }
    
    const secondaryFiles = await this.secondaryOss.listFiles(prefix, maxKeys);
    
    // 合并并去重
    const allFiles = [...primaryFiles, ...secondaryFiles];
    const uniqueFiles = allFiles.filter((file, index, self) => 
      index === self.findIndex(f => f.key === file.key)
    );
    
    return uniqueFiles.slice(0, maxKeys || 100);
  }

  async fileExists(key: string): Promise<boolean> {
    const Oss = this.selectOss(key);
    return Oss.fileExists(key);
  }

  getFileUrl(key: string): string {
    const Oss = this.selectOss(key);
    return Oss.getFileUrl(key);
  }

  async getPresignedUploadUrl(key: string, expires: number = 3600, contentType?: string): Promise<string> {
    const Oss = this.selectOss(key, contentType);
    return Oss.getPresignedUploadUrl(key, expires, contentType);
  }

  async getPresignedDownloadUrl(key: string, expires: number = 3600): Promise<string> {
    const Oss = this.selectOss(key);
    return Oss.getPresignedDownloadUrl(key, expires);
  }

  async deleteFiles(keys: string[]): Promise<void> {
    // 按存储类型分组
    const primaryKeys: string[] = [];
    const secondaryKeys: string[] = [];
    
    keys.forEach(key => {
      const Oss = this.selectOss(key);
      if (Oss === this.secondaryOss) {
        secondaryKeys.push(key);
      } else {
        primaryKeys.push(key);
      }
    });
    
    const promises: Promise<void>[] = [];
    
    if (primaryKeys.length > 0) {
      promises.push(this.primaryOss.deleteFiles(primaryKeys));
    }
    
    if (secondaryKeys.length > 0 && this.secondaryOss) {
      promises.push(this.secondaryOss.deleteFiles(secondaryKeys));
    }
    
    await Promise.all(promises);
  }

  async copyFile(sourceKey: string, targetKey: string): Promise<void> {
    const sourceOss = this.selectOss(sourceKey);
    const targetOss = this.selectOss(targetKey);
    
    if (sourceOss === targetOss) {
      // 同一存储内复制
      return sourceOss.copyFile(sourceKey, targetKey);
    } else {
      // 跨存储复制：下载后上传
      const fileBuffer = await sourceOss.downloadFile(sourceKey);
      const fileInfo = await sourceOss.getFileInfo(sourceKey);
      
      const originalName = sourceKey.split('/').pop() || 'unknown';
      const folder = targetKey.includes('/') ? targetKey.substring(0, targetKey.lastIndexOf('/')) : undefined;
      
      await targetOss.uploadFile(fileBuffer, originalName, fileInfo.contentType, folder);
    }
  }
}