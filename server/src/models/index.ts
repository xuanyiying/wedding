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
import { initMediaProfile } from './MediaProfile';
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
  // Define associations that are not defined within the init functions
  // Most associations are already defined in individual model files

  // User and Team associations (Team owner)
  User.hasMany(Team, { foreignKey: 'owner_id', as: 'ownedTeams' });
  Team.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

  // User and TeamMember associations
  User.hasMany(TeamMember, { foreignKey: 'user_id', as: 'teamMemberships' });

  // TeamMember inviter association
  User.hasMany(TeamMember, { foreignKey: 'inviter_id', as: 'invitedMembers' });
  TeamMember.belongsTo(User, { foreignKey: 'inviter_id', as: 'inviter' });

  // Team and TeamMember associations
  Team.hasMany(TeamMember, { foreignKey: 'team_id', as: 'members' });
  TeamMember.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });

  // Note: TeamMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' }) is already defined in Team.ts
};

// Note: initModels should be called explicitly when needed
// initModels(sequelize);

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
