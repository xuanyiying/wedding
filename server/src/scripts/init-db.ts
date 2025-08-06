#!/usr/bin/env ts-node

import { Sequelize } from 'sequelize';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { initModels } from '@/models';
import { User , Work, Schedule } from '../models';
import { PasswordUtils } from '../utils/helpers';
import { generateId } from '@/utils/id.generator';
import { UserRole, UserStatus } from '@/interfaces';
import { EventType, ScheduleStatus, WeddingTime } from '../types';
export class DatabaseInitializer {
  private userIdMap: { [key: string]: string } = {};

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
        '张先生', '李女士', '王先生', '刘女士', '陈先生', '杨女士', '赵先生', '黄女士',
        '周先生', '吴女士', '徐先生', '孙女士', '胡先生', '朱女士', '高先生', '林女士',
        '何先生', '郭女士', '罗先生', '梁女士', '宋先生', '郑女士', '谢先生', '韩女士',
        '唐先生', '冯女士', '于先生', '董女士', '萧先生', '程女士', '曹先生', '袁女士',
        '邓先生', '许女士', '傅先生', '沈女士', '曾先生', '彭女士', '吕先生', '苏女士',
        '卢先生', '蒋女士', '蔡先生', '贾女士', '丁先生', '魏女士', '薛先生', '叶女士',
        '阎先生', '余女士', '潘先生', '杜女士', '戴先生', '夏女士', '钟先生', '汪女士',
        '田先生', '任女士', '姜先生', '范女士', '方先生', '石女士', '姚先生', '谭女士',
        '廖先生', '邹女士', '熊先生', '金女士', '陆先生', '郝女士', '孔先生', '白女士',
        '崔先生', '康女士', '毛先生', '邱女士', '秦先生', '江女士', '史先生', '顾女士',
        '侯先生', '邵女士', '孟先生', '龙女士', '万先生', '段女士', '漕先生', '钱女士',
        '汤先生', '尹女士', '黎先生', '易女士', '常先生', '武女士', '乔先生', '贺女士',
        '赖先生', '龚女士', '文先生', '庞女士', '樊先生', '兰女士', '殷先生', '施女士'
      ];
      
      // 地点池
      const locations = [
        '上海外滩W酒店', '上海半岛酒店', '上海浦东丽思卡尔顿酒店', '上海静安香格里拉大酒店',
        '上海和平饭店', '上海柏悦酒店', '上海宝格丽酒店', '上海四季酒店',
        '杭州西湖国宾馆', '杭州君悦酒店', '杭州凯悦酒店', '杭州洲际酒店',
        '苏州金鸡湖凯宾斯基大酒店', '苏州香格里拉大酒店', '苏州尼盛万丽酒店',
        '南京金陵饭店', '南京涵碧楼酒店', '南京香格里拉大酒店',
        '无锡君来洲际酒店', '无锡凯悦酒店', '常州环球港凯悦酒店',
        '青岛香格里拉大酒店', '青岛涵碧楼酒店', '烟台金海湾酒店',
        '三亚亚龙湾丽思卡尔顿酒店', '三亚海棠湾君悦酒店', '三亚文华东方酒店',
        '厦门悦华酒店', '厦门康莱德酒店', '福州香格里拉大酒店',
        '广州四季酒店', '广州丽思卡尔顿酒店', '深圳瑞吉酒店',
        '成都瑞吉酒店', '成都香格里拉大酒店', '重庆君悦酒店',
        '西安香格里拉大酒店', '西安君悦酒店', '兰州万达文华酒店',
        '北京瑞吉酒店', '北京四季酒店', '北京柏悦酒店',
        '天津丽思卡尔顿酒店', '天津四季酒店', '石家庄万达文华酒店',
        '沈阳香格里拉大酒店', '大连香格里拉大酒店', '哈尔滨香格里拉大酒店',
        '长春香格里拉大酒店', '呼和浩特香格里拉大酒店'
      ];
      
      // 备注池
      const notes = [
        '新人要求户外仪式', '需要准备鲜花拱门', '客人较多，需要扩音设备',
        '新娘有特殊要求', '需要准备红毯', '要求中式传统仪式',
        '海外客人较多，需要英文主持', '新人希望简约风格', '需要准备投影设备',
        '要求现场直播', '新人要求个性化誓词', '需要准备特殊道具',
        '客人有小朋友，需要特别安排', '新人要求音响效果佳', '需要准备签到台',
        '要求现场摄影摄像', '新人希望互动环节多', '需要准备迎宾区',
        '要求现场花艺布置', '新人希望温馨氛围', '', '', '', '', ''
      ];
      
      // 电话号码生成
      const generatePhone = () => {
        const prefixes = ['138', '139', '150', '151', '152', '158', '159', '178', '188', '189'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
        return prefix + suffix;
      };
      
      // 生成100条档期数据
      for (let i = 0; i < 100; i++) {
        // 随机日期 2025 7 1 到 2026 7 31
        const randomDate = new Date('2025-07-01');
        randomDate.setDate(randomDate.getDate() + Math.floor(Math.random() * 365));
        
        // 随机时间
        const startHour = Math.floor(Math.random() * 12) + 8; // 8-19点开始
        const duration = Math.floor(Math.random() * 6) + 2; // 2-7小时时长
        const endHour = Math.min(startHour + duration, 22);
        
        const startTime = new Date(randomDate);
        startTime.setHours(startHour, 0, 0, 0);
        
        const endTime = new Date(randomDate);
        endTime.setHours(endHour, 0, 0, 0);
        
        // 随机选择主持人
         const hostIds = [this.userIdMap.admin].filter(Boolean);
         if (hostIds.length === 0) {
           throw new Error('没有可用的主持人ID');
         }
         const userId = hostIds[Math.floor(Math.random() * hostIds.length)];
         
         // 随机事件类型
         const eventTypes: EventType[] = [EventType.WEDDING, EventType.CONSULTATION, EventType.OTHER];
         const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]!;
         
         // 随机状态
         const statuses: ScheduleStatus[] = [
           ScheduleStatus.AVAILABLE, ScheduleStatus.BOOKED, ScheduleStatus.CONFIRMED, 
           ScheduleStatus.COMPLETED, ScheduleStatus.CANCELLED, ScheduleStatus.BUSY, ScheduleStatus.VACATION
         ];
         const status = statuses[Math.floor(Math.random() * statuses.length)]!;
         
         // 根据事件类型生成标题
         let title = '';
         switch (eventType) {
           case EventType.WEDDING:
             title = '婚礼主持服务';
             break;
           case EventType.CONSULTATION:
             title = '婚礼咨询服务';
             break;
           default:
             title = '其他服务';
         }
         
         // 随机价格
         const basePrice = eventType === EventType.WEDDING ? 3000 : 
                          eventType === EventType.CONSULTATION ? 500 : 1000;
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
           updatedAt: new Date()
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
    await this.initializeSchedules();

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
 