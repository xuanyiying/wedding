import React, { useState, useEffect } from "react";
import { Row, Col, Button, message } from "antd";
import { TrendType } from "../../types";
import {
  UserOutlined,
  CalendarOutlined,
  PictureOutlined,
  MessageOutlined,
  EyeOutlined,
  TeamOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { dashboardService } from "../../services";
import { PageViewService } from "../../services/page-view.ts";
import { useAppSelector } from "../../store";
import { useTheme } from "../../hooks/useTheme";
import {
  PageHeader,
  StatCard,
  ContentCard,
} from "../../components/admin/common";
import { UserRole } from "../../types";
import DashboardScheduleCard  from "../../components/admin/dashbord/DashboardScheduleCard.tsx";

const PageContainer = styled.div`
  background: var(--admin-bg-layout);
  min-height: 100vh;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;

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

`;

interface StatData {
  title: string;
  value: number;
  suffix?: string;
  prefix?: React.ReactNode;
  trend?: TrendType;
  trendValue?: number;
}

interface TodayScheduleStats {
  totalSchedules: number;
  teamSchedules: number;
  personalSchedules: number;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatData[]>([]);
  const [todayScheduleStats, setTodayScheduleStats] = useState<TodayScheduleStats>({
    totalSchedules: 0,
    teamSchedules: 0,
    personalSchedules: 0,
  });

  // 检查用户是否为管理员
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  // 初始化admin主题
  const { initTheme } = useTheme();

  useEffect(() => {
    initTheme("admin");
  }, [initTheme]);

  // 数据加载
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        // 根据用户角色决定获取哪些数据
        let statsResponse: any;
        let adminStatsResponse: any;

        if (isAdmin) {
          // 管理员获取全部统计数据
          const results = await Promise.all([
            dashboardService.getStats(),
            PageViewService.getAdminStats(7),
          ]);

          statsResponse = results[0];
          adminStatsResponse = results[1];
        } else {
          // 普通用户获取个人相关数据
          const results = await Promise.all([
            dashboardService.getStats(),
            PageViewService.getAdminStats(7),
          ]);

          statsResponse = results[0];
          adminStatsResponse = results[1];
        }

        const statsData = statsResponse?.data || {};
        const adminStats = adminStatsResponse || {};

        // 根据用户角色设置不同的统计数据
        const formattedStats: StatData[] = [];

        if (isAdmin) {
          // 管理员看到全部统计
          formattedStats.push(
            {
              title: "总用户数",
              value: Number(statsData.totalUsers) || 0,
              prefix: <UserOutlined />,
              trend:
                (statsData.userTrend || 0) >= 0 ? TrendType.UP : TrendType.DOWN,
              trendValue: Math.abs(statsData.userTrend || 0),
            },
            {
              title: "本月预订",
              value: Number(statsData.monthlyBookings) || 0,
              prefix: <CalendarOutlined />,
              trend:
                (statsData.bookingTrend || 0) >= 0
                  ? TrendType.UP
                  : TrendType.DOWN,
              trendValue: Math.abs(statsData.bookingTrend || 0),
            },
            {
              title: "作品数量",
              value: Number(statsData.totalWorks) || 0,
              prefix: <PictureOutlined />,
              trend:
                (statsData.workTrend || 0) >= 0 ? TrendType.UP : TrendType.DOWN,
              trendValue: Math.abs(statsData.workTrend || 0),
            },
            {
              title: "总浏览量",
              value: Number(adminStats.totalViews) || 0,
              prefix: <EyeOutlined />,
              trend: TrendType.UP,
              trendValue: 0,
            },
          );
        } else {
          // 普通用户只看到个人相关统计
          formattedStats.push(
            {
              title: "我的档期",
              value: Number(statsData.totalSchedules) || 0,
              prefix: <CalendarOutlined />,
              trend:
                (statsData.bookingTrend || 0) >= 0
                  ? TrendType.UP
                  : TrendType.DOWN,
              trendValue: Math.abs(statsData.bookingTrend || 0),
            },
            {
              title: "我的作品",
              value: Number(statsData.totalWorks) || 0,
              prefix: <PictureOutlined />,
              trend:
                (statsData.workTrend || 0) >= 0 ? TrendType.UP : TrendType.DOWN,
              trendValue: Math.abs(statsData.workTrend || 0),
            },
            {
              title: "作品浏览量",
              value: Number(adminStats.totalViews) || 0,
              prefix: <EyeOutlined />,
              trend: TrendType.UP,
              trendValue: 0,
            },
          );
        }

        console.log("Formatted Stats:", formattedStats);

        setStats(formattedStats);

        // 获取今日档期统计数据
        try {
          const todayStatsResponse = await dashboardService.getTodayScheduleStats();
          if (todayStatsResponse?.data) {
            setTodayScheduleStats({
              totalSchedules: todayStatsResponse.data.totalSchedules || 0,
              teamSchedules: todayStatsResponse.data.teamSchedules || 0,
              personalSchedules: todayStatsResponse.data.personalSchedules || 0,
            });
          }
        } catch (error) {
          console.error('获取今日档期统计失败:', error);
        }

        // 只有管理员才显示热门页面和访问趋势

        setLoading(false);
      } catch (error) {
        console.error("加载仪表盘数据失败:", error);
        message.error("加载数据失败，请稍后重试");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAdmin]);
  return (
    <PageContainer>
      <PageHeader title="仪表盘" subtitle="欢迎回来！这里是您的数据概览" />

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {stats.map((stat, index) => (
          <Col xs={12} sm={12} md={12} lg={6} key={index}>
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
        <h3 style={{ marginBottom: 16, color: "var(--admin-text-primary)" }}>
          快速操作
        </h3>
        <QuickActions>
          <Button
            type="primary"
            icon={<CalendarOutlined />}
            onClick={() => navigate("/admin/schedules")}
          >
            新建档期
          </Button>
          <Button
            icon={<UserOutlined />}
            onClick={() => navigate("/admin/users")}
          >
            添加用户
          </Button>
          <Button
            icon={<PictureOutlined />}
            onClick={() => navigate("/admin/works")}
          >
            上传作品
          </Button>
          <Button
            icon={<MessageOutlined />}
            onClick={() => navigate("/admin/settings")}
          >
            系统设置
          </Button>
        </QuickActions>
      </ContentCard>

      {/* 今日档期统计模块 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <ContentCard>
            <h3 style={{ marginBottom: 16, color: "var(--admin-text-primary)" }}>
              <ClockCircleOutlined style={{ marginRight: 8 }} />
              今日档期统计
            </h3>
            <Row gutter={[16, 16]}>
              <Col xs={8} sm={8} md={8} lg={8}>
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  padding: '20px',
                  color: 'white',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '80px',
                    height: '80px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%'
                  }} />
                  <CalendarOutlined style={{ fontSize: '32px', marginBottom: '12px', position: 'relative', zIndex: 1 }} />
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', position: 'relative', zIndex: 1 }}>
                    {todayScheduleStats.totalSchedules}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.9, position: 'relative', zIndex: 1 }}>
                    总档期数
                  </div>
                </div>
              </Col>
              <Col xs={8} sm={8} md={8} lg={8}>
                <div style={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  borderRadius: '12px',
                  padding: '20px',
                  color: 'white',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '80px',
                    height: '80px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%'
                  }} />
                  <TeamOutlined style={{ fontSize: '32px', marginBottom: '12px', position: 'relative', zIndex: 1 }} />
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', position: 'relative', zIndex: 1 }}>
                    {todayScheduleStats.teamSchedules}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.9, position: 'relative', zIndex: 1 }}>
                    团队档期数
                  </div>
                </div>
              </Col>
              <Col xs={8} sm={8} md={8} lg={8}>
                <div style={{
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  borderRadius: '12px',
                  padding: '20px',
                  color: 'white',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '80px',
                    height: '80px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%'
                  }} />
                  <UserOutlined style={{ fontSize: '32px', marginBottom: '12px', position: 'relative', zIndex: 1 }} />
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', position: 'relative', zIndex: 1 }}>
                    {todayScheduleStats.personalSchedules}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.9, position: 'relative', zIndex: 1 }}>
                    个人档期数
                  </div>
                </div>
              </Col>
            </Row>
            <div style={{ marginTop: '16px' }}>
              <DashboardScheduleCard />
            </div>
          </ContentCard>
        </Col>
      </Row>

      {/* 页面访问统计 - 仅管理员可见 */}

    </PageContainer>
  );
};

export default DashboardPage;
