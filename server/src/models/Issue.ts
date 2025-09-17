import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Sequelize } from 'sequelize';
import User from './User';

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

@Table({
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
})
export class Issue extends Model {
  @Column({
    type: DataType.STRING(100),
    allowNull: false
  })
  title!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  description!: string;

  @Column({
    type: DataType.ENUM(...Object.values(IssueType)),
    allowNull: false,
    defaultValue: IssueType.BUG
  })
  type!: IssueType;

  @Column({
    type: DataType.ENUM(...Object.values(IssuePriority)),
    allowNull: false,
    defaultValue: IssuePriority.MEDIUM
  })
  priority!: IssuePriority;

  @Column({
    type: DataType.ENUM(...Object.values(IssueStatus)),
    allowNull: false,
    defaultValue: IssueStatus.OPEN
  })
  status!: IssueStatus;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  stepsToReproduce?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  expectedBehavior?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  actualBehavior?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  environment?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  version?: string;

  @ForeignKey(() => User as any)
  @Column({
    field: 'reporter_id',
    type: DataType.UUID,
    allowNull: false
  })
  reporterId!: string;

  @BelongsTo(() => User as any, 'reporter_id')
  reporter!: User;

  @ForeignKey(() => User as any)
  @Column({
    field: 'assignee_id',
    type: DataType.UUID,
    allowNull: true
  })
  assigneeId?: string;

  @BelongsTo(() => User as any, 'assignee_id')
  assignee?: User;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  dueDate?: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  estimatedHours?: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  labels?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  attachments?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  voteCount!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  commentCount!: number;
}

// 添加 initIssue 函数
export function initIssue(sequelize: Sequelize): void {
  Issue.init({
    id: {
      type: DataType.UUID,
      defaultValue: DataType.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataType.STRING(100),
      allowNull: false
    },
    description: {
      type: DataType.TEXT,
      allowNull: false
    },
    type: {
      type: DataType.ENUM(...Object.values(IssueType)),
      allowNull: false,
      defaultValue: IssueType.BUG
    },
    priority: {
      type: DataType.ENUM(...Object.values(IssuePriority)),
      allowNull: false,
      defaultValue: IssuePriority.MEDIUM
    },
    status: {
      type: DataType.ENUM(...Object.values(IssueStatus)),
      allowNull: false,
      defaultValue: IssueStatus.OPEN
    },
    stepsToReproduce: {
      type: DataType.TEXT,
      allowNull: true,
      field: 'steps_to_reproduce'
    },
    expectedBehavior: {
      type: DataType.TEXT,
      allowNull: true,
      field: 'expected_behavior'
    },
    actualBehavior: {
      type: DataType.TEXT,
      allowNull: true,
      field: 'actual_behavior'
    },
    environment: {
      type: DataType.STRING(100),
      allowNull: true
    },
    version: {
      type: DataType.STRING(100),
      allowNull: true
    },
    reporterId: {
      type: DataType.UUID,
      allowNull: false,
      field: 'reporter_id'
    },
    assigneeId: {
      type: DataType.UUID,
      allowNull: true,
      field: 'assignee_id'
    },
    dueDate: {
      type: DataType.DATE,
      allowNull: true,
      field: 'due_date'
    },
    estimatedHours: {
      type: DataType.INTEGER,
      allowNull: true,
      field: 'estimated_hours'
    },
    labels: {
      type: DataType.TEXT,
      allowNull: true
    },
    attachments: {
      type: DataType.TEXT,
      allowNull: true
    },
    voteCount: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'vote_count'
    },
    commentCount: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'comment_count'
    }
  }, {
    sequelize,
    tableName: 'issues',
    timestamps: true,
    paranoid: true
  });
}