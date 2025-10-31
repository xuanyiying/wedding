import Joi from 'joi';
import { validateRequest } from '@/middlewares';
import { FileCategory, FileType } from '@/types';

// 单文件上传验证规则
export const uploadFileSchema = Joi.object({
    fileType: Joi.string()
        .valid(...Object.values(FileType))
        .required()
        .messages({
            'any.only': `文件类型必须是以下值之一：${Object.values(FileType).join('、')}`,
            'any.required': '文件类型是必填项',
        }),
    category: Joi.string()
        .valid(...Object.values(FileCategory))
        .optional()
        .messages({
            'any.only': `文件分类必须是以下值之一：${Object.values(FileCategory).join('、')}`,
        }),
    description: Joi.string()
        .trim()
        .max(500)
        .optional()
        .messages({
            'string.max': '文件描述不能超过500个字符',
        }),
});

// 批量文件上传验证规则
export const uploadFilesSchema = Joi.object({
    fileType: Joi.string()
        .valid(...Object.values(FileType))
        .required()
        .messages({
            'any.only': `文件类型必须是以下值之一：${Object.values(FileType).join('、')}`,
            'any.required': '文件类型是必填项',
        }),
    category: Joi.string()
        .valid(...Object.values(FileCategory))
        .optional()
        .messages({
            'any.only': `文件分类必须是以下值之一：${Object.values(FileCategory).join('、')}`,
        }),
    description: Joi.string()
        .trim()
        .max(500)
        .optional()
        .messages({
            'string.max': '文件描述不能超过500个字符',
        }),
});

// 获取文件列表验证规则
export const getFilesSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .messages({
            'number.integer': '页码必须是整数',
            'number.min': '页码必须大于0',
        }),
    pageSize: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20)
        .messages({
            'number.integer': '每页数量必须是整数',
            'number.min': '每页数量必须大于0',
            'number.max': '每页数量不能超过100',
        }),
    userId: Joi.string()
        .optional()
        .messages({
            'string.base': '用户ID必须是字符串',
        }),
    fileType: Joi.string()
        .valid(...Object.values(FileType))
        .optional()
        .messages({
            'any.only': `文件类型必须是以下值之一：${Object.values(FileType).join('、')}`,
        }),
    category: Joi.string()
        .valid(...Object.values(FileCategory))
        .optional()
        .messages({
            'any.only': `文件分类必须是以下值之一：${Object.values(FileCategory).join('、')}`,
        }),
    keyword: Joi.string()
        .trim()
        .max(100)
        .optional()
        .messages({
            'string.max': '搜索关键词不能超过100个字符',
        }),
    sortBy: Joi.string()
        .valid('createdAt', 'size', 'filename')
        .default('createdAt')
        .messages({
            'any.only': '排序字段必须是以下值之一：createdAt、size、filename',
        }),
    sortOrder: Joi.string()
        .valid('ASC', 'DESC')
        .default('DESC')
        .messages({
            'any.only': '排序方向必须是ASC或DESC',
        }),
});

// 获取文件详情验证规则
export const getFileByIdSchema = Joi.object({
    id: Joi.string()
        .required()
        .messages({
            'string.empty': '文件ID不能为空',
            'any.required': '文件ID是必填项',
        }),
});

// 删除文件验证规则
export const deleteFileSchema = Joi.object({
    id: Joi.string()
        .required()
        .messages({
            'string.empty': '文件ID不能为空',
            'any.required': '文件ID是必填项',
        }),
});

// 批量删除文件验证规则
export const deleteFilesSchema = Joi.object({
    ids: Joi.array()
        .items(Joi.string().required())
        .min(1)
        .max(50)
        .required()
        .messages({
            'array.min': '至少选择一个文件',
            'array.max': '一次最多删除50个文件',
            'any.required': '文件ID列表是必填项',
        }),
});

// 获取上传令牌验证规则
export const getUploadTokenSchema = Joi.object({
    fileType: Joi.string()
        .valid(...Object.values(FileType))
        .required()
        .messages({
            'any.only': `文件类型必须是以下值之一：${Object.values(FileType).join('、')}`,
            'any.required': '文件类型是必填项',
        }),
});

// 更新文件信息验证规则
export const updateFileSchema = Joi.object({
    description: Joi.string()
        .trim()
        .max(500)
        .optional()
        .messages({
            'string.max': '文件描述不能超过500个字符',
        }),
}).min(1).messages({
    'object.min': '至少需要提供一个要更新的字段',
});

// 下载文件验证规则
export const downloadFileSchema = Joi.object({
    id: Joi.string()
        .required()
        .messages({
            'string.empty': '文件ID不能为空',
            'any.required': '文件ID是必填项',
        }),
});

// 生成缩略图验证规则
export const generateThumbnailSchema = Joi.object({
    width: Joi.number()
        .integer()
        .min(50)
        .max(1000)
        .default(200)
        .messages({
            'number.integer': '宽度必须是整数',
            'number.min': '宽度不能小于50像素',
            'number.max': '宽度不能超过1000像素',
        }),
    height: Joi.number()
        .integer()
        .min(50)
        .max(1000)
        .default(200)
        .messages({
            'number.integer': '高度必须是整数',
            'number.min': '高度不能小于50像素',
            'number.max': '高度不能超过1000像素',
        }),
});

// 初始化分块上传验证规则
export const initChunkUploadSchema = Joi.object({
    filename: Joi.string()
        .trim()
        .min(1)
        .max(255)
        .required()
        .messages({
            'string.empty': '文件名不能为空',
            'string.min': '文件名至少需要1个字符',
            'string.max': '文件名不能超过255个字符',
            'any.required': '文件名是必填项',
        }),
    fileSize: Joi.number()
        .integer()
        .min(1)
        .max(5 * 1024 * 1024 * 1024)
        .required()
        .messages({
            'number.integer': '文件大小必须是整数',
            'number.min': '文件大小必须大于0',
            'number.max': '文件大小不能超过5GB',
            'any.required': '文件大小是必填项',
        }),
    mimeType: Joi.string()
        .trim()
        .min(1)
        .max(100)
        .required()
        .messages({
            'string.empty': 'MIME类型不能为空',
            'string.min': 'MIME类型至少需要1个字符',
            'string.max': 'MIME类型不能超过100个字符',
            'any.required': 'MIME类型是必填项',
        }),
    category: Joi.string()
        .valid(...Object.values(FileCategory))
        .optional()
        .messages({
            'any.only': `文件分类必须是以下值之一：${Object.values(FileCategory).join('、')}`,
        }),
    totalChunks: Joi.number()
        .integer()
        .min(1)
        .max(1000)
        .required()
        .messages({
            'number.integer': '分块总数必须是整数',
            'number.min': '分块总数必须大于0',
            'number.max': '分块总数不能超过1000',
            'any.required': '分块总数是必填项',
        }),
});

// 上传分块验证规则
export const uploadChunkSchema = Joi.object({
    uploadId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.guid': '上传ID必须是有效的UUID格式',
            'any.required': '上传ID是必填项',
        }),
    chunkIndex: Joi.alternatives()
        .try(
            Joi.number().integer().min(0),
            Joi.string().pattern(/^\d+$/)
        )
        .required()
        .messages({
            'alternatives.match': '分块索引必须是大于等于0的整数',
            'any.required': '分块索引是必填项',
        }),
});

// 完成分块上传验证规则
export const completeChunkUploadSchema = Joi.object({
    uploadId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.guid': '上传ID必须是有效的UUID格式',
            'any.required': '上传ID是必填项',
        }),
    fileId: Joi.string()
        .required()
        .messages({
            'string.empty': '文件ID不能为空',
            'any.required': '文件ID是必填项',
        }),
});

// 导出验证中间件
export const validateUploadFile = validateRequest({ body: uploadFileSchema });
export const validateUploadFiles = validateRequest({ body: uploadFilesSchema });
export const validateGetFiles = validateRequest({ query: getFilesSchema });
export const validateGetFileById = validateRequest({ params: getFileByIdSchema });
export const validateDeleteFile = validateRequest({ params: deleteFileSchema });
export const validateDeleteFiles = validateRequest({ body: deleteFilesSchema });
export const validateGetUploadToken = validateRequest({ body: getUploadTokenSchema });
export const validateUpdateFile = validateRequest({ 
    params: getFileByIdSchema, 
    body: updateFileSchema 
});
export const validateDownloadFile = validateRequest({ params: downloadFileSchema });
export const validateGenerateThumbnail = validateRequest({ 
    params: getFileByIdSchema, 
    body: generateThumbnailSchema 
});
export const validateInitChunkUpload = validateRequest({ body: initChunkUploadSchema });
export const validateUploadChunk = validateRequest({ body: uploadChunkSchema });
export const validateCompleteChunkUpload = validateRequest({ body: completeChunkUploadSchema });

// 导出验证器对象
export const fileValidators = {
    uploadFile: validateUploadFile,
    uploadFiles: validateUploadFiles,
    getFiles: validateGetFiles,
    getFileById: validateGetFileById,
    deleteFile: validateDeleteFile,
    deleteFiles: validateDeleteFiles,
    getUploadToken: validateGetUploadToken,
    updateFile: validateUpdateFile,
    downloadFile: validateDownloadFile,
    generateThumbnail: validateGenerateThumbnail,
    initChunkUpload: validateInitChunkUpload,
    uploadChunk: validateUploadChunk,
    completeChunkUpload: validateCompleteChunkUpload,
};
