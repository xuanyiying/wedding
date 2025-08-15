import { Request, Response } from 'express';
import { DirectUploadService } from '../services/direct-upload.service';
import { logger } from '../utils/logger';
import { Resp } from '@/utils/response';

export class DirectUploadController {
  /**
   * 获取预签名上传URL
   */
  static async getPresignedUrl(req: Request, res: Response) : Promise<void> {
    try {
      const { fileName, fileSize, contentType, fileType, expires } = req.body;
      const userId = req.user?.id;

      // 参数校验
      if (!fileName || !fileSize || !contentType || !fileType || !userId) {
         Resp.badRequest(res, '缺少必要参数');
         return;
      }

      const result = await DirectUploadService.generatePresignedUrl({
        userId,
        fileName,
        fileSize,
        contentType,
        fileType,
        expires
      });
      Resp.success(res, result);
    } catch (error) {
      logger.error('获取预签名URL失败:', error);
      Resp.internalError(res, '获取预签名URL失败');
    }
  }

  /**
   * 确认上传完成
   */
  static async confirmUpload(req: Request, res: Response): Promise<void> {
    try {
      const { uploadSessionId, actualFileSize } = req.body;
      const userId = req.user?.id;

      // 参数校验
      if (!uploadSessionId || !userId) {
        Resp.badRequest(res, '缺少必要参数');
        return;
      }

      const result = await DirectUploadService.confirmUpload({
        uploadSessionId,
        userId,
        actualFileSize
      });
      Resp.success(res, result);
    } catch (error) {
      logger.error('确认上传失败:', error);
      Resp.internalError(res, '确认上传失败');
    }
  }

  /**
   * 取消上传
   */
  static async cancelUpload(req: Request, res: Response): Promise<void> {
    try {
      const { uploadSessionId } = req.body;
      const userId = req.user?.id;

      // 参数校验
      if (!uploadSessionId || !userId) {
        Resp.badRequest(res, '缺少必要参数');
        return;
      }

      await DirectUploadService.cancelUpload(userId, uploadSessionId);

      Resp.success(res, {
        message: '取消上传成功'
      });
    } catch (error) {
      logger.error('取消上传失败:', error);
      Resp.internalError(res, '取消上传失败');
    }
  }

  /**
   * 查询上传进度
   */
  static async getUploadProgress(req: Request, res: Response): Promise<void> {
    try {
      const { uploadSessionId } = req.params;
      const userId = req.user?.id;

      // 参数校验
      if (!uploadSessionId || !userId) {
        Resp.badRequest(res, '缺少必要参数');
        return;
      }

      const result = await DirectUploadService.getUploadProgress(userId, uploadSessionId);

      Resp.success(res, {
        message: '查询上传进度成功',
        data: result
      });
    } catch (error) {
      logger.error('查询上传进度失败:', error);
      Resp.internalError(res, '查询上传进度失败');
    }
  }
}