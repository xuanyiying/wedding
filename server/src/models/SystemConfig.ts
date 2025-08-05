import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

// Enum for ConfigType
export enum ConfigType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  TEXT = 'text',
}

// Interface for SystemConfig attributes
export interface SystemConfigAttributes {
  id: string;
  configKey: string;
  configValue: string | null;
  defaultValue: string | null;
  configType: ConfigType;
  category: string;
  description: string | null;
  validationRule: string | null;
  isPublic: boolean;
  isEditable: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface for SystemConfig creation attributes
export interface SystemConfigCreationAttributes extends Optional<SystemConfigAttributes, 'id'> {}

class SystemConfig
  extends Model<SystemConfigAttributes, SystemConfigCreationAttributes>
  implements SystemConfigAttributes
{
  public id!: string;
  public configKey!: string;
  public configValue!: string | null;
  public defaultValue!: string | null;
  public configType!: ConfigType;
  public category!: string;
  public description!: string | null;
  public validationRule!: string | null;
  public isPublic!: boolean;
  public isEditable!: boolean;
  public sortOrder!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Method to get parsed value
  public getParsedValue(): any {
    if (this.configValue === null) {
      return null;
    }
    switch (this.configType) {
      case ConfigType.NUMBER:
        return Number(this.configValue);
      case ConfigType.BOOLEAN:
        return this.configValue === 'true';
      case ConfigType.JSON:
        try {
          return JSON.parse(this.configValue);
        } catch (error) {
          return null;
        }
      default:
        return this.configValue;
    }
  }

  // Static method to find by key
  public static async findByKey(key: string): Promise<SystemConfig | null> {
    return this.findOne({ where: { configKey: key } });
  }

  // Static method to get all public configs
  public static async getPublicConfigs(): Promise<SystemConfig[]> {
    return this.findAll({ where: { isPublic: true } });
  }
}

export const initSystemConfig = (sequelize: Sequelize): void => {
  SystemConfig.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '配置ID',
      },
      configKey: {
        type: new DataTypes.STRING(100),
        unique: true,
        allowNull: false,
        field: 'config_key',
        comment: '配置键',
      },
      configValue: {
        type: DataTypes.TEXT,
        field: 'config_value',
        comment: '配置值',
      },
      defaultValue: {
        type: DataTypes.TEXT,
        field: 'default_value',
        comment: '默认值',
      },
      configType: {
        type: DataTypes.ENUM(...Object.values(ConfigType)),
        allowNull: false,
        defaultValue: ConfigType.STRING,
        field: 'config_type',
        comment: '配置类型',
      },
      category: {
        type: new DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'general',
        comment: '配置分类',
      },
      description: {
        type: new DataTypes.STRING(500),
        comment: '配置描述',
      },
      validationRule: {
        type: DataTypes.TEXT,
        field: 'validation_rule',
        comment: '验证规则',
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_public',
        comment: '是否公开配置',
      },
      isEditable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_editable',
        comment: '是否可编辑',
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'sort_order',
        comment: '排序',
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
    },
    {
      tableName: 'system_configs',
      sequelize,
      timestamps: true,
      comment: '系统配置表',
      indexes: [
        { name: 'idx_system_configs_key', fields: ['config_key'], unique: true },
        { name: 'idx_system_configs_category', fields: ['category'] },
        { name: 'idx_system_configs_public', fields: ['is_public'] },
        { name: 'idx_system_configs_sort_order', fields: ['sort_order'] },
      ],
      scopes: {
        public: {
          where: { isPublic: true },
        },
        editable: {
          where: { isEditable: true },
        },
      },
    },
  );
};

export default SystemConfig;
