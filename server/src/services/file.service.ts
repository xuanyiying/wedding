import { Op, WhereOptions } from 'sequelize';
import { File, FileAttributes } from '../models';
import { logger } from '../utils/logger';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { Readable } from 'stream';
import * as crypto from 'crypto';
import * as sharp from 'sharp';
import { OssService } from './oss/oss.service';
import { getOssService } from '../config/oss';
import { createRetryHandler } from '../middlewares/upload';
import { CHUNK_SESSION_EXPIRE_TIME, CHUNK_UPLOAD_PREFIX, FileCategory, FileType, OssType } from '../types';
import { generateId } from '../utils/id.generator';
import { redisClient } from '../config/redis';
import { config } from '../config/config';

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
  filename?: string; // 内存存储时不需要filename
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

// 分块上传会话接口
interface ChunkUploadSession {
  uploadId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  category: string;
  totalChunks: number;
  userId: string;
  uploadedChunks: number[];
  createdAt: number; // 时间戳
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
      order: sortBy && sortOrder ? [[sortBy, sortOrder]] : [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
    });
    for (const file of rows) {
      file.user = await file.getUser();
    }
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
    });
    if (!file) {
      throw new Error('文件不存在');
    }
    file.user = await file.getUser();
    return file;
  }

  /**
   * 单文件上传
   */
  static async uploadFile(data: UploadFileData) {
    console.log('📤 开始文件上传处理:', {
      userId: data.userId,
      filename: data.originalName,
      size: data.size,
      fileType: data.fileType,
      category: data.category
    });

    // 验证文件类型
    const allowedTypes = {
      [FileType.IMAGE]: config.upload.allowedImageTypes,
      [FileType.VIDEO]: config.upload.allowedVideoTypes,
    };

    if (data.fileType && allowedTypes[data.fileType]) {
      if (!allowedTypes[data.fileType].includes(data.mimetype)) {
        const error = new Error(`不支持的文件类型: ${data.mimetype}`);
        console.error('❌ 文件类型验证失败:', {
          expected: allowedTypes[data.fileType],
          received: data.mimetype
        });
        throw error;
      }
    }

    // 准备文件数据（流或缓冲区）
    let fileData: Buffer | Readable;
    let fileHash: string;

    if (data.buffer) {
      // 如果已经是缓冲区，直接使用
      fileData = data.buffer;
      console.log('📄 使用缓冲区数据');
      // 计算文件哈希
      console.log('🔍 计算文件哈希...');
      fileHash = crypto.createHash('md5').update(data.buffer).digest('hex');
      console.log('✅ 文件哈希计算完成:', fileHash.substring(0, 8));
    } else if (data.path) {
      console.log('📄 从路径创建文件流:', data.path);
      // 创建文件读取流
      fileData = fsSync.createReadStream(data.path);

      // 计算文件哈希 - 需要单独读取文件来计算哈希
      console.log('🔍 计算文件哈希...');
      const tempBuffer = await fs.readFile(data.path);
      fileHash = crypto.createHash('md5').update(tempBuffer).digest('hex');
      console.log('✅ 文件哈希计算完成:', fileHash.substring(0, 8));
    } else {
      const error = new Error('必须提供文件路径或缓冲区');
      console.error('❌ 文件数据缺失');
      throw error;
    }

    // 检查是否已存在相同文件
    console.log('🔍 检查重复文件...');
    const existingFile = await File.findOne({
      where: { hashMd5: fileHash },
    });

    if (existingFile) {
      console.log('✅ 发现重复文件，返回现有记录:', existingFile.id);
      // 删除临时文件（如果存在）
      if (data.path) {
        await fs.unlink(data.path).catch(() => { });
      }
      return existingFile;
    }

    // 确定文件夹
    const folder = this.getFolderByType(data.fileType);
    console.log('📁 确定存储文件夹:', folder);

    // 上传主文件到OSS - 添加重试机制
    console.log('☁️ 开始上传到OSS...');
    const retryHandler = createRetryHandler();
    const uploadResult = await retryHandler(
      () => this.ossService.uploadFile(fileData, data.originalName, data.mimetype, folder),
      `文件上传到OSS: ${data.originalName}`,
    );
    console.log('✅ OSS上传完成:', uploadResult.key, uploadResult.url);
    // 创建文件记录
    const file = await File.create({
      filename: path.basename(uploadResult.key),
      originalName: data.originalName,
      mimeType: data.mimetype,
      fileSize: data.size,
      fileUrl: uploadResult.url, // 直接使用uploadResult.url，避免重复拼接
      filePath: uploadResult.key, // 存储OSS的key
      hashMd5: fileHash,
      fileType: data.fileType,
      userId: data.userId,
      ossType: OssType.minio,
      isPublic: false,
      downloadCount: 0,
      category: data.category as FileCategory,
      thumbnailUrl: null, // 缩略图URL将在视频处理后更新
    });

    // 清理临时文件
    if (data.path) {
      console.log('🧹 清理临时文件:', data.path);
      await fs.unlink(data.path).catch(() => { });
    }

    console.log('🎉 文件上传处理完成:', {
      fileId: file.id,
      filename: file.filename,
      url: file.fileUrl
    });
    logger.info(`文件上传成功: ${data.originalName}, 用户: ${data.userId}, OSS Key: ${uploadResult.key}`);

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
    this.deleteOssFile(file.fileUrl, file.thumbnailUrl || undefined).catch(error => {
      logger.error(`删除OSS文件失败: ${file.fileUrl}`, error instanceof Error ? error : new Error(String(error)));
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
        this.deleteOssFile(file.fileUrl, file.thumbnailUrl || undefined).catch(error => {
          logger.error(`删除OSS文件失败: ${file.fileUrl}`, error instanceof Error ? error : new Error(String(error)));
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
        ossType: (process.env.OSS_TYPE as OssType) || OssType.minio,
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
      logger.error(`从OSS下载文件失败: ${file.filePath}`, error instanceof Error ? error : new Error(String(error)));
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
    await sharp.default(file.filePath)
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
   * 删除OSS文件
   */
  private static async deleteOssFile(fileUrl: string, thumbnailUrl?: string): Promise<void> {
    try {
      // 删除主文件
      await this.ossService.deleteFile(fileUrl);
      // 删除缩略图（如果存在）
      if (thumbnailUrl) {
        try {
          await this.ossService.deleteFile(thumbnailUrl);
        } catch (error) {
          logger.warn(`删除缩略图失败: ${thumbnailUrl}`, error instanceof Error ? error : new Error(String(error)));
        }
      }
    } catch (error) {
      logger.error(`删除OSS文件失败: ${fileUrl}`, error instanceof Error ? error : new Error(String(error)));
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
      [FileType.IMAGE]: config.upload.allowedImageTypes,
      [FileType.VIDEO]: config.upload.allowedVideoTypes,
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
  /**
   * 上传视频封面
   */
  static async uploadVideoCover(fileBuffer: Buffer, fileId: string): Promise<any> {
    // 查找文件记录
    const fileRecord = await File.findOne({
      where: {
        id: fileId,
      },
    });

    if (!fileRecord) {
      throw new Error('视频文件不存在，请稍后再试！');
    }

    // 上传封面到OSS
    const result = await this.ossService.uploadFile(fileBuffer, `video_cover_${fileId}.jpg`, 'image/jpeg');

    // 更新文件记录的缩略图URL
    await File.update({
      thumbnailUrl: result.url,
    }, {
      where: {
        id: fileId,
      },
    });

    // 返回更新后的文件记录
    const updatedFileRecord = await File.findOne({
      where: {
        id: fileId,
      },
    });

    return updatedFileRecord;
  }

  /**
   * 初始化分块上传
   */
  static async initChunkUpload(params: {
    filename: string;
    fileSize: number;
    mimeType: string;
    category: string;
    totalChunks: number;
    userId: string;
  }) {

    const { filename, fileSize, mimeType, category, totalChunks, userId } = params;

    // 生成唯一的上传ID
    const uploadId = generateId();

    // 创建上传会话对象
    const session: ChunkUploadSession = {
      uploadId,
      filename,
      fileSize,
      mimeType,
      category,
      totalChunks,
      userId,
      uploadedChunks: [],
      createdAt: Date.now()
    };

    // 保存会话到Redis
    const sessionKey = `${CHUNK_UPLOAD_PREFIX}${uploadId}`;
    await redisClient.setex(
      sessionKey,
      CHUNK_SESSION_EXPIRE_TIME,
      JSON.stringify(session)
    );

    logger.info('分块上传会话创建成功:', {
      uploadId,
      filename,
      fileSize,
      totalChunks,
      userId
    });

    return {
      uploadId,
      uploadUrl: `/api/v1/files/chunk/upload` // 返回完整的API路径
    };
  }

  /**
   * 上传分块
   */
  static async uploadChunk(params: {
    uploadId: string;
    chunkIndex: number;
    chunkData: Buffer;
    userId: string;
  }) {
    const { uploadId, chunkIndex, chunkData, userId } = params;

    // 检查分块数据是否有效
    if (!chunkData || !Buffer.isBuffer(chunkData)) {
      throw new Error('分块数据无效或为空');
    }

    // 从Redis获取上传会话
    const sessionKey = `${CHUNK_UPLOAD_PREFIX}${uploadId}`;
    const sessionStr = await redisClient.get(sessionKey);

    if (!sessionStr) {
      throw new Error('上传会话不存在或已过期');
    }

    const session: ChunkUploadSession = JSON.parse(sessionStr);

    // 验证用户权限
    if (session.userId !== userId) {
      throw new Error('无权限访问此上传会话');
    }

    // 验证分块索引
    if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
      throw new Error('无效的分块索引');
    }

    // 检查分块是否已上传
    if (session.uploadedChunks.includes(chunkIndex)) {
      // 分块已上传，直接返回
      logger.info('分块已存在，跳过上传:', {
        uploadId,
        chunkIndex,
        uploadedChunks: session.uploadedChunks.length,
        totalChunks: session.totalChunks
      });

      return {
        success: true,
        uploadedChunks: session.uploadedChunks.length,
        totalChunks: session.totalChunks
      };
    }
// 存储分块数据到Redis，使用更长的过期时间确保数据不会在上传过程中丢失
    const chunkKey = `${CHUNK_UPLOAD_PREFIX}${uploadId}:chunk:${chunkIndex}`;
    const extendedExpireTime = CHUNK_SESSION_EXPIRE_TIME * 2; // 48小时，比会话时间更长

    await redisClient.setex(
      chunkKey,
      extendedExpireTime,
      chunkData.toString('base64') // 将Buffer转换为base64字符串存储
    );

    // 更新已上传的分块列表
    session.uploadedChunks.push(chunkIndex);

    // 保存更新后的会话
    await redisClient.setex(
      sessionKey,
      CHUNK_SESSION_EXPIRE_TIME,
      JSON.stringify(session)
    );

    logger.info('分块上传成功:', {
      uploadId,
      chunkIndex,
      chunkSize: chunkData.length,
      uploadedChunks: session.uploadedChunks.length,
      totalChunks: session.totalChunks
    });

    return {
      success: true,
      uploadedChunks: session.uploadedChunks.length,
      totalChunks: session.totalChunks
    };
  }


  /**
   * 检查分块上传状态
   */
  static async checkChunkUploadStatus(params: {
    uploadId: string;
    userId: string;
  }) {
    const { uploadId, userId } = params;

    // 从Redis获取上传会话
    const sessionKey = `${CHUNK_UPLOAD_PREFIX}${uploadId}`;
    const sessionStr = await redisClient.get(sessionKey);

    if (!sessionStr) {
      throw new Error('上传会话不存在或已过期');
    }

    const session: ChunkUploadSession = JSON.parse(sessionStr);

    // 验证用户权限
    if (session.userId !== userId) {
      throw new Error('无权限访问此上传会话');
    }

    // 检查每个分块的状态
    const chunkStatus: { [key: number]: boolean } = {};
    const missingChunks: number[] = [];
    const availableChunks: number[] = [];

    for (let i = 0; i < session.totalChunks; i++) {
      const chunkKey = `${CHUNK_UPLOAD_PREFIX}${uploadId}:chunk:${i}`;

      try {
        const exists = await redisClient.exists(chunkKey);
        chunkStatus[i] = exists === 1;

        if (exists === 1) {
          availableChunks.push(i);
        } else {
          missingChunks.push(i);
        }
      } catch (error) {
        chunkStatus[i] = false;
        missingChunks.push(i);
      }
    }

    const sessionAge = Date.now() - session.createdAt;
    const isComplete = missingChunks.length === 0 && session.uploadedChunks.length === session.totalChunks;

    logger.info('分块上传状态检查:', {
      uploadId,
      totalChunks: session.totalChunks,
      uploadedChunks: session.uploadedChunks.length,
      availableChunks: availableChunks.length,
      missingChunks: missingChunks.length,
      sessionAge,
      isComplete
    });

    return {
      uploadId,
      filename: session.filename,
      fileSize: session.fileSize,
      totalChunks: session.totalChunks,
      uploadedChunks: session.uploadedChunks,
      availableChunks,
      missingChunks,
      chunkStatus,
      isComplete,
      sessionAge,
      canComplete: missingChunks.length === 0
    };
  }

  /**
   * 完成分块上传
   */
  static async completeChunkUpload(params: {
    uploadId: string;
    fileId: string;
    userId: string;
  }) {

    const { uploadId, fileId, userId } = params;

    // 从Redis获取上传会话
    const sessionKey = `${CHUNK_UPLOAD_PREFIX}${uploadId}`;
    const sessionStr = await redisClient.get(sessionKey);

    if (!sessionStr) {
      throw new Error('上传会话不存在或已过期');
    }

    const session: ChunkUploadSession = JSON.parse(sessionStr);

    // 验证用户权限
    if (session.userId !== userId) {
      throw new Error('无权限访问此上传会话');
    }

    // 验证所有分块都已上传
    if (session.uploadedChunks.length !== session.totalChunks) {
      throw new Error(`分块上传不完整，已上传 ${session.uploadedChunks.length}/${session.totalChunks} 个分块`);
    }

    try {
      // 按顺序获取所有分块数据，增加详细的错误处理
      const chunks: Buffer[] = [];
      const missingChunks: number[] = [];

      for (let i = 0; i < session.totalChunks; i++) {
        const chunkKey = `${CHUNK_UPLOAD_PREFIX}${uploadId}:chunk:${i}`;

        try {
          const chunkData = await redisClient.get(chunkKey);

          if (!chunkData) {
            missingChunks.push(i);
            logger.error('分块数据丢失:', {
              uploadId,
              chunkIndex: i,
              chunkKey,
              sessionAge: Date.now() - session.createdAt,
              totalChunks: session.totalChunks
            });
            continue;
          }

          // 验证 base64 数据格式
          if (typeof chunkData !== 'string') {
            missingChunks.push(i);
            logger.error('分块数据格式错误:', {
              uploadId,
              chunkIndex: i,
              dataType: typeof chunkData
            });
            continue;
          }

          // 转换 base64 到 Buffer
          const chunkBuffer = Buffer.from(chunkData, 'base64');
          chunks[i] = chunkBuffer;

        } catch (error) {
          missingChunks.push(i);
          logger.error('获取分块数据失败:', {
            uploadId,
            chunkIndex: i,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // 如果有丢失的分块，提供详细的错误信息
      if (missingChunks.length > 0) {
        const errorMessage = `分块数据丢失，丢失的分块索引: [${missingChunks.join(', ')}]，总共丢失 ${missingChunks.length}/${session.totalChunks} 个分块`;

        logger.error('分块上传完成失败:', {
          uploadId,
          userId,
          filename: session.filename,
          missingChunks,
          missingCount: missingChunks.length,
          totalChunks: session.totalChunks,
          sessionAge: Date.now() - session.createdAt,
          sessionExpireTime: CHUNK_SESSION_EXPIRE_TIME
        });

        throw new Error(errorMessage);
      }

      // 合并所有分块
      const completeBuffer = Buffer.concat(chunks);

      // 验证文件大小
      if (completeBuffer.length !== session.fileSize) {
        throw new Error(`文件大小不匹配，期望 ${session.fileSize} 字节，实际 ${completeBuffer.length} 字节`);
      }

      // 生成文件名和路径
      const fileExtension = path.extname(session.filename);
      const uniqueFilename = `${generateId}${fileExtension}`;

      // 确定文件类型
      const fileType = this.getFileTypeFromMimeType(session.mimeType);

      // 上传到OSS
      const ossResult = await this.ossService.uploadFile(
        completeBuffer,
        uniqueFilename,
        session.mimeType,
        fileType
      );

      // 保存文件记录到数据库
      const fileRecord = await File.create({
        id: fileId,
        filename: ossResult.key,
        originalName: session.filename,
        mimeType: session.mimeType,
        fileSize: session.fileSize,
        fileUrl: ossResult.url,
        filePath: ossResult.key,
        userId: session.userId,
        fileType: fileType,
        category: session.category as FileCategory,
        ossType: config.oss.type as OssType,
        isPublic: true,
        downloadCount: 0
      });

      // 清理Redis中的上传会话和分块数据
      const cleanupKeys = [sessionKey];
      for (let i = 0; i < session.totalChunks; i++) {
        cleanupKeys.push(`${CHUNK_UPLOAD_PREFIX}${uploadId}:chunk:${i}`);
      }
      await redisClient.del(...cleanupKeys);

      logger.info('分块上传完成:', {
        uploadId,
        fileId: fileRecord.id,
        filename: fileRecord.filename,
        size: fileRecord.fileSize,
        url: fileRecord.fileUrl
      });

      return fileRecord;

    } catch (error) {
      // 上传失败时清理Redis数据
      const cleanupKeys = [sessionKey];
      for (let i = 0; i < session.totalChunks; i++) {
        cleanupKeys.push(`${CHUNK_UPLOAD_PREFIX}${uploadId}:chunk:${i}`);
      }
      await redisClient.del(...cleanupKeys);

      logger.error('分块上传完成失败:', error);
      throw error;
    }
  }

  /**
   * 根据MIME类型确定文件类型
   */
  private static getFileTypeFromMimeType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) {
      return FileType.IMAGE;
    } else if (mimeType.startsWith('video/')) {
      return FileType.VIDEO;
    } else {
      // 由于当前FileType只有IMAGE和VIDEO，其他类型默认为IMAGE
      return FileType.IMAGE;
    }
  }
}





