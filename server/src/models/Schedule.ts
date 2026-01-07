import { Model, DataTypes, Sequelize, Optional, Op } from 'sequelize';
import User from './User';
import { ScheduleStatus, TimeSlot } from '../types';
import logger from '@/utils/logger';

// Schedule attributes interface
export interface ScheduleAttributes {
  id: string;
  userId: string;
  customerId: string | null;
  customerName: string | null;
  title?: string;
  description: string | null;
  date: Date; // 婚礼日期
  timeSlot: TimeSlot; // 婚礼时间
  location: string | null; // 婚礼地点
  venueName: string | null; // 场馆名称
  venueAddress: string | null; // 场馆地址
  status: ScheduleStatus;
  price: number | null;
  deposit: number | null; // 定金
  isPaid: boolean; // 是否已结清
  customerPhone: string | null;
  requirements: string | null;
  notes: string | null;
  tags: string[] | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

// Schedule creation attributes interface
export interface ScheduleCreationAttributes extends Optional<ScheduleAttributes, 'id'> { }

// Schedule model class
class Schedule extends Model<ScheduleAttributes, ScheduleCreationAttributes> implements ScheduleAttributes {
  public id!: string;
  public userId!: string;
  public customerId!: string | null;
  public title?: string;
  public description!: string | null;
  public date!: Date; // 婚礼日期
  public timeSlot!: TimeSlot; // 婚礼时间
  public location!: string | null; // 婚礼地点
  public venueName!: string | null; // 场馆名称
  public venueAddress!: string | null; // 场馆地址
  public status!: ScheduleStatus;
  public price!: number | null; // 婚礼价格
  public deposit!: number | null; // 定金
  public isPaid!: boolean; // 是否已结清
  public customerName!: string | null;
  public customerPhone!: string | null;
  public requirements!: string | null;
  public notes!: string | null;
  public tags!: string[] | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;

  // Associations
  public readonly user?: User;

  // Static method to check for conflicting schedules
  public static async hasConflict(
    userId: string,
    date: Date,
    timeSlot: TimeSlot,
    excludeScheduleId?: string,
  ): Promise<Schedule | null> {
    // 确保只比较日期部分，忽略时间部分
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    const where: any = {
      userId,
      status: { [Op.ne]: ScheduleStatus.CANCELLED },
      date: {
        [Op.gte]: dateOnly,
        [Op.lt]: new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000) // 加一天
      },
      timeSlot: { [Op.eq]: timeSlot },
    };

    // 如果提供了excludeScheduleId，排除该档期
    if (excludeScheduleId) {
      where.id = { [Op.ne]: excludeScheduleId };
    }

    // 同一天. 相同时段冲突
    const schedule = await Schedule.findOne({
      where,
      attributes: [
        'id',
        'userId',
        'date',
        'timeSlot',
        'customerName',
      ],
    });
    logger.debug('hasConflict schedule', schedule);
    return schedule;
  }
}

export const initSchedule = (sequelize: Sequelize): void => {
  Schedule.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '日程ID',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        field: 'user_id',
        comment: '用户ID (主持人或团队成员)',
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        field: 'customer_id',
        comment: '客户ID',
      },
      title: {
        type: new DataTypes.STRING(255),
        allowNull: true,
        comment: '日程标题',
      },
      description: {
        type: DataTypes.TEXT,
        comment: '详细描述',
      },
      date: {
        type: DataTypes.DATEONLY, // 改为 DATEONLY 类型，只保存日期部分
        allowNull: false,
        field: 'date',
        comment: '婚礼日期',
      },
      timeSlot: {
        type: DataTypes.ENUM(...Object.values(TimeSlot)),
        allowNull: false,
        field: 'time_slot',
      },
      location: {
        type: new DataTypes.STRING(255),
        comment: '地点',
      },
      venueName: {
        type: new DataTypes.STRING(200),
        field: 'venue_name',
        comment: '场地名称',
      },
      venueAddress: {
        type: new DataTypes.STRING(500),
        field: 'venue_address',
        comment: '场地地址',
      },
      status: {
        type: DataTypes.ENUM(...Object.values(ScheduleStatus)),
        allowNull: false,
        defaultValue: ScheduleStatus.AVAILABLE,
        comment: '日程状态',
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        comment: '价格',
        field: 'price',
      },
      deposit: {
        type: DataTypes.DECIMAL(10, 2),
        comment: '定金',
        field: 'deposit',
      },
      customerName: {
        type: new DataTypes.STRING(100),
        field: 'customer_name',
        comment: '客户姓名',
      },
      customerPhone: {
        type: new DataTypes.STRING(20),
        field: 'customer_phone',
        comment: '客户电话',
      },
      isPaid: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '是否已结清',
        field: 'is_paid',
      },
      requirements: {
        type: DataTypes.TEXT,
        comment: '特殊要求',
      },
      notes: {
        type: DataTypes.TEXT,
        comment: '备注',
      },
      tags: {
        type: DataTypes.JSON,
        comment: '标签',
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at',
        comment: '创建时间',
      },
      updatedAt: {
        type: DataTypes.DATE,
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
      tableName: 'schedules',
      sequelize,
      timestamps: true,
      paranoid: true,
      comment: '日程表',
      indexes: [
        { name: 'idx_schedules_user_id_date', fields: ['user_id', 'date'] },
        { name: 'idx_schedules_customer_id', fields: ['customer_id'] },
        { name: 'idx_schedules_date_time_slot', fields: ['date', 'time_slot'] },
        { name: 'idx_schedules_deleted_at', fields: ['deleted_at'] },
      ],
    },
  );

  Schedule.belongsTo(User, { as: 'user', foreignKey: 'userId' });
  Schedule.belongsTo(User, { as: 'customer', foreignKey: 'customerId' });
};
export default Schedule;