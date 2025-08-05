import React from 'react';
import { Select, Radio } from 'antd';
import styled from 'styled-components';
import type { User } from '../../types';

const { Option } = Select;

const FilterContainer = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

interface ScheduleFilterProps {
  hosts: User[];
  selectedHost: string;
  selectedStatus: string;
  onHostChange: (host: string) => void;
  onStatusChange: (status: string) => void;
}

const ScheduleFilter: React.FC<ScheduleFilterProps> = ({ hosts, selectedHost, selectedStatus, onHostChange, onStatusChange }) => {
  return (
    <FilterContainer>
      <Select value={selectedHost} onChange={onHostChange} style={{ width: 150 }}>
        <Option value="all">所有主持人</Option>
        {hosts.map(host => (
          <Option key={host.id} value={host.id}>{host.realName || host.nickname}</Option>
        ))}
      </Select>
      <Radio.Group onChange={(e) => onStatusChange(e.target.value)} value={selectedStatus}>
        <Radio.Button value="all">全部</Radio.Button>
        <Radio.Button value="available">可预约</Radio.Button>
        <Radio.Button value="booked">满档</Radio.Button>
      </Radio.Group>
    </FilterContainer>
  );
};

export default ScheduleFilter;