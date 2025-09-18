import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

export enum IssueType {
  BUG = 'bug',
  FEATURE = 'feature',
  ENHANCEMENT = 'enhancement',
  DOCUMENTATION = 'documentation',
  OTHER = 'other'
}

export enum IssuePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum IssueStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  REJECTED = 'rejected'
}

// Issue attributes interface
export interface IssueAttributes {
  id: string;
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  status: IssueStatus;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  environment?: string;
  version?: string;
  reporterId: string;
  assigneeId?: string;
  dueDate?: Date;
  estimatedHours?: number;
  labels?: string | null;  // 修改这里，允许 null 值
  attachments?: string;
  voteCount: number;
  commentCount: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

// Issue creation attributes interface
export interface IssueCreationAttributes extends Optional<IssueAttributes, 'id' | 'voteCount' | 'commentCount'> { }

// Issue model class
export class Issue extends Model<IssueAttributes, IssueCreationAttributes> implements IssueAttributes {
  public id!: string;
  public title!: string;
  public description!: string;
  public type!: IssueType;
  public priority!: IssuePriority;
  public status!: IssueStatus;
  public stepsToReproduce?: string;
  public expectedBehavior?: string;
  public actualBehavior?: string;
  public environment?: string;
  public version?: string;
  public reporterId!: string;
  public assigneeId?: string;
  public dueDate?: Date;
  public estimatedHours?: number;
  public labels?: string;
  public attachments?: string;
  public voteCount!: number;
  public commentCount!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt?: Date;
}

export function initIssue(sequelize: Sequelize): void {
  Issue.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: new DataTypes.STRING(100),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM(...Object.values(IssueType)),
        allowNull: false,
        defaultValue: IssueType.BUG
      },
      priority: {
        type: DataTypes.ENUM(...Object.values(IssuePriority)),
        allowNull: false,
        defaultValue: IssuePriority.MEDIUM
      },
      status: {
        type: DataTypes.ENUM(...Object.values(IssueStatus)),
        allowNull: false,
        defaultValue: IssueStatus.OPEN
      },
      stepsToReproduce: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'steps_to_reproduce'
      },
      expectedBehavior: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'expected_behavior'
      },
      actualBehavior: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'actual_behavior'
      },
      environment: {
        type: new DataTypes.STRING(100),
        allowNull: true
      },
      version: {
        type: new DataTypes.STRING(100),
        allowNull: true
      },
      reporterId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'reporter_id'
      },
      assigneeId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'assignee_id'
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'due_date'
      },
      estimatedHours: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'estimated_hours'
      },
      labels: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      attachments: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      voteCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'vote_count'
      },
      commentCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'comment_count'
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at'
      }
    },
    {
      sequelize,
      tableName: 'issues',
      timestamps: true,
      paranoid: true,
      indexes: [
        {
          fields: ['type']
        },
        {
          fields: ['priority']
        },
        {
          fields: ['status']
        },
        {
          fields: ['reporter_id']
        },
        {
          fields: ['assignee_id']
        }
      ]
    }
  );
}