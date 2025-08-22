import { Router } from 'express';
import {
  login,
  register,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  getCurrentUser,
  checkUsername,
  checkEmail,
} from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth';
import {
  validateLogin,
  validateRegister,
  validateRefreshToken,
  validateChangePassword,
  validateUpdateProfile,
} from '../validators/auth';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: 用户邮箱
 *         password:
 *           type: string
 *           minLength: 6
 *           description: 用户密码
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 20
 *           description: 用户名
 *         email:
 *           type: string
 *           format: email
 *           description: 用户邮箱
 *         password:
 *           type: string
 *           minLength: 6
 *           description: 用户密码
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT访问令牌
 *         refreshToken:
 *           type: string
 *           description: 刷新令牌
 *         user:
 *           $ref: '#/components/schemas/User'
 *     RefreshTokenRequest:
 *       type: object
 *       required:
 *         - refreshToken
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: 刷新令牌
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           description: 当前密码
 *         newPassword:
 *           type: string
 *           minLength: 6
 *           description: 新密码
 *     UpdateProfileRequest:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 20
 *           description: 用户名
 *         email:
 *           type: string
 *           format: email
 *           description: 用户邮箱
 *         avatar:
 *           type: string
 *           description: 头像URL
 *         bio:
 *           type: string
 *           description: 个人简介
 */

// 公开路由（无需认证）

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 邮箱或密码错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', validateLogin, login);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 用户注册
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: 请求参数错误或用户已存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', validateRegister, register);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: 刷新访问令牌
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: 令牌刷新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: 新的访问令牌
 *       400:
 *         description: 刷新令牌无效或已过期
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh-token', validateRefreshToken, refreshToken);

// 用户名和邮箱可用性检查

/**
 * @swagger
 * /api/auth/check-username/{username}:
 *   get:
 *     summary: 检查用户名是否可用
 *     tags: [Authentication]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: 要检查的用户名
 *     responses:
 *       200:
 *         description: 检查结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                   description: 用户名是否可用
 *                 message:
 *                   type: string
 *                   description: 检查结果消息
 */
router.get('/check-username/:username', checkUsername);

/**
 * @swagger
 * /api/auth/check-email/{email}:
 *   get:
 *     summary: 检查邮箱是否可用
 *     tags: [Authentication]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: 要检查的邮箱地址
 *     responses:
 *       200:
 *         description: 检查结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                   description: 邮箱是否可用
 *                 message:
 *                   type: string
 *                   description: 检查结果消息
 */
router.get('/check-email/:email', checkEmail);

// 需要认证的路由

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 用户登出
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: 成功消息
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout', authMiddleware, logout);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: 获取用户资料
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 用户资料
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile', getProfile);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 获取当前用户信息
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 当前用户信息
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', getCurrentUser);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: 更新用户资料
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/profile', authMiddleware, validateUpdateProfile, updateProfile);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: 修改密码
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: 密码修改成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: 成功消息
 *       400:
 *         description: 请求参数错误或当前密码不正确
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/change-password', authMiddleware, validateChangePassword, changePassword);

export default router;
