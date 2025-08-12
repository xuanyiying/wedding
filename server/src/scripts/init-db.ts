#!/usr/bin/env ts-node

import { Sequelize } from 'sequelize';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { initModels } from '../models';
import { User, Work, Schedule, Team, TeamMember } from '../models';
import { PasswordUtils } from '../utils/helpers';
import { generateId } from '../utils/id.generator';
import { UserRole, UserStatus } from '../interfaces';
import {
  EventType,
  ScheduleStatus,
  WeddingTime,
  WorkType,
  WorkCategory,
  WorkStatus,
  TeamStatus,
  TeamMemberRole,
  TeamMemberStatus,
} from '../types';
import { initializeSystemConfig } from './init-system-config';
import sequelize from '../config/database';
export class DatabaseInitializer {
  private userIdMap: { [key: string]: string } = {};
  private teamIdMap: { [key: string]: string } = {};

  constructor(_sequelize: Sequelize) {
    // sequelize实例通过模型直接使用，不需要存储
  }

  /**
   * 初始化用户数据
   */
  async initializeUsers(): Promise<void> {
    try {
      logger.info('开始初始化用户数据...');

      // 清除现有用户数据
      await User.destroy({ where: {}, force: true });
      logger.info('已清除现有用户数据');

      // 准备初始用户数据
      const initialUsers = [
        {
          id: generateId(),
          username: 'admin',
          email: 'admin@wedding.com',
          phone: '13800138000',
          passwordHash: await PasswordUtils.hashPassword('admin123'),
          salt: 'admin_salt',
          role: UserRole.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
          realName: '系统管理员',
          nickname: 'Admin',
          bio: '系统超级管理员，负责整体系统管理和维护',
          experienceYears: 10,
          location: '北京市',
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date('2025-01-15T10:30:00Z'),
        },
        {
          id: generateId(),
          username: 'user',
          email: 'user@wedding.com',
          phone: '13800138001',
          passwordHash: await PasswordUtils.hashPassword('user123'),
          salt: 'user_salt',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          realName: '普通用户',
          nickname: 'User',
          bio: '普通用户，负责日常操作和管理',
          experienceYears: 5,
          location: '北京市',
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date('2025-01-15T10:30:00Z'),
        },
        {
          id: generateId(),
          username: 'user2',
          email: 'user2@wedding.com',
          phone: '13800138002',
          passwordHash: await PasswordUtils.hashPassword('host123'),
          salt: 'host_salt',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          realName: '婚礼主持人',
          nickname: 'Host',
          bio: '婚礼主持人，负责婚礼组织和管理',
          experienceYears: 8,
          location: '北京市',
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date('2025-01-15T10:30:00Z'),
        },
        {
          id: generateId(),
          username: 'user3',
          email: 'user3@wedding.com',
          phone: '13800138003',
          passwordHash: await PasswordUtils.hashPassword('host123'),
          salt: 'host_salt',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          realName: '婚礼主持人',
          nickname: 'Host',
          bio: '婚礼主持人，负责婚礼组织和管理',
          experienceYears: 8,
          location: '北京市',
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date('2025-01-15T10:30:00Z'),
        },
        {
          id: generateId(),
          username: 'user4',
          email: 'user4@wedding.com',
          phone: '13800138004',
          passwordHash: await PasswordUtils.hashPassword('host123'),
          salt: 'host_salt',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          realName: '婚礼主持人',
          nickname: 'Host',
          bio: '婚礼主持人，负责婚礼组织和管理',
          experienceYears: 8,
          location: '北京市',
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date('2025-01-15T10:30:00Z'),
        },
        {
          id: generateId(),
          username: 'user5',
          email: 'user5@wedding.com',
          phone: '13800138005',
          passwordHash: await PasswordUtils.hashPassword('host123'),
          salt: 'host_salt',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          realName: '婚礼主持人',
          nickname: 'Host',
          bio: '婚礼主持人，负责婚礼组织和管理',
          experienceYears: 8,
          location: '北京市',
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date('2025-01-15T10:30:00Z'),
        },
        {
          id: generateId(),
          username: 'user6',
          email: 'user6@wedding.com',
          phone: '13800138006',
          passwordHash: await PasswordUtils.hashPassword('host123'),
          salt: 'host_salt',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          realName: '婚礼主持人',
          nickname: 'Host',
          bio: '婚礼主持人，负责婚礼组织和管理',
          experienceYears: 8,
          location: '北京市',
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date('2025-01-15T10:30:00Z'),
        },
        {
          id: generateId(),
          username: 'user7',
          email: 'user7@wedding.com',
          phone: '13800138007',
          passwordHash: await PasswordUtils.hashPassword('host123'),
          salt: 'host_salt',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          realName: '婚礼主持人',
          nickname: 'Host',
          bio: '婚礼主持人，负责婚礼组织和管理',
          experienceYears: 8,
          location: '北京市',
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date('2025-01-15T10:30:00Z'),
        },
        {
          id: generateId(),
          username: 'user8@wedding.com',
          email: 'user8@wedding.com',
          phone: '13800138008',
          passwordHash: await PasswordUtils.hashPassword('host123'),
          salt: 'host_salt',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          realName: '婚礼主持人',
          nickname: 'Host',
          bio: '婚礼主持人，负责婚礼组织和管理',
          experienceYears: 8,
          location: '北京市',
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date('2025-01-15T10:30:00Z'),
        },
      ];

      // 批量插入用户数据
      const createdUsers = await User.bulkCreate(initialUsers, { returning: true });

      // 构建用户ID映射
      createdUsers.forEach(user => {
        this.userIdMap[user.username] = user.id;
      });

      logger.info(`成功插入 ${createdUsers.length} 条用户数据`);
      logger.info('用户数据初始化完成');
    } catch (error) {
      logger.error('用户数据初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化档期数据
   */
  async initializeSchedules(): Promise<void> {
    try {
      logger.info('开始初始化档期数据...');

      // 清除现有档期数据
      await Schedule.destroy({ where: {}, force: true });
      logger.info('已清除现有档期数据');

      const schedules = [];

      // 客户姓名池
      const customerNames = [
        '张先生',
        '李女士',
        '王先生',
        '刘女士',
        '陈先生',
        '杨女士',
        '赵先生',
        '黄女士',
        '周先生',
        '吴女士',
        '徐先生',
        '孙女士',
        '胡先生',
        '朱女士',
        '高先生',
        '林女士',
        '何先生',
        '郭女士',
        '罗先生',
        '梁女士',
        '宋先生',
        '郑女士',
        '谢先生',
        '韩女士',
        '唐先生',
        '冯女士',
        '于先生',
        '董女士',
        '萧先生',
        '程女士',
        '曹先生',
        '袁女士',
        '邓先生',
        '许女士',
        '傅先生',
        '沈女士',
        '曾先生',
        '彭女士',
        '吕先生',
        '苏女士',
        '卢先生',
        '蒋女士',
        '蔡先生',
        '贾女士',
        '丁先生',
        '魏女士',
        '薛先生',
        '叶女士',
        '阎先生',
        '余女士',
        '潘先生',
        '杜女士',
        '戴先生',
        '夏女士',
        '钟先生',
        '汪女士',
        '田先生',
        '任女士',
        '姜先生',
        '范女士',
        '方先生',
        '石女士',
        '姚先生',
        '谭女士',
        '廖先生',
        '邹女士',
        '熊先生',
        '金女士',
        '陆先生',
        '郝女士',
        '孔先生',
        '白女士',
        '崔先生',
        '康女士',
        '毛先生',
        '邱女士',
        '秦先生',
        '江女士',
        '史先生',
        '顾女士',
        '侯先生',
        '邵女士',
        '孟先生',
        '龙女士',
        '万先生',
        '段女士',
        '漕先生',
        '钱女士',
        '汤先生',
        '尹女士',
        '黎先生',
        '易女士',
        '常先生',
        '武女士',
        '乔先生',
        '贺女士',
        '赖先生',
        '龚女士',
        '文先生',
        '庞女士',
        '樊先生',
        '兰女士',
        '殷先生',
        '施女士',
      ];

      // 地点池
      const locations = [
        '上海外滩W酒店',
        '上海半岛酒店',
        '上海浦东丽思卡尔顿酒店',
        '上海静安香格里拉大酒店',
        '上海和平饭店',
        '上海柏悦酒店',
        '上海宝格丽酒店',
        '上海四季酒店',
        '杭州西湖国宾馆',
        '杭州君悦酒店',
        '杭州凯悦酒店',
        '杭州洲际酒店',
        '苏州金鸡湖凯宾斯基大酒店',
        '苏州香格里拉大酒店',
        '苏州尼盛万丽酒店',
        '南京金陵饭店',
        '南京涵碧楼酒店',
        '南京香格里拉大酒店',
        '无锡君来洲际酒店',
        '无锡凯悦酒店',
        '常州环球港凯悦酒店',
        '青岛香格里拉大酒店',
        '青岛涵碧楼酒店',
        '烟台金海湾酒店',
        '三亚亚龙湾丽思卡尔顿酒店',
        '三亚海棠湾君悦酒店',
        '三亚文华东方酒店',
        '厦门悦华酒店',
        '厦门康莱德酒店',
        '福州香格里拉大酒店',
        '广州四季酒店',
        '广州丽思卡尔顿酒店',
        '深圳瑞吉酒店',
        '成都瑞吉酒店',
        '成都香格里拉大酒店',
        '重庆君悦酒店',
        '西安香格里拉大酒店',
        '西安君悦酒店',
        '兰州万达文华酒店',
        '北京瑞吉酒店',
        '北京四季酒店',
        '北京柏悦酒店',
        '天津丽思卡尔顿酒店',
        '天津四季酒店',
        '石家庄万达文华酒店',
        '沈阳香格里拉大酒店',
        '大连香格里拉大酒店',
        '哈尔滨香格里拉大酒店',
        '长春香格里拉大酒店',
        '呼和浩特香格里拉大酒店',
      ];

      // 备注池
      const notes = [
        '新人要求户外仪式',
        '需要准备鲜花拱门',
        '客人较多，需要扩音设备',
        '新娘有特殊要求',
        '需要准备红毯',
        '要求中式传统仪式',
        '海外客人较多，需要英文主持',
        '新人希望简约风格',
        '需要准备投影设备',
        '要求现场直播',
        '新人要求个性化誓词',
        '需要准备特殊道具',
        '客人有小朋友，需要特别安排',
        '新人要求音响效果佳',
        '需要准备签到台',
        '要求现场摄影摄像',
        '新人希望互动环节多',
        '需要准备迎宾区',
        '要求现场花艺布置',
        '新人希望温馨氛围',
        '',
        '',
        '',
        '',
        '',
      ];

      // 电话号码生成
      const generatePhone = () => {
        const prefixes = ['138', '139', '150', '151', '152', '158', '159', '178', '188', '189'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = Math.floor(Math.random() * 100000000)
          .toString()
          .padStart(8, '0');
        return prefix + suffix;
      };

      // 生成100条档期数据
      for (let i = 0; i < 100; i++) {
        // 随机日期：当前时间向前推1个月，向后5个月（共6个月范围）
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setMonth(startDate.getMonth() - 1); // 向前推1个月
        const endDate = new Date(currentDate);
        endDate.setMonth(endDate.getMonth() + 5); // 向后推5个月

        const timeDiff = endDate.getTime() - startDate.getTime();
        const randomTime = startDate.getTime() + Math.floor(Math.random() * timeDiff);
        const randomDate = new Date(randomTime);

        // 随机时间
        const startHour = Math.floor(Math.random() * 12) + 8; // 8-19点开始
        const duration = Math.floor(Math.random() * 6) + 2; // 2-7小时时长
        const endHour = Math.min(startHour + duration, 22);

        const startTime = new Date(randomDate);
        startTime.setHours(startHour, 0, 0, 0);

        const endTime = new Date(randomDate);
        endTime.setHours(endHour, 0, 0, 0);

        // 随机选择主持人
        const hostIds = Object.values(this.userIdMap).filter(Boolean);
        if (hostIds.length === 0) {
          throw new Error('没有可用的主持人ID');
        }
        const userId = hostIds[Math.floor(Math.random() * hostIds.length)];

        // 随机事件类型
        const eventTypes: EventType[] = [EventType.WEDDING, EventType.CONSULTATION, EventType.OTHER];
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]!;

        // 随机状态
        const statuses: ScheduleStatus[] = [
          ScheduleStatus.AVAILABLE,
          ScheduleStatus.BOOKED,
          ScheduleStatus.CONFIRMED,
          ScheduleStatus.COMPLETED,
          ScheduleStatus.CANCELLED,
          ScheduleStatus.BUSY,
          ScheduleStatus.VACATION,
        ];
        const status = statuses[Math.floor(Math.random() * statuses.length)]!;

        // 根据事件类型生成标题
        let title = '';
        switch (eventType) {
          case EventType.WEDDING:
            title = '婚礼主持服务';
            break;
        }

        // 随机价格
        const basePrice = eventType === EventType.WEDDING ? 3000 : eventType === EventType.CONSULTATION ? 500 : 1000;
        const price = basePrice + Math.floor(Math.random() * 2000);

        const schedule = {
          id: generateId(),
          userId: userId!,
          customerId: null, // 设置为null，因为客户可能不是系统用户
          title,
          weddingTime: WeddingTime.LUNCH,
          weddingDate: startTime,
          location: locations[Math.floor(Math.random() * locations.length)] as string,
          eventType,
          status,
          price,
          deposit: Math.floor(price * 0.3), // 30%定金
          isPaid: false,
          customerName: customerNames[Math.floor(Math.random() * customerNames.length)] as string,
          customerPhone: generatePhone(),
          requirements: `${eventType === EventType.WEDDING ? '婚礼' : eventType === EventType.CONSULTATION ? '咨询' : '其他'}服务需求`,
          notes: notes[Math.floor(Math.random() * notes.length)] as string,
          tags: [eventType, status],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        schedules.push(schedule);
      }

      // 批量插入档期数据
      await Schedule.bulkCreate(schedules);
      logger.info(`成功插入 ${schedules.length} 条档期数据`);

      logger.info('档期数据初始化完成');
    } catch (error) {
      logger.error('档期数据初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化作品数据
   */
  async initializeWorks(): Promise<void> {
    try {
      logger.info('开始初始化作品数据...');

      // 清除现有作品数据
      await Work.destroy({ where: {}, force: true });
      logger.info('已清除现有作品数据');

      const works = [];
      const userKeys = Object.keys(this.userIdMap);
      if (userKeys.length === 0) {
        throw new Error('没有可用的用户ID');
      }

      // 作品标题池
      const workTitles = [
        '浪漫海边婚礼',
        '森林系户外婚礼',
        '复古宫廷风婚礼',
        '简约现代婚礼',
        '中式传统婚礼',
        '欧式城堡婚礼',
        '花园派对婚礼',
        '工业风loft婚礼',
        '温馨小型婚礼',
        '豪华酒店婚礼',
        '乡村田园婚礼',
        '都市天台婚礼',
        '梦幻童话婚礼',
        '艺术画廊婚礼',
        '海岛度假婚礼',
        '山顶景观婚礼',
        '订婚仪式记录',
        '求婚现场拍摄',
        '婚纱照拍摄',
        '结婚周年纪念',
        '团队建设活动',
        '企业年会记录',
        '生日派对拍摄',
        '毕业典礼记录',
      ];

      // 作品描述池
      const descriptions = [
        '这是一场充满爱意的婚礼，新人在亲朋好友的见证下许下永恒的誓言。',
        '完美的婚礼需要完美的记录，每一个瞬间都值得被珍藏。',
        '用镜头捕捉最真挚的情感，用光影诉说最美的爱情故事。',
        '专业的婚礼摄影团队，为您记录人生中最重要的时刻。',
        '从准备到仪式，从交换戒指到第一支舞，完整记录婚礼全程。',
        '唯美的画面，动人的瞬间，让爱情在镜头中永恒绽放。',
        '精心策划的婚礼现场，每一个细节都体现着新人的用心。',
        '温馨浪漫的氛围，见证两个人从此携手走过人生路。',
      ];

      // 拍摄地点池
      const locations = [
        '上海外滩',
        '杭州西湖',
        '苏州园林',
        '三亚海滩',
        '丽江古城',
        '北京故宫',
        '成都宽窄巷子',
        '厦门鼓浪屿',
        '青岛海边',
        '大理洱海',
        '西安古城墙',
        '南京中山陵',
        '重庆洪崖洞',
        '天津意式风情区',
        '深圳世界之窗',
        '广州珠江夜景',
        '武汉东湖',
        '长沙橘子洲',
        '郑州黄河风景区',
        '济南大明湖',
        '太原晋祠',
        '石家庄赵州桥',
        '呼和浩特草原',
        '银川沙湖',
        '兰州黄河铁桥',
        '西宁青海湖',
      ];

      // 标签池
      const tagOptions = [
        '婚礼摄影',
        '婚礼摄像',
        '户外婚礼',
        '室内婚礼',
        '海边婚礼',
        '森林婚礼',
        '城市婚礼',
        '乡村婚礼',
        '中式婚礼',
        '西式婚礼',
        '小清新',
        '复古风',
        '现代简约',
        '奢华风',
        '文艺范',
        '浪漫',
        '温馨',
        '唯美',
        '自然',
        '时尚',
        '经典',
        '创意',
      ];

      // 生成50条作品数据
      for (let i = 0; i < 50; i++) {
        // 随机选择用户
        const randomUserKey = userKeys[Math.floor(Math.random() * userKeys.length)];
        if (!randomUserKey) {
          continue;
        }
        const userId = this.userIdMap[randomUserKey];
        if (!userId) {
          continue;
        }

        // 随机作品类型和分类
        const types = Object.values(WorkType);
        const categories = Object.values(WorkCategory);
        const statuses = Object.values(WorkStatus);

        const type = types[Math.floor(Math.random() * types.length)]!;
        const category = categories[Math.floor(Math.random() * categories.length)]!;
        const status = statuses[Math.floor(Math.random() * statuses.length)]!;

        // 随机拍摄日期：与档期数据保持一致的时间范围
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setMonth(startDate.getMonth() - 1);
        const endDate = new Date(currentDate);
        endDate.setMonth(endDate.getMonth() + 5);

        const timeDiff = endDate.getTime() - startDate.getTime();
        const randomTime = startDate.getTime() + Math.floor(Math.random() * timeDiff);
        const shootDate = new Date(randomTime);

        // 随机选择标签（2-5个）
        const tagCount = Math.floor(Math.random() * 4) + 2;
        const selectedTags: string[] = [];
        for (let j = 0; j < tagCount; j++) {
          const tag = tagOptions[Math.floor(Math.random() * tagOptions.length)]!;
          if (!selectedTags.includes(tag)) {
            selectedTags.push(tag);
          }
        }

        // 生成内容URLs（根据类型）
        let contentUrls: string[] = [];
        let coverUrl = '';
        if (type === WorkType.IMAGE) {
          for (let k = 0; k < 4; k++) {
            contentUrls.push(`http://localhost:9000/wedding-media/images/1639df43-3cc5-410a-89d9-e799a10d07bd.png`);
          }
          coverUrl = contentUrls[0] || '';
        } else if (type === WorkType.VIDEO) {
          // 使用指定的视频URL
          contentUrls.push('http://localhost:9000/wedding-media/videos/135223ea-3678-4ea9-a9dd-fb11a9d84918.mp4');
          // 使用图片作为视频封面
          coverUrl = `http://localhost:9000/wedding-media/images/1639df43-3cc5-410a-89d9-e799a10d07bd.png`;
        } else if (type === WorkType.ALBUM) {
          for (let k = 0; k < 5; k++) {
            contentUrls.push(`http://localhost:9000/wedding-media/images/1639df43-3cc5-410a-89d9-e799a10d07bd.png`);
          }
          coverUrl = contentUrls[0] || '';
        }

        const work = {
          id: generateId(),
          userId,
          title: workTitles[Math.floor(Math.random() * workTitles.length)]!,
          description: descriptions[Math.floor(Math.random() * descriptions.length)]!,
          type,
          category,
          coverUrl: coverUrl,
          contentUrls,
          tags: selectedTags,
          location: locations[Math.floor(Math.random() * locations.length)]!,
          shootDate,
          status,
          isFeatured: Math.random() < 0.2, // 20%概率为精选
          viewCount: Math.floor(Math.random() * 1000),
          likeCount: Math.floor(Math.random() * 100),
          shareCount: Math.floor(Math.random() * 50),
          sortOrder: i,
          publishedAt: status === WorkStatus.PUBLISHED ? new Date(shootDate.getTime() + 24 * 60 * 60 * 1000) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        works.push(work);
      }

      // 批量插入作品数据
      await Work.bulkCreate(works);
      logger.info(`成功插入 ${works.length} 条作品数据`);

      logger.info('作品数据初始化完成');
    } catch (error) {
      logger.error('作品数据初始化失败:', error);
      throw error;
    }
  }

  async initializeTeams(): Promise<void> {
    try {
      logger.info('开始初始化团队数据...');

      // 清除现有团队数据
      await TeamMember.destroy({ where: {}, force: true });
      await Team.destroy({ where: {}, force: true });
      logger.info('已清除现有团队数据');

      const teams = [];
      const userIds = Object.values(this.userIdMap).filter(Boolean);
      if (userIds.length === 0) {
        throw new Error('没有可用的用户ID');
      }

      // 团队名称池
      const teamNames = [
        '梦幻婚礼团队',
        '浪漫时光工作室',
        '完美婚礼策划',
        '爱情见证者',
        '幸福时刻团队',
        '永恒记忆工作室',
        '甜蜜婚礼坊',
        '真爱无敌团队',
        '温馨婚礼屋',
        '美好时光社',
        '爱的印记工作室',
        '幸福密码团队',
      ];

      // 团队描述池
      const descriptions = [
        '专业的婚礼策划和执行团队，致力于为每对新人打造完美的婚礼。',
        '拥有丰富经验的婚礼服务团队，用心记录每一个美好瞬间。',
        '创意无限的婚礼设计团队，让您的婚礼独一无二。',
        '温馨专业的婚礼服务，为您的爱情故事增添完美篇章。',
      ];

      // 创建陆合团队和合悦团队，以及其他3个团队
      const teamConfigs = [
        { name: '陆合团队', memberCount: 3 },
        { name: '合悦团队', memberCount: 4 },
      ];

      for (let i = 0; i < 2; i++) {
        const teamId = generateId();
        const ownerId = userIds[Math.floor(Math.random() * userIds.length)]!;

        let teamName = teamNames[i] || `团队${i + 1}`;
        if (i < teamConfigs.length) {
          teamName = teamConfigs[i]!.name;
        }

        const team = {
          id: teamId,
          name: teamName,
          description: descriptions[Math.floor(Math.random() * descriptions.length)]!,
          ownerId,
          status: TeamStatus.ACTIVE,
          memberCount: 0, // 初始为0，后续会更新
          viewCount: 0,
          rating: 0,
          ratingCount: 0,
          isVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        teams.push(team);
        this.teamIdMap[team.name] = teamId;
      }

      // 批量插入团队数据
      const createdTeams = await Team.bulkCreate(teams, { returning: true });
      logger.info(`成功插入 ${createdTeams.length} 条团队数据`);

      // 为每个团队添加成员
      const teamMembers = [];

      for (let index = 0; index < createdTeams.length; index++) {
        const team = createdTeams[index]!;
        let targetMemberCount = Math.floor(Math.random() * 4) + 2; // 默认2-5个成员

        // 为特定团队设置指定的成员数量
        if (index < teamConfigs.length) {
          targetMemberCount = teamConfigs[index]!.memberCount;
        }

        const selectedUserIds = new Set<string>();
        selectedUserIds.add(team.ownerId); // 团队所有者必须是成员

        // 添加团队所有者
        teamMembers.push({
          id: generateId(),
          teamId: team.id,
          userId: team.ownerId,
          role: TeamMemberRole.OWNER,
          status: TeamMemberStatus.ACTIVE,
          joinedAt: new Date(),
          inviterId: team.ownerId, // 所有者邀请自己
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // 添加其他成员
        while (selectedUserIds.size < targetMemberCount && selectedUserIds.size < userIds.length) {
          const randomUserId = userIds[Math.floor(Math.random() * userIds.length)]!;
          if (!selectedUserIds.has(randomUserId)) {
            selectedUserIds.add(randomUserId);

            const roles = [TeamMemberRole.MEMBER, TeamMemberRole.ADMIN];
            const role = roles[Math.floor(Math.random() * roles.length)]!;

            teamMembers.push({
              id: generateId(),
              teamId: team.id,
              userId: randomUserId,
              role,
              status: TeamMemberStatus.ACTIVE,
              joinedAt: new Date(),
              inviterId: team.ownerId, // 由团队所有者邀请
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        // 更新团队成员数量
        await Team.update({ memberCount: selectedUserIds.size }, { where: { id: team.id } });
      }

      // 批量插入团队成员数据
      await TeamMember.bulkCreate(teamMembers);
      logger.info(`成功插入 ${teamMembers.length} 条团队成员数据`);

      logger.info('团队数据初始化完成');
    } catch (error) {
      logger.error('团队数据初始化失败:', error);
      throw error;
    }
  }

  /**
   * 执行完整的数据库初始化
   */
  async initialize(): Promise<void> {
    try {
      logger.info('开始数据库初始化...');

      // 先删除有外键依赖的表数据
      await Schedule.destroy({ where: {}, force: true });
      await Work.destroy({ where: {}, force: true });
      logger.info('已清除现有数据');

      await this.initializeUsers();
      await this.initializeTeams();
      await this.initializeSchedules();
      await this.initializeWorks();
      await initializeSystemConfig(sequelize);
      logger.info('数据库初始化完成');
    } catch (error) {
      logger.error('数据库初始化失败:', error);
      throw error;
    }
  }
}

/**
 * 导出初始化函数
 */
export async function initializeDatabase(sequelize: Sequelize): Promise<void> {
  const initializer = new DatabaseInitializer(sequelize);
  await initializer.initialize();
}
/**
 * 数据库初始化执行脚本
 * 使用方法: npm run init-db 或 ts-node src/scripts/run-init.ts
 */
async function main() {
  let sequelize: Sequelize | null = null;

  try {
    logger.info('正在连接数据库...');

    // 创建数据库连接
    sequelize = new Sequelize({
      dialect: 'mysql',
      host: config.database.host,
      port: config.database.port,
      username: config.database.username,
      password: config.database.password,
      database: config.database.name,
      logging: msg => logger.debug(msg),
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });

    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 清理数据库
    await sequelize.drop();
    logger.info('数据库已清理');

    // 初始化模型
    initModels(sequelize);
    logger.info('数据库模型初始化完成');

    // 同步数据库表结构
    await sequelize.sync({ force: true });
    logger.info('数据库表结构同步完成');

    // 初始化数据库数据
    await initializeDatabase(sequelize);
    logger.info('数据库数据初始化完成');

    process.exit(0);
  } catch (error) {
    logger.error('数据库初始化脚本执行失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    if (sequelize) {
      await sequelize.close();
      logger.info('数据库连接已关闭');
    }
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, _promise) => {
  logger.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', error => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

// 执行主函数
if (require.main === module) {
  main();
}

export default main;
