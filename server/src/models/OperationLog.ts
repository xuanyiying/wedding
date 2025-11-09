import { Model, DataTypes, Sequelize, Optional, BelongsToGetAssociationMixin } from 'sequelize';
import User, { UserAttributes } from './User';

// Interface for OperationLog attributes
export interface OperationLogAttributes {
  id: string;
  userId: string | null;
  module: string;
  action: string;
  level: string;
  resourceType: string | null;
  resourceId: string | null;
  description: string | null;
  requestMethod: string | null;
  requestUrl: string | null;
  requestParams: object | null;
  responseStatus: number | null;
  responseData: object | null;
  errorMessage: string | null;
  stackTrace: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  executionTime: number | null;
  createdAt?: Date;
}

// Interface for OperationLog creation attributes
export interface OperationLogCreationAttributes extends Optional<OperationLogAttributes, 'id'> {}

class OperationLog
  extends Model<OperationLogAttributes, OperationLogCreationAttributes>
  implements OperationLogAttributes
{
  public id!: string;
  public userId!: string | null;
  public module!: string;
  public action!: string;
  public level!: string;
  public resourceType!: string | null;
  public resourceId!: string | null;
  public description!: string | null;
  public requestMethod!: string | null;
  public requestUrl!: string | null;
  public requestParams!: object | null;
  public responseStatus!: number | null;
  public responseData!: object | null;
  public errorMessage!: string | null;
  public stackTrace!: string | null;
  public ipAddress!: string | null;
  public userAgent!: string | null;
  public executionTime!: number | null;

  public readonly createdAt!: Date;

  // Associations
  public getUser!: BelongsToGetAssociationMixin<UserAttributes>;

  public readonly user?: UserAttributes;

  public static associations: {
    user: any;
  };
}

export const initOperationLog = (sequelize: Sequelize): void => {
  OperationLog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '日志ID',
      },
      userId: {
        type: DataTypes.UUID,
        field: 'user_id',
        comment: '操作用户ID',
      },
      module: {
        type: new DataTypes.STRING(50),
        allowNull: false,
        comment: '模块名称',
      },
      action: {
        type: new DataTypes.STRING(100),
        allowNull: false,
        comment: '操作动作',
      },
      level: {
        type: DataTypes.ENUM('INFO', 'WARN', 'ERROR', 'DEBUG'),
        allowNull: false,
        defaultValue: 'INFO',
        comment: '日志级别',
      },
      resourceType: {
        type: new DataTypes.STRING(50),
        field: 'resource_type',
        comment: '资源类型',
      },
      resourceId: {
        type: DataTypes.UUID,
        field: 'resource_id',
        comment: '资源ID',
      },
      description: {
        type: DataTypes.TEXT,
        comment: '操作描述',
      },
      requestMethod: {
        type: new DataTypes.STRING(10),
        field: 'request_method',
        comment: '请求方法',
      },
      requestUrl: {
        type: new DataTypes.STRING(500),
        field: 'request_url',
        comment: '请求URL',
      },
      requestParams: {
        type: DataTypes.JSON,
        field: 'request_params',
        comment: '请求参数',
      },
      responseStatus: {
        type: DataTypes.INTEGER,
        field: 'response_status',
        comment: '响应状态码',
      },
      responseData: {
        type: DataTypes.JSON,
        field: 'response_data',
        comment: '响应数据',
      },
      errorMessage: {
        type: DataTypes.TEXT,
        field: 'error_message',
        comment: '错误信息',
      },
      stackTrace: {
        type: DataTypes.TEXT,
        field: 'stack_trace',
        comment: '堆栈跟踪',
      },
      ipAddress: {
        type: new DataTypes.STRING(45),
        field: 'ip_address',
        comment: 'IP地址',
      },
      userAgent: {
        type: DataTypes.TEXT,
        field: 'user_agent',
        comment: '用户代理',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
        comment: '创建时间',
      },
      executionTime: {
        type: DataTypes.INTEGER,
        field: 'execution_time',
        comment: '执行时间(毫秒)',
      },
    },
    {
      tableName: 'operation_logs',
      sequelize,
      timestamps: true,
      updatedAt: false, // No updated_at field in this table
      comment: '操作日志表',
      indexes: [
        { name: 'idx_operation_logs_user_id', fields: ['user_id'] },
        { name: 'idx_operation_logs_resource', fields: ['resource_type', 'resource_id'] },
        { name: 'idx_operation_logs_created_at', fields: ['created_at'] },
      ],
    },
  );

  OperationLog.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'SET NULL',
  });
};

export default OperationLog;
