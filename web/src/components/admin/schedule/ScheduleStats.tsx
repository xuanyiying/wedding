import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  DatePicker,
  Space,
  Radio,
  Flex,
} from "antd";
import {
  BarChartOutlined,
  TrophyOutlined,
  MoneyCollectOutlined,
} from "@ant-design/icons";
import { StatCard } from "../common";
import { useAppSelector } from "../../../store";
import { scheduleService } from "../../../services";
import styled from "styled-components";
import type { RangePickerProps } from "antd/es/date-picker";
const { RangePicker } = DatePicker;

// 添加响应式样式
const StatsContainer = styled.div`
  .ant-row {
    margin-bottom: 16px;

    @media (max-width: 768px) {
      .ant-col {
        margin-bottom: 12px;
      }
    }
  }

  // 统计卡片在移动端一行展示

  .stats-card-row {
    @media (max-width: 768px) {
      flex-wrap: nowrap;
      overflow-x: auto;
      margin-bottom: 16px;

      .ant-col {
        flex: 0 0 auto;
        width: auto;
        min-width: 120px;
        margin-right: 8px;
      }
    }
  }

  // 日期选择器在移动端适配

  .custom-date-range {
    @media (max-width: 768px) {
      .ant-picker {
        width: 100%;
        max-width: 280px;
      }
    }
  }
`;

// 个人档期统计数据接口
interface PersonalScheduleStats {
  userId: string;
  realName: string;
  avatarUrl?: string;
  scheduleCount: number;
  completedCount: number;
  revenue: number;
}

const ScheduleStats: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [personalStats, setPersonalStats] = useState<PersonalScheduleStats | null>(null);
  const [statsTimeRange, setStatsTimeRange] = useState<
    "month" | "quarter" | "year" | "custom"
  >("month");
  const [customDateRange, setCustomDateRange] = useState<[string, string]>([
    "",
    "",
  ]);
  
  // 获取当前用户信息
  const currentUser = useAppSelector((state) => state.auth.user);

  // 获取服务端统计数据
  const fetchServerStats = async () => {
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

      // 获取个人统计数据
      if (currentUser?.id) {
        const personalStatsResponse = await scheduleService.getPersonalScheduleStats({
          userId: currentUser.id,
          ...params
        });
        
        if (personalStatsResponse.success) {
          setPersonalStats(personalStatsResponse.data);
        }
      }
    } catch (error) {
      console.error("获取统计数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServerStats();
  }, [statsTimeRange, customDateRange, currentUser?.id]);


  const onRangeChange: RangePickerProps['onChange'] = (dates, dateStrings) => {
    if (dates && dates.length === 2) {
      setCustomDateRange([dateStrings[0] || "", dateStrings[1] || ""]);
    } else {
      console.log('Clear');
    }
  };

  return (
    <StatsContainer>
      {/* 统计时间范围选择器 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space wrap>
            <Flex vertical gap="middle">
              <Radio.Group
                defaultValue="month"
                buttonStyle="solid"
                name="statsTimeRange"
                onChange={(e) => {
                  setStatsTimeRange(e.target.value);
                }}
                value={statsTimeRange}
              >
                <Radio.Button value="month">本月</Radio.Button>
                <Radio.Button value="quarter">本季度</Radio.Button>
                <Radio.Button value="year">本年</Radio.Button>
                <Radio.Button value="custom">自定义</Radio.Button>
              </Radio.Group>
              {statsTimeRange === "custom" && (
                <div className="custom-date-range">
                  <RangePicker onChange={onRangeChange} />
                </div>
              )}
            </Flex>
          </Space>
        </Col>
      </Row>

      {/* 个人统计卡片 */}
      {personalStats && !loading && (
        <Row gutter={[16, 16]} className="stats-card-row" style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="档期数"
            value={personalStats?.scheduleCount || 0}
            prefix={<BarChartOutlined style={{ color: "#1890ff" }} />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="已完成"
            value={personalStats?.completedCount || 0}
            prefix={<TrophyOutlined style={{ color: "#52c41a" }} />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="收入"
            value={personalStats?.revenue || 0}
            prefix={<MoneyCollectOutlined style={{ color: "#f5222d" }} />}
            suffix="元"
          />
        </Col>
      </Row>
        )}
    </StatsContainer>
  );
};

export default ScheduleStats;