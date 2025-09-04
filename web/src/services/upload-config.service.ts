import { http } from '../utils/request';

/**
 * 上传配置服务
 * 用于获取和管理上传相关的配置
 */
export const uploadConfigService = {
  /**
   * 获取上传配置
   * @returns 上传配置信息
   */
  async getUploadConfig() {
    const response = await http.get('/api/enhanced-upload/config');
    return response.data;
  },

  /**
   * 获取当前上传模式
   * @returns 上传模式信息
   */
  async getUploadMode() {
    const response = await http.get('/api/enhanced-upload/mode');
    return response.data;
  },

  /**
   * 获取上传状态
   * @param sessionId 上传会话ID
   * @returns 上传状态信息
   */
  async getUploadStatus(sessionId: string) {
    const response = await http.get(`/api/enhanced-upload/status/${sessionId}`);
    return response.data;
  },

  /**
   * 获取上传进度详情
   * @param sessionId 上传会话ID
   * @returns 上传进度详情
   */
  async getUploadProgressDetail(sessionId: string) {
    const response = await http.get(`/api/enhanced-upload/progress/${sessionId}/detail`);
    return response.data;
  },

  /**
   * 更新上传配置
   * @param config 要更新的配置
   * @returns 更新后的配置
   */
  async updateUploadConfig(config: Record<string, any>) {
    const response = await http.post('/api/enhanced-upload/config', config);
    return response.data;
  },

  /**
   * 获取上传统计信息
   * @returns 上传统计信息
   */
  async getUploadStats() {
    const response = await http.get('/api/enhanced-upload/stats');
    return response.data;
  }
};