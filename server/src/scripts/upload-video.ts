#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { FileType } from '../types/index';
import { sequelize } from '../config/database';
import { OssService } from '../services/oss/oss.service';
import { OssFactory } from '../services/oss/oss.factory';
import { FileService } from '../services/file.service';
import '../models'; // 确保模型被加载
import { ossConfig } from '@/config/oss';

/**
 * 视频上传脚本
 * 用于将本地视频文件上传到MinIO存储
 */
class VideoUploader {
  private ossService: OssService;

  constructor() {
    this.ossService = OssFactory.getInstance(ossConfig);
  }

  /**
   * 上传视频文件
   * @param filePath 本地文件路径
   * @param userId 用户ID（可选，默认为系统用户）
   * @returns 上传结果
   */
  async uploadVideo(
    filePath: string,
    userId?: string,
  ): Promise<{
    fileId: string;
    url: string;
    minioKey: string;
  }> {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }

      // 读取文件
      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(fileName).toLowerCase();

      // 验证文件类型
      const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'];
      if (!videoExtensions.includes(fileExtension)) {
        throw new Error(`不支持的视频格式: ${fileExtension}`);
      }

      logger.info(`开始上传视频文件: ${fileName}`);
      logger.info(`文件大小: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);

      // 上传到MinIO
      const uploadResult = await this.ossService.uploadFile(
        fileBuffer,
        fileName,
        this.getContentType(fileExtension),
        'videos', // 存储在videos文件夹下
      );

      logger.info(`MinIO上传成功: ${uploadResult.url}`);

      // 尝试保存文件记录到数据库（如果失败则跳过）
      let fileId = 'uploaded-' + Date.now();
      try {
        const fileRecord = await FileService.createFileRecord({
          filename: path.basename(uploadResult.key),
          originalName: fileName,
          filePath: uploadResult.key,
          fileSize: uploadResult.size,
          mimeType: uploadResult.contentType,
          fileType: FileType.VIDEO,
          userId: userId || 'system',
          url: uploadResult.url,
        });
        fileId = fileRecord.id;
        logger.info(`数据库记录创建成功: ${fileRecord.id}`);
      } catch (dbError) {
        logger.warn('数据库记录创建失败，但文件已成功上传到MinIO:', dbError);
      }

      return {
        fileId,
        url: uploadResult.url,
        minioKey: uploadResult.key,
      };
    } catch (error) {
      logger.error('视频上传失败:', error);
      throw error;
    }
  }

  /**
   * 根据文件扩展名获取Content-Type
   */
  private getContentType(extension: string): string {
    const contentTypes: { [key: string]: string } = {
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
    };
    return contentTypes[extension] || 'video/mp4';
  }

  /**
   * 批量上传视频文件
   */
  async uploadVideos(
    filePaths: string[],
    userId?: string,
  ): Promise<
    Array<{
      filePath: string;
      fileId: string;
      url: string;
      minioKey: string;
    }>
  > {
    const results = [];

    for (const filePath of filePaths) {
      try {
        const result = await this.uploadVideo(filePath, userId);
        results.push({
          filePath,
          ...result,
        });
      } catch (error) {
        logger.error(`上传失败 ${filePath}:`, error);
        // 继续处理其他文件
      }
    }

    return results;
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 初始化数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 同步模型
    await sequelize.sync();
    logger.info('数据库模型同步成功');

    const uploader = new VideoUploader();

    // 从命令行参数获取文件路径
    const filePath = process.argv[2];
    const userId = process.argv[3]; // 可选的用户ID

    if (!filePath) {
      console.error('使用方法: ts-node upload-video.ts <文件路径> [用户ID]');
      console.error('示例: ts-node upload-video.ts /path/to/video.mp4 user123');
      process.exit(1);
    }

    // 上传视频
    const result = await uploader.uploadVideo(filePath, userId);

    console.log('\n=== 上传成功 ===');
    console.log(`文件ID: ${result.fileId}`);
    console.log(`访问URL: ${result.url}`);
    console.log(`MinIO Key: ${result.minioKey}`);
    console.log('================\n');
  } catch (error) {
    logger.error('脚本执行失败:', error);
    process.exit(1);
  }
}

// 错误处理
process.on('unhandledRejection', (reason, _promise) => {
  logger.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', error => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { VideoUploader };
export default main;
