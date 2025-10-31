import { Request, Response, NextFunction } from 'express';
import { Resp } from '../utils/response';

/**
 * 通用验证中间件函数
 * 用于验证请求的 query、params 和 body 参数
 * 
 * @param validator - 包含验证规则的对象，可包含 query、params、body 属性
 * @returns Express 中间件函数
 */
export const validateRequest = (validator: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // 验证 query 参数
    if (validator.query) {
      const { error } = validator.query.validate(req.query, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map((detail: any) => detail.message));
      }
    }

    // 验证 params 参数
    if (validator.params) {
      const { error } = validator.params.validate(req.params, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map((detail: any) => detail.message));
      }
    }

    // 验证 body 参数
    if (validator.body) {
      const { error } = validator.body.validate(req.body, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map((detail: any) => detail.message));
      }
    }

    // 如果有验证错误，返回422状态码和错误信息
    if (errors.length > 0) {
      Resp.unprocessableEntity(res, errors.join('; '));
      return;
    }

    // 验证通过，继续执行下一个中间件
    next();
  };
};