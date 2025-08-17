import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

// Contact 属性接口
export interface ContactAttributes {
  id: string;
  name: string;
  phone: string;
  email: string;
  weddingDate: string;
  weddingTime: string;
  location: string;
  guestCount: number;
  serviceType: 'wedding' | 'engagement' | 'anniversary' | 'other';
  budget: '5000-10000' | '10000-20000' | '20000-50000' | '50000+';
  requirements?: string;
  status: 'pending' | 'contacted' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 创建时可选的属性
interface ContactCreationAttributes
  extends Optional<ContactAttributes, 'id' | 'requirements' | 'notes' | 'createdAt' | 'updatedAt'> {}

// Contact 模型类
export class Contact extends Model<ContactAttributes, ContactCreationAttributes> implements ContactAttributes {
  public id!: string;
  public name!: string;
  public phone!: string;
  public email!: string;
  public weddingDate!: string;
  public weddingTime!: string;
  public location!: string;
  public guestCount!: number;
  public serviceType!: 'wedding' | 'engagement' | 'anniversary' | 'other';
  public budget!: '5000-10000' | '10000-20000' | '20000-50000' | '50000+';
  public requirements?: string;
  public status!: 'pending' | 'contacted' | 'completed' | 'cancelled';
  public notes?: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}
export const initContact = (sequelize: Sequelize): void => {
  // 初始化模型
  Contact.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '联系人姓名',
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: '联系电话',
        validate: {
          is: /^1[3-9]\d{9}$/,
        },
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '邮箱地址',
        validate: {
          isEmail: true,
        },
      },
      weddingDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: '婚礼日期',
        field: 'wedding_date',
      },
      weddingTime: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: '婚礼时间',
        field: 'wedding_time',
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '婚礼地点',
        field: 'location',
      },
      guestCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '宾客人数',
        validate: {
          min: 1,
        },
        field: 'guest_count',
      },
      serviceType: {
        type: DataTypes.ENUM('wedding', 'engagement', 'anniversary', 'other'),
        allowNull: false,
        comment: '服务类型',
        field: 'service_type',
      },
      budget: {
        type: DataTypes.ENUM('5000-10000', '10000-20000', '20000-50000', '50000+'),
        allowNull: false,
        comment: '预算范围',
        field: 'budget',
      },
      requirements: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '特殊要求',
      },
      status: {
        type: DataTypes.ENUM('pending', 'contacted', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        comment: '处理状态',
        field: 'status',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '管理员备注',
        field: 'notes',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: '创建时间',
        field: 'created_at',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: '更新时间',
        field: 'updated_at',
      },
    },
    {
      sequelize,
      modelName: 'Contact',
      tableName: 'contacts',
      timestamps: true,
      paranoid: false, // 不启用软删除
      indexes: [
        { name: 'idx_contacts_phone', fields: ['phone'] },
        { name: 'idx_contacts_email', fields: ['email'] },
      ],
      comment: '联系表单表',
    },
  );
};
export default Contact;
