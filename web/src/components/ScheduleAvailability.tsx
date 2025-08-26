import React, { useState, useEffect, useCallback } from 'react';
import { Card, DatePicker, Button, List, Tag, Typography, Space, Spin, message } from 'antd';
import { CalendarOutlined, UserOutlined, CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { scheduleService, type DayAvailability } from '../services/scheduleService';

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface ScheduleAvailabilityProps {
  onSelectDate?: (date: string, availability: DayAvailability) => void;
}

const ScheduleAvailability: React.FC<ScheduleAvailabilityProps> = ({ onSelectDate }) => {
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs(),
    dayjs().add(30, 'day')
  ]);

  const fetchAvailability = useCallback(async () => {
    if (!dateRange[0]) return;

    setLoading(true);
    try {
      const data = await scheduleService.getAvailability(dateRange[0].format('YYYY-MM-DD'));
      setAvailability(data);
    } catch (error) {
      console.error('获取日程可用性失败:', error);
      message.error('获取日程可用性失败');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAvailability();
  }, [dateRange, fetchAvailability]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'partial':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'unavailable':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <CalendarOutlined />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'partial':
        return 'warning';
      case 'unavailable':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return '可预约';
      case 'partial':
        return '部分可用';
      case 'unavailable':
        return '不可预约';
      default:
        return '未知';
    }
  };

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  const handleDateSelect = (item: DayAvailability) => {
    if (onSelectDate) {
      onSelectDate(item.date, item);
    }
  };

  return (
    <Card title="日程可用性查询" className="schedule-availability">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Text strong>选择查询日期范围：</Text>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            format="YYYY-MM-DD"
            style={{ marginLeft: 8 }}
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
          <Button
            type="primary"
            onClick={fetchAvailability}
            loading={loading}
            style={{ marginLeft: 8 }}
          >
            查询
          </Button>
        </div>

        <Spin spinning={loading}>
          <List
            dataSource={availability}
            renderItem={(item) => (
              <List.Item
                key={item.date}
                className={`availability-item status-${item.status}`}
                onClick={() => handleDateSelect(item)}
                style={{
                  cursor: onSelectDate ? 'pointer' : 'default',
                  padding: '16px',
                  border: '1px solid #f0f0f0',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  transition: 'all 0.3s ease',
                }}
              >
                <List.Item.Meta
                  avatar={getStatusIcon(item.status)}
                  title={
                    <Space>
                      <Text strong>{dayjs(item.date).format('YYYY年MM月DD日 dddd')}</Text>
                      <Tag color={getStatusColor(item.status)}>
                        {getStatusText(item.status)}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <Text>{item.message}</Text>
                      {item.availableHosts && item.availableHosts.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary">
                            <UserOutlined /> 可用主持人：
                            {item.availableHosts.map((host) => host.nickname).join('、')}
                          </Text>
                        </div>
                      )}
                      {item.bookedEvents && (
                        <div style={{ marginTop: 8 }}>
                          <Space>
                            {item.bookedEvents.lunch && (
                              <Tag color="orange">午宴已预约</Tag>
                            )}
                            {item.bookedEvents.dinner && (
                              <Tag color="purple">晚宴已预约</Tag>
                            )}
                          </Space>
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
            locale={{ emptyText: '暂无数据' }}
          />
        </Spin>
      </Space>

      <style>{`
        .availability-item:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }
        
        .availability-item.status-available {
          border-left: 4px solid #52c41a;
        }
        
        .availability-item.status-partial {
          border-left: 4px solid #faad14;
        }
        
        .availability-item.status-unavailable {
          border-left: 4px solid #ff4d4f;
          opacity: 0.7;
        }
      `}</style>
    </Card>
  );
};

export default ScheduleAvailability;