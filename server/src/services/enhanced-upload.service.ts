import { getOssService } from '../config/oss';
import { uploadConfig } from '../config/upload.config';
import { RetryUtil, RetryConfigs } from '../utils/retry.util';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { FileService } from './file.service';
import { redisClient } from '../config/redis';
import { FileType } from '@/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

/**
 * 上传模式枚举
 */
export enum UploadMode {
  DIRECT = 'direct',      // 直传OSS
  SERVER = 'server',      // 服务端上传
  AUTO = 'auto'           // 自动选择
}

/**
 * 上传会话接口
 */
export interface EnhancedUploadSession {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  fileType: 'video' | 'image' | 'audio';
  category: string;
  ossKey: string;
  uploadMode: UploadMode;
  presignedUrl?: string;
  tempFilePath?: string;
  chunkInfo?: ChunkInfo;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  retryCount: number;
  lastError?: string;
}

/**
 * 分片信息接口
 */
export interface ChunkInfo {
  totalChunks: number;
  chunkSize: number;
  uploadedChunks: number[];
  failedChunks: number[];
}

/**
 * 上传请求参数
 */
export interface EnhancedUploadRequest {
  userId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  fileType: 'video' | 'image' | 'audio';
  category?: string;
  uploadMode?: UploadMode;
  enableChunking?: boolean;
  expires?: number;
}

/**
 * 服务端上传请求参数
 */
export interface ServerUploadRequest {
  uploadSessionId: string;
  userId: string;
  fileBuffer: Buffer;
  chunkIndex?: number | undefined;
  totalChunks?: number | undefined;
}

/**
 * 增强的上传服务
 */
export class EnhancedUploadService {
  private static readonly SESSION_PREFIX = 'enhanced_upload_session:';
  private static readonly SESSION_EXPIRE_TIME = 7200; // 2小时
  private static ossService = getOssService();

  /**
   * 初始化上传会话
   */
  static async initializeUpload(request: EnhancedUploadRequest) {
    const {
      userId,
      fileName,
      fileSize,
      contentType,
      fileType,
      category = 'other',
      uploadMode = UploadMode.AUTO,
      enableChunking = uploadConfig.mode.enableChunkUpload,
      expires = 3600
    } = request;

    // 验证文件
    this.validateFile(fileName, fileSize, contentType, fileType);

    // 确定上传模式
    const finalUploadMode = this.determineUploadMode(uploadMode, fileSize);

    // 生成唯一的OSS key
    const ossKey = this.generateOssKey(userId, fileName, fileType, category);

    // 创建上传会话
    const sessionId = uuidv4();
    const session: EnhancedUploadSession = {
      id: sessionId,
      userId,
      fileName,
      fileSize,
      contentType,
      fileType,
      category,
      ossKey,
      uploadMode: finalUploadMode,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + expires * 1000),
      retryCount: 0
    };

    // 根据上传模式进行不同的初始化
    if (finalUploadMode === UploadMode.DIRECT) {
      await this.initializeDirectUpload(session, expires);
    } else if (finalUploadMode === UploadMode.SERVER) {
      await this.initializeServerUpload(session, enableChunking);
    }

    // 保存会话
    await this.saveSession(session);

    logger.info(`初始化上传会话成功: ${sessionId}`, {
      userId,
      fileName,
      fileType,
      fileSize,
      uploadMode: finalUploadMode
    });

    return {
      uploadSessionId: sessionId,
      uploadMode: finalUploadMode,
      presignedUrl: session.presignedUrl,
      chunkInfo: session.chunkInfo,
      expires
    };
  }

  /**
   * 服务端文件上传
   */
  static async uploadFileToServer(request: ServerUploadRequest) {
    const { uploadSessionId, userId, fileBuffer, chunkIndex, totalChunks } = request;

    // 获取上传会话
    const session = await this.getSession(uploadSessionId);
    if (!session) {
      throw new Error('上传会话不存在或已过期');
    }

    // 验证用户权限
    if (session.userId !== userId) {
      throw new Error('无权限操作此上传会话');
    }

    // 验证上传模式
    if (session.uploadMode !== UploadMode.SERVER) {
      throw new Error('当前会话不支持服务端上传');
    }

    try {
      session.status = 'uploading';
      session.updatedAt = new Date();
      await this.saveSession(session);

      if (session.chunkInfo && chunkIndex !== undefined && totalChunks !== undefined) {
        // 分片上传
        return await this.handleChunkUpload(session, fileBuffer, chunkIndex, totalChunks);
      } else {
        // 完整文件上传
        return await this.handleCompleteFileUpload(session, fileBuffer);
      }

    } catch (error) {
      session.status = 'failed';
      session.lastError = error instanceof Error ? error.message : String(error);
      session.updatedAt = new Date();
      await this.saveSession(session);
      throw error;
    }
  }

  /**
   * 确认上传完成
   */
  static async confirmUpload(uploadSessionId: string, userId: string, actualFileSize?: number) {
    const session = await this.getSession(uploadSessionId);
    if (!session) {
      throw new Error('上传会话不存在或已过期');
    }

    // 验证用户权限
    if (session.userId !== userId) {
      throw new Error('无权限操作此上传会话');
    }

    // 验证会话状态
    if (session.status === 'completed') {
      // 如果已经完成，返回现有结果
      try {
        const existingFile = await FileService.getFileById(session.id);
        if (existingFile) {
          return this.formatFileResult(existingFile, session);
        }
      } catch (error) {
        // 文件记录不存在，继续处理
      }
    }

    if (session.status !== 'pending' && session.status !== 'uploading' && session.status !== 'processing') {
      throw new Error(`上传会话状态异常: ${session.status}`);
    }

    try {
      session.status = 'processing';
      session.updatedAt = new Date();
      await this.saveSession(session);

      // 验证文件是否真正上传成功
      const fileExists = await RetryUtil.executeWithRetry(
        () => this.ossService.fileExists(session.ossKey),
        RetryConfigs.fast,
        'verify-file-exists'
      );

      if (!fileExists) {
        throw new Error('文件上传验证失败：文件不存在于OSS中');
      }

      // 获取文件信息
      const fileInfo = await RetryUtil.executeWithRetry(
        () => this.ossService.getFileInfo(session.ossKey),
        RetryConfigs.fast,
        'get-file-info'
      );

      // 验证文件大小
      if (actualFileSize && Math.abs(actualFileSize - fileInfo.size) > 1024) {
        logger.warn(`文件大小不匹配: 预期=${actualFileSize}, 实际=${fileInfo.size}`);
      }

      // 创建文件记录
      const fileRecord = await FileService.createFileRecord({
        userId,
        filename: session.fileName,
        originalName: session.fileName,
        fileSize: actualFileSize || fileInfo.size,
        fileType: session.fileType as FileType,
        category: session.category,
        url: fileInfo.url,
        filePath: session.ossKey,
        mimeType: session.contentType
      });

      // 更新会话状态
      session.status = 'completed';
      session.progress = 100;
      session.updatedAt = new Date();
      await this.saveSession(session);

      // 清理临时文件
      if (session.tempFilePath) {
        await this.cleanupTempFile(session.tempFilePath);
      }

      logger.info(`确认上传完成: ${uploadSessionId}`, {
        userId,
        fileId: fileRecord.id,
        fileName: session.fileName
      });

      return this.formatFileResult(fileRecord, session);

    } catch (error) {
      session.status = 'failed';
      session.lastError = error instanceof Error ? error.message : String(error);
      session.updatedAt = new Date();
      await this.saveSession(session);

      logger.error(`确认上传失败: ${uploadSessionId}`, error);
      throw error;
    }
  }

  /**
   * 重试上传
   */
  static async retryUpload(uploadSessionId: string, userId: string) {
    const session = await this.getSession(uploadSessionId);
    if (!session) {
      throw new Error('上传会话不存在或已过期');
    }

    // 验证用户权限
    if (session.userId !== userId) {
      throw new Error('无权限操作此上传会话');
    }

    // 检查重试次数
    if (session.retryCount >= uploadConfig.retry.attempts) {
      throw new Error('已达到最大重试次数');
    }

    // 重置会话状态
    session.status = 'pending';
    session.progress = 0;
    session.retryCount += 1;
    session.updatedAt = new Date();
    session.lastError = '';

    // 如果是直传模式，重新生成预签名URL
    if (session.uploadMode === UploadMode.DIRECT) {
      const expires = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
      if (expires > 0) {
        session.presignedUrl = await RetryUtil.executeWithRetry(
          () => this.ossService.getPresignedUploadUrl(session.ossKey, expires, session.contentType),
          RetryConfigs.network,
          'generate-presigned-url-retry'
        );
      } else {
        throw new Error('上传会话已过期，无法重试');
      }
    }

    await this.saveSession(session);

    logger.info(`重试上传: ${uploadSessionId}`, {
      userId,
      retryCount: session.retryCount
    });

    return {
      uploadSessionId,
      uploadMode: session.uploadMode,
      presignedUrl: session.presignedUrl,
      chunkInfo: session.chunkInfo,
      retryCount: session.retryCount
    };
  }

  /**
   * 取消上传
   */
  static async cancelUpload(userId: string, uploadSessionId: string) {
    const session = await this.getSession(uploadSessionId);
    if (!session) {
      throw new Error('上传会话不存在或已过期');
    }

    // 验证用户权限
    if (session.userId !== userId) {
      throw new Error('无权限操作此上传会话');
    }

    // 清理资源
    if (session.tempFilePath) {
      await this.cleanupTempFile(session.tempFilePath);
    }

    // 清理分片文件
    if (session.chunkInfo) {
      for (let i = 0; i < session.chunkInfo.totalChunks; i++) {
        const chunkPath = `${session.tempFilePath}.chunk.${i}`;
        await this.cleanupTempFile(chunkPath);
      }
    }

    // 如果文件已经上传到OSS，尝试删除
    if (session.status === 'completed' || session.status === 'processing') {
      try {
        await this.ossService.deleteFile(session.ossKey);
      } catch (error) {
        logger.warn(`删除OSS文件失败: ${session.ossKey}`, error);
      }
    }

    // 更新会话状态
    session.status = 'cancelled';
    session.updatedAt = new Date();
    await this.saveSession(session);

    logger.info(`取消上传: ${uploadSessionId}`, { userId });
  }

  /**
   * 恢复上传（断点续传）
   */
  static async resumeUpload(userId: string, uploadSessionId: string) {
    const session = await this.getSession(uploadSessionId);
    if (!session) {
      throw new Error('上传会话不存在或已过期');
    }

    // 验证用户权限
    if (session.userId !== userId) {
      throw new Error('无权限操作此上传会话');
    }

    // 检查是否支持断点续传
    if (!uploadConfig.mode.enableResumeUpload) {
      throw new Error('系统未启用断点续传功能');
    }

    // 只有失败或上传中的会话才能恢复
    if (!['failed', 'uploading', 'pending'].includes(session.status)) {
      throw new Error(`当前状态不支持恢复上传: ${session.status}`);
    }

    // 检查会话是否过期
    if (new Date() > session.expiresAt) {
      throw new Error('上传会话已过期，无法恢复');
    }

    try {
      // 重置会话状态
      session.status = 'pending';
      session.lastError = '';
      session.updatedAt = new Date();

      // 如果是分片上传，检查已上传的分片
      if (session.chunkInfo && session.tempFilePath) {
        const resumeInfo = await this.checkResumeChunks(session);
        session.chunkInfo.uploadedChunks = resumeInfo.uploadedChunks;
        session.chunkInfo.failedChunks = resumeInfo.failedChunks;
        session.progress = Math.round((resumeInfo.uploadedChunks.length / session.chunkInfo.totalChunks) * 100);
      }

      // 如果是直传模式，重新生成预签名URL
      if (session.uploadMode === UploadMode.DIRECT) {
        const expires = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
        if (expires > 0) {
          session.presignedUrl = await RetryUtil.executeWithRetry(
            () => this.ossService.getPresignedUploadUrl(session.ossKey, expires, session.contentType),
            RetryConfigs.network,
            'generate-presigned-url-resume'
          );
        }
      }

      await this.saveSession(session);

      logger.info(`恢复上传: ${uploadSessionId}`, {
        userId,
        progress: session.progress,
        uploadMode: session.uploadMode
      });

      return {
        uploadSessionId,
        status: session.status,
        progress: session.progress,
        uploadMode: session.uploadMode,
        presignedUrl: session.presignedUrl,
        chunkInfo: session.chunkInfo,
        message: '上传会话恢复成功'
      };

    } catch (error) {
      session.status = 'failed';
      session.lastError = error instanceof Error ? error.message : String(error);
      session.updatedAt = new Date();
      await this.saveSession(session);
      throw error;
    }
  }

  /**
   * 检查断点续传分片状态
   */
  private static async checkResumeChunks(session: EnhancedUploadSession): Promise<{
    uploadedChunks: number[];
    failedChunks: number[];
  }> {
    if (!session.chunkInfo || !session.tempFilePath) {
      return { uploadedChunks: [], failedChunks: [] };
    }

    const uploadedChunks: number[] = [];
    const failedChunks: number[] = [];

    // 检查每个分片文件是否存在
    for (let i = 0; i < session.chunkInfo.totalChunks; i++) {
      const chunkPath = `${session.tempFilePath}.chunk.${i}`;
      try {
        await fs.stat(chunkPath);
        uploadedChunks.push(i);
      } catch (error) {
        // 文件不存在，标记为失败
        if (session.chunkInfo.uploadedChunks.includes(i)) {
          failedChunks.push(i);
        }
      }
    }

    logger.debug(`断点续传检查完成`, {
      sessionId: session.id,
      totalChunks: session.chunkInfo.totalChunks,
      uploadedChunks: uploadedChunks.length,
      failedChunks: failedChunks.length
    });

    return { uploadedChunks, failedChunks };
  }

  /**
   * 获取上传进度详情
   */
  static async getUploadProgressDetail(userId: string, uploadSessionId: string) {
    const session = await this.getSession(uploadSessionId);
    if (!session) {
      throw new Error('上传会话不存在或已过期');
    }

    // 验证用户权限
    if (session.userId !== userId) {
      throw new Error('无权限查询此上传会话');
    }

    const result = {
      uploadSessionId,
      status: session.status,
      progress: session.progress,
      fileName: session.fileName,
      fileSize: session.fileSize,
      fileType: session.fileType,
      uploadMode: session.uploadMode,
      retryCount: session.retryCount,
      lastError: session.lastError,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
      chunkInfo: session.chunkInfo ? {
        totalChunks: session.chunkInfo.totalChunks,
        chunkSize: session.chunkInfo.chunkSize,
        uploadedChunks: session.chunkInfo.uploadedChunks.length,
        failedChunks: session.chunkInfo.failedChunks.length,
        remainingChunks: session.chunkInfo.totalChunks - session.chunkInfo.uploadedChunks.length,
        uploadedChunksList: session.chunkInfo.uploadedChunks,
        failedChunksList: session.chunkInfo.failedChunks
      } : null,
      canResume: uploadConfig.mode.enableResumeUpload && 
                 ['failed', 'uploading', 'pending'].includes(session.status) &&
                 new Date() <= session.expiresAt,
      estimatedTimeRemaining: this.calculateEstimatedTime(session)
    };

    return result;
  }

  /**
   * 计算预估剩余时间
   */
  private static calculateEstimatedTime(session: EnhancedUploadSession): number | null {
    if (!session.chunkInfo || session.progress === 0) {
      return null;
    }

    const elapsedTime = Date.now() - session.createdAt.getTime();
    const progressRatio = session.progress / 100;
    
    if (progressRatio === 0) {
      return null;
    }

    const estimatedTotalTime = elapsedTime / progressRatio;
    const remainingTime = estimatedTotalTime - elapsedTime;

    return Math.max(0, Math.round(remainingTime / 1000)); // 返回秒数
  }

  /**
   * 获取上传进度
   */
  static async getUploadProgress(userId: string, uploadSessionId: string) {
    const session = await this.getSession(uploadSessionId);
    if (!session) {
      throw new Error('上传会话不存在或已过期');
    }

    // 验证用户权限
    if (session.userId !== userId) {
      throw new Error('无权限查询此上传会话');
    }

    return {
      uploadSessionId,
      status: session.status,
      progress: session.progress,
      fileName: session.fileName,
      fileSize: session.fileSize,
      fileType: session.fileType,
      uploadMode: session.uploadMode,
      chunkInfo: session.chunkInfo,
      retryCount: session.retryCount,
      lastError: session.lastError,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt
    };
  }

  /**
   * 初始化直传上传
   */
  private static async initializeDirectUpload(session: EnhancedUploadSession, expires: number) {
    session.presignedUrl = await RetryUtil.executeWithRetry(
      () => this.ossService.getPresignedUploadUrl(session.ossKey, expires, session.contentType),
      RetryConfigs.network,
      'generate-presigned-url'
    );
  }

  /**
   * 初始化服务端上传
   */
  private static async initializeServerUpload(session: EnhancedUploadSession, enableChunking: boolean) {
    // 创建临时文件路径
    const tempDir = path.join(process.cwd(), uploadConfig.storage.tempDir);
    await fs.mkdir(tempDir, { recursive: true });
    
    session.tempFilePath = path.join(tempDir, `${session.id}_${session.fileName}`);

    // 如果启用分片上传且文件大小超过阈值
    if (enableChunking && session.fileSize > uploadConfig.mode.chunkSize) {
      const totalChunks = Math.ceil(session.fileSize / uploadConfig.mode.chunkSize);
      session.chunkInfo = {
        totalChunks,
        chunkSize: uploadConfig.mode.chunkSize,
        uploadedChunks: [],
        failedChunks: []
      };
    }
  }

  /**
   * 处理分片上传
   */
  private static async handleChunkUpload(
    session: EnhancedUploadSession,
    chunkBuffer: Buffer,
    chunkIndex: number,
    totalChunks: number
  ) {
    if (!session.chunkInfo || !session.tempFilePath) {
      throw new Error('分片上传信息不完整');
    }

    // 验证分片索引
    if (chunkIndex < 0 || chunkIndex >= totalChunks) {
      throw new Error('无效的分片索引');
    }

    // 保存分片到临时文件
    const chunkPath = `${session.tempFilePath}.chunk.${chunkIndex}`;
    await fs.writeFile(chunkPath, chunkBuffer);

    // 更新分片信息
    if (!session.chunkInfo.uploadedChunks.includes(chunkIndex)) {
      session.chunkInfo.uploadedChunks.push(chunkIndex);
    }

    // 移除失败记录
    const failedIndex = session.chunkInfo.failedChunks.indexOf(chunkIndex);
    if (failedIndex > -1) {
      session.chunkInfo.failedChunks.splice(failedIndex, 1);
    }

    // 更新进度
    session.progress = Math.round((session.chunkInfo.uploadedChunks.length / totalChunks) * 100);
    session.updatedAt = new Date();
    await this.saveSession(session);

    // 检查是否所有分片都已上传
    if (session.chunkInfo.uploadedChunks.length === totalChunks) {
      return await this.mergeChunksAndUpload(session);
    }

    return {
      chunkIndex,
      uploaded: true,
      progress: session.progress,
      remainingChunks: totalChunks - session.chunkInfo.uploadedChunks.length
    };
  }

  /**
   * 合并分片并上传
   */
  private static async mergeChunksAndUpload(session: EnhancedUploadSession) {
    if (!session.chunkInfo || !session.tempFilePath) {
      throw new Error('分片信息不完整');
    }

    const mergedFilePath = session.tempFilePath;
    const writeStream = createWriteStream(mergedFilePath);

    try {
      // 按顺序合并分片
      for (let i = 0; i < session.chunkInfo.totalChunks; i++) {
        const chunkPath = `${session.tempFilePath}.chunk.${i}`;
        const readStream = createReadStream(chunkPath);
        await pipeline(readStream, writeStream, { end: false });
        
        // 删除分片文件
        await fs.unlink(chunkPath).catch(() => {}); // 忽略删除错误
      }

      writeStream.end();

      // 读取合并后的文件并上传到OSS
      const fileBuffer = await fs.readFile(mergedFilePath);
      
      await RetryUtil.executeWithRetry(
        () => this.ossService.uploadFile(fileBuffer, session.fileName, session.contentType, session.category),
        RetryConfigs.upload,
        'upload-merged-file'
      );

      // 清理临时文件
      await this.cleanupTempFile(mergedFilePath);

      session.status = 'completed';
      session.progress = 100;
      session.updatedAt = new Date();
      await this.saveSession(session);

      return {
        merged: true,
        uploaded: true,
        progress: 100
      };

    } catch (error) {
      // 清理临时文件
      await this.cleanupTempFile(mergedFilePath);
      throw error;
    }
  }

  /**
   * 处理完整文件上传
   */
  private static async handleCompleteFileUpload(session: EnhancedUploadSession, fileBuffer: Buffer) {
    await RetryUtil.executeWithRetry(
      () => this.ossService.uploadFile(fileBuffer, session.fileName, session.contentType, session.category),
      RetryConfigs.upload,
      'upload-complete-file'
    );

    session.status = 'completed';
    session.progress = 100;
    session.updatedAt = new Date();
    await this.saveSession(session);

    return {
      uploaded: true,
      progress: 100
    };
  }

  /**
   * 确定上传模式
   */
  private static determineUploadMode(requestedMode: UploadMode, fileSize: number): UploadMode {
    // 如果强制服务端上传
    if (uploadConfig.mode.forceServerUpload) {
      return UploadMode.SERVER;
    }

    // 如果禁用直传
    if (!uploadConfig.mode.enableDirectUpload) {
      return UploadMode.SERVER;
    }

    // 检查文件大小限制
    if (requestedMode === UploadMode.DIRECT && fileSize > uploadConfig.mode.directUploadSizeLimit) {
      logger.warn(`文件大小 ${fileSize} 超过直传限制 ${uploadConfig.mode.directUploadSizeLimit}，切换到服务端上传`);
      return UploadMode.SERVER;
    }

    if (requestedMode === UploadMode.SERVER && fileSize > uploadConfig.mode.serverUploadSizeLimit) {
      throw new Error(`文件大小 ${fileSize} 超过服务端上传限制 ${uploadConfig.mode.serverUploadSizeLimit}`);
    }

    // 根据请求的模式
    if (requestedMode === UploadMode.DIRECT || requestedMode === UploadMode.SERVER) {
      return requestedMode;
    }

    // 自动选择：使用配置的阈值
    const threshold = uploadConfig.mode.autoModeThreshold;
    const selectedMode = fileSize > threshold ? UploadMode.SERVER : UploadMode.DIRECT;
    
    logger.info(`自动选择上传模式: ${selectedMode}`, {
      fileSize,
      threshold,
      directUploadLimit: uploadConfig.mode.directUploadSizeLimit,
      serverUploadLimit: uploadConfig.mode.serverUploadSizeLimit
    });
    
    return selectedMode;
  }

  /**
   * 验证文件
   */
  private static validateFile(
    fileName: string,
    fileSize: number,
    contentType: string,
    fileType: 'video' | 'image' | 'audio'
  ) {
    // 验证文件大小
    if (fileSize > uploadConfig.maxFileSize) {
      throw new Error(`文件大小超过限制: ${Math.round(uploadConfig.maxFileSize / 1024 / 1024)}MB`);
    }

    // 验证文件类型
    let allowedTypes: string[];
    switch (fileType) {
      case 'image':
        allowedTypes = uploadConfig.allowedImageTypes;
        break;
      case 'video':
        allowedTypes = uploadConfig.allowedVideoTypes;
        break;
      case 'audio':
        allowedTypes = uploadConfig.allowedAudioTypes;
        break;
      default:
        throw new Error(`不支持的文件类型: ${fileType}`);
    }

    if (!allowedTypes.includes(contentType)) {
      throw new Error(`不支持的文件格式: ${contentType}`);
    }

    // 验证文件名
    if (!fileName || fileName.length > 255) {
      throw new Error('文件名无效');
    }
  }

  /**
   * 生成OSS key
   */
  private static generateOssKey(
    userId: string,
    fileName: string,
    fileType: string,
    category: string
  ): string {
    const timestamp = Date.now();
    const randomId = uuidv4().substring(0, 8);
    const ext = fileName.split('.').pop();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

    return `${fileType}s/${category}/${userId}/${timestamp}_${randomId}_${sanitizedName}_.${ext}`;
  }

  /**
   * 保存会话
   */
  private static async saveSession(session: EnhancedUploadSession) {
    const key = this.SESSION_PREFIX + session.id;
    await redisClient.setex(key, this.SESSION_EXPIRE_TIME, JSON.stringify(session));
  }

  /**
   * 获取会话
   */
  private static async getSession(sessionId: string): Promise<EnhancedUploadSession | null> {
    const key = this.SESSION_PREFIX + sessionId;
    const data = await redisClient.get(key);

    if (!data) {
      return null;
    }

    try {
      const session = JSON.parse(data) as EnhancedUploadSession;
      // 转换日期字符串为Date对象
      session.createdAt = new Date(session.createdAt);
      session.updatedAt = new Date(session.updatedAt);
      session.expiresAt = new Date(session.expiresAt);
      return session;
    } catch (error) {
      logger.error('解析上传会话数据失败:', error);
      return null;
    }
  }

  /**
   * 清理临时文件
   */
  private static async cleanupTempFile(filePath: string) {
    try {
      await fs.unlink(filePath);
      logger.debug(`清理临时文件: ${filePath}`);
    } catch (error) {
      logger.warn(`清理临时文件失败: ${filePath}`, error);
    }
  }

  /**
   * 格式化文件结果
   */
  private static formatFileResult(fileRecord: any, session: EnhancedUploadSession) {
    return {
      fileId: fileRecord.id,
      filename: fileRecord.filename,
      originalName: fileRecord.originalName,
      fileSize: fileRecord.fileSize,
      url: fileRecord.fileUrl,
      fileType: fileRecord.fileType,
      uploadedAt: fileRecord.createdAt,
      category: session.category,
      uploadMode: session.uploadMode,
      retryCount: session.retryCount
    };
  }

  /**
   * 清理过期会话
   */
  static async cleanupExpiredSessions() {
    try {
      const pattern = this.SESSION_PREFIX + '*';
      const keys = await redisClient.keys(pattern);

      let cleanedCount = 0;
      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          try {
            const session = JSON.parse(data) as EnhancedUploadSession;
            if (new Date(session.expiresAt) < new Date()) {
              // 清理临时文件
              if (session.tempFilePath) {
                await this.cleanupTempFile(session.tempFilePath);
              }
              
              // 删除会话
              await redisClient.del(key);
              cleanedCount++;
            }
          } catch (error) {
            // 数据格式错误，直接删除
            await redisClient.del(key);
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        logger.info(`清理过期上传会话: ${cleanedCount}个`);
      }
    } catch (error) {
      logger.error('清理过期上传会话失败:', error);
    }
  }

  /**
   * 清理临时文件目录
   */
  static async cleanupTempDirectory() {
    try {
      const tempDir = path.join(process.cwd(), uploadConfig.storage.tempDir);
      const files = await fs.readdir(tempDir).catch(() => []);
      
      let cleanedCount = 0;
      const maxAge = uploadConfig.storage.maxTempFileAge;
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        try {
          const stats = await fs.stat(filePath);
          if (now - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        } catch (error) {
          // 忽略单个文件的错误
        }
      }
      
      if (cleanedCount > 0) {
        logger.info(`清理临时文件: ${cleanedCount}个`);
      }
    } catch (error) {
      logger.error('清理临时文件目录失败:', error);
    }
  }
}