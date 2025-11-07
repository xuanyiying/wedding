import { Sequelize } from 'sequelize';

import User, { initUser, UserAttributes, UserCreationAttributes } from './User';
import Schedule, { initSchedule, ScheduleAttributes, ScheduleCreationAttributes } from './Schedule';
import Work, { initWork, WorkAttributes, WorkCreationAttributes } from './Work';
import File, { initFile, FileAttributes, FileCreationAttributes } from './File';
import SystemConfig, { initSystemConfig } from './SystemConfig';
import OperationLog, { initOperationLog } from './OperationLog';
import UserPermission, { initUserPermission } from './UserPermission';
import WorkLike, { initWorkLike } from './WorkLike';
import { Team, TeamMember, initTeam } from './Team';
import Contact, { ContactAttributes, initContact } from './Contact';
import ViewStat, { initViewStat, ViewStatAttributes, ViewStatCreationAttributes } from './ViewStat';
import MediaProfile, { initMediaProfile } from './MediaProfile';
import { Issue, initIssue } from './Issue';
const models = {
  User,
  Schedule,
  Work,
  File,
  SystemConfig,
  OperationLog,
  UserPermission,
  WorkLike,
  ViewStat,
  Team,
  TeamMember,
  Contact,
  MediaProfile,
  Issue,
};

export const initModels = (sequelizeInstance: Sequelize): void => {
  // Initialize models
  initUser(sequelizeInstance);
  initSchedule(sequelizeInstance);
  initWork(sequelizeInstance);
  initFile(sequelizeInstance);
  initSystemConfig(sequelizeInstance);
  initOperationLog(sequelizeInstance);
  initUserPermission(sequelizeInstance);
  initWorkLike(sequelizeInstance);

  initTeam(sequelizeInstance);
  initContact(sequelizeInstance);

  initViewStat(sequelizeInstance);
  initMediaProfile(sequelizeInstance);
  initIssue(sequelizeInstance);

};

// 具名导出所有模型
export {
  User,
  Schedule,
  Work,
  File,
  SystemConfig,
  OperationLog,
  UserPermission,
  WorkLike,
  ViewStat,
  Team,
  TeamMember,
  Contact,
  MediaProfile,
};

// 导出类型和枚举
export {
  UserAttributes,
  UserCreationAttributes,
  ScheduleAttributes,
  ScheduleCreationAttributes,
  WorkAttributes,
  WorkCreationAttributes,
  FileAttributes,
  FileCreationAttributes,
  ContactAttributes,
  ViewStatAttributes,
  ViewStatCreationAttributes,
};

export default models;