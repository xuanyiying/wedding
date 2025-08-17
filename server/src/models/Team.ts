import { DataTypes, Model, Optional, Association, Sequelize } from 'sequelize';
import User from './User';
import { TeamMemberRole, TeamMemberStatus, TeamStatus } from '../types';

// 团队属性接口
export interface TeamAttributes {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  background?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactWechat?: string;
  contactQq?: string;
  address?: string;
  serviceAreas?: string; // JSON格式存储服务区域
  specialties?: string; // JSON格式存储专业特长
  priceRange?: string;
  ownerId: string;
  memberCount: number;
  status: TeamStatus; // 0:禁用 1:正常 2:待审核
  viewCount: number;
  rating: number;
  ratingCount: number;
  establishedAt?: Date; // 成立时间
  // 团队扩展信息
  scale?: string; // 团队规模
  achievements?: string; // 团队成就，JSON格式
  certifications?: string; // 团队资质，JSON格式
  equipmentList?: string; // 设备清单，JSON格式
  servicePackages?: string; // 服务套餐，JSON格式
  workingHours?: string; // 工作时间
  emergencyContact?: string; // 紧急联系人
  emergencyPhone?: string; // 紧急联系电话
  bankAccount?: string; // 对公账户
  taxNumber?: string; // 税号
  legalRepresentative?: string; // 法人代表
  registrationAddress?: string; // 注册地址
  operatingAddress?: string; // 经营地址
  isVerified: boolean; // 是否认证
  businessLicense?: string; // 营业执照
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// 创建团队时的可选属性
export interface TeamCreationAttributes
  extends Optional<TeamAttributes, 'id' | 'createdAt' | 'updatedAt' | 'isVerified'> {}

// 团队成员属性接口
export interface TeamMemberAttributes {
  id: string;
  teamId: string;
  userId: string;
  role: TeamMemberRole; // 1:成员 2:管理员 3:所有者
  joinedAt: Date | null;
  status: TeamMemberStatus; // 0:禁用 1:正常 2:待审核
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  inviterId: string;
}

// 创建团队成员时的可选属性
export interface TeamMemberCreationAttributes
  extends Optional<TeamMemberAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// 团队模型类
export class Team extends Model<TeamAttributes, TeamCreationAttributes> implements TeamAttributes {
  public id!: string;
  public name!: string;
  public description?: string;
  public avatar?: string;
  public background?: string;
  public contactPhone?: string;
  public contactEmail?: string;
  public contactWechat?: string;
  public contactQq?: string;
  public address?: string;
  public serviceAreas?: string;
  public specialties?: string;
  public priceRange?: string;
  public ownerId!: string;
  public memberCount!: number;
  public status!: TeamStatus;
  public viewCount!: number;
  public rating!: number;
  public ratingCount!: number;
  public establishedAt?: Date;
  public scale?: string;
  public achievements?: string;
  public certifications?: string;
  public equipmentList?: string;
  public servicePackages?: string;
  public workingHours?: string;
  public emergencyContact?: string;
  public emergencyPhone?: string;
  public bankAccount?: string;
  public taxNumber?: string;
  public legalRepresentative?: string;
  public registrationAddress?: string;
  public operatingAddress?: string;
  public isVerified!: boolean;
  public businessLicense?: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt?: Date;

  // 关联关系
  public static associations: {
    owner: Association<Team, User>;
    members: Association<Team, any>;
    schedules: Association<Team, any>;
    works: Association<Team, any>;
  };

  // 实例方法：检查团队状态
  public isActive(): boolean {
    return this.status === TeamStatus.ACTIVE;
  }

  // 实例方法：增加访问量
  public async incrementViewCount(): Promise<void> {
    this.viewCount += 1;
    await this.save();
  }

  // 实例方法：更新评分
  public async updateRating(newRating: number): Promise<void> {
    const totalRating = this.rating * this.ratingCount + newRating;
    this.ratingCount += 1;
    this.rating = totalRating / this.ratingCount;
    await this.save();
  }

  // 实例方法：获取服务区域数组
  public getServiceAreas(): string[] {
    return this.serviceAreas ? JSON.parse(this.serviceAreas) : [];
  }

  // 实例方法：获取专业特长数组
  public getSpecialties(): string[] {
    return this.specialties ? JSON.parse(this.specialties) : [];
  }

  // 实例方法：获取团队成就数组
  public getAchievements(): any[] {
    return this.achievements ? JSON.parse(this.achievements) : [];
  }

  // 实例方法：获取团队资质数组
  public getCertifications(): any[] {
    return this.certifications ? JSON.parse(this.certifications) : [];
  }

  // 实例方法：获取设备清单数组
  public getEquipmentList(): any[] {
    return this.equipmentList ? JSON.parse(this.equipmentList) : [];
  }

  // 实例方法：获取服务套餐数组
  public getServicePackages(): any[] {
    return this.servicePackages ? JSON.parse(this.servicePackages) : [];
  }

  // 实例方法：获取工作时间对象
  public getWorkingHours(): any {
    return this.workingHours ? JSON.parse(this.workingHours) : {};
  }

  // 实例方法：获取团队状态文本
  public getTeamStatusText(): string {
    const typeMap: { [key in TeamStatus]: string } = {
      [TeamStatus.DISABLED]: '禁用',
      [TeamStatus.ACTIVE]: '正常',
      [TeamStatus.PENDING]: '待审核',
    };
    return typeMap[this.status] || '未知类型';
  }

  // 实例方法：更新成员数量
  public async updateMemberCount(): Promise<void> {
    const count = await TeamMember.count({
      where: {
        teamId: this.id,
        status: TeamMemberStatus.ACTIVE,
      },
    });
    this.memberCount = count;
    await this.save();
  }

  // 静态方法：搜索团队
  public static async searchTeams(params: {
    keyword?: string;
    location?: string;
    priceRange?: string;
    specialties?: string[];
    page?: number;
    limit?: number;
  }): Promise<{ teams: Team[]; total: number }> {
    const { Op } = require('sequelize');
    const { keyword, location, priceRange, specialties, page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;

    const where: any = {
      status: TeamStatus.ACTIVE, // 正常状态
    };

    if (keyword) {
      where[Op.or] = [{ name: { [Op.like]: `%${keyword}%` } }, { description: { [Op.like]: `%${keyword}%` } }];
    }

    if (location) {
      where[Op.or] = [{ address: { [Op.like]: `%${location}%` } }, { serviceAreas: { [Op.like]: `%${location}%` } }];
    }

    if (priceRange) {
      where.priceRange = priceRange;
    }

    if (specialties && specialties.length > 0) {
      where.specialties = {
        [Op.and]: specialties.map(specialty => ({
          [Op.like]: `%${specialty}%`,
        })),
      };
    }

    const { count, rows } = await Team.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'realName', 'nickname', 'avatarUrl'],
        },
      ],
      order: [
        ['rating', 'DESC'],
        ['viewCount', 'DESC'],
      ],
      limit,
      offset,
    });

    return { teams: rows, total: count };
  }

  // 静态方法：获取热门团队
  public static async getPopularTeams(limit: number = 10): Promise<Team[]> {
    return await Team.findAll({
      where: {
        status: TeamStatus.ACTIVE,
      },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'nickname', 'avatarUrl'],
        },
      ],
      order: [
        ['rating', 'DESC'],
        ['viewCount', 'DESC'],
      ],
      limit,
    });
  }

  // 静态方法：获取团队统计信息
  public static async getTeamStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    banned: number;
  }> {
    const [total, active, inactive, banned] = await Promise.all([
      Team.count(),
      Team.count({ where: { status: TeamStatus.ACTIVE } }),
      Team.count({ where: { status: TeamStatus.PENDING } }),
      Team.count({ where: { status: TeamStatus.DISABLED } }),
    ]);

    return { total, active, inactive, banned };
  }
}

// 团队成员模型类
class TeamMember extends Model<TeamMemberAttributes, TeamMemberCreationAttributes> implements TeamMemberAttributes {
  public id!: string;
  public teamId!: string;
  public userId!: string;
  public role!: TeamMemberRole;
  public joinedAt!: Date;
  public status!: TeamMemberStatus;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt?: Date;
  public inviterId!: string;

  // 关联关系
  public static associations: {
    team: Association<TeamMember, Team>;
    user: Association<TeamMember, User>;
  };

  // 实例方法：检查是否为所有者
  public isOwner(): boolean {
    return this.role === TeamMemberRole.OWNER;
  }

  // 实例方法：检查是否为管理员
  public isAdmin(): boolean {
    return this.role === TeamMemberRole.ADMIN;
  }

  // 静态方法：获取团队成员列表
  public static async getTeamMembers(
    teamId: number,
    params: {
      role?: TeamMemberRole;
      status?: TeamMemberStatus;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ members: TeamMember[]; total: number }> {
    const { role, status = TeamMemberStatus.ACTIVE, page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    const where: any = {
      teamId,
      status,
    };

    if (role !== undefined) {
      where.role = role;
    }

    const { count, rows } = await TeamMember.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'nickname', 'avatarUrl', 'profession'],
        },
      ],
      order: [
        ['role', 'DESC'],
        ['joinedAt', 'ASC'],
      ],
      limit,
      offset,
    });

    return { members: rows, total: count };
  }
  // 静态方法：检查用户是否为团队成员
  public static async isTeamMember(teamId: number, userId: number): Promise<boolean> {
    const member = await TeamMember.findOne({
      where: {
        teamId,
        userId,
      },
    });
    return member !== null;
  }
  // 静态方法：检查用户是否为团队成员
  public static async isMember(teamId: number, userId: number): Promise<boolean> {
    const member = await TeamMember.findOne({
      where: {
        teamId,
        userId,
        status: TeamMemberStatus.ACTIVE,
      },
    });
    return !!member;
  }

  // 静态方法：获取用户在团队中的角色
  public static async getUserRole(teamId: number, userId: number): Promise<TeamMemberRole | null> {
    const member = await TeamMember.findOne({
      where: {
        teamId,
        userId,
        status: TeamMemberStatus.ACTIVE,
      },
    });
    return member ? member.role : null;
  }
}

// 导出TeamMember类
export { TeamMember };

// 初始化函数
export const initTeam = (sequelizeInstance: Sequelize): void => {
  // 先初始化TeamMember模型
  TeamMember.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      teamId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'team_id',
        references: {
          model: 'teams',
          key: 'id',
        },
        comment: '团队ID',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
          model: 'users',
          key: 'id',
        },
      },
      role: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: TeamMemberRole.MEMBER,
        validate: {
          isIn: [[TeamMemberRole.MEMBER, TeamMemberRole.ADMIN, TeamMemberRole.OWNER]],
        },
        comment: '角色: 1-成员 2-管理员 3-所有者',
      },
      joinedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'joined_at',
      },
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: TeamMemberStatus.ACTIVE,
        validate: {
          isIn: [[TeamMemberStatus.INACTIVE, TeamMemberStatus.ACTIVE, TeamMemberStatus.PENDING]],
        },
        comment: '状态: 0-禁用 1-正常 2-待审核',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
      },
      inviterId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'inviter_id',
        references: {
          model: 'users',
          key: 'id',
        },
      },
    },
    {
      sequelize: sequelizeInstance,
      modelName: 'TeamMember',
      tableName: 'team_members',
      timestamps: true,
      paranoid: true,
      indexes: [
        {
          fields: ['team_id'],
        },
        {
          fields: ['user_id'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['role'],
        },
        {
          unique: true,
          fields: ['team_id', 'user_id'],
        },
      ],
    },
  );

  // 然后初始化Team模型
  Team.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          len: [2, 100],
        },
        comment: '团队名称',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '团队描述',
      },
      avatar: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'avatar',
        comment: '团队头像',
      },
      background: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'background',
      },
      contactPhone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'contact_phone',
      },
      contactEmail: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'contact_email',
        validate: {
          isEmail: true,
        },
      },
      contactWechat: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'contact_wechat',
      },
      contactQq: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'contact_qq',
      },
      address: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      serviceAreas: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'service_areas',
        comment: 'JSON格式存储服务区域数组',
      },
      specialties: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'specialties',
        comment: 'JSON格式存储专业特长数组',
      },
      priceRange: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'price_range',
      },
      ownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'owner_id',
        references: {
          model: 'users',
          key: 'id',
        },
        comment: '团队所有者ID',
      },
      memberCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'member_count',
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: TeamStatus.ACTIVE,
        validate: {
          isIn: [[TeamStatus.DISABLED, TeamStatus.ACTIVE, TeamStatus.PENDING]],
        },
        comment: '状态: disabled-禁用 active-正常 pending-待审核',
        field: 'status',
      },
      viewCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'view_count',
      },
      rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 5,
        },
        comment: '团队评级',
        field: 'rating',
      },
      ratingCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'rating_count',
      },
      establishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'established_at',
      },
      scale: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '团队规模',
      },
      achievements: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '团队成就，JSON格式',
      },
      certifications: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '团队资质，JSON格式',
      },
      equipmentList: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'equipment_list',
        comment: '设备清单，JSON格式',
      },
      servicePackages: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'service_packages',
        comment: '服务套餐，JSON格式',
      },
      workingHours: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'working_hours',
        comment: '工作时间',
      },
      emergencyContact: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'emergency_contact',
        comment: '紧急联系人',
      },
      emergencyPhone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'emergency_phone',
        comment: '紧急联系电话',
      },
      bankAccount: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'bank_account',
        comment: '对公账户',
      },
      taxNumber: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'tax_number',
        comment: '税号',
      },
      legalRepresentative: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'legal_representative',
        comment: '法人代表',
      },
      registrationAddress: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: 'registration_address',
        comment: '注册地址',
      },
      operatingAddress: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: 'operating_address',
        comment: '经营地址',
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已认证',
        field: 'is_verified',
      },
      businessLicense: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'business_license',
        comment: '营业执照',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
      },
    },
    {
      sequelize: sequelizeInstance,
      modelName: 'Team',
      tableName: 'teams',
      timestamps: true,
      paranoid: true,
      indexes: [
        { name: 'idx_teams_owner_id', fields: ['owner_id'] },
        { name: 'idx_teams_status', fields: ['status'] },
        { name: 'idx_teams_rating', fields: ['rating'] },
        { name: 'idx_teams_view_count', fields: ['view_count'] },
        { name: 'idx_teams_created_at', fields: ['created_at'] },
      ],
    },
  );

  // 设置模型关联
  TeamMember.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  // 与User模型的关联需要在User模型初始化后设置
  // 这些关联将在models/index.ts中的initModels函数中设置
};
