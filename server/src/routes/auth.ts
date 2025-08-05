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

// 公开路由（无需认证）
router.post('/login', validateLogin, login);
router.post('/register', validateRegister, register);
router.post('/refresh-token', validateRefreshToken, refreshToken);

// 用户名和邮箱可用性检查
router.get('/check-username/:username', checkUsername);
router.get('/check-email/:email', checkEmail);

// 需要认证的路由
router.post('/logout', authMiddleware, logout);
router.get('/profile', getProfile);
router.get('/me', getCurrentUser);
router.put('/profile', authMiddleware, validateUpdateProfile, updateProfile);
router.post('/change-password', authMiddleware, validateChangePassword, changePassword);

export default router;
