import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { ValidationError } from './error';
import { UserRole, UserStatus } from '../types';
import { ValidationUtils } from '../utils/helpers';
import Joi from 'joi';

// 验证结果处理中间件
export const handleValidationErrors = (req: Request, _res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));

    throw new ValidationError('Validation failed', errorMessages);
  }

  next();
};

// 通用验证规则
export const commonValidations = {
  // ID 验证 - 移除UUID校验，改为字符串验证
  id: param('id').isString().notEmpty().withMessage('ID is required'),

  // 分页验证
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100').toInt(),
  ],

  // 搜索验证
  search: query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
    .trim(),

  // 排序验证
  sort: [
    query('sortBy').optional().isString().withMessage('Sort field must be a string'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  ],

  // 日期范围验证
  dateRange: [
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
      .custom((value, { req }) => {
        if (req.query && req.query.startDate && value) {
          const startDate = new Date(req.query.startDate as string);
          const endDate = new Date(value);
          if (endDate <= startDate) {
            throw new Error('End date must be after start date');
          }
        }
        return true;
      }),
  ],
};

// 用户相关验证
export const userValidations = {
  // 用户注册验证
  register: [
    body('username')
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),

    body('email').isEmail().withMessage('Invalid email format').normalizeEmail(),

    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      ),

    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),

    body('phone')
      .optional()
      .custom(value => {
        if (value && !ValidationUtils.isValidPhone(value)) {
          throw new Error('Invalid phone number format');
        }
        return true;
      }),

    body('realName')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Real name must be between 2 and 50 characters'),
  ],

  // 用户登录验证
  login: [
    body('username').notEmpty().withMessage('Username or email is required'),

    body('password').notEmpty().withMessage('Password is required'),
  ],

  // 用户更新验证
  update: [
    body('username')
      .optional()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),

    body('email').optional().isEmail().withMessage('Invalid email format').normalizeEmail(),

    body('phone')
      .optional()
      .custom(value => {
        if (value && !ValidationUtils.isValidPhone(value)) {
          throw new Error('Invalid phone number format');
        }
        return true;
      }),

    body('realName')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Real name must be between 2 and 50 characters'),

    body('bio').optional().isLength({ max: 500 }).withMessage('Bio must not exceed 500 characters'),
  ],

  // 密码修改验证
  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),

    body('newPassword')
      .isLength({ min: 8, max: 128 })
      .withMessage('New password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage(
        'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      ),

    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  ],

  // 密码重置验证
  resetPassword: [
    body('token').notEmpty().withMessage('Reset token is required'),

    body('newPassword')
      .isLength({ min: 8, max: 128 })
      .withMessage('New password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage(
        'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      ),
  ],

  // 用户状态更新验证
  updateStatus: [
    body('status')
      .isIn(Object.values(UserStatus))
      .withMessage(`Status must be one of: ${Object.values(UserStatus).join(', ')}`),
  ],

  // 用户角色更新验证
  updateRole: [
    body('role')
      .isIn(Object.values(UserRole))
      .withMessage(`Role must be one of: ${Object.values(UserRole).join(', ')}`),
  ],
};

// 文件上传验证
export const uploadValidations = {
  // 图片上传验证
  image: [
    body('category')
      .optional()
      .isIn(['avatar', 'cover', 'gallery', 'news', 'case'])
      .withMessage('Category must be one of: avatar, cover, gallery, news, case'),
  ],

  // 文档上传验证
  document: [
    body('category')
      .optional()
      .isIn(['contract', 'proposal', 'other'])
      .withMessage('Category must be one of: contract, proposal, other'),
  ],
};

// 创建验证中间件工厂
export const createValidationMiddleware = (validations: ValidationChain[]) => {
  return [...validations, handleValidationErrors];
};

// 导出常用的验证中间件组合
export const validationMiddlewares = {
  // 用户相关
  userRegister: createValidationMiddleware(userValidations.register),
  userLogin: createValidationMiddleware(userValidations.login),
  userUpdate: createValidationMiddleware(userValidations.update),
  userChangePassword: createValidationMiddleware(userValidations.changePassword),
  userResetPassword: createValidationMiddleware(userValidations.resetPassword),
  userUpdateStatus: createValidationMiddleware(userValidations.updateStatus),
  userUpdateRole: createValidationMiddleware(userValidations.updateRole),

  // 通用验证
  validateId: createValidationMiddleware([commonValidations.id]),
  validatePagination: createValidationMiddleware(commonValidations.pagination),
  validateSearch: createValidationMiddleware([commonValidations.search]),
  validateSort: createValidationMiddleware(commonValidations.sort),
  validateDateRange: createValidationMiddleware(commonValidations.dateRange),
};

// Joi验证中间件
export const validateRequest = (
  schema: Joi.ObjectSchema | { params?: Joi.ObjectSchema; query?: Joi.ObjectSchema; body?: Joi.ObjectSchema },
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    let errors: any[] = [];

    // 如果是单个schema，验证body
    if ('validate' in schema) {
      const { error } = (schema as Joi.ObjectSchema).validate(req.body);
      if (error) {
        errors = errors.concat(error.details);
      }
    } else {
      // 如果是包含params、query、body的对象
      const schemaObj = schema as { params?: Joi.ObjectSchema; query?: Joi.ObjectSchema; body?: Joi.ObjectSchema };

      if (schemaObj.params) {
        const { error } = schemaObj.params.validate(req.params, { allowUnknown: true });
        if (error) {
          errors = errors.concat(error.details);
        }
      }

      if (schemaObj.query) {
        const { error } = schemaObj.query.validate(req.query, { allowUnknown: true });
        if (error) {
          errors = errors.concat(error.details);
        }
      }

      if (schemaObj.body) {
        const { error } = schemaObj.body.validate(req.body);
        if (error) {
          errors = errors.concat(error.details);
        }
      }
    }

    if (errors.length > 0) {
      const errorMessages = errors.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));
      console.log('Validation failed with details:', errorMessages);
      console.log('Request params:', req.params);
      console.log('Request query:', req.query);
      console.log('Request body:', req.body);
      throw new ValidationError('Validation failed', errorMessages);
    }

    next();
  };
};

export default validationMiddlewares;
