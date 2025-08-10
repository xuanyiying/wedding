import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Button,
  Calendar,
  message,
  Table} from 'antd';
import { TrendType } from '../../types';
import {
  UserOutlined,
  CalendarOutlined,
  PictureOutlined,
  MessageOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { dashboardService, scheduleService } from '../../services';
import { PageViewService } from '../../services/pageViewService';
import { useAppSelector } from '../../store/hooks';
import { useTheme } from '../../hooks/useTheme';
import { PageHeader, StatCard, ContentCard } from '../../components/admin/common';
import { UserRole } from '../../types';

const PageContainer = styled.div`
  background: var(--admin-bg-layout);
  min-height: 100vh;
  
  .ant-typography-title {
    color: var(--admin-text-primary);
  }
  
  .ant-typography {
    color: var(--admin-text-secondary);
  }
`;



const QuickActions = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  
  .ant-btn {
    flex: 1;
    min-width: 120px;
  }
`;


interface StatData {
  title: string;
  value: number;
  suffix?: string;
  prefix?: React.ReactNode;
  trend?: TrendType;
  trendValue?: number;
}

interface PopularPage {
  pageType: string;
  pageId: string;
  totalViews: number;
  uniqueViews: number;
}

interface ViewTrend {
  date: string;
  views: number;
}


const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatData[]>([]);
  const [popularPages, setPopularPages] = useState<PopularPage[]>([]);
  const [viewTrends, setViewTrends] = useState<ViewTrend[]>([]);
  
  // 检查用户是否为管理员
  const isAdmin = user?.role === UserRole.ADMIN;

  // 初始化admin主题
  const { initTheme } = useTheme();

  useEffect(() => {
    initTheme('admin');
  }, [initTheme]);

  // 数据加载
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        // 根据用户角色决定获取哪些数据
        let statsResponse: any;
        let adminStatsResponse: any;
        let popularPagesResponse: any;
        let viewTrendsResponse: any;
        
        if (isAdmin) {
          // 管理员获取全部统计数据
          const results = await Promise.all([
            dashboardService.getStats(),
            PageViewService.getAdminStats(7),
            PageViewService.getPopularPages('work', 10),
            PageViewService.getViewTrends('work', undefined, 7)
          ]);
          
          statsResponse = results[0];
          adminStatsResponse = results[1];
          popularPagesResponse = results[2];
          viewTrendsResponse = results[3];
        } else {
          // 普通用户获取个人相关数据
          const results = await Promise.all([
            dashboardService.getStats(),
            PageViewService.getAdminStats(7),
            PageViewService.getPopularPages('work', 10),
            PageViewService.getViewTrends('work', undefined, 7)
          ]);
          
          statsResponse = results[0];
          adminStatsResponse = results[1];
          popularPagesResponse = results[2];
          viewTrendsResponse = results[3];
        }

        const statsData = statsResponse.data;
        const adminStats = adminStatsResponse;

        // 根据用户角色设置不同的统计数据
        const formattedStats: StatData[] = [];
        
        if (isAdmin) {
          // 管理员看到全部统计
          formattedStats.push(
            {
              title: '总用户数',
              value: statsData?.totalUsers || 0,
              prefix: <UserOutlined />,
              trend: (statsData?.userTrend || 0) >= 0 ? TrendType.UP : TrendType.DOWN,
              trendValue: Math.abs(statsData?.userTrend || 0)
            },
            {
              title: '本月预订',
              value: statsData?.monthlyBookings || 0,
              prefix: <CalendarOutlined />,
              trend: (statsData?.bookingTrend || 0) >= 0 ? TrendType.UP : TrendType.DOWN,
              trendValue: Math.abs(statsData?.bookingTrend || 0)
            },
            {
              title: '作品数量',
              value: statsData?.totalWorks || 0,
              prefix: <PictureOutlined />,
              trend: (statsData?.workTrend || 0) >= 0 ? TrendType.UP : TrendType.DOWN,
              trendValue: Math.abs(statsData?.workTrend || 0)
            },
            {
              title: '总浏览量',
              value: adminStats?.popularWorks?.reduce((sum: number, page: PopularPage) => sum + page.totalViews, 0) || 0,
              prefix: <EyeOutlined />,
              trend: TrendType.UP,
              trendValue: 0
            }
          );
        } else {
          // 普通用户只看到个人相关统计
          formattedStats.push(
            {
              title: '我的档期',
              value: statsData?.totalSchedules || 0,
              prefix: <CalendarOutlined />,
              trend: (statsData?.bookingTrend || 0) >= 0 ? TrendType.UP : TrendType.DOWN,
              trendValue: Math.abs(statsData?.bookingTrend || 0)
            },
            {
              title: '我的作品',
              value: statsData?.totalWorks || 0,
              prefix: <PictureOutlined />,
              trend: (statsData?.workTrend || 0) >= 0 ? TrendType.UP : TrendType.DOWN,
              trendValue: Math.abs(statsData?.workTrend || 0)
            },
            {
              title: '作品浏览量',
              value: adminStats?.popularWorks?.reduce((sum: number, page: PopularPage) => sum + page.totalViews, 0) || 0,
              prefix: <EyeOutlined />,
              trend: TrendType.UP,
              trendValue: 0
            }
          );
        }

        setStats(formattedStats);
        
        // 只有管理员才显示热门页面和访问趋势
        if (isAdmin) {
          const mappedPopularPages = (popularPagesResponse || []).map((page: any) => ({
            pageType: (page as any).pageType || '',
            pageId: page.pageId || '',
            totalViews: page.totalViews || 0,
            uniqueViews: page.uniqueViews || 0
          }));
          setPopularPages(mappedPopularPages);
          setViewTrends(viewTrendsResponse || []);
        } else {
          setPopularPages([]);
          setViewTrends([]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('加载仪表盘数据失败:', error);
        message.error('加载数据失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);
  // 日历数据状态
  const [calendarData, setCalendarData] = useState<Record<string, { total: number; type: string }>>({});

  // 获取日历数据
  const fetchCalendarData = async (year: number, month: number, userId?: string) => {
    try {
      if (!userId) {
        userId = user?.id;
      }
      if (!userId) {
        message.error('请选择主持人查看档期');
        return;
      }
      const response = await scheduleService.getUserScheduleCalendar(userId, year, month);
      console.log('getUserScheduleCalendar response:', response);
      const data = response.data;

      // 转换数据格式
      const formattedData: Record<string, { total: number; type: string }> = {};
      data?.forEach((dayData: any) => {
        if (dayData.schedules && dayData.schedules.length > 0) {
          const total = dayData.schedules.length;
          // 根据档期状态确定类型
          const hasConfirmed = dayData.schedules.some((s: any) => s.status === 'confirmed');
          const hasPending = dayData.schedules.some((s: any) => s.status === 'pending');

          let type = 'default';
          if (hasConfirmed) {
            type = 'success';
          } else if (hasPending) {
            type = 'warning';
          }

          formattedData[dayData.date] = { total, type };
        }
      });

      setCalendarData(formattedData);
    } catch (error) {
      console.error('获取日历数据失败:', error);
    }
  };



  // 日历面板变化时重新获取数据
  const onPanelChange = (value: Dayjs, mode: string) => {
    if (mode === 'month') {
      fetchCalendarData(value.year(), value.month() + 1);
    }
  };

  // 初始化时获取当前月份的日历数据
  useEffect(() => {
    const now = dayjs();
    fetchCalendarData(now.year(), now.month() + 1);
  }, []);

  // 热门页面表格列配置
  const popularPagesColumns = [
    {
      title: '页面类型',
      dataIndex: 'pageType',
      key: 'pageType',
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          'work': '作品',
          'team_member': '团队成员',
          'service': '服务',
          'about': '关于我们'
        };
        return typeMap[type] || type;
      }
    },
    {
      title: '页面ID',
      dataIndex: 'pageId',
      key: 'pageId'
    },
    {
      title: '总浏览量',
      dataIndex: 'totalViews',
      key: 'totalViews',
      sorter: (a: PopularPage, b: PopularPage) => a.totalViews - b.totalViews
    },
    {
      title: '独立访客',
      dataIndex: 'uniqueViews',
      key: 'uniqueViews',
      sorter: (a: PopularPage, b: PopularPage) => a.uniqueViews - b.uniqueViews
    }
  ];


  const dateCellRender = (value: Dayjs) => {
    const dateKey = value.format('YYYY-MM-DD');
    const data = calendarData[dateKey];
    if (data) {
      return (
        <div style={{ textAlign: 'center', fontSize: '12px' }}>
          <div>{data.total}个档期</div>
        </div>
      );
    }
    return null;
  };

  return (
    <PageContainer>
      <PageHeader
        title="仪表盘"
        subtitle="欢迎回来！这里是您的数据概览"
      />

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <StatCard
              title={stat.title}
              value={stat.value}
              prefix={stat.prefix}
              suffix={stat.suffix}
              loading={loading}
            />
          </Col>
        ))}
      </Row>



      <ContentCard>
        <h3 style={{ marginBottom: 16, color: 'var(--admin-text-primary)' }}>快速操作</h3>
        <QuickActions>
          <Button
            type="primary"
            icon={<CalendarOutlined />}
            onClick={() => navigate('/admin/schedules')}
          >
            新建档期
          </Button>
          <Button
            icon={<UserOutlined />}
            onClick={() => navigate('/admin/users')}
          >
            添加用户
          </Button>
          <Button
            icon={<PictureOutlined />}
            onClick={() => navigate('/admin/works')}
          >
            上传作品
          </Button>
          <Button
            icon={<MessageOutlined />}
            onClick={() => navigate('/admin/settings')}
          >
            系统设置
          </Button>
        </QuickActions>
      </ContentCard>

      {/* 页面访问统计 - 仅管理员可见 */}
      {isAdmin && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <ContentCard>
              <h3 style={{ marginBottom: 16, color: 'var(--admin-text-primary)' }}>热门页面</h3>
              <Table
                columns={popularPagesColumns}
                dataSource={popularPages}
                rowKey={(record) => `${record.pageType}-${record.pageId}`}
                pagination={{ pageSize: 5 }}
                size="small"
                loading={loading}
              />
            </ContentCard>
          </Col>
          <Col xs={24} lg={12}>
            <ContentCard>
              <h3 style={{ marginBottom: 16, color: 'var(--admin-text-primary)' }}>访问趋势</h3>
              <div style={{ padding: '16px 0' }}>
                {viewTrends.map((trend, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: index < viewTrends.length - 1 ? '1px solid var(--admin-border-color)' : 'none'
                  }}>
                    <span style={{ color: 'var(--admin-text-secondary)' }}>
                      {dayjs(trend.date).format('MM-DD')}
                    </span>
                    <span style={{ 
                      color: 'var(--admin-text-primary)',
                      fontWeight: 600
                    }}>
                      {trend.views} 次访问
                    </span>
                  </div>
                ))}
                {viewTrends.length === 0 && !loading && (
                  <div style={{ 
                    textAlign: 'center', 
                    color: 'var(--admin-text-secondary)',
                    padding: '32px 0'
                  }}>
                    暂无访问数据
                  </div>
                )}
              </div>
            </ContentCard>
          </Col>
        </Row>
      )}


      {/* 最近活动 */}
      {/*<Col xs={24} lg={8}>
          <ContentCard>
            <h3 style={{ marginBottom: 16, color: 'var(--admin-text-primary)' }}>最近活动</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {activities.length > 0 ? (
                activities.map(activity => (
                  <ActivityItem key={activity.id}>
                    <Avatar icon={getActivityIcon(activity.type)} />
                    <div className="activity-content">
                       <div className="activity-title">{activity.title}</div>
                       <div>{activity.description}</div>
                       <div className="activity-time">{dayjs(activity.time).format('MM-DD HH:mm')}</div>
                     </div>
                  </ActivityItem>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--admin-text-tertiary)' }}>
                  暂无活动记录
                </div>
              )}
            </div>
          </ContentCard>
        </Col>*/}

      {/* 系统状态 */}
      {/* <Col xs={24} lg={8}>
          <ContentCard title="系统状态" loading={loading}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text>CPU使用率</Text>
                <Progress percent={45} size="small" />
              </div>
              <div>
                <Text>内存使用率</Text>
                <Progress percent={67} size="small" status="active" />
              </div>
              <div>
                <Text>磁盘使用率</Text>
                <Progress percent={23} size="small" />
              </div>
              <div>
                <Text>网络状态</Text>
                <Progress percent={89} size="small" status="success" />
              </div>
            </Space>
          </ContentCard>
        </Col>*/}


      <ContentCard>
        <h3 style={{ marginBottom: 16, color: 'var(--admin-text-primary)' }}>档期日历</h3>
        <Calendar
          fullscreen={false}
          cellRender={dateCellRender}
          onPanelChange={onPanelChange}
        />
      </ContentCard>

    </PageContainer>
  );
};

export default DashboardPage;