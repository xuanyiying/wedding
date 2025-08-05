import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, _res: Response, next: NextFunction): void => {
  // 添加ip path method
  logger.info(`${req.ip} ${req.method} ${req.path}`);
  next();
};
