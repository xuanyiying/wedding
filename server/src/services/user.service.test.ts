import { UserService } from './user.service';
import { User } from '../models';
import { UserRole, UserStatus } from '../types';
import bcrypt from 'bcryptjs';

// Mock User model
jest.mock('../models', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    findAndCountAll: jest.fn(),
    count: jest.fn(),
    sequelize: {
      fn: jest.fn(),
      col: jest.fn(),
    },
  },
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
  },
  ...jest.requireActual('bcryptjs'),
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        realName: 'Test User',
      };

      // Mock that no existing user found
      (User.findOne as jest.Mock).mockResolvedValue(null);
      
      // Mock bcrypt
      (bcrypt.hash as jest.Mock).mockImplementation(() => Promise.resolve('hashedPassword'));
      
      // Mock user creation
      const createdUser = {
        id: '1',
        ...userData,
        passwordHash: 'hashedPassword',
        salt: '',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        toJSON: () => ({
          id: '1',
          ...userData,
          passwordHash: 'hashedPassword',
          salt: '',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
        }),
      };
      (User.create as jest.Mock).mockResolvedValue(createdUser);

      const result = await UserService.createUser(userData);

      // 检查调用参数，忽略Symbol(or)的精确匹配
      expect(User.findOne).toHaveBeenCalled();
      const calledWith = (User.findOne as jest.Mock).mock.calls[0][0];
      expect(calledWith.where[Symbol('or')]).toEqual([
        { username: userData.username },
        { email: userData.email }
      ]);
      
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
      expect(User.create).toHaveBeenCalledWith({
        ...userData,
        passwordHash: 'hashedPassword',
        salt: '',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      });
      expect(result).toEqual({
        id: '1',
        username: userData.username,
        email: userData.email,
        realName: userData.realName,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      });
    });

    it('should create a user without email successfully', async () => {
      const userData = {
        username: 'testuser',
        email: '',
        password: 'password123',
      };

      // Mock that no existing user found
      (User.findOne as jest.Mock).mockResolvedValue(null);
      
      // Mock bcrypt
      (bcrypt.hash as jest.Mock).mockImplementation(() => Promise.resolve('hashedPassword'));
      
      // Mock user creation
      const createdUser = {
        id: '1',
        ...userData,
        passwordHash: 'hashedPassword',
        salt: '',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        toJSON: () => ({
          id: '1',
          ...userData,
          passwordHash: 'hashedPassword',
          salt: '',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
        }),
      };
      (User.create as jest.Mock).mockResolvedValue(createdUser);

      const result = await UserService.createUser(userData);

      // 检查调用参数，忽略Symbol(or)的精确匹配
      expect(User.findOne).toHaveBeenCalled();
      const calledWith = (User.findOne as jest.Mock).mock.calls[0][0];
      expect(calledWith.where[Symbol('or')]).toEqual([
        { username: userData.username }
      ]);
      
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
      expect(User.create).toHaveBeenCalledWith({
        ...userData,
        passwordHash: 'hashedPassword',
        salt: '',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      });
      expect(result).toEqual({
        id: '1',
        username: userData.username,
        email: userData.email,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      });
    });

    it('should throw error if username already exists', async () => {
      const userData = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'password123',
      };

      // Mock that existing user found
      const existingUser = {
        username: 'existinguser',
        email: 'existing@example.com',
      };
      (User.findOne as jest.Mock).mockResolvedValue(existingUser);

      await expect(UserService.createUser(userData)).rejects.toThrow('用户名已存在');

      // 检查调用参数，忽略Symbol(or)的精确匹配
      expect(User.findOne).toHaveBeenCalled();
      const calledWith = (User.findOne as jest.Mock).mock.calls[0][0];
      expect(calledWith.where[Symbol('or')]).toEqual([
        { username: userData.username },
        { email: userData.email }
      ]);
    });

    it('should throw error if email already exists', async () => {
      const userData = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'password123',
      };

      // Mock that existing user found
      const existingUser = {
        username: 'existinguser',
        email: 'existing@example.com',
      };
      (User.findOne as jest.Mock).mockResolvedValue(existingUser);

      await expect(UserService.createUser(userData)).rejects.toThrow('邮箱已存在');

      // 检查调用参数，忽略Symbol(or)的精确匹配
      expect(User.findOne).toHaveBeenCalled();
      const calledWith = (User.findOne as jest.Mock).mock.calls[0][0];
      expect(calledWith.where[Symbol('or')]).toEqual([
        { username: userData.username },
        { email: userData.email }
      ]);
    });
  });
});