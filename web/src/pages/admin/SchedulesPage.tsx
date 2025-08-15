import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  message,
  Space,
  Row,
  Col,
  Form
} from 'antd';
import {
  PlusOutlined
} from '@ant-design/icons';
import { ContentCard } from '../../components/admin/common';
import { type Schedule, UserRole, type Team, type TeamMember, type User } from '../../types';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import styled from 'styled-components';
import { scheduleService } from '../../services';
import { useTheme } from '../../hooks/useTheme';
import { useAppSelector } from '../../store';
import QueryBar, { type QueryFilters } from '../../components/common/QueryBar';
import ScheduleStats from '../../components/admin/schedule/ScheduleStats';
import ScheduleDisplay from '../../components/admin/schedule/ScheduleDisplay';
import ScheduleEditModal from '../../components/admin/schedule/ScheduleEditModal';

const SchedulesContainer = styled.div`
  padding: 16px;
  
  @media (max-width: 768px) {
    padding: 8px;
  }
`;

const SchedulesPage: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  
  // 模态框相关状态
  const [form] = Form.useForm();
  const [weddingDate, setWeddingDate] = useState<Dayjs | null>(null);
  const [selectedWeddingTime, setSelectedWeddingTime] = useState<string>('lunch');
  const [availableHosts, setAvailableHosts] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [conflictSchedules, setConflictSchedules] = useState<Schedule[]>([]);

  const [teamMembers] = useState<TeamMember[]>([]);
  const [selectedTeam] = useState<Team>();

  // 筛选条件状态
  const [filters, setFilters] = useState<QueryFilters>({
    search: '',
    teamId: '',
    userId: '',
    date: null,
    mealType: 'lunch',
  });
  // 初始化admin主题和用户认证
  const { initTheme } = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
  
  useEffect(() => {
    initTheme('admin');
  }, [initTheme]);

  const loadSchedules = async (queryFilters?: {
    teamId?: string;
    userId?: string;
    date?: string;
    status?: string;
    mealType?: 'lunch' | 'dinner';
  }) => {
    setLoading(true);
    try {
      const params: any = { page: 1, limit: 100 };
      // 处理成员ID查询
      if (queryFilters?.userId) {
        params.userId = queryFilters.userId;
      }
      // 处理日期查询
      if (queryFilters?.date) {
        params.date = queryFilters.date;
      }

      // 处理状态查询
      if (queryFilters?.status) {
        params.status = queryFilters.status;
      }

      // 处理餐次类型查询
      if (queryFilters?.mealType) {
        params.mealType = queryFilters.mealType;
      }
      if (queryFilters?.teamId) {
        params.teamId = queryFilters.teamId;
      }
      const response = await scheduleService.getSchedules(params);
      const scheduleData = response.data?.schedules || [];
      setSchedules(scheduleData);
    } catch (error) {
      console.error('加载档期数据失败:', error);
      message.error('加载档期数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理日期选择 
  const handleDateSelect = (date: Dayjs) => {
    setSelectedDate(date);
    loadSchedules({ date: date.format('YYYY-MM-DD') });
  };

  // 处理事件点击
  const handleEventClick = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setModalVisible(true);
  };

  // 打开添加/编辑模态框
  const openModal = (schedule?: Schedule) => {
    setEditingSchedule(schedule || null);
    setModalVisible(true);
    
    // 重置模态框状态
    if (schedule) {
      // 编辑模式
      setWeddingDate(schedule.weddingDate ? dayjs(schedule.weddingDate) : null);
      setSelectedWeddingTime(schedule.weddingTime || 'lunch');
      form.setFieldsValue({
        ...schedule,
        weddingDate: schedule.weddingDate ? dayjs(schedule.weddingDate) : null,
      });
    } else {
      // 新增模式
      setWeddingDate(null);
      setSelectedWeddingTime('lunch');
      setConflictSchedules([]);
      form.resetFields();
    }
    setAvailableHosts([]);
    setSearchModalVisible(false);
  };

  // 保存档期
  const handleSave = async (values: any) => {
    try {
      // 非管理员用户检查档期冲突
      if (!isAdmin && conflictSchedules.length > 0) {
        message.error('存在档期冲突，请选择其他时间');
        return;
      }
      
      const scheduleData = {
        ...values,
        weddingDate: values.weddingDate.format('YYYY-MM-DD'),
      };

      if (editingSchedule) {
        await scheduleService.updateSchedule(editingSchedule.id, scheduleData);
        message.success('档期更新成功');
      } else {
        await scheduleService.createSchedule(scheduleData);
        message.success('档期添加成功');
      }

      setModalVisible(false);
      await loadSchedules();
    } catch (error) {
      console.error('保存档期失败:', error);
      message.error('操作失败，请重试');
    }
  };

  // 删除档期
  const handleDelete = async (scheduleId: string) => {
    try {
      await scheduleService.deleteSchedule(scheduleId);
      message.success('档期删除成功');
      await loadSchedules();
      setModalVisible(false);
    } catch (error) {
      console.error('删除档期失败:', error);
      message.error('删除失败，请重试');
    }
  };

  // 查询可用主持人（管理员功能）
  const handleSearchAvailableHosts = useCallback(async () => {
    if (!weddingDate || !selectedWeddingTime) {
      message.warning('请先选择婚礼日期和时间');
      return;
    }

    setSearchLoading(true);
    try {
      const response = await scheduleService.getAvailableHosts({
        teamId: selectedTeam?.id || 'all',
        weddingDate: weddingDate.format('YYYY-MM-DD'),
        weddingTime: selectedWeddingTime
      });
      console.log('Available hosts:', response.data);
      setAvailableHosts(response.data?.hosts || []);
      setSearchModalVisible(true);
    } catch (error) {
      console.error('查询可用主持人失败:', error);
      message.error('查询可用主持人失败');
      setAvailableHosts([]);
    } finally {
      setSearchLoading(false);
    }
  }, [weddingDate, selectedWeddingTime]);

  // 检查档期冲突（非管理员功能）
  const handleCheckScheduleConflict = useCallback(async () => {
    if (!weddingDate || !selectedWeddingTime || !user?.id) {
      setConflictSchedules([]);
      return;
    }

    try {
      const response = await scheduleService.checkScheduleConflict({
        userId: user.id,
        weddingDate: weddingDate.format('YYYY-MM-DD'),
        weddingTime:  selectedWeddingTime,
        excludeId: editingSchedule?.id // 编辑时排除当前档期
      });
      setConflictSchedules(response.data?.conflicts || []);
    } catch (error) {
      console.error('检查档期冲突失败:', error);
      setConflictSchedules([]);
    }
  }, [weddingDate, selectedWeddingTime, user, editingSchedule]);

  // 处理婚礼日期变化
  const handleWeddingDateChange = useCallback((date: Dayjs | null) => {
    setWeddingDate(date);
    form.setFieldsValue({ weddingDate: date });
    if (isAdmin && date && selectedWeddingTime) {
      handleSearchAvailableHosts();
    } else if (!isAdmin) {
      handleCheckScheduleConflict();
    }
  }, [isAdmin, selectedWeddingTime, handleSearchAvailableHosts, handleCheckScheduleConflict, form]);

  // 处理婚礼时间变化
  const handleWeddingTimeChange = useCallback((e: any) => {
    const time = e.target.value;
    setSelectedWeddingTime(time);
    form.setFieldsValue({ weddingTime: time });
    if (isAdmin && weddingDate && time) {
      handleSearchAvailableHosts();
    }
  }, [isAdmin, weddingDate, handleSearchAvailableHosts, form]);

  // 处理查询
  const handleSearch = async (searchFilters: any) => {
    setFilters(searchFilters);
    await loadSchedules(searchFilters);
  };

  // 处理重置
  const handleReset = () => {
    setFilters(filters => ({ ...filters, date: null }));
    // 重新加载所有数据
    loadSchedules();
  };



  return (
    <SchedulesContainer>
      {/* 统计组件 */}
       <ScheduleStats
          schedules={schedules}
          selectedTeam={selectedTeam}
          teamMembers={teamMembers}
          statsTimeRange="month"
          statusFilter="all"
          customDateRange={[null, null]}
          showDetailedStats={false}
          onStatsTimeRangeChange={() => {}}
          onStatusFilterChange={() => {}}
          onCustomDateRangeChange={() => {}}
          onShowDetailedStatsChange={() => {}}
        />

      {/* 条件查询栏 */}
      <QueryBar
        showMealFilter={true}
        onQuery={(filters: QueryFilters) => handleSearch(filters)}
        initialFilters={filters}
        onReset={handleReset}
      />

      <Row gutter={16}>
        {/* 日历视图 */}
        <Col xs={24} lg={16}>
          <ContentCard>
            {/* 操作按钮区域 */}
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openModal()}
                >
                  添加档期
                </Button>
              </Space>
            </div>
            
            {/* 档期显示组件 */}
             <ScheduleDisplay
                   filteredEvents={schedules.map(s => ({ ...s, hostName: s.user?.realName || s.user?.nickname || '未分配' }))}
                   selectedDate={selectedDate}
                   selectedDateSchedules={schedules.filter(s => dayjs(s.weddingDate).isSame(selectedDate, 'day')).map(s => ({ ...s, hostName: s.user?.realName || s.user?.nickname || '未分配' }))}
                   onDateSelect={handleDateSelect}
                   onEventClick={handleEventClick}
                   onAddSchedule={() => openModal()}
                   onEditSchedule={(schedule: Schedule) => openModal(schedule)}
                   onDeleteSchedule={async (id: string) => {
                     try {
                       await scheduleService.deleteSchedule(id);
                       message.success('删除成功');
                       loadSchedules();
                     } catch (error) {
                       message.error('删除失败');
                     }
                   }}
                   loading={loading}
                 />
          </ContentCard>
        </Col>
      </Row>

      {/* 添加/编辑档期模态框 */}
       <ScheduleEditModal
         visible={modalVisible}
         editingSchedule={editingSchedule}
         form={form}
         user={user}
         isAdmin={isAdmin}
         weddingDate={weddingDate}
         selectedWeddingTime={selectedWeddingTime}
         availableHosts={availableHosts}
         searchLoading={searchLoading}
         searchModalVisible={searchModalVisible}
         conflictSchedules={conflictSchedules}
         onCancel={() => {
           setModalVisible(false);
           setConflictSchedules([]);
           setAvailableHosts([]);
         }}
         onSave={handleSave}
         onDelete={handleDelete}
         onWeddingDateChange={handleWeddingDateChange}
         onWeddingTimeChange={handleWeddingTimeChange}
         onSearchAvailableHosts={handleSearchAvailableHosts}
         onCheckScheduleConflict={handleCheckScheduleConflict}
         setSearchModalVisible={setSearchModalVisible}
       />
    </SchedulesContainer>
  );
};

export default SchedulesPage;