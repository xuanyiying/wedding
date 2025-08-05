import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { teamService } from '../services';
import { TeamMemberStatus, TeamStatus, type Team } from '../types';
import { transformTeamMember } from '../utils/team';

// 客户端团队成员接口
export interface ClientTeamMember {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  status: TeamMemberStatus;
  specialties: string[];
  experienceYears: number;
  bio: string;
}

export interface UseTeamDataReturn {
  teams: Team[];
  teamMembers: ClientTeamMember[];
  currentTeam: Team | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useTeamData = (options?: {
  teamId?: string;
  includeMembers?: boolean;
  activeOnly?: boolean;
  limit?: number;
}): UseTeamDataReturn => {  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<ClientTeamMember[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

 const {
    teamId,
    includeMembers = false,
    activeOnly = true,
    limit
  } = options || {};

  // 获取团队数据
  const fetchTeams = useCallback(async () => {
    try {
      const teamsResponse = await teamService.getTeams();
      if (!teamsResponse.data || teamsResponse.data.teams.length === 0) {
        setTeams([]);
        setCurrentTeam(null);
        return [];
      }
      
      let filteredTeams = teamsResponse.data.teams;
      if (activeOnly) {
        filteredTeams = filteredTeams.filter(team => team.status === TeamStatus.ACTIVE);
      }
      
      if (limit) {
        filteredTeams = filteredTeams.slice(0, limit);
      }
      
      setTeams(filteredTeams);
      setCurrentTeam(filteredTeams[0] || null);
      return filteredTeams;
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      setError('获取团队信息失败');
      setTeams([]);
      setCurrentTeam(null);
      return [];
    }
  }, [activeOnly, limit]);

  // 获取团队成员数据
  const fetchTeamMembers = useCallback(async (teamId: string) => {
    if (!includeMembers) {
      setTeamMembers([]);
      return;
    }

    try {
      const response = await teamService.getTeamMembers(teamId, {
        page: 1,
        pageSize: 50,
        status: activeOnly ? TeamMemberStatus.ACTIVE : undefined,
      });

      const members = response.data?.members || [];
      const transformedMembers = members.map(transformTeamMember);
      setTeamMembers(transformedMembers);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      setError('获取团队成员信息失败');
      setTeamMembers([]);
    }
  }, [includeMembers, activeOnly]);

  // 重新获取数据
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const fetchedTeams = await fetchTeams();
      if (includeMembers && fetchedTeams.length > 0) {
        await fetchTeamMembers(fetchedTeams[0].id);
      }
    } catch (error) {
      console.error('Failed to refetch data:', error);
      setError('数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [fetchTeams, fetchTeamMembers, includeMembers]);

  useEffect(() => {
    if (teamId) {
      fetchTeamMembers(teamId);
    }
  }, [teamId, fetchTeamMembers]);

  // 初始化数据
  useEffect(() => {
    refetch();
  }, [refetch]);

  // 显示错误消息
  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  return {
    teams,
    teamMembers,
    currentTeam,
    loading,
    error,
    refetch
  };
};