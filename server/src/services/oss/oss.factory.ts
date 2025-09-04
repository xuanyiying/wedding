import { OssService } from './oss.service';
import { MinIOService } from './minio.service';
import { AliyunOssService } from './aliyun-oss.service';
import { TencentCosService } from './tencent-cos.service';
import { OssConfig } from '../../config/config';
import { OssType } from '@/types';

export class OssFactory {
  private static instances: Map<string, OssService> = new Map();

  static getService(config: OssConfig): OssService {
    const type = config.ossType;
    if (!this.instances.has(type)) {
      const ossService = this.createOssService(config);
      this.instances.set(type, ossService);
    }
    return this.instances.get(type)!;
  }

  /**
   * 获取OSS服务实例
   */
  static getInstance(config: OssConfig): OssService {
    return this.getService(config);
  }

  /**
   * 重置所有实例
   */
  static reset(): void {
    this.instances.clear();
  }

  private static createOssService(config: OssConfig): OssService {
    switch (config.ossType) {
      case OssType.MINIO:
        return new MinIOService(config);
      case OssType.ALIYUN:
        return new AliyunOssService(config);
      case OssType.TENCENT:
        // 转换配置格式以匹配TencentCosService期望的格式
        return new TencentCosService(config);
      case OssType.AWS:
        // AWS S3服务暂未实现
        throw new Error('AWS S3 service is not implemented yet.');

      default:
        return new MinIOService(config);
    }
  }
}