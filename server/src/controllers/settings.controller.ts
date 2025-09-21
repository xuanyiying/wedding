import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service';
import { Resp } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * 获取系统设置
 */
export const getAllSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    logger.info('🔍 收到获取设置请求');
    const settings = await SettingsService.getAllSettings();
    logger.info('🔍 返回设置数据:', settings);
    Resp.success(res, settings, '获取设置成功');
  } catch (error) {
    logger.error('❌ 获取设置失败:', error);
    next(error);
  }
};

/**
 * 更新网站设置
 */
export const updateSiteSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = req.body;
    logger.info('📝 更新网站设置:', settings);
    await SettingsService.updateSiteSettings(settings);
    Resp.success(res, null, '网站设置更新成功');
  } catch (error) {
    logger.error('更新网站设置失败:', error);
    next(error);
  }
};

/**
 * 更新首页设置
 */
export const updateHomepageSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = req.body
    logger.info('📝 更新首页设置:', settings);

    await SettingsService.updateHomepageSettings(settings);
    Resp.success(res, null, '首页设置更新成功');
  } catch (error) {
    logger.error('更新首页设置失败:', error);
    next(error);
  }
};

/**
 * 更新主题设置
 */
export const updateThemeSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = req.body;
    logger.info('📝 更新主题设置:', settings);

    await SettingsService.updateThemeSettings(settings);
    Resp.success(res, null, '主题设置更新成功');
  } catch (error) {
    logger.error('更新主题设置失败:', error);
    next(error);
  }
};

/**
 * 更新邮件设置
 */
export const updateEmailSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = req.body;
    await SettingsService.updateEmailSettings(settings);
    Resp.success(res, null, '邮件设置更新成功');
  } catch (error) {
    logger.error('更新邮件设置失败:', error);
    next(error);
  }
};

/**
 * 测试邮件发送
 */
export const testEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { to, subject, content } = req.body;
    await SettingsService.testEmail({ to, subject, content });
    Resp.success(res, null, '测试邮件发送成功');
  } catch (error) {
    logger.error('测试邮件发送失败:', error);
    next(error);
  }
};

/**
 * 清理缓存
 */
export const clearCache = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await SettingsService.clearCache();
    Resp.success(res, null, '缓存清理成功');
  } catch (error) {
    logger.error('清理缓存失败:', error);
    next(error);
  }
};

/**
 * 获取网站配置
 */
export const getSiteSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const config = await SettingsService.getConfigValue('site');
    Resp.success(res, config, '获取网站配置成功');
  } catch (error) {
    logger.error('获取网站配置失败:', error);
    next(error);
  }
};

/**
 * 更新网站配置
 */
export const getHomepageSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const config = await SettingsService.getConfigValue('homepage');
    Resp.success(res, config, '获取网站配置成功');
  } catch (error) {
    logger.error('获取网站配置失败:', error);
    next(error);
  }
};

export const getEmailSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const config = await SettingsService.getConfigValue('email');
    await SettingsService.getConfigValue(config);
    Resp.success(res, null, '首页配置更新成功');
  } catch (error) {
    logger.error('更新首页配置失败:', error);
    next(error);
  }
};
export const getThemeSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const config = await SettingsService.getConfigValue('theme');
    await SettingsService.getConfigValue(config);
    Resp.success(res, null, '主题配置更新成功');
  } catch (error) {
    logger.error('更新主题配置失败:', error);
    next(error);
  }
};
