import { http, uploadRequest } from '../utils/request';
import type {
  EnhancedUploadConfig,
  EnhancedUploadProgress,
  EnhancedUploadResult,
  UploadSessionInfo
} from '../types/enhanced-upload.types';

/**
 * 增强上传API服务
 * 提供与后端增强上传API的交互功能
 */
export const enhancedUploadApi = {
  /**
   * 初始化上传会话
   * @param fileName 文件名
   * @param fileSize 文件大小
   * @param fileType 文件类型
   * @param options 上传选项
   * @returns 上传会话信息
   */
  async initUploadSession(
    fileName: string,
    fileSize: number,
    fileType: string,
    options?: {
      uploadMode?: 'direct' | 'server';
      resumable?: boolean;
      timeout?: number;
      retryConfig?: {
        attempts: number;
        delay: number;
        backoff: 'linear' | 'exponential' | 'fixed';
      };
    }
  ): Promise<UploadSessionInfo> {
    const response = await http.post<UploadSessionInfo>('/api/enhanced-upload/init', {
      fileName,
      fileSize,
      fileType,
      ...options
    });
    if (!response.data) {
      throw new Error('初始化上传会话失败：服务器未返回数据');
    }
    return response.data;
  },

  /**
   * 获取上传URL（用于直传OSS）
   * @param sessionId 上传会话ID
   * @param partNumber 分片编号
   * @returns 上传URL
   */
  async getUploadUrl(sessionId: string, partNumber?: number): Promise<{ uploadUrl: string }> {
    const response = await http.get<{ uploadUrl: string }>(`/api/enhanced-upload/url/${sessionId}`, {
      params: { partNumber }
    });
    if (!response.data) {
      throw new Error('获取上传URL失败：服务器未返回数据');
    }
    return response.data;
  },

  /**
   * 上传文件到服务器
   * @param sessionId 上传会话ID
   * @param file 文件对象
   * @param onProgress 进度回调
   * @returns 上传结果
   */
  async uploadToServer(
    sessionId: string,
    file: File | Blob,
    onProgress?: (progress: EnhancedUploadProgress) => void
  ): Promise<EnhancedUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);

    const response = await uploadRequest.post<EnhancedUploadResult>('/api/enhanced-upload/server', formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = progressEvent.loaded / progressEvent.total;
          const speed = progressEvent.loaded / ((Date.now() - performance.now()) / 1000);
          const remainingTime = (progressEvent.total - progressEvent.loaded) / speed;

          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: percent,
            speed,
            remainingTime,
            status: 'uploading',
          });
        }
      }
    });

    if (!response.data) {
      throw new Error('上传文件到服务器失败：服务器未返回数据');
    }
    return response.data;
  },

  /**
   * 上传分片到服务器
   * @param sessionId 上传会话ID
   * @param partNumber 分片编号
   * @param chunk 分片数据
   * @param onProgress 进度回调
   * @returns 分片上传结果
   */
  async uploadChunkToServer(
    sessionId: string,
    partNumber: number,
    chunk: Blob,
    onProgress?: (progress: EnhancedUploadProgress) => void
  ): Promise<{ etag: string; partNumber: number }> {
    const formData = new FormData();
    formData.append('file', chunk);
    formData.append('sessionId', sessionId);
    formData.append('partNumber', partNumber.toString());

    const response = await uploadRequest.post<{ etag: string; partNumber: number }>('/api/enhanced-upload/chunk', formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = progressEvent.loaded / progressEvent.total;
          const speed = progressEvent.loaded / ((Date.now() - performance.now()) / 1000);
          const remainingTime = (progressEvent.total - progressEvent.loaded) / speed;

          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: percent,
            speed,
            remainingTime,
            status: 'uploading',
          });
        }
      }
    });

    if (!response.data) {
      throw new Error('上传分片到服务器失败：服务器未返回数据');
    }
    return response.data;
  },

  /**
   * 完成上传
   * @param sessionId 上传会话ID
   * @param parts 分片信息（用于分片上传）
   * @returns 上传结果
   */
  async completeUpload(
    sessionId: string,
    parts?: Array<{ etag: string; partNumber: number }>
  ): Promise<EnhancedUploadResult> {
    const response = await http.post<EnhancedUploadResult>(`/api/enhanced-upload/complete/${sessionId}`, { parts });
    if (!response.data) {
      throw new Error('完成上传失败：服务器未返回数据');
    }
    return response.data;
  },

  /**
   * 取消上传
   * @param sessionId 上传会话ID
   * @returns 取消结果
   */
  async cancelUpload(sessionId: string): Promise<{ success: boolean }> {
    const response = await http.post<{ success: boolean }>(`/api/enhanced-upload/cancel/${sessionId}`);
    if (!response.data) {
      throw new Error('取消上传失败：服务器未返回数据');
    }
    return response.data;
  },

  /**
   * 获取上传进度
   * @param sessionId 上传会话ID
   * @returns 上传进度
   */
  async getUploadProgress(sessionId: string): Promise<EnhancedUploadProgress> {
    const response = await http.get<EnhancedUploadProgress>(`/api/enhanced-upload/progress/${sessionId}`);
    if (!response.data) {
      throw new Error('获取上传进度失败：服务器未返回数据');
    }
    return response.data;
  },

  /**
   * 获取上传状态
   * @param sessionId 上传会话ID
   * @returns 上传状态
   */
  async getUploadStatus(sessionId: string): Promise<{ status: string }> {
    const response = await http.get<{ status: string }>(`/api/enhanced-upload/status/${sessionId}`);
    if (!response.data) {
      throw new Error('获取上传状态失败：服务器未返回数据');
    }
    return response.data;
  },

  /**
   * 恢复上传
   * @param sessionId 上传会话ID
   * @returns 恢复结果
   */
  async resumeUpload(sessionId: string): Promise<UploadSessionInfo> {
    const response = await http.post<UploadSessionInfo>(`/api/enhanced-upload/resume/${sessionId}`);
    if (!response.data) {
      throw new Error('恢复上传失败：服务器未返回数据');
    }
    return response.data;
  },

  /**
   * 获取上传配置
   * @returns 上传配置
   */
  async getUploadConfig(): Promise<EnhancedUploadConfig> {
    const response = await http.get<EnhancedUploadConfig>('/api/enhanced-upload/config');
    if (!response.data) {
      throw new Error('获取上传配置失败：服务器未返回数据');
    }
    return response.data;
  },

  /**
   * 更新上传配置
   * @param config 上传配置
   * @returns 更新后的配置
   */
  async updateUploadConfig(config: Partial<EnhancedUploadConfig>): Promise<EnhancedUploadConfig> {
    const response = await http.post<EnhancedUploadConfig>('/api/enhanced-upload/config', config);
    if (!response.data) {
      throw new Error('更新上传配置失败：服务器未返回数据');
    }
    return response.data;
  }
};