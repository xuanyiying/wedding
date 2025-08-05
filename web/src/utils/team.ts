import type { ClientTeamMember } from "../hooks/useTeamData";
import type { TeamMember } from "../types";
 // 数据转换函数：将API返回的TeamMember转换为ClientTeamMember
export const transformTeamMember = (member: TeamMember): ClientTeamMember => {
    const user = member.user || {};
    const memberName = user.realName || user.nickname || `用户${member.userId?.slice(-4) || member.id}`;
    
    return {
      id: member.id,
      userId: member.userId,
      name: memberName,
      avatar: user.avatarUrl || (memberName ? memberName.charAt(0) : '用'),
      status: member.status || 1,
      specialties: Array.isArray(user.specialties) ? user.specialties : (user.specialties ? [user.specialties] : ['婚礼主持', '现场协调']),
      experienceYears: user.experienceYears || 0,
      bio: user.bio || '专业的婚礼服务团队成员，致力于为您打造完美的婚礼体验。',
    };
  };