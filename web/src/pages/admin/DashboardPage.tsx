import React, { useState, useEffect } from "react";
import { Row, Col, Button, message, Table } from "antd";
import { TrendType } from "../../types";
import {
  UserOutlined,
  CalendarOutlined,
  PictureOutlined,
  MessageOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { dashboardService } from "../../services";
import { PageViewService } from "../../services/pageViewService";
import { useAppSelector } from "../../store/hooks";
import { useTheme } from "../../hooks/useTheme";
import {
  PageHeader,
  StatCard,
  ContentCard,
} from "../../components/admin/common";
import { UserRole } from "../../types";

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
        let popularPagesResponse: any;
        let viewTrendsResponse: any;

        if (isAdmin) {
          // 管理员获取全部统计数据
          const results = await Promise.all([
            dashboardService.getStats(),
            PageViewService.getAdminStats(7),
            PageViewService.getPopularPages("work", 10),
            PageViewService.getViewTrends("work", undefined, 7),
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
            PageViewService.getPopularPages("work", 10),
            PageViewService.getViewTrends("work", undefined, 7),
          ]);

          statsResponse = results[0];
          adminStatsResponse = results[1];
          popularPagesResponse = results[2];
          viewTrendsResponse = results[3];
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

        // 只有管理员才显示热门页面和访问趋势
        if (isAdmin) {
          if (
            popularPagesResponse?.data &&
            popularPagesResponse.data.length > 0
          ) {
            const mappedPopularPages = popularPagesResponse.data.map(
              (page: any) => ({
                pageType: (page as any).pageType || "",
                pageId: page.pageId || "",
                totalViews: page.totalViews || 0,
                uniqueViews: page.uniqueViews || 0,
              }),
            );
            setPopularPages(mappedPopularPages);
          }
          if (viewTrendsResponse?.data && viewTrendsResponse.data.length > 0) {
            // 确保 viewTrendsResponse 是数组
            const viewTrendsArray = Array.isArray(viewTrendsResponse)
              ? viewTrendsResponse
              : viewTrendsResponse?.data &&
                  Array.isArray(viewTrendsResponse.data)
                ? viewTrendsResponse.data
                : [];
            setViewTrends(viewTrendsArray);
          } else {
            setPopularPages([]);
            setViewTrends([]);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error("加载仪表盘数据失败:", error);
        message.error("加载数据失败，请稍后重试");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);
  // 热门页面表格列配置
  const popularPagesColumns = [
    {
      title: "页面类型",
      dataIndex: "pageType",
      key: "pageType",
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          work: "作品",
          team_member: "团队成员",
          service: "服务",
          about: "关于我们",
        };
        return typeMap[type] || type;
      },
    },
    {
      title: "页面ID",
      dataIndex: "pageId",
      key: "pageId",
    },
    {
      title: "总浏览量",
      dataIndex: "totalViews",
      key: "totalViews",
      sorter: (a: PopularPage, b: PopularPage) => a.totalViews - b.totalViews,
    },
    {
      title: "独立访客",
      dataIndex: "uniqueViews",
      key: "uniqueViews",
      sorter: (a: PopularPage, b: PopularPage) => a.uniqueViews - b.uniqueViews,
    },
  ];

  return (
    <PageContainer>
      <PageHeader title="仪表盘" subtitle="欢迎回来！这里是您的数据概览" />

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

      {/* 页面访问统计 - 仅管理员可见 */}
      {isAdmin && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <ContentCard>
              <h3
                style={{ marginBottom: 16, color: "var(--admin-text-primary)" }}
              >
                热门页面
              </h3>
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
              <h3
                style={{ marginBottom: 16, color: "var(--admin-text-primary)" }}
              >
                访问趋势
              </h3>
              <div style={{ padding: "16px 0" }}>
                {Array.isArray(viewTrends) &&
                  viewTrends.map((trend, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 0",
                        borderBottom:
                          index <
                          (Array.isArray(viewTrends) ? viewTrends.length : 0) -
                            1
                            ? "1px solid var(--admin-border-color)"
                            : "none",
                      }}
                    >
                      <span style={{ color: "var(--admin-text-secondary)" }}>
                        {dayjs(trend.date).format("MM-DD")}
                      </span>
                      <span
                        style={{
                          color: "var(--admin-text-primary)",
                          fontWeight: 600,
                        }}
                      >
                        {trend.views} 次访问
                      </span>
                    </div>
                  ))}
                {(!Array.isArray(viewTrends) || viewTrends.length === 0) &&
                  !loading && (
                    <div
                      style={{
                        textAlign: "center",
                        color: "var(--admin-text-secondary)",
                        padding: "32px 0",
                      }}
                    >
                      暂无访问数据
                    </div>
                  )}
              </div>
            </ContentCard>
          </Col>
        </Row>
      )}
    </PageContainer>
  );
};

export default DashboardPage;
