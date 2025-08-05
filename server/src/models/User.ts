import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import { PasswordUtils } from '../utils/helpers';
import { UserRole, UserStatus } from '../types';


// User attributes interface
export interface UserAttributes {
  id: string;
  username: string;
  email: string;
  phone?: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  realName?: string; // 真实姓名
  nickname?: string; // 昵称
  bio?: string; // 个人介绍
  specialties?: any; // 专业领域
  experienceYears?: number; // 工作经验年数
  location?: string; // 工作地点
  contactInfo?: any; // 联系信息
  socialLinks?: any; // 社交链接
  lastLoginAt?: Date;
  lastLoginIp?: string;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

// User creation attributes interface
export interface UserCreationAttributes extends Optional<UserAttributes, 'id'> {}

// User model class
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public username!: string;
  public email!: string;
  public phone?: string;
  public passwordHash!: string;
  public salt!: string;
  public role!: UserRole;
  public status!: UserStatus;
  public avatarUrl?: string;
  public realName?: string;
  public nickname?: string;
  public bio?: string;
  public specialties?: any;
  public experienceYears?: number;
  public location?: string;
  public contactInfo?: any;
  public socialLinks?: any;
  public lastLoginAt?: Date;
  public lastLoginIp?: string;
  public emailVerifiedAt?: Date;
  public phoneVerifiedAt?: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt?: Date;

  // Instance method to validate a password
  public async validatePassword(password: string): Promise<boolean> {
    return PasswordUtils.comparePassword(password, this.passwordHash);
  }

  // Static method to find a user by username
  public static async findByUsername(username: string): Promise<User | null> {
    return this.findOne({ where: { username } });
  }

  // Static method to find a user by email
  public static async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }
}

export const initUser = (sequelize: Sequelize): void => {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '用户ID',
      },
      username: {
        type: new DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: '用户名',
      },
      email: {
        type: new DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
        comment: '邮箱',
      },
      phone: {
        type: new DataTypes.STRING(20),
        comment: '手机号',
      },
      passwordHash: {
        type: new DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash',
        comment: '密码哈希',
      },
      salt: {
        type: new DataTypes.STRING(32),
        allowNull: false,
        comment: '密码盐值',
      },
      role: {
        type: DataTypes.ENUM(...Object.values(UserRole)),
        allowNull: false,
        defaultValue: UserRole.USER,
        comment: '用户角色',
      },
      status: {
        type: DataTypes.ENUM(...Object.values(UserStatus)),
        allowNull: false,
        defaultValue: UserStatus.ACTIVE,
        comment: '用户状态',
      },
      avatarUrl: {
        type: new DataTypes.STRING(500),
        field: 'avatar_url',
        comment: '头像URL',
      },
      realName: {
        type: new DataTypes.STRING(100),
        field: 'real_name',
        comment: '真实姓名',
      },
      nickname: {
        type: new DataTypes.STRING(100),
        comment: '昵称',
      },
      bio: {
        type: DataTypes.TEXT,
        comment: '个人简介',
      },
      specialties: {
        type: DataTypes.JSON,
        comment: '专业技能',
      },
      experienceYears: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'experience_years',
        comment: '从业年限',
      },
      location: {
        type: new DataTypes.STRING(200),
        comment: '所在地区',
      },
      contactInfo: {
        type: DataTypes.JSON,
        field: 'contact_info',
        comment: '联系方式',
      },
      socialLinks: {
        type: DataTypes.JSON,
        field: 'social_links',
        comment: '社交媒体链接',
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        field: 'last_login_at',
        comment: '最后登录时间',
      },
      lastLoginIp: {
        type: new DataTypes.STRING(45),
        field: 'last_login_ip',
        comment: '最后登录IP',
      },
      emailVerifiedAt: {
        type: DataTypes.DATE,
        field: 'email_verified_at',
        comment: '邮箱验证时间',
      },
      phoneVerifiedAt: {
        type: DataTypes.DATE,
        field: 'phone_verified_at',
        comment: '手机验证时间',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
        comment: '创建时间',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
        comment: '更新时间',
      },
      deletedAt: {
        type: DataTypes.DATE,
        field: 'deleted_at',
        comment: '删除时间',
      },
    },
    {
      tableName: 'users',
      sequelize,
      timestamps: true,
      paranoid: true,
      comment: '用户表',
      indexes: [
        { name: 'idx_users_username', fields: ['username'] },
        { name: 'idx_users_email', fields: ['email'] },
        { name: 'idx_users_phone', fields: ['phone'] },
        { name: 'idx_users_role', fields: ['role'] },
        { name: 'idx_users_status', fields: ['status'] },
        { name: 'idx_users_created_at', fields: ['created_at'] },
        { name: 'idx_users_deleted_at', fields: ['deleted_at'] },
      ],
    },
  );
};

export default User;
