import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service';
import { Resp } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * 获取系统设置
 */
export const getSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = await SettingsService.getSettings();
    Resp.success(res, settings, '获取设置成功');
  } catch (error) {
    logger.error('获取设置失败:', error);
    next(error);
  }
};

/**
 * 更新网站设置
 */
export const updateSiteSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = req.body;
    await SettingsService.updateSiteSettings(settings);
    Resp.success(res, null, '网站设置更新成功');
  } catch (error) {
    logger.error('更新网站设置失败:', error);
    next(error);
  }
};

export const updateHomepageSections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = req.body;
    await SettingsService.updateSiteSettings(settings);
    Resp.success(res, null, '首页配置更新成功');
  } catch (error) {
    logger.error('更新首页配置失败:', error);
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
 * 更新安全设置
 */
export const updateSecuritySettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = req.body;
    await SettingsService.updateSecuritySettings(settings);
    Resp.success(res, null, '安全设置更新成功');
  } catch (error) {
    logger.error('更新安全设置失败:', error);
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
 * 数据库备份
 */
export const backupDatabase = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const backupPath = await SettingsService.backupDatabase();
    Resp.success(res, { backupPath }, '数据库备份成功');
  } catch (error) {
    logger.error('数据库备份失败:', error);
    next(error);
  }
};

/**
 * 获取系统信息
 */
export const getSystemInfo = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const systemInfo = await SettingsService.getSystemInfo();
    Resp.success(res, systemInfo, '获取系统信息成功');
  } catch (error) {
    logger.error('获取系统信息失败:', error);
    next(error);
  }
};

/**
 * 获取网站配置
 */
export const getSiteConfig = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const config = await SettingsService.getSiteConfig();
    Resp.success(res, config, '获取网站配置成功');
  } catch (error) {
    logger.error('获取网站配置失败:', error);
    next(error);
  }
};

/**
 * 更新网站配置
 */
export const updateSiteConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const config = req.body;
    await SettingsService.updateSiteConfig(config);
    Resp.success(res, null, '网站配置更新成功');
  } catch (error) {
    logger.error('更新网站配置失败:', error);
    next(error);
  }
};
