import { Team, TeamMember } from '../models/Team';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';
import { User } from '../models';
import { TeamMemberRole, TeamMemberStatus, TeamStatus } from '../types';

export class TeamService {
  static async getTeamsByUserId(userId: string): Promise<Team[]> {
    return Team.findAll({
      where: await (async () => {
        const teamMemberIds = await TeamMember.findAll({
          where: {
            userId,
            role: TeamMemberRole.OWNER,
          },
          attributes: ['teamId'],
        }).then(members => members.map(member => member.teamId));

        return {
          [Op.or]: [{ ownerId: userId }, { id: { [Op.in]: teamMemberIds } }],
        };
      })(),
    });
  }
  /**
   * 创建团队
   */
  static async createTeam(teamData: {
    name: string;
    description?: string;
    ownerId: string;
    contactPhone?: string;
    contactEmail?: string;
    address?: string;
    serviceAreas?: string[];
    specialties?: string[];
    establishedYear?: number;
  }) {
    try {
      const { serviceAreas, specialties, establishedYear, ...otherData } = teamData;

      const team = await Team.create({
        ...otherData,
        ...(establishedYear && { establishedAt: new Date(establishedYear, 0, 1) }),
        serviceAreas: serviceAreas ? JSON.stringify(serviceAreas) : '',
        specialties: specialties ? JSON.stringify(specialties) : '',
        status: TeamStatus.ACTIVE,
        memberCount: 0,
        viewCount: 0,
        rating: 0,
        ratingCount: 0,
        isVerified: false,
      });

      // 创建团队所有者成员记录
      await TeamMember.create({
        teamId: team.id,
        userId: teamData.ownerId,
        role: TeamMemberRole.OWNER,
        status: TeamMemberStatus.ACTIVE,
        inviterId: teamData.ownerId,
        joinedAt: new Date(),
      });

      return team;
    } catch (error) {
      logger.error('创建团队失败:', error);
      throw error;
    }
  }

  /**
   * 获取团队列表
   */
  static async getTeams({
    page = 1,
    limit = 10,
    search,
    status,
  }: {
    page?: number;
    limit?: number;
    search?: string;
    status?: TeamStatus;
  }) {
    try {
      const offset = (page - 1) * limit;
      const where: any = {};

      // 搜索条件
      if (search) {
        where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { description: { [Op.like]: `%${search}%` } }];
      }

      // 状态筛选
      if (status) {
        where.status = status;
      }

      const { count, rows } = await Team.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'realName', 'nickname', 'email'],
          },
        ],
      });
      // 批量获取团队成员数量，避免N+1查询问题
      const teamIds = rows.map(team => team.id);
      const memberCounts = await TeamMember.findAll({
        where: {
          teamId: { [Op.in]: teamIds },
        },
        attributes: [
          'teamId',
          [sequelize.fn('COUNT', sequelize.col('id')), 'memberCount'],
          [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "ACTIVE" THEN 1 END')), 'activeMemberCount'],
        ],
        group: ['teamId'],
        raw: true,
      });

      // 创建成员数量映射
      const memberCountMap = new Map();
      memberCounts.forEach((item: any) => {
        memberCountMap.set(item.teamId, {
          memberCount: parseInt(item.memberCount) || 0,
          activeMemberCount: parseInt(item.activeMemberCount) || 0,
        });
      });

      // 为每个团队设置成员数量
      rows.forEach(team => {
        const counts = memberCountMap.get(team.id) || { memberCount: 0, activeMemberCount: 0 };
        team.memberCount = counts.memberCount;
        team.rating = 0; // 暂时设为0，后续可以实现真实的评分逻辑
        team.ratingCount = counts.activeMemberCount;
        team.viewCount = 0; // 暂时设为0，后续可以实现浏览量统计
      });
      // 序列化团队数据，转换JSON字段为数组
      const serializedTeams = rows.map(team => ({
        ...team.toJSON(),
        serviceAreas: team.getServiceAreas(),
        specialties: team.getSpecialties(),
        achievements: team.getAchievements(),
        certifications: team.getCertifications(),
        equipmentList: team.getEquipmentList(),
        servicePackages: team.getServicePackages(),
        workingHours: team.getWorkingHours(),
      }));

      return {
        teams: serializedTeams,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      };
    } catch (error) {
      logger.error('获取团队列表失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取团队详情
   */
  static async getTeamById(id: string) {
    try {
      const team = await Team.findByPk(id, {
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'realName', 'nickname', 'email', 'username'],
          },
        ],
      });

      if (!team) {
        throw new Error('团队不存在');
      }
      team.memberCount = await TeamMember.count({
        where: {
          teamId: id,
        },
      });
      team.rating = await TeamMember.count({
        where: {
          teamId: id,
          status: TeamMemberStatus.ACTIVE,
        },
      });
      team.ratingCount = await TeamMember.count({
        where: {
          teamId: id,
        },
      });
      // 序列化团队数据，转换JSON字段为数组
      const serializedTeam = {
        ...team.toJSON(),
        serviceAreas: team.getServiceAreas(),
        specialties: team.getSpecialties(),
        achievements: team.getAchievements(),
        certifications: team.getCertifications(),
        equipmentList: team.getEquipmentList(),
        servicePackages: team.getServicePackages(),
        workingHours: team.getWorkingHours(),
      };

      logger.info('获取团队详情成功:', serializedTeam);
      return serializedTeam;
    } catch (error) {
      logger.error('获取团队详情失败:', error);
      throw error;
    }
  }

  /**
   * 更新团队信息
   */
  static async updateTeam(
    id: string,
    teamData: Partial<{
      name: string;
      description: string;
      contactPhone: string;
      contactEmail: string;
      address: string;
      serviceAreas: string[];
      specialties: string[];
      status: TeamStatus;
    }>,
  ) {
    try {
      const team = await Team.findByPk(id);
      if (!team) {
        throw new Error('团队不存在');
      }

      const { serviceAreas, specialties, ...otherData } = teamData;
      const updateData: any = { ...otherData };

      if (serviceAreas) {
        updateData.serviceAreas = JSON.stringify(serviceAreas);
      }
      if (specialties) {
        updateData.specialties = JSON.stringify(specialties);
      }

      await team.update(updateData);
      await team.reload();

      return team;
    } catch (error) {
      logger.error('更新团队信息失败:', error);
      throw error;
    }
  }

  /**
   * 删除团队
   */
  static async deleteTeam(id: string) {
    try {
      const team = await Team.findByPk(id);
      if (!team) {
        throw new Error('团队不存在');
      }

      // 删除所有团队成员
      await TeamMember.destroy({
        where: { teamId: id },
      });

      // 删除团队
      await team.destroy();
      return true;
    } catch (error) {
      logger.error('删除团队失败:', error);
      throw error;
    }
  }
  static async updateTeamMember(id: string, memberData: Partial<TeamMember>) {
    try {
      const member = await TeamMember.findByPk(id);
      if (!member) {
        throw new Error('团队成员不存在');
      }
      await member.update(memberData);
      return member;
    } catch (error) {
      logger.error('更新团队成员失败:', error);
      throw error;
    }
  }
  /**
   * 获取团队成员列表（分页）
   */
  static async getTeamMembers({
    page = 1,
    limit = 10,
    search,
    role = null,
    status = TeamMemberStatus.ACTIVE,
    teamId,
  }: {
    page?: number;
    limit?: number;
    search?: string;
    role?: TeamMemberRole | null;
    status?: TeamMemberStatus | null;
    teamId: string;
  }) {
    try {
      const offset = (page - 1) * limit;
      const where: any = {};
      if (teamId) {
        where.teamId = teamId;
      }
      // 搜索条件
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { position: { [Op.like]: `%${search}%` } },
        ];
      }

      // 角色筛选
      if (role) {
        where.role = role;
      }

      // 状态筛选
      if (status) {
        where.status = status;
      }

      const { count, rows } = await TeamMember.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'realName', 'nickname', 'email', 'avatarUrl', 'phone'],
          },
        ],
      });

      return {
        members: rows,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      };
    } catch (error) {
      logger.error('获取团队成员列表失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取团队成员详情
   */
  static async getTeamMemberById(id: string) {
    try {
      const member = await TeamMember.findByPk(id);

      if (!member) {
        throw new Error('团队成员不存在');
      }

      return member;
    } catch (error) {
      logger.error('获取团队成员详情失败:', error);
      throw error;
    }
  }

  /**
   * 获取可邀请的用户列表（排除已在团队中的用户）
   */
  static async getAvailableUsers({
    teamId,
    page = 1,
    limit = 10,
    search,
  }: {
    teamId: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    try {
      const offset = (page - 1) * limit;

      // 获取已在团队中的用户ID列表
      const existingMemberIds = await TeamMember.findAll({
        where: { teamId },
        attributes: ['userId'],
        raw: true,
      }).then(members => members.map(m => m.userId));

      logger.info('已存在团队成员ID列表:', existingMemberIds);
      const where: any = {
        id: { [Op.notIn]: existingMemberIds },
      };

      // 搜索条件
      if (search) {
        where[Op.or] = [
          { realName: { [Op.like]: `%${search}%` } },
          { nickname: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ];
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        limit,
        offset,
        attributes: ['id', 'realName', 'nickname', 'email', 'avatarUrl', 'role'],
        order: [['createdAt', 'DESC']],
      });

      return {
        users: rows,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      };
    } catch (error) {
      logger.error('获取可邀请用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 邀请团队成员（支持批量邀请）
   */
  static async inviteTeamMember(memberData: {
    userIds: string[];
    teamId: string;
    role?: TeamMemberRole;
    inviterId: string;
  }) {
    try {
      const { userIds, teamId, role = TeamMemberRole.MEMBER, inviterId } = memberData;

      // 验证团队是否存在
      const team = await Team.findByPk(teamId);
      if (!team) {
        throw new Error('团队不存在');
      }

      // 验证用户是否存在
      const users = await User.findAll({
        where: { id: { [Op.in]: userIds } },
      });

      if (users.length !== userIds.length) {
        throw new Error('部分用户不存在');
      }

      // 检查是否有用户已在团队中
      const existingMembers = await TeamMember.findAll({
        where: {
          teamId,
          userId: { [Op.in]: userIds },
        },
      });

      if (existingMembers.length > 0) {
        throw new Error('部分用户已在团队中');
      }

      // 批量创建团队成员
      const members = await TeamMember.bulkCreate(
        userIds.map(userId => ({
          userId,
          teamId,
          role,
          status: TeamMemberStatus.ACTIVE,
          inviterId,
          joinedAt: new Date(),
        })),
      );

      return members;
    } catch (error) {
      logger.error('邀请团队成员失败:', error);
      throw error;
    }
  }

  /**
   * 删除团队成员
   */
  static async deleteTeamMember(id: string) {
    try {
      const member = await TeamMember.findByPk(id);
      if (!member) {
        throw new Error('团队成员不存在');
      }

      await member.destroy();
      return true;
    } catch (error) {
      logger.error('删除团队成员失败:', error);
      throw error;
    }
  }

  /**
   * 批量删除团队成员
   */
  static async batchDeleteTeamMembers(ids: string[]) {
    try {
      const deletedCount = await TeamMember.destroy({
        where: {
          id: { [Op.in]: ids },
        },
      });

      return { deletedCount };
    } catch (error) {
      logger.error('批量删除团队成员失败:', error);
      throw error;
    }
  }

  /**
   * 更新团队成员状态
   */
  static async updateTeamMemberStatus(id: string, status: TeamMemberStatus, terminationDate?: string) {
    try {
      const member = await TeamMember.findByPk(id);
      if (!member) {
        throw new Error('团队成员不存在');
      }

      const updateData: any = { status };
      if (status === TeamMemberStatus.INACTIVE && terminationDate) {
        updateData.terminationDate = new Date(terminationDate);
      } else if (status === TeamMemberStatus.ACTIVE) {
        updateData.terminationDate = null;
      }

      await member.update(updateData);
      await member.reload();

      return member;
    } catch (error) {
      logger.error('更新团队成员状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取团队统计信息
   */
  static async getTeamStats(startDate: string, endDate: string) {
    try {
      const totalMembers = await TeamMember.count();
      const activeMembers = await TeamMember.count({
        where: { status: TeamMemberStatus.ACTIVE },
      });
      const inactiveMembers = await TeamMember.count({
        where: { status: TeamMemberStatus.INACTIVE, createdAt: { [Op.between]: [startDate, endDate] } },
      });
      const disabledMembers = await TeamMember.count({
        where: { status: TeamMemberStatus.INACTIVE, createdAt: { [Op.between]: [startDate, endDate] } },
      });

      // 按角色统计
      const roleStats = await TeamMember.findAll({
        attributes: ['role', [TeamMember.sequelize!.fn('COUNT', TeamMember.sequelize!.col('id')), 'count']],
        group: ['role'],
        raw: true,
      });

      return {
        totalMembers,
        activeMembers,
        inactiveMembers,
        disabledMembers,
        roleStats,
      };
    } catch (error) {
      logger.error('获取团队统计信息失败:', error);
      throw error;
    }
  }
}
