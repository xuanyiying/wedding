import { Request, Response, NextFunction } from 'express';
import { FileService } from '../services/file.service';
import { Resp } from '../utils/response';
import { logger } from '../utils/logger';
import { FileType } from '../types';
import { AuthenticatedRequest } from '../interfaces';

/**
 * 上传单个文件
 */
export const uploadFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('📥 文件上传请求开始:', {
      userId: req.user?.id,
      fileType: req.body.fileType,
      category: req.body.category,
      hasFile: !!req.file,
      fileSize: req.file?.size,
      originalName: req.file?.originalname
    });

    if (!req.file) {
      Resp.badRequest(res, '请选择要上传的文件');
      return;
    }

    const { fileType, category } = req.body;
    const userId = req.user!.id;
    const fileData = {
      buffer: req.file.buffer, // 使用内存存储的 buffer
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      userId: userId,
      fileType: fileType as FileType,
      category: category,
    };

    console.log('📤 开始上传到OSS:', {
      originalName: fileData.originalName,
      size: fileData.size,
      fileType: fileData.fileType
    });

    const result = await FileService.uploadFile(fileData);

    console.log('✅ 文件上传成功:', {
      fileId: result.id,
      originalName: result.originalName,
      url: result.fileUrl
    });
    Resp.created(res, result, '文件上传成功');
  } catch (error) {
    logger.error('文件上传失败:', error);
    next(error);
  }
};

/**
 * 批量上传文件
 */
export const batchUploadFiles = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      Resp.badRequest(res, '请选择要上传的文件');
      return;
    }

    const { fileType, category } = req.query;
    const userId = req.user!.id;
    const filesData = (req.files as Express.Multer.File[]).map(file => ({
      buffer: file.buffer, // 使用内存存储的 buffer
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      userId: userId,
      fileType: fileType as FileType,
      category: category as string,
    }));

    const results = await FileService.uploadFiles(filesData);

    Resp.created(res, results, '批量上传成功');
  } catch (error) {
    logger.error('批量上传失败:', error);
    next(error);
  }
};

/**
 * 获取文件列表
 */
export const getFiles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, pageSize = 10, type, userId } = req.query;

    const result = await FileService.getFiles({
      page: Number(page),
      pageSize: Number(pageSize),
      fileType: type as FileType,
      ...(userId && { userId: userId as string }),
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    });

    Resp.success(res, result, '获取文件列表成功');
  } catch (error) {
    logger.error('获取文件列表失败:', error);
    next(error);
  }
};

/**
 * 获取文件详情
 */
export const getFileById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      Resp.badRequest(res, '缺少文件ID');
      return;
    }

    const file = await FileService.getFileById(id);
    Resp.success(res, file, '获取文件详情成功');
  } catch (error) {
    logger.error('获取文件详情失败:', error);
    next(error);
  }
};

/**
 * 删除文件
 */
export const deleteFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;
    logger.info('删除文件请求:', { id, currentUserId });
    if (!id) {
      Resp.badRequest(res, '缺少文件ID');
      return;
    }

    await FileService.deleteFile(id, currentUserId);
    Resp.success(res, null, '删除文件成功');
  } catch (error) {
    logger.error('删除文件失败:', error);
    next(error);
  }
};

/**
 * 批量删除文件
 */
export const batchDeleteFiles = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ids } = req.body;
    const currentUserId = req.user!.id;

    if (!Array.isArray(ids) || ids.length === 0) {
      Resp.badRequest(res, '请提供有效的文件ID列表');
      return;
    }

    const deletedCount = await FileService.deleteFiles(ids, currentUserId);
    Resp.success(res, { deletedCount }, '批量删除文件成功');
  } catch (error) {
    logger.error('批量删除文件失败:', error);
    next(error);
  }
};

/**
 * 获取上传令牌
 */
export const getUploadToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { filename, fileSize } = req.query;
    const userId = req.user!.id;

    if (!filename || !fileSize) {
      Resp.badRequest(res, '缺少文件名或文件大小参数');
      return;
    }

    const token = await FileService.getUploadToken(userId, 'image' as FileType);

    Resp.success(res, token, '获取上传令牌成功');
  } catch (error) {
    logger.error('获取上传令牌失败:', error);
    next(error);
  }
};

/**
 * 更新文件信息
 */
export const updateFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const currentUserId = req.user!.id;

    if (!id) {
      Resp.badRequest(res, '无效的文件ID');
      return;
    }

    const file = await FileService.updateFile(id, updateData, currentUserId);
    Resp.success(res, file, '更新文件信息成功');
  } catch (error) {
    logger.error('更新文件信息失败:', error);
    next(error);
  }
};

/**
 * 获取文件统计信息
 */
export const getFileStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      const error = new Error('无效的用户ID');
      return next(error);
    }
    const stats = await FileService.getFileStats(userId);
    Resp.success(res, stats, '获取文件统计成功');
  } catch (error) {
    logger.error('获取文件统计失败:', error);
    next(error);
  }
};

/**
 * 下载文件
 */
export const downloadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      Resp.badRequest(res, '无效的文件ID');
      return;
    }

    const fileInfo = await FileService.downloadFile(id);

    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.filename}"`);
    res.setHeader('Content-Type', fileInfo.mimetype);
    res.setHeader('Content-Length', fileInfo.size);

    // 发送文件Buffer
    res.send(fileInfo.buffer);
  } catch (error) {
    logger.error('下载文件失败:', error);
    next(error);
  }
};

/**
 * 生成缩略图
 */
export const generateThumbnail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { width, height } = req.query;

    if (!id) {
      Resp.badRequest(res, '无效的文件ID');
      return;
    }

    const thumbnail = await FileService.generateThumbnail(
      id,
      width ? Number(width) : 200,
      height ? Number(height) : 200,
    );

    Resp.success(res, thumbnail, '生成缩略图成功');
  } catch (error) {
    logger.error('生成缩略图失败:', error);
    next(error);
  }
};

/**
 * 获取用户媒体文件
 */
export const getUserMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, type } = req.params;

    if (!userId || !type) {
      Resp.badRequest(res, '缺少用户ID或文件类型参数');
      return;
    }

    const result = await FileService.getFiles({
      page: 1,
      pageSize: 100,
      fileType: type as FileType,
      userId: userId,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    });

    Resp.success(res, { mediaFiles: result.files }, '获取用户媒体文件成功');
  } catch (error) {
    logger.error('获取用户媒体文件失败:', error);
    next(error);
  }
}
/**
 *  上传视频封面
 */
export const uploadVideoCover = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const fileId = req.params.id;  // 从URL参数获取fileId
    const file = req.file;  // 从multer获取上传的文件

    if (!fileId || !file) {
      Resp.badRequest(res, '缺少文件ID或文件参数');
      return;
    }

    // 读取文件buffer
    const fileBuffer = file.buffer;
    const result = await FileService.uploadVideoCover(fileBuffer, fileId);
    Resp.success(res, result, '上传视频封面成功');
  } catch (error) {
    logger.error('上传视频封面失败:', error);
    next(error);
  }
}

/**
 * 初始化分块上传
 */
export const initChunkUpload = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { filename, fileSize, mimeType, category, totalChunks } = req.body;
    const userId = req.user!.id;

    console.log('📥 初始化分块上传:', {
      userId,
      filename,
      fileSize,
      mimeType,
      category,
      totalChunks
    });

    const result = await FileService.initChunkUpload({
      filename,
      fileSize,
      mimeType,
      category,
      totalChunks,
      userId
    });

    console.log('✅ 分块上传初始化成功:', {
      uploadId: result.uploadId,
      uploadUrl: result.uploadUrl
    });

    Resp.success(res, result, '分块上传初始化成功');
  } catch (error) {
    logger.error('初始化分块上传失败:', error);
    next(error);
  }
};

/**
 * 上传分块
 */
export const uploadChunk = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { uploadId, chunkIndex } = req.body;
    const userId = req.user!.id;

    if (!req.file || !req.file.buffer) {
      Resp.badRequest(res, '分块文件数据无效或未正确上传');
      return;
    }

    console.log('📤 接收分块上传请求:', {
      userId,
      uploadId,
      chunkIndex,
      hasFile: !!req.file,
      fileSize: req.file.size,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      bufferSize: req.file.buffer?.length,
      headers: {
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length']
      }
    });

    const result = await FileService.uploadChunk({
      uploadId,
      chunkIndex: typeof chunkIndex === 'string' ? parseInt(chunkIndex) : chunkIndex,
      chunkData: req.file.buffer,
      userId
    });

    console.log('✅ 分块上传成功:', {
      uploadId,
      chunkIndex,
      success: result.success
    });

    Resp.success(res, result, '分块上传成功');
  } catch (error) {
    logger.error('上传分块失败:', error);
    next(error);
  }
};

/**
 * 检查分块上传状态
 */
export const checkChunkUploadStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { uploadId } = req.params;
    const userId = req.user!.id;

    if (!uploadId || !userId) {
      Resp.badRequest(res, '缺少必要参数：uploadId 或 userId');
      return;
    } 
    console.log('🔍 检查分块上传状态:', {
      userId,
      uploadId
    });

    const result = await FileService.checkChunkUploadStatus({
      uploadId,
      userId
    });

    console.log('✅ 分块状态检查完成:', {
      uploadId,
      totalChunks: result.totalChunks,
      availableChunks: result.availableChunks.length,
      missingChunks: result.missingChunks.length,
      canComplete: result.canComplete
    });

    Resp.success(res, result, '分块状态检查完成');
  } catch (error) {
    logger.error('检查分块状态失败:', error);
    next(error);
  }
};

/**
 * 完成分块上传
 */
export const completeChunkUpload = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { uploadId, fileId } = req.body;
    const userId = req.user!.id;

    console.log('🔄 完成分块上传:', {
      userId,
      uploadId,
      fileId
    });

    const result = await FileService.completeChunkUpload({
      uploadId,
      fileId,
      userId
    });

    console.log('✅ 分块上传完成:', {
      fileId: result.id,
      filename: result.filename,
      url: result.fileUrl
    });

    Resp.success(res, result, '分块上传完成');
  } catch (error) {
    logger.error('完成分块上传失败:', error);
    next(error);
  }
};
