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

export interface UserInfo {
  id: string;
  username: string;
  avatar?: string;
}

export interface Issue {
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
  reporter: UserInfo;
  assigneeId?: string;
  assignee?: UserInfo;
  dueDate?: string;
  estimatedHours?: number;
  labels?: string[];
  attachments?: string[];
  voteCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateIssueRequest {
  title: string;
  description: string;
  type?: IssueType;
  priority?: IssuePriority;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  environment?: string;
  version?: string;
  labels?: string[];
}

export interface UpdateIssueRequest {
  title?: string;
  description?: string;
  type?: IssueType;
  priority?: IssuePriority;
  status?: IssueStatus;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  environment?: string;
  version?: string;
  assigneeId?: string;
  dueDate?: string;
  estimatedHours?: number;
  labels?: string[];
}

export interface IssueListResponse {
  issues: Issue[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface IssueStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  byStatus: Array<{
    status: IssueStatus;
    count: number;
  }>;
}

export interface VoteRequest {
  action: 'upvote' | 'downvote';
}

export interface VoteResponse {
  voteCount: number;
}