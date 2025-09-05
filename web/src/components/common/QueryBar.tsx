import React, { useState, useEffect } from 'react';
import { Select, DatePicker, Button } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { teamService } from '../../services';
import type { Team, User, TeamMember } from '../../types';
import { useAppSelector } from '../../store/hooks';
import styled from 'styled-components';
import type { Dayjs } from 'dayjs';

const { Option } = Select;

const QueryBarContainer = styled.div`
  background: var(--admin-bg-card);
  border: 1px solid var(--admin-border-color);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;

  .ant-select {
    width: 100%;
  }

  .ant-picker {
    width: 100%;
  }

  .query-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    align-items: center;
    white-space: nowrap;
  }

  .query-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: nowrap;
  }

  .query-item {
    flex: 1 1 auto;
    min-width: 120px;
    max-width: 200px;
  }

  .query-item-date {
    flex: 1 1 auto;
    min-width: 140px;
    max-width: 220px;
  }

  .query-item-meal {
    flex: 1 1 auto;
    min-width: 100px;
    max-width: 150px;
  }

  .query-actions-wrapper {
    flex: 0 0 auto;
    min-width: 140px;
  }

  @media (max-width: 1400px) {
    .query-row {
      flex-wrap: wrap;
    }
    
    .query-item {
      flex: 1 1 calc(50% - 6px);
      min-width: 140px;
    }
    
    .query-item-date {
      flex: 1 1 calc(50% - 6px);
      min-width: 160px;
    }
    
    .query-actions-wrapper {
      flex: 1 1 100%;
      margin-top: 8px;
    }
  }

  @media (max-width: 768px) {
    .query-row {
      flex-direction: column;
      gap: 12px;
    }
    
    .query-item,
    .query-item-date,
    .query-item-meal,
    .query-actions-wrapper {
      width: 100%;
      min-width: unset;
      max-width: unset;
      flex: none;
      margin-top: 0;
    }
    
    .query-actions {
      justify-content: stretch;
      
      .ant-btn {
        flex: 1;
      }
    }
  }
`;

export interface QueryFilters {
  search?: string;
  teamId?: string;
  userId?: string;
  date?: Dayjs | null;
  mealType?: 'lunch' | 'dinner'; // 仅用于档期页面
}

export interface QueryBarProps {
  onQuery: (filters: QueryFilters) => void;
  onReset: () => void;
  showMemberFilter?: boolean;
  showMealFilter?: boolean; // 是否显示午宴/晚宴筛选（仅档期页面需要）
  loading?: boolean;
  initialFilters?: QueryFilters;
}

const QueryBar: React.FC<QueryBarProps> = ({
  onQuery,
  onReset,
  showMealFilter = false,
  showMemberFilter = true,
  loading = false,
  initialFilters
}) => {
  const user = useAppSelector(state => state.auth.user);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<(TeamMember & { user: User })[]>([]);
  const [filters, setFilters] = useState<QueryFilters>(initialFilters || {});
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // 获取团队列表
  const fetchTeams = async () => {
    setLoadingTeams(true);
    try {
      const response = await teamService.getTeams({
        status: 'active',
        page: 1,
        limit: 100
      });
      setTeams(response.data?.teams || []);
    } catch (error) {
      console.error('获取团队列表失败:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

  // 获取团队成员列表
  const fetchMembers = async (teamId?: string) => {
    if (!teamId) {
      setMembers([]);
      return;
    }

    setLoadingMembers(true);
    try {
      const response = await teamService.getTeamMembers(teamId, {
        status: 1, // ACTIVE
        page: 1,
        limit: 100
      });
      setMembers(response.data?.members || []);
    } catch (error) {
      console.error('获取团队成员失败:', error);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  // 初始化数据
  useEffect(() => {
    fetchTeams();
    
    // 如果有初始筛选条件，设置到state中
    if (initialFilters) {
      setFilters(initialFilters);
    }
  }, []);

  // 当初始筛选条件变化时，更新filters - 使用JSON.stringify避免对象引用问题
  useEffect(() => {
    if (initialFilters) {
      setFilters(prev => ({
        ...prev,
        ...initialFilters
      }));
    }
  }, [JSON.stringify(initialFilters)]);

  // 当选择团队时，获取对应的成员列表
  useEffect(() => {
    if (filters.teamId) {
      fetchMembers(filters.teamId);
    } else {
      setMembers([]);
      setFilters(prev => ({ ...prev, memberId: undefined }));
    }
  }, [filters.teamId]);

  // 处理筛选条件变化
  const handleFilterChange = (key: keyof QueryFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 执行查询
  const handleQuery = () => {
    onQuery(filters);
  };

  // 重置筛选条件
  const handleReset = () => {
    setFilters({});
    onReset();
  };

  // 获取当前用户在成员列表中的显示名称
  const getCurrentUserDisplayName = () => {
    if (!user) return '我的';
    return `我的 (${user.realName || user.nickname || user.username})`;
  };

  return (
    <QueryBarContainer>
      <div className="query-row">
        {/* 团队选择 */}
        <div className="query-item">
          <Select
            placeholder="选择团队"
            value={filters.teamId}
            onChange={(value) => handleFilterChange('teamId', value)}
            loading={loadingTeams}
            allowClear
            defaultValue={'all'}
          >
            <Option value="all">全部</Option>
            {teams.map(team => (
              <Option key={team.id} value={team.id}>
                {team.name}
              </Option>
            ))}
          </Select>
        </div>

        {/* 成员选择 */}
        {showMemberFilter && (
          <div className="query-item">
          <Select
            placeholder="选择成员"
            value={filters.userId}
            onChange={(value) => handleFilterChange('userId', value)}
            loading={loadingMembers}
            disabled={!filters.teamId}
            allowClear
          >
            <Option value="">全部成员</Option>
            {user && (
              <Option key={user.id} value={user.id}>
                {getCurrentUserDisplayName()}
              </Option>
            )}
            {members
              .filter(member => member.user.id !== user?.id)
              .map(member => (
                <Option key={member.user.id} value={member.user.id}>
                  {member.user.realName || member.user.nickname || member.user.username}
                </Option>
              ))
            }
          </Select>
        </div>
        )}

        {/* 日期选择 */}
        <div className="query-item-date">
          <DatePicker
            placeholder="选择日期"
            value={filters.date}
            onChange={(date) => setFilters({ ...filters, date })}
            format="YYYY-MM-DD"
          />
        </div>

        {/* 午宴/晚宴筛选（仅档期页面显示） */}
        {showMealFilter && (
          <div className="query-item-meal">
            <Select
              placeholder="选择时段"
              value={filters.mealType}
              onChange={(value) => handleFilterChange('mealType', value)}
              allowClear
            >
              <Option value="lunch">午宴</Option>
              <Option value="dinner">晚宴</Option>
            </Select>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="query-actions-wrapper">
          <div className="query-actions">
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleQuery}
              loading={loading}
              size="middle"
            >
              查询
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              size="middle"
            >
              重置
            </Button>
          </div>
        </div>
      </div>
    </QueryBarContainer>
  );
};

export default QueryBar;