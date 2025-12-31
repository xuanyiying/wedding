import { AuthService, RegisterData } from './auth.service';
import { User } from '../models';
import { JWTUtils } from '../utils/helpers';
import bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '../types';

// Mock User model
jest.mock('../models', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
  },
}));

// Mock JWTUtils
jest.mock('../utils/helpers', () => ({
  JWTUtils: {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
    verifyAccessToken: jest.fn(),
  },
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    genSalt: jest.fn(),
    hash: jest.fn(),
    compare: jest.fn(),
  },
  ...jest.requireActual('bcryptjs'),
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerData: RegisterData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      realName: 'Test User',
    };

    it('should register a new user successfully', async () => {
      // Mock that no existing user found
      (User.findOne as jest.Mock).mockResolvedValue(null);
      
      // Mock bcrypt
      (bcrypt.genSalt as jest.Mock).mockImplementation(() => Promise.resolve('salt'));
      (bcrypt.hash as jest.Mock).mockImplementation(() => Promise.resolve('hashedPassword'));
      
      // Mock user creation
      const createdUser: any = {
        id: '1',
        username: registerData.username,
        email: registerData.email,
        phone: '',
        passwordHash: 'hashedPassword',
        salt: 'salt',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        bio: '',
        realName: registerData.realName,
        update: jest.fn(),
        reload: jest.fn(),
        toJSON: () => ({
          id: '1',
          username: registerData.username,
          email: registerData.email,
          phone: '',
          passwordHash: 'hashedPassword',
          salt: 'salt',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          bio: '',
          realName: registerData.realName,
        }),
      };
      (User.create as jest.Mock).mockResolvedValue(createdUser);
      
      // Mock JWT token generation
      (JWTUtils.generateAccessToken as jest.Mock).mockReturnValue('accessToken');
      (JWTUtils.generateRefreshToken as jest.Mock).mockReturnValue('refreshToken');

      const result = await AuthService.register(registerData);

      // 检查调用参数，忽略Symbol(or)的精确匹配
      expect(User.findOne).toHaveBeenCalled();
      const calledWith = (User.findOne as jest.Mock).mock.calls[0][0];
      expect(calledWith.where[Symbol('or')]).toEqual([
        { username: registerData.username },
        { email: registerData.email }
      ]);
      
      expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, 'salt');
      expect(User.create).toHaveBeenCalledWith({
        username: registerData.username,
        email: registerData.email,
        phone: '',
        passwordHash: 'hashedPassword',
        salt: 'salt',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        bio: '',
        realName: registerData.realName,
      });
      expect(JWTUtils.generateAccessToken).toHaveBeenCalled();
      expect(JWTUtils.generateRefreshToken).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
    });

    it('should register a user without email successfully', async () => {
      const registerDataWithoutEmail: RegisterData = {
        username: 'testuser',
        email: '',
        password: 'password123',
      };

      // Mock that no existing user found
      (User.findOne as jest.Mock).mockResolvedValue(null);
      
      // Mock bcrypt
      (bcrypt.genSalt as jest.Mock).mockImplementation(() => Promise.resolve('salt'));
      (bcrypt.hash as jest.Mock).mockImplementation(() => Promise.resolve('hashedPassword'));
      
      // Mock user creation
      const createdUser: any = {
        id: '1',
        username: registerDataWithoutEmail.username,
        email: '',
        phone: '',
        passwordHash: 'hashedPassword',
        salt: 'salt',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        bio: '',
        update: jest.fn(),
        reload: jest.fn(),
        toJSON: () => ({
          id: '1',
          username: registerDataWithoutEmail.username,
          email: '',
          phone: '',
          passwordHash: 'hashedPassword',
          salt: 'salt',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          bio: '',
        }),
      };
      (User.create as jest.Mock).mockResolvedValue(createdUser);
      
      // Mock JWT token generation
      (JWTUtils.generateAccessToken as jest.Mock).mockReturnValue('accessToken');
      (JWTUtils.generateRefreshToken as jest.Mock).mockReturnValue('refreshToken');

      const result = await AuthService.register(registerDataWithoutEmail);

      // 检查调用参数，忽略Symbol(or)的精确匹配
      expect(User.findOne).toHaveBeenCalled();
      const calledWith = (User.findOne as jest.Mock).mock.calls[0][0];
      expect(calledWith.where[Symbol('or')]).toEqual([
        { username: registerDataWithoutEmail.username }
      ]);
      
      expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDataWithoutEmail.password, 'salt');
      expect(User.create).toHaveBeenCalledWith({
        username: registerDataWithoutEmail.username,
        email: '',
        phone: '',
        passwordHash: 'hashedPassword',
        salt: 'salt',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        bio: '',
      });
      expect(JWTUtils.generateAccessToken).toHaveBeenCalled();
      expect(JWTUtils.generateRefreshToken).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
    });

    it('should throw validation error if username already exists', async () => {
      // Mock that existing user found
      const existingUser = {
        username: 'testuser',
        email: 'other@example.com',
      };
      (User.findOne as jest.Mock).mockResolvedValue(existingUser);

      await expect(AuthService.register(registerData)).rejects.toThrow('用户名已存在');

      // 检查调用参数，忽略Symbol(or)的精确匹配
      expect(User.findOne).toHaveBeenCalled();
      const calledWith = (User.findOne as jest.Mock).mock.calls[0][0];
      expect(calledWith.where[Symbol('or')]).toEqual([
        { username: registerData.username },
        { email: registerData.email }
      ]);
    });

    it('should throw validation error if email already exists', async () => {
      // Mock that existing user found
      const existingUser = {
        username: 'otheruser',
        email: 'test@example.com',
      };
      (User.findOne as jest.Mock).mockResolvedValue(existingUser);

      await expect(AuthService.register(registerData)).rejects.toThrow('邮箱已被注册');

      // 检查调用参数，忽略Symbol(or)的精确匹配
      expect(User.findOne).toHaveBeenCalled();
      const calledWith = (User.findOne as jest.Mock).mock.calls[0][0];
      expect(calledWith.where[Symbol('or')]).toEqual([
        { username: registerData.username },
        { email: registerData.email }
      ]);
    });
  });
});