import React from 'react';
import { Select, Space, DatePicker, Typography } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { Dayjs } from 'dayjs';
import type { Schedule, TeamMember } from '../../types';

// 档期事件接口
interface ScheduleEvent extends Schedule {
  hostName: string;
}

const { Option } = Select;
const { Text } = Typography;

const FilterContainer = styled.div`
  padding: 16px;
  background: var(--admin-bg-container);
  border-radius: var(--admin-border-radius);
  margin-bottom: 16px;
  border: 1px solid var(--admin-border-color);
`;

const FilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  
  .filter-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
    color: var(--admin-text-primary);
    min-width: 80px;
  }
`;

interface HostFilterProps {
  scheduleEvents: ScheduleEvent[];
  teamMembers: TeamMember[];
  selectedHost: string;
  setSelectedHost: (hostId: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  selectedDate: Dayjs;
  setSelectedDate: (date: Dayjs) => void;
}

const HostFilter: React.FC<HostFilterProps> = ({
  scheduleEvents,
  selectedHost,
  setSelectedHost,
  selectedStatus,
  setSelectedStatus,
  selectedDate,
  setSelectedDate
}) => {
  // 从档期事件中提取所有主持人
  const getHostsFromSchedules = () => {
    const hostMap = new Map();
    
    scheduleEvents.forEach(event => {
      if (event.user) {
        hostMap.set(event.user.id, {
          id: event.user.id,
          realName: event.user.realName,
          username: event.user.username
        });
      }
    });
    
    return Array.from(hostMap.values());
  };

  const hosts = getHostsFromSchedules();

  return (
    <FilterContainer>
      <FilterRow>
        <div className="filter-label">
          <FilterOutlined />
          筛选条件：
        </div>
        
        <Space size="middle" wrap>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text>主持人：</Text>
            <Select
              placeholder="选择主持人"
              value={selectedHost || undefined}
              onChange={setSelectedHost}
              allowClear
              style={{ width: 150 }}
            >
              {hosts.map(host => (
                <Option key={host.id} value={host.id}>
                  {host.realName || host.username}
                </Option>
              ))}
            </Select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text>状态：</Text>
            <Select
              placeholder="档期状态"
              value={selectedStatus || undefined}
              onChange={setSelectedStatus}
              allowClear
              style={{ width: 120 }}
            >
              <Option value="available">可预约</Option>
              <Option value="confirmed">已确认</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text>日期：</Text>
            <DatePicker
              value={selectedDate}
              onChange={(date) => date && setSelectedDate(date)}
              placeholder="选择日期"
              style={{ width: 150 }}
            />
          </div>
        </Space>
      </FilterRow>
    </FilterContainer>
  );
};

export default HostFilter;