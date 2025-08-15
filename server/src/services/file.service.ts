import { Op, WhereOptions } from 'sequelize';
import { File, FileAttributes, User } from '../models';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { OssService } from './oss/oss.service';
import { getOssService } from '../config/oss';
import { createRetryHandler } from '../middlewares/upload';
import axios from 'axios';
import { FileCategory, FileType, StorageType } from '../types';

interface GetFilesParams {
  page: number;
  pageSize: number;
  userId?: string | null;
  fileType?: FileType | null;
  keyword?: string | null;
  sortBy?: 'createdAt' | 'fileSize' | 'filename' | null;
  sortOrder?: 'ASC' | 'DESC' | null;
}

interface UploadFileData {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path?: string;
  buffer?: Buffer;
  userId: string;
  fileType: FileType;
  description?: string;
  category?: string;
}

export class FileService {

  // 获取OSS服务
  private static ossService: OssService = getOssService();

  /**
   * 获取文件列表
   */
  static async getFiles(params: GetFilesParams) {
    const { page, pageSize, userId, fileType, keyword, sortBy = 'createdAt', sortOrder = 'DESC' } = params;
    const offset = (page - 1) * pageSize;

    const where: WhereOptions = {};

    if (userId) {
      where.userId = userId;
    }

    if (fileType) {
      where.fileType = fileType;
    }

    if (keyword) {
      (where as any)[Op.or] = [
        { filename: { [Op.like]: `%${keyword}%` } },
        { originalName: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const { count, rows } = await File.findAndCountAll<File>({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'realName'],
        },
      ],
      order: sortBy && sortOrder ? [[sortBy, sortOrder]] : [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
    });

    return {
      files: rows,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  }

  /**
   * 获取文件详情
   */
  static async getFileById(id: string) {
    const file = await File.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'realName'],
        },
      ],
    });

    if (!file) {
      throw new Error('文件不存在');
    }

    return file;
  }

  static async generateVideoCover(videoUrl: string): Promise<string> {
    try {
      // 1. 下载视频文件
      const response = await axios.get(videoUrl, { responseType: 'arraybuffer' });
      const videoBuffer = Buffer.from(response.data, 'binary');
      const originalName = path.basename(new URL(videoUrl).pathname);
      // 2. 生成缩略图
      const thumbnailUrl = await this.generateVideoThumbnail(videoBuffer, originalName);
      return thumbnailUrl;
    } catch (error) {
      logger.error(`从URL生成视频封面失败: ${videoUrl}`, error);
      throw new Error('生成视频封面失败');
    }
  }

  /**
   * 单文件上传
   */
  static async uploadFile(data: UploadFileData) {
    // 验证文件类型
    const allowedTypes = {
      [FileType.IMAGE]: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      [FileType.VIDEO]: [
        'video/mp4',
        'video/avi',
        'video/mov',
        'video/wmv',
        'video/quicktime',
        'video/flv',
        'video/webm',
        'video/mkv',
      ],
    };

    if (data.fileType && allowedTypes[data.fileType]) {
      if (!allowedTypes[data.fileType].includes(data.mimetype)) {
        throw new Error(`不支持的文件类型: ${data.mimetype}`);
      }
    }

    // 获取文件缓冲区
    let fileBuffer: Buffer;
    if (data.buffer) {
      fileBuffer = data.buffer;
    } else if (data.path) {
      fileBuffer = await fs.readFile(data.path);
    } else {
      throw new Error('必须提供文件路径或缓冲区');
    }

    // 计算文件哈希
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');

    // 检查是否已存在相同文件
    const existingFile = await File.findOne({
      where: { hashMd5: hash },
    });

    if (existingFile) {
      // 删除临时文件（如果存在）
      if (data.path) {
        await fs.unlink(data.path).catch(() => { });
      }
      return existingFile;
    }

    // 确定文件夹
    const folder = this.getFolderByType(data.fileType);

    // 上传主文件到OSS - 添加重试机制
    const retryHandler = createRetryHandler();
    const uploadResult = await retryHandler(
      () => this.ossService.uploadFile(fileBuffer, data.originalName, data.mimetype, folder),
      `文件上传到OSS: ${data.originalName}`,
    );

    let thumbnailUrl: string | undefined;

    // 为视频文件生成缩略图 - 添加重试机制
    if (data.fileType === FileType.VIDEO) {
      try {
        thumbnailUrl = await retryHandler(
          () => this.generateVideoThumbnail(fileBuffer, data.originalName),
          `视频缩略图生成: ${data.originalName}`,
        );
      } catch (error) {
        logger.warn(`视频缩略图生成失败: ${data.originalName}`, error);
      }
    }

    // 创建文件记录
    const file = await File.create({
      filename: path.basename(uploadResult.key),
      originalName: data.originalName,
      mimeType: data.mimetype,
      fileSize: data.size,
      fileUrl: uploadResult.url,
      filePath: uploadResult.key, // 存储OSS的key
      hashMd5: hash,
      fileType: data.fileType,
      userId: data.userId,
      storageType: (process.env.OSS_TYPE as StorageType) || StorageType.MINIO,
      isPublic: false,
      downloadCount: 0,
      category: data.category as FileCategory,
      thumbnailUrl: thumbnailUrl || null, // 如果是视频文件，存储缩略图URL
    });

    // 清理临时文件
    if (data.path) {
      await fs.unlink(data.path).catch(() => { });
    }

    logger.info(`文件上传成功: ${data.filename}, 用户: ${data.userId}, OSS Key: ${uploadResult.key}`);

    return this.getFileById(file.id);
  }

  /**
   * 批量文件上传
   */
  static async uploadFiles(filesData: UploadFileData[]) {
    const results = [];
    const errors = [];

    for (let i = 0; i < filesData.length; i++) {
      const fileData = filesData[i];
      if (!fileData) continue;

      try {
        const file = await this.uploadFile(fileData);
        results.push(file);
      } catch (error) {
        errors.push({
          index: i,
          filename: fileData.originalName,
          error: error instanceof Error ? error.message : '上传失败',
        });
        // 清理失败的文件
        if (fileData.path) {
          await fs.unlink(fileData.path).catch(() => { });
        }
      }
    }

    return {
      success: results,
      errors,
      total: filesData.length,
      successCount: results.length,
      errorCount: errors.length,
    };
  }

  /**
   * 删除文件
   */
  static async deleteFile(id: string, currentUserId: string) {
    const file = await File.findOne({
      where: { id },
    });

    if (!file) {
      throw new Error('文件不存在');
    }

    // 检查权限
    if (file.userId !== currentUserId) {
      throw new Error('无权限操作此文件');
    }
    // 删除记录
    await file.destroy();

    // 异步删除OSS文件
    this.deleteOssFile(file.filePath, file.thumbnailUrl || undefined).catch(error => {
      logger.error(`删除OSS文件失败: ${file.filePath}`, error);
    });

    logger.info(`文件已删除: ${id}, 操作用户: ${currentUserId}`);
  }

  /**
   * 批量删除文件
   */
  static async deleteFiles(ids: string[], currentUserId: string) {
    const files = await File.findAll({
      where: {
        id: { [Op.in]: ids },
      },
    });

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        // 检查权限
        if (file.userId !== currentUserId) {
          errors.push({
            id: file.id,
            filename: file.originalName,
            error: '无权限操作此文件',
          });
          continue;
        }
        // 删除记录
        await file.destroy();
        // 异步删除OSS文件
        this.deleteOssFile(file.filePath, file.thumbnailUrl || undefined).catch(error => {
          logger.error(`删除OSS文件失败: ${file.filePath}`, error);
        });

        results.push(file.id);
      } catch (error) {
        errors.push({
          id: file.id,
          filename: file.originalName,
          error: error instanceof Error ? error.message : '删除失败',
        });
      }
    }

    logger.info(`批量删除文件完成, 成功: ${results.length}, 失败: ${errors.length}, 操作用户: ${currentUserId}`);

    return {
      success: results,
      errors,
      total: ids.length,
      successCount: results.length,
      errorCount: errors.length,
    };
  }

  /**
   * 获取上传令牌
   */
  static async getUploadToken(userId: string, type: FileType) {
    // 生成临时令牌
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天后过期

    // 这里可以将令牌存储到Redis中，暂时返回简单的令牌信息
    return {
      token,
      expiresAt,
      type,
      userId,
      maxSize: this.getMaxFileSize(type),
      allowedTypes: this.getAllowedMimeTypes(type),
    };
  }

  /**
   * 创建文件记录（用于直传OSS后的数据库记录）
   */
  static async createFileRecord(fileData: {
    originalName: string;
    filename: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    category?: string;
    fileType: FileType;
    userId: string;
    url: string;
  }) {
    try {
      // 计算文件哈希（对于直传的文件，我们无法在服务端计算真实哈希）
      // 生成一个32位的伪哈希值，符合数据库字段长度限制
      const crypto = require('crypto');
      const fileHash = crypto
        .createHash('md5')
        .update(`${fileData.filePath}_${Date.now()}_${Math.random()}`)
        .digest('hex');

      // 检查是否存在相同的文件（基于路径）
      const existingFile = await File.findOne({
        where: { filePath: fileData.filePath },
      });

      if (existingFile) {
        return existingFile;
      }

      // 验证并设置存储类型
      const getValidStorageType = (envType: string | undefined): StorageType => {
        if (envType && Object.values(StorageType).includes(envType as StorageType)) {
          return envType as StorageType;
        }
        return StorageType.MINIO;
      };

      // 创建新的文件记录
      const file = await File.create({
        filename: fileData.filename,
        originalName: fileData.originalName,
        mimeType: fileData.mimeType,
        fileSize: fileData.fileSize,
        fileUrl: fileData.url,
        filePath: fileData.filePath,
        hashMd5: fileHash,
        fileType: fileData.fileType,
        userId: fileData.userId,
        storageType: getValidStorageType(process.env.OSS_TYPE),
        isPublic: false,
        downloadCount: 0,
        thumbnailUrl: null,
        category: fileData.category as FileCategory,
      });
      return this.getFileById(file.id);
    } catch (error) {
      logger.error('创建文件记录失败:', error);
      throw new Error('创建文件记录失败');
    }
  }

  /**
   * 异步生成视频缩略图
   */
  /** private static async generateVideoThumbnailAsync(fileId: string, filePath: string): Promise<void> {
    try {
      const retryHandler = createRetryHandler();

      await retryHandler(async () => {

        // 从OSS下载视频文件
        const videoBuffer = await this.ossService.downloadFile(filePath);

        // 生成缩略图
        const thumbnailUrl = await this.generateVideoThumbnail(videoBuffer, path.basename(filePath));

        // 更新文件记录，添加缩略图URL
        await File.update({ thumbnailUrl }, { where: { id: fileId } });
      }, `异步生成视频缩略图: ${filePath}`);
    } catch (error) {
      logger.error(`生成视频缩略图失败 (文件ID: ${fileId}):`, error);
      // 不抛出错误，避免影响主流程
    }
  }
*/
  /**
   * 更新文件信息
   */
  static async updateFile(id: string, data: Partial<FileAttributes>, currentUserId: string) {
    const file = await File.findOne({
      where: { id },
    });

    if (!file) {
      throw new Error('文件不存在');
    }

    // 检查权限
    if (file.userId !== currentUserId) {
      throw new Error('无权限操作此文件');
    }

    // 只允许更新某些字段（根据File模型的实际字段）
    const updateData: Partial<FileAttributes> = {};

    // 只更新允许的字段
    if (data.originalName !== undefined) {
      updateData.originalName = data.originalName;
    }
    if (data.isPublic !== undefined) {
      updateData.isPublic = data.isPublic;
    }

    await file.update(updateData);
    return this.getFileById(id);
  } 

  /**
   * 获取文件统计
   */
  static async getFileStats(userId?: string) {
    const where: WhereOptions = {};

    if (userId) {
      where.userId = userId;
    }

    const [total, images, videos, totalSize] = await Promise.all([
      File.count({ where }),
      File.count({ where: { ...where, fileType: FileType.IMAGE } }),
      File.count({ where: { ...where, fileType: FileType.VIDEO } }),
      File.sum('fileSize', { where }) || 0,
    ]);

    return {
      total,
      byType: {
        images,
        videos,
      },
      totalSize,
      totalSizeFormatted: this.formatFileSize(totalSize),
    };
  }

  /**
   * 下载文件
   */
  static async downloadFile(id: string, currentUserId?: string) {
    const file = await File.findOne({
      where: { id },
    });

    if (!file) {
      throw new Error('文件不存在');
    }

    // 检查权限（如果需要）
    if (currentUserId && file.userId !== currentUserId) {
      // 这里可以添加更复杂的权限检查逻辑
      throw new Error('无权限操作此文件');
    }

    // 从OSS下载文件
    let fileBuffer: Buffer;

    try {
      fileBuffer = await this.ossService.downloadFile(file.filePath); // filePath存储的是OSS key
    } catch (error) {
      logger.error(`从OSS下载文件失败: ${file.filePath}`, error);
      throw new Error('文件下载失败');
    }

    // 增加下载次数
    await file.increment('downloadCount');

    return {
      buffer: fileBuffer,
      filename: file.originalName,
      mimetype: file.mimeType,
      size: file.fileSize,
    };
  }

  /**
   * 生成缩略图
   */
  static async generateThumbnail(id: string, width = 200, height = 200) {
    const file = await File.findOne({
      where: { id, fileType: FileType.IMAGE },
    });

    if (!file) {
      throw new Error('图片文件不存在');
    }

    const thumbnailDir = path.join(path.dirname(file.filePath), 'thumbnails');
    const thumbnailFilename = `${path.parse(file.originalName).name}_${width}x${height}.webp`;
    const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

    // 确保缩略图目录存在
    await fs.mkdir(thumbnailDir, { recursive: true });

    // 检查缩略图是否已存在
    try {
      await fs.access(thumbnailPath);
      return {
        url: `/uploads/thumbnails/${thumbnailFilename}`,
        path: thumbnailPath,
      };
    } catch {
      // 缩略图不存在，需要生成
    }

    // 生成缩略图
    await sharp(file.filePath)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 80 })
      .toFile(thumbnailPath);

    return {
      url: `/uploads/thumbnails/${thumbnailFilename}`,
      path: thumbnailPath,
    };
  }

  /**
   * 根据文件类型获取存储文件夹
   */
  private static getFolderByType(type: FileType): string {
    const folders = {
      [FileType.IMAGE]: 'images',
      [FileType.VIDEO]: 'videos',
    };
    return folders[type] || 'images';
  }

  /**
   * 生成视频缩略图
   */
  private static async generateVideoThumbnail(
    videoBuffer: Buffer,
    originalName: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // 创建临时文件
      const tempVideoPath = path.join('/tmp', `temp_${Date.now()}_${originalName}`);
      const tempThumbnailPath = path.join('/tmp', `thumb_${Date.now()}_${path.parse(originalName).name}.jpg`);

      // 写入临时视频文件
      fs.writeFile(tempVideoPath, videoBuffer)
        .then(() => {
          // 使用ffmpeg生成缩略图
          ffmpeg(tempVideoPath)
            .screenshots({
              timestamps: ['00:00:01'], // 在第1秒截取
              filename: path.basename(tempThumbnailPath),
              folder: path.dirname(tempThumbnailPath),
              size: '320x240',
            })
            .on('end', async () => {
              try {
                // 读取生成的缩略图
                const thumbnailBuffer = await fs.readFile(tempThumbnailPath);

                // 上传缩略图到OSS
                const thumbnailName = `${path.parse(originalName).name}_thumbnail.jpg`;
                const uploadResult = await this.ossService.uploadFile(
                  thumbnailBuffer,
                  thumbnailName,
                  'image/jpeg',
                  'thumbnails',
                );

                // 清理临时文件
                await Promise.all([
                  fs.unlink(tempVideoPath).catch(() => { }),
                  fs.unlink(tempThumbnailPath).catch(() => { }),
                ]);

                resolve(uploadResult.url);
              } catch (error) {
                // 清理临时文件
                await Promise.all([
                  fs.unlink(tempVideoPath).catch(() => { }),
                  fs.unlink(tempThumbnailPath).catch(() => { }),
                ]);
                reject(error);
              }
            })
            .on('error', async error => {
              // 清理临时文件
              await Promise.all([
                fs.unlink(tempVideoPath).catch(() => { }),
                fs.unlink(tempThumbnailPath).catch(() => { }),
              ]);
              reject(error);
            });
        })
        .catch(reject);
    });
  }

  /**
   * 删除OSS文件
   */
  private static async deleteOssFile(fileId: string, thumbnailUrl?: string): Promise<void> {
    try {
      // 删除主文件
      const file = await this.getFileById(fileId);
      await this.ossService.deleteFile(file.fileUrl);
      // 删除缩略图（如果存在）
      if (file.thumbnailUrl) {
        try {
          await this.ossService.deleteFile(file.thumbnailUrl);
        } catch (error) {
          logger.warn(`删除缩略图失败: ${thumbnailUrl}`, error);
        }
      }
    } catch (error) {
      logger.error(`删除OSS文件失败: ${fileId}`, error);
      throw error;
    }
  }

  /**
   * 获取文件类型的最大大小限制
   */
  private static getMaxFileSize(type: FileType): number {
    const limits = {
      [FileType.IMAGE]: 10 * 1024 * 1024, // 10MB
      [FileType.VIDEO]: 100 * 1024 * 1024, // 100MB
    };

    return limits[type] || limits[FileType.IMAGE];
  }

  /**
   * 获取文件类型允许的MIME类型
   */
  private static getAllowedMimeTypes(type: FileType): string[] {
    const types = {
      [FileType.IMAGE]: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      [FileType.VIDEO]: [
        'video/mp4',
        'video/avi',
        'video/mov',
        'video/wmv',
        'video/quicktime',
        'video/flv',
        'video/webm',
        'video/mkv',
      ],
    };
    return types[type] || types[FileType.IMAGE];
  }

  /**
   * 格式化文件大小
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
