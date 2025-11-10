import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Space,
  Tag,
  Spin,
  Typography,
  Radio,
  Avatar,
  DatePicker
} from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  TeamOutlined,
  UserOutlined
} from "@ant-design/icons";
import { dashboardService } from "../../../services";
import type { DashboardScheduleStats, TeamScheduleStats } from "../../../types";
import type { RangePickerProps } from "antd/es/date-picker";

const { Title } = Typography;
const { RangePicker } = DatePicker;

const DashboardScheduleStats: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardScheduleStats | null>(null);
  const [statsTimeRange, setStatsTimeRange] = useState<"month" | "quarter" | "year" | "custom">("month");
  const [customDateRange, setCustomDateRange] = useState<[string, string]>(["", ""]);

  // 获取服务端统计数据
  const fetchStats = async () => {
    setLoading(true);
    try {
      // 构造参数
      let params: { startDate?: string; endDate?: string } = {};
      if (
        statsTimeRange === "custom" &&
        customDateRange[0] &&
        customDateRange[1]
      ) {
        params = {
          startDate: customDateRange[0],
          endDate: customDateRange[1],
        };
      }

      // 获取仪表板统计数据
      const response = await dashboardService.getScheduleStats(params);
      
      if (response.success) {
        setStats(response.data || null);
      }
    } catch (error) {
      console.error("获取统计数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [statsTimeRange, customDateRange]);

  const onRangeChange: RangePickerProps['onChange'] = (dates, dateStrings) => {
    if (dates && dates.length === 2) {
      setCustomDateRange([dateStrings[0] || "", dateStrings[1] || ""]);
    } else {
      console.log('Clear');
    }
  };

  // 团队统计表格列定义
  const teamColumns = [
    {
      title: "团队名称",
      dataIndex: "teamName",
      key: "teamName",
      render: (text: string) => (
        <Space>
          <Avatar icon={<TeamOutlined />} />
          <span>{text}</span>
        </Space>
      )
    },
    {
      title: "成员数",
      dataIndex: "memberCount",
      key: "memberCount",
      render: (text: number) => (
        <Tag icon={<UserOutlined />} color="blue">
          {text}
        </Tag>
      )
    },
    {
      title: "总档期数",
      dataIndex: "totalCount",
      key: "totalCount",
      sorter: (a: TeamScheduleStats, b: TeamScheduleStats) => a.totalCount - b.totalCount,
    },
    {
      title: "已完成",
      dataIndex: "completedCount",
      key: "completedCount",
      sorter: (a: TeamScheduleStats, b: TeamScheduleStats) => a.completedCount - b.completedCount,
    },
    {
      title: "总收入",
      dataIndex: "totalRevenue",
      key: "totalRevenue",
      sorter: (a: TeamScheduleStats, b: TeamScheduleStats) => a.totalRevenue - b.totalRevenue,
      render: (text: number) => `¥${text.toFixed(2)}`,
    }
  ];

  return (
    <div>
      {/* 统计时间范围选择器 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space direction="vertical">
            <Radio.Group
              defaultValue="month"
              buttonStyle="solid"
              onChange={(e) => setStatsTimeRange(e.target.value)}
              value={statsTimeRange}
            >
              <Radio.Button value="month">本月</Radio.Button>
              <Radio.Button value="quarter">本季度</Radio.Button>
              <Radio.Button value="year">本年</Radio.Button>
              <Radio.Button value="custom">自定义</Radio.Button>
            </Radio.Group>
            {statsTimeRange === "custom" && (
              <RangePicker onChange={onRangeChange} />
            )}
          </Space>
        </Col>
      </Row>

      {loading ? (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* 统计卡片 */}
          {stats && (
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="总档期数"
                    value={stats.totalCount}
                    prefix={<CalendarOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="已完成"
                    value={stats.completedCount}
                    prefix={<CheckCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="预定中"
                    value={stats.reserveCount}
                    prefix={<CalendarOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="总收入"
                    value={stats.totalRevenue}
                    prefix={<DollarOutlined />}
                    formatter={(value) => `¥${Number(value).toFixed(2)}`}
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* 团队统计表格 */}
          {stats && stats.teamStats && stats.teamStats.length > 0 && (
            <Card 
              title={
                <Space>
                  <TeamOutlined />
                  <span>各团队统计</span>
                </Space>
              }
              style={{ marginBottom: 24 }}
            >
              <Table
                dataSource={stats.teamStats}
                columns={teamColumns}
                rowKey="teamId"
                pagination={false}
                scroll={{ x: true }}
              />
            </Card>
          )}

          {/* 如果没有数据 */}
          {stats && (!stats.teamStats || stats.teamStats.length === 0) && (
            <Card>
              <Title level={4} style={{ textAlign: "center", padding: "40px 0" }}>
                暂无团队统计数据
              </Title>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardScheduleStats;