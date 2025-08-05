import { getOssService } from '../config/oss';
import { OssService, UploadResult, FileInfo } from './oss/oss.service';

// 重新导出接口以保持向后兼容性
export { UploadResult, FileInfo };

/**
 * 文件存储服务
 * 现在使用抽象存储层，支持MinIO和阿里云OSS
 */
export class FSService {
  private storageService: OssService;

  constructor() {
    this.storageService = getOssService();
  }

  /**
   * 初始化存储桶
   */
  async initializeBucket(): Promise<void> {
    return this.storageService.initializeBucket();
  }

  /**
   * 上传文件
   * @param file 文件缓冲区
   * @param originalName 原始文件名
   * @param contentType 文件类型
   * @param folder 文件夹路径（可选）
   */
  async uploadFile(file: Buffer, originalName: string, contentType: string, folder?: string): Promise<UploadResult> {
    return this.storageService.uploadFile(file, originalName, contentType, folder);
  }

  /**
   * 下载文件
   * @param key 文件键
   */
  async downloadFile(key: string): Promise<Buffer> {
    return this.storageService.downloadFile(key);
  }

  /**
   * 删除文件
   * @param key 文件键
   */
  async deleteFile(key: string): Promise<void> {
    return this.storageService.deleteFile(key);
  }

  /**
   * 获取文件信息
   * @param key 文件键
   */
  async getFileInfo(key: string): Promise<FileInfo> {
    return this.storageService.getFileInfo(key);
  }

  /**
   * 列出文件
   * @param prefix 前缀过滤
   * @param maxKeys 最大返回数量
   */
  async listFiles(prefix?: string, maxKeys: number = 100): Promise<FileInfo[]> {
    return this.storageService.listFiles(prefix, maxKeys);
  }

  /**
   * 检查文件是否存在
   * @param key 文件键
   */
  async fileExists(key: string): Promise<boolean> {
    return this.storageService.fileExists(key);
  }

  /**
   * 获取文件访问URL
   * @param key 文件键
   */
  getFileUrl(key: string): string {
    return this.storageService.getFileUrl(key);
  }

  /**
   * 批量删除文件
   * @param keys 文件键数组
   */
  async deleteFiles(keys: string[]): Promise<void> {
    return this.storageService.deleteFiles(keys);
  }

  /**
   * 复制文件
   * @param sourceKey 源文件键
   * @param targetKey 目标文件键
   */
  async copyFile(sourceKey: string, targetKey: string): Promise<void> {
    return this.storageService.copyFile(sourceKey, targetKey);
  }
}

// 导出单例实例
export const fsService = new FSService();
export const rustfsService = fsService; // 向后兼容
