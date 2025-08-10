import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  Row,
  Col,
  List,
  Avatar,
  Tooltip,
  Popconfirm,
  Spin,
  Tag,
  Typography,
  DatePicker,
  Radio,
  Switch,
  Card,
  Segmented,
  type RadioChangeEvent
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  UserOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  BarChartOutlined,
  TrophyOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { StatCard, ContentCard } from '../../components/admin/common';
import { ScheduleStatus, type Schedule, type User, UserRole, type Team, TeamMemberStatus, type TeamMember } from '../../types';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import styled from 'styled-components';
import { scheduleService, teamService, userService } from '../../services';
import { useTheme } from '../../hooks/useTheme';
import { useAppSelector } from '../../store';
import ScheduleCalendar from '../../components/ScheduleCalendar';
import ConditionalQueryBar from '../../components/common/QueryBar';

// 扩展Schedule类型以包含hostName
interface ScheduleEvent extends Schedule {
  hostName: string;
}

const { Option } = Select;
const { Title } = Typography;

const SchedulesContainer = styled.div`
  padding: 16px;
  
  @media (max-width: 768px) {
    padding: 8px;
  }
`;




const TeamSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  
  .team-label {
    font-weight: 500;
    color: var(--admin-text-primary);
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    
    .ant-select {
      width: 100% !important;
    }
  }
`;

const SchedulesPage: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [form] = Form.useForm();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<User>();
  const [selectedTeam, setSelectedTeam] = useState<Team>();

  // 新增状态变量
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [statsTimeRange, setStatsTimeRange] = useState<'month' | 'quarter' | 'year'>('month');
  const [showDetailedStats, setShowDetailedStats] = useState(false);

  // 主持人可用性查询相关状态
  const [weddingDate, setWeddingDate] = useState<Dayjs | null>(null);
  const [selectedWeddingTime, setSelectedWeddingTime] = useState<string>('lunch');
  const [availableHosts, setAvailableHosts] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);

  // 筛选条件状态
  const [filters, setFilters] = useState({
    teamId: '',
    memberId: '',
    status: '',
    date: '',
    mealType: ''
  });

  // 初始化admin主题和用户认证
  const { initTheme } = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === UserRole.ADMIN ;
  const options = [
    { label: '午宴', value: 'lunch' },
    { label: '晚宴', value: 'dinner' },
  ];
  useEffect(() => {
    initTheme('admin');
  }, [initTheme]);

  // 加载数据
  useEffect(() => {
    if (!user) return;
    loadTeams(user.id);
  }, [user]);

  useEffect(() => {
    if (selectedTeam?.id) {
      loadTeamMembers(selectedTeam.id);
    }
  }, [selectedTeam, user]);

  useEffect(() => {
    if (selectedMember?.id) {
      loadSchedules(selectedMember.id);
    } else if (selectedTeam && teamMembers.length > 0) {
      loadSchedules(); // Load all team members' schedules
    } else if (user && !selectedTeam) {
      loadSchedules(user.id); // Default to user's own schedules
    }
  }, [selectedMember, selectedTeam, teamMembers, user]);

  const loadTeams = async (userId: string) => {
    setLoading(true);
    try {

      const response = await userService.getTeamsByUserId(userId);
      setTeams(response.data || []);
    } catch (error) {
      console.error('加载团队失败:', error);
      message.error('加载团队失败');
    } finally {
      setLoading(false);
    }
  };
  const loadSchedules = async (userId?: string) => {
    setLoading(true);
    try {
      const params: any = { page: 1, pageSize: 100 };

      if (userId) {
        // 如果指定了成员ID，只加载该成员的档期
        params.userId = userId;
      } else if (selectedTeam && teamMembers.length > 0) {
        // 如果选择了团队但没有指定成员，加载团队所有成员的档期
        const teamMemberIds = teamMembers.map(member => member.id);
        params.userIds = teamMemberIds; // 假设API支持多个hostId查询
      }
      // 如果既没有选择团队也没有指定成员，则不加载任何档期

      const response = await scheduleService.getSchedules(params);
      const scheduleData = response.data?.schedules || [];
      setSchedules(scheduleData);

      // 转换数据格式，添加主持人姓名
      const eventsWithHost: ScheduleEvent[] = scheduleData.map(schedule => ({
        ...schedule,
        hostName: teamMembers.find(member => member.id === schedule.userId)?.user?.realName ||
          teamMembers.find(member => member.id === schedule.userId)?.user?.nickname ||
          schedule.user?.realName || schedule.user?.nickname || '未知主持人',
      }));
      setScheduleEvents(eventsWithHost);
    } catch (error) {
      console.error('加载档期数据失败:', error);
      message.error('加载档期数据失败');
    } finally {
      setLoading(false);
    }
  };


  const loadTeamMembers = async (teamId?: string) => {
    try {
      if (!isAdmin) {
        setTeamMembers([]); // Clear team members for non-admin
        return;
      }
      if (!teamId) {
        setTeamMembers([]);
        return;
      }
      const params = {
        status: TeamMemberStatus.ACTIVE,
        page: 1,
        limit: 100
      };
      const response = await teamService.getTeamMembers(teamId, params);
      console.log('loadTeamMembers response:', response);
      const members = response.data?.members || [];
      setTeamMembers(members);
      // If selectedMember is not in the new teamMembers list, clear it
      if (selectedMember && !members.some(m => m.id === selectedMember.id)) {
        setSelectedMember(undefined);
      }
    } catch (error) {
      console.error('加载团队成员失败:', error);
      message.error('加载团队成员失败');
    }
  };

  // 获取日期的档期数据
  const getDateSchedules = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return schedules.filter(schedule => {
      const matchesDate = schedule.weddingDate.startsWith(dateStr);

      if (isAdmin) {
        if (selectedMember) {
          // 如果选择了特定成员，只显示该成员的档期
          return matchesDate && schedule.userId === selectedMember.id;
        } else if (selectedTeam && teamMembers.length > 0) {
          // 如果选择了团队但没有选择特定成员，显示团队所有成员的档期
          const teamMemberIds = teamMembers.map(member => member.id);
          return matchesDate && teamMemberIds.includes(schedule.userId);
        } else {
          // 如果没有选择团队，不显示任何档期
          return false;
        }
      } else {
        // 普通用户只看自己的档期
        return matchesDate && schedule.userId === user?.id;
      }
    });
  };


  // 处理团队选择
  const handleTeamChange = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    setSelectedTeam(team);
    // 清空当前选中的团队成员
    setSelectedMember(undefined);
    // 如果选择了团队，加载团队成员
    if (teamId) {
      loadTeamMembers(teamId);
    } else {
      setTeamMembers([]);
    }
    // 重新加载档期数据
    loadSchedules();
  };

  // 处理团队成员切换
  const handleMemberChange = (memberId: string) => {
    if (!memberId) {
      setSelectedMember(undefined);
      loadSchedules();
      return;
    }
    const member = teamMembers.find(m => m.userId === memberId);
    setSelectedMember(member?.user || undefined);
    loadSchedules(member?.userId);
  };


  // 筛选事件
  const filteredEvents = scheduleEvents.filter(event => {
    return event;
  });

  // 处理日期选择
  const handleDateSelect = (date: Dayjs) => {
    setSelectedDate(date);
  };

  // 处理事件点击
  const handleEventClick = (event: ScheduleEvent) => {
    setEditingSchedule(event);
    setModalVisible(true);
    // 填充表单数据
    form.setFieldsValue({
      title: event.title,
      hostId: event.userId,
      customerName: event.customerName,
      customerPhone: event.customerPhone,
      eventType: event.eventType,
      status: event.status,
      location: event.location,
      notes: event.notes,
      price: event.price,
      weddingDate: dayjs(event.weddingDate),
      weddingTime: event.weddingTime,
      deposit: event.deposit,
      isPaid: event.isPaid,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      requirements: event.requirements,
      tags: event.tags,
    });
  };

  // 查询可用主持人
  const searchAvailableHosts = async (date?: Dayjs | null, time?: string) => {
    const targetDate = date || weddingDate;
    const targetTime = time || selectedWeddingTime;
    
    if (!targetDate) {
      message.warning('请选择婚礼日期');
      return;
    }

    setSearchLoading(true);
    try {
      const params: any = {
        weddingDate: targetDate.format('YYYY-MM-DD'),
        weddingTime: targetTime,
      };

      const response = await scheduleService.getAvailableHosts(params);

      if (response.success && response.data) {
        setAvailableHosts(response.data.users);
        message.success(`找到 ${response.data.total} 位可用主持人`);
      } else {
        setAvailableHosts([]);
        message.info('暂无可用主持人');
      }
    } catch (error) {
      console.error('查询可用主持人失败:', error);
      message.error('查询可用主持人失败');
      setAvailableHosts([]);
    } finally {
      setSearchLoading(false);
    }
  };
  // 状态颜色 - 严格按照用户配色方案
  const getStatusColor = (status: string) => {
    switch (status) {
      case ScheduleStatus.AVAILABLE:
        return '#90EE90'; // 浅绿色 - 可预约
      case ScheduleStatus.BOOKED:
        return '#1890ff'; // 蓝色 - 已预订
      case 'PENDING': // 待确认
        return '#FFB366'; // 浅橙色 - 待确认
      case ScheduleStatus.CONFIRMED:
        return '#FF8C00'; // 深橙色 - 已确认
      case ScheduleStatus.COMPLETED:
        return '#52c41a'; // 绿色 - 已完成
      case ScheduleStatus.CANCELLED:
        return '#ff4d4f'; // 红色 - 已取消
      case ScheduleStatus.BUSY:
        return '#FFB366'; // 浅橙色 - 忙碌
      case ScheduleStatus.VACATION:
        return '#ff4d4f'; // 红色 - 休假
      default:
        return '#90EE90';
    }
  };

  // 状态标签 - 严格按照用户配色方案
  const getStatusTag = (status: string) => {
    switch (status) {
      case ScheduleStatus.AVAILABLE:
        return <Tag style={{ color: '#90EE90', borderColor: '#90EE90' }}>可预约</Tag>;
      case ScheduleStatus.BOOKED:
        return <Tag style={{ color: '#1890ff', borderColor: '#1890ff' }}>已预订</Tag>;
      case 'PENDING':
        return <Tag style={{ color: '#FFB366', borderColor: '#FFB366' }}>待确认</Tag>;
      case ScheduleStatus.CONFIRMED:
        return <Tag style={{ color: '#FF8C00', borderColor: '#FF8C00' }}>已确认</Tag>;
      case ScheduleStatus.COMPLETED:
        return <Tag style={{ color: '#52c41a', borderColor: '#52c41a' }}>已完成</Tag>;
      case ScheduleStatus.CANCELLED:
        return <Tag style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}>已取消</Tag>;
      case ScheduleStatus.BUSY:
        return <Tag style={{ color: '#FFB366', borderColor: '#FFB366' }}>忙碌</Tag>;
      case ScheduleStatus.VACATION:
        return <Tag style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}>休假</Tag>;
      default:
        return <Tag style={{ color: '#90EE90', borderColor: '#90EE90' }}>{status}</Tag>;
    }
  };

  // 类型标签
  const getTypeTag = (type: string) => {
    const typeMap = {
      wedding: { color: 'red', text: '婚礼' },
      engagement: { color: 'blue', text: '订婚' },
      anniversary: { color: 'purple', text: '纪念日' },
      other: { color: 'default', text: '其他' }
    };

    const config = typeMap[type as keyof typeof typeMap];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 打开添加/编辑模态框
  const openModal = (schedule?: Schedule) => {
    setEditingSchedule(schedule || null);
    setModalVisible(true);
    // 重置可用主持人列表
    setAvailableHosts([]);
    setWeddingDate(null);
    setSelectedWeddingTime('lunch');

    if (schedule) {
      form.setFieldsValue({
        title: schedule.title,
        hostId: schedule.userId,
        customerName: schedule.customerName,
        customerPhone: schedule.customerPhone,
        weddingDate: dayjs(schedule.weddingDate),
        weddingTime: schedule.weddingTime,
        location: schedule.location,
        eventType: schedule.eventType,
        status: schedule.status,
        notes: schedule.notes,
        price: schedule.price,
        venueName: schedule.venueName,
        venueAddress: schedule.venueAddress,
        deposit: schedule.deposit,
        isPaid: schedule.isPaid
      });
      // 编辑时设置日期和时间状态
      setWeddingDate(dayjs(schedule.weddingDate));
      setSelectedWeddingTime(schedule.weddingTime || 'lunch');
    } else {
      form.resetFields();
      // 新增档期时的默认值
      const defaultValues: any = {
        status: ScheduleStatus.AVAILABLE,
        weddingTime: 'lunch'
      };
      
      // 如果是普通用户，自动设置hostId为当前用户
      if (!isAdmin && user?.id) {
        defaultValues.hostId = user.id;
      }
      
      // 如果有选中的日期，预填日期
      if (selectedDate) {
        defaultValues.weddingDate = selectedDate;
        setWeddingDate(selectedDate);
      }
      
      form.setFieldsValue(defaultValues);
    }
  };

  // 保存档期
  const handleSave = async (values: any) => {
    try {
      const userId = values.hostId;
      if (!userId) {
        message.error('请选择主持人');
        return;
      }
      const scheduleData = {
        title: values.title,
        customerName: values.customerName, //
        customerPhone: values.customerPhone,
        customer: values.customer,
        weddingDate: values.startTime.format('YYYY-MM-DD'),
        weddingTime: values.weddingTime,
        location: values.location,
        eventType: values.eventType,
        notes: values.notes,
        status: values.status,
        price: values.price,
        userId: userId,
        isCancelled: false,
        deposit: values.deposit,
        postPaid: values.postPaid,
        isPaid: values.isPaid,
        venueName: values.venueName,
        venueAddress: values.venueAddress,
        requirements: values.requirements,
        tags: values.tags,
      };

      if (editingSchedule) {
        await scheduleService.updateSchedule(editingSchedule.id, scheduleData);
        message.success('档期更新成功');
      } else {
        await scheduleService.createSchedule(scheduleData);
        message.success('档期添加成功');
      }

      setModalVisible(false);
      form.resetFields();
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

  // 更新档期状态
  const updateScheduleStatus = async (scheduleId: string, status: ScheduleStatus) => {
    try {
      await scheduleService.updateSchedule(scheduleId, { status });
      message.success('状态更新成功');
      await loadSchedules();
    } catch (error) {
      console.error('状态更新失败:', error);
      message.error('状态更新失败');
    }
  };

  // 根据时间范围过滤档期数据
  const getFilteredSchedulesByTimeRange = (timeRange: 'month' | 'quarter' | 'year') => {
    const now = dayjs();
    return schedules.filter(s => {
      const scheduleDate = dayjs(s.weddingDate);
      switch (timeRange) {
        case 'month':
          return scheduleDate.isSame(now, 'month');
        case 'quarter':
          // 使用季度计算：获取当前季度的开始和结束月份
          const currentQuarter = Math.floor(now.month() / 3);
          const scheduleQuarter = Math.floor(scheduleDate.month() / 3);
          return scheduleDate.year() === now.year() && scheduleQuarter === currentQuarter;
        case 'year':
          return scheduleDate.isSame(now, 'year');
        default:
          return false;
      }
    });
  };

  // 统计数据
  const filteredSchedules = getFilteredSchedulesByTimeRange(statsTimeRange);
  const stats = {
    total: schedules.length,
    current: filteredSchedules.length,
    available: filteredSchedules.filter(s => s.status === ScheduleStatus.AVAILABLE).length,
    confirmed: filteredSchedules.filter(s => s.status === ScheduleStatus.CONFIRMED).length,
    completed: filteredSchedules.filter(s => s.status === ScheduleStatus.COMPLETED).length,
    revenue: Number(filteredSchedules.filter(s => s.status === ScheduleStatus.COMPLETED)
      .reduce((sum, s) => sum + (s.price || 0), 0)).toFixed(2)
  };

  // 团队和个人统计
  const getTeamStats = () => {
    if (!selectedTeam || teamMembers.length === 0) return [];
    
    return teamMembers.map(member => {
      const memberSchedules = filteredSchedules.filter(s => s.userId === member.id);
      return {
        id: member.id,
        name: member.user.realName || member.user.nickname || '未知',
        avatar: member.user.avatarUrl,
        total: memberSchedules.length,
        completed: memberSchedules.filter(s => s.status === ScheduleStatus.COMPLETED).length,
        revenue: Number(memberSchedules.filter(s => s.status === ScheduleStatus.COMPLETED)
          .reduce((sum, s) => sum + (s.price || 0), 0)).toFixed(2)
      };
    }).sort((a, b) => b.completed - a.completed);
  };

  const teamStats = getTeamStats();

  // 获取选中日期的档期列表
  const selectedDateSchedules = getDateSchedules(selectedDate);

  // 处理查询
  const handleSearch = (searchFilters: any) => {
    console.log('搜索条件:', searchFilters);
    // 这里可以根据搜索条件重新加载数据
    // loadSchedules();
  };

  // 处理重置
  const handleReset = () => {
    setFilters({
      teamId: '',
      memberId: '',
      status: '',
      date: '',
      mealType: ''
    });
    // 重新加载所有数据
    loadSchedules();
  };

  // 婚礼时间选择处理
  const handleWeddingTimeChange = (e: RadioChangeEvent): void => {
    const newTime = e.target.value;
    setSelectedWeddingTime(newTime);
    // 如果已选择日期，自动查询可用主持人
    const currentDate = form.getFieldValue('weddingDate');
    if (currentDate && isAdmin) {
      setWeddingDate(currentDate);
      // 直接传递最新的参数
      searchAvailableHosts(currentDate, newTime);
    }
  };

  // 婚礼日期选择处理
  const handleWeddingDateChange = (date: Dayjs | null) => {
    form.setFieldsValue({ weddingDate: date });
    setWeddingDate(date);
    // 如果是管理员且已选择日期和时间，自动查询可用主持人
    const currentTime = form.getFieldValue('weddingTime') || selectedWeddingTime;
    if (date && currentTime && isAdmin) {
      // 直接传递最新的参数
      searchAvailableHosts(date, currentTime);
    }
  };

  return (
    <SchedulesContainer>
      {/* 统计时间范围选择器 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <BarChartOutlined />
            <span style={{ fontWeight: 500 }}>统计时间范围：</span>
            <Segmented
              value={statsTimeRange}
              onChange={setStatsTimeRange}
              options={[
                { label: '本月', value: 'month' },
                { label: '本季度', value: 'quarter' },
                { label: '本年', value: 'year' }
              ]}
            />
          </Space>
        </Col>
        <Col>
          <Button
            type={showDetailedStats ? 'primary' : 'default'}
            icon={<TrophyOutlined />}
            onClick={() => setShowDetailedStats(!showDetailedStats)}
          >
            {showDetailedStats ? '隐藏' : '显示'}团队统计
          </Button>
        </Col>
      </Row>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <StatCard
            title="总档期数"
            value={stats.total}
          />
        </Col>
        <Col xs={24} sm={6}>
          <StatCard
            title={`${statsTimeRange === 'month' ? '本月' : statsTimeRange === 'quarter' ? '本季度' : '本年'}档期`}
            value={stats.current}
          />
        </Col>
        <Col xs={24} sm={6}>
          <StatCard
            title="已完成"
            value={stats.completed}
          />
        </Col>
        <Col xs={24} sm={6}>
          <StatCard
            title={`${statsTimeRange === 'month' ? '本月' : statsTimeRange === 'quarter' ? '本季度' : '本年'}收入`}
            value={stats.revenue}
            prefix="¥"
          />
        </Col>
      </Row>

      {/* 条件查询栏 */}
      <ConditionalQueryBar
        showMealFilter={true}
        onQuery={handleSearch}
        onReset={handleReset}
      />

      {/* 团队统计详情 */}
      {showDetailedStats && selectedTeam && teamStats.length > 0 && (
        <Card
          title={`${selectedTeam.name} - 团队成员统计`}
          style={{ marginBottom: 24 }}
          extra={
            <Tag color="blue">
              {statsTimeRange === 'month' ? '本月' : statsTimeRange === 'quarter' ? '本季度' : '本年'}数据
            </Tag>
          }
        >
          <Row gutter={16}>
            {teamStats.map((member, index) => (
              <Col xs={24} sm={12} md={8} lg={6} key={member.id} style={{ marginBottom: 16 }}>
                <Card size="small" hoverable>
                  <div style={{ textAlign: 'center' }}>
                    <Avatar
                      size={48}
                      src={member.avatar}
                      icon={<UserOutlined />}
                      style={{ marginBottom: 8 }}
                    />
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>{member.name}</div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: 8 }}>
                      排名 #{index + 1}
                    </div>
                    <Space direction="vertical" size={4}>
                      <div>
                        <CalendarOutlined style={{ marginRight: 4 }} />
                        总档期: {member.total}
                      </div>
                      <div>
                        <TrophyOutlined style={{ marginRight: 4, color: '#52c41a' }} />
                        已完成: {member.completed}
                      </div>
                      <div>
                        <DollarOutlined style={{ marginRight: 4, color: '#1890ff' }} />
                        收入: ¥{member.revenue}
                      </div>
                    </Space>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}
      <TeamSelector>
        {/* 团队选择器 - 所有用户可见 */}
        <div className="team-label">
          <TeamOutlined />
          选择团队：
        </div>
        <Select
          placeholder="请先选择团队"
          value={selectedTeam?.id}
          onChange={handleTeamChange}
          allowClear
          style={{ width: 200 }}
        >
          {teams.map((team) => (
            <Option key={team.id} value={team.id}>
              {team.name}
            </Option>
          ))}
        </Select>

        {/* 团队成员选择器 - 只有选择团队后才可用 */}
        <div className="team-label">
          <UserOutlined />
          团队成员：
        </div>
        <Select
          placeholder={selectedTeam ? "选择团队成员" : "请先选择团队"}
          value={selectedMember?.id || ''}
          onChange={handleMemberChange}
          allowClear
          disabled={!selectedTeam}
          style={{ width: 200 }}
        >
       
          {teamMembers.map(member => (
            <Option key={member.userId} value={member.userId}>
              {selectedTeam?.name} - {member.user.realName || member.user.nickname}
            </Option>
          ))}
        </Select>
      </TeamSelector>





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
            {/* 使用ScheduleCalendar组件 */}
            <ScheduleCalendar
              schedules={filteredEvents}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onEventClick={handleEventClick}
              loading={loading}
              theme="admin"
            />
          </ContentCard>
        </Col>

        {/* 选中日期的档期列表 */}
        <Col xs={24} lg={8}>
          <ContentCard>
            <Title level={4}>
              {selectedDate.format('YYYY年MM月DD日')} 档期
            </Title>

            {selectedDateSchedules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--admin-text-tertiary)' }}>
                <CalendarOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <div>该日期暂无档期安排</div>
              </div>
            ) : (
              <List
                dataSource={selectedDateSchedules}
                renderItem={schedule => (
                  <List.Item
                    actions={[
                      <Tooltip title="编辑">
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          size="small"
                          onClick={() => openModal(schedule)}
                        />
                      </Tooltip>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          style={{ backgroundColor: getStatusColor(schedule.status) }}
                          icon={<UserOutlined />}
                        >
                          {schedule.user?.realName?.charAt(0)}
                        </Avatar>
                      }
                      title={
                        <div>
                          <div style={{ fontWeight: 500 }}>{schedule.title}</div>
                          <Space size="small">
                            {getStatusTag(schedule.status)}
                            {getTypeTag(schedule.eventType)}
                          </Space>
                        </div>
                      }
                      description={
                        <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                          <div style={{ marginBottom: '4px', fontWeight: 500 }}>
                            <ClockCircleOutlined style={{ marginRight: 6, color: 'var(--admin-primary-color)' }} />
                            <span style={{ fontSize: '14px' }}>
                              {dayjs(schedule.weddingDate).format('YYYY-MM-DD')} {schedule.weddingTime === 'lunch' ? '午餐' : '晚餐'}
                            </span>
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <EnvironmentOutlined style={{ marginRight: 6, color: 'var(--admin-success-color)' }} />
                            {schedule.location || '地点待定'}
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <UserOutlined style={{ marginRight: 6, color: 'var(--admin-functional-purple)' }} />
                            主持人：{schedule.user?.realName || schedule.userId || '待分配'}
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <PhoneOutlined style={{ marginRight: 6, color: 'var(--admin-warning-color)' }} />
                            {schedule.customerName} {schedule.customerPhone}
                          </div>
                          {schedule.notes && (
                            <div style={{ marginTop: '6px', padding: '4px 8px', background: 'var(--admin-bg-layout)', borderRadius: 'var(--admin-border-radius)', fontSize: '12px', color: 'var(--admin-text-secondary)' }}>
                              备注：{schedule.notes}
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </ContentCard>
        </Col>
      </Row>

      {/* 添加/编辑档期模态框 */}
      <Modal
        title={editingSchedule ? '编辑档期' : '添加档期'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="title"
                label="档期标题"
                rules={[{ required: true, message: '请输入档期标题' }]}
              >
                <Input placeholder="请输入档期标题" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="customerName"
                label="客户姓名"
                rules={[{ required: true, message: '请输入客户姓名' }]}
              >
                <Input placeholder="请输入客户姓名" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="customerPhone"
                label="客户电话"
                rules={[
                  { required: true, message: '请输入客户电话' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
                ]}
              >
                <Input placeholder="请输入客户电话" />
              </Form.Item>
            </Col>
          </Row>
        
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="weddingDate" label="婚礼日期" rules={[{ required: true, message: '请选择婚礼日期' }]}>
                <DatePicker
                  value={form.getFieldValue('weddingDate')}
                  onChange={handleWeddingDateChange}
                  placeholder="选择婚礼日期"
                  style={{ width: '100%' }}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="weddingTime" label="婚礼时间" rules={[{ required: true, message: '请选择婚礼时间' }]}>
                <Radio.Group 
                  block 
                  options={options} 
                  value={form.getFieldValue('weddingTime')} 
                  onChange={handleWeddingTimeChange} 
                  defaultValue={'lunch'} 
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="hostId"
                label="主持人"
                rules={[{ required: true, message: '请选择主持人' }]}
              >
                {isAdmin ? (
                  <Select 
                    placeholder={availableHosts.length > 0 ? "请选择可用主持人" : "请先选择日期和时间"}
                    disabled={availableHosts.length === 0}
                    notFoundContent={weddingDate && selectedWeddingTime ? "暂无可用主持人" : "请先选择日期和时间"}
                  >
                    {availableHosts.map(host => (
                      <Option key={host.id} value={host.id}>
                        {host.realName || host.nickname || host.username}
                      </Option>
                    ))}
                  </Select>
                ) : (
                  <Select 
                    placeholder="当前用户"
                    value={user?.id}
                    disabled
                  >
                    <Option value={user?.id}>
                      {user?.realName || user?.nickname || user?.username}
                    </Option>
                  </Select>
                )}
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="酒店名称"
                name="venueName"
                rules={[{ required: true, message: '请输入酒店名称' }]}
              >
                <Input placeholder="请输入酒店名称" />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="venueAddress"
                label="详细地址"
                rules={[{ required: true, message: '请输入详细地址' }]}
              >
                <Input placeholder="请输入详细地址" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  <Option value={ScheduleStatus.AVAILABLE}>可预约</Option>
                  <Option value={ScheduleStatus.CONFIRMED}>已确认</Option>
                  <Option value={ScheduleStatus.COMPLETED}>已完成</Option>
                  <Option value={ScheduleStatus.CANCELLED}>已取消</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="price"
                label="价格"
              >
                <Input placeholder="请输入价格" type="number" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="deposit"
                label="定金"
              >
                <Input placeholder="请输入定金" type="number" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="isPaid"
                label="是否已结清"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label="备注"
          >
            <Input.TextArea
              placeholder="请输入备注信息"
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              {editingSchedule && (
                <>
                  <Popconfirm
                    title="确定要删除这个档期吗？"
                    onConfirm={() => handleDelete(editingSchedule.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>

                  {editingSchedule.status === ScheduleStatus.AVAILABLE && (
                    <Button
                      type="default"
                      onClick={() => updateScheduleStatus(editingSchedule.id, ScheduleStatus.CONFIRMED)}
                    >
                      确认档期
                    </Button>
                  )}

                  {editingSchedule.status === ScheduleStatus.CONFIRMED && (
                    <Button
                      type="default"
                      onClick={() => updateScheduleStatus(editingSchedule.id, ScheduleStatus.COMPLETED)}
                    >
                      标记完成
                    </Button>
                  )}
                </>
              )}

              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingSchedule ? '更新' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 查询可用主持人模态框 */}
      <Modal
        title="查询可用主持人"
        open={searchModalVisible}
        onCancel={() => {
          setSearchModalVisible(false);
          setAvailableHosts([]);
        }}
        footer={null}
        width={800}
      >
        {searchLoading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>正在查询可用主持人...</div>
          </div>
        )}
      </Modal>
    </SchedulesContainer>
  );
};

export default SchedulesPage;