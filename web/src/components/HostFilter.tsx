import React, { useState } from 'react';
import { Button, DatePicker, Row, Col, Card, Avatar, Typography, message, Radio, type RadioChangeEvent } from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import styled from 'styled-components';
import { scheduleService } from '../services';
import type { User } from '../types';
import type { CheckboxGroupProps } from 'antd/es/checkbox';
import type { ClientTeamMember } from '../hooks/useTeamData';

const { Title } = Typography;

// 组件属性接口
interface HostSearchFilterProps {
  scheduleEvents: any[];
  teamMembers: ClientTeamMember[];
  selectedHost: string;
  selectedStatus: string;
  setSelectedHost: (host: string) => void;
  setSelectedStatus: (status: string) => void;
  selectedDate?: Dayjs;
  setSelectedDate?: (date: Dayjs) => void;
}

// 样式组件
const FilterContainer = styled.div`
  background: var(--client-bg-container);
  padding: 24px;
  border-radius: var(--client-border-radius-lg);
  border: 1px solid var(--client-border-color);
  margin-bottom: 32px;
  box-shadow: var(--client-shadow-sm);
`;



const SearchForm = styled.div`
  display: flex;
  gap: 16px;
  align-items: end;
  flex-wrap: wrap;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const FormItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  label {
    font-weight: 500;
    color: var(--client-text-primary);
    white-space: nowrap;
    font-size: 14px;
  }
`;

const HostCard = styled(Card)`
  .ant-card-body {
    padding: 16px;
  }
  
  .ant-card-meta-title {
    color: var(--client-text-primary);
  }
  
  .ant-card-meta-description {
    color: var(--client-text-secondary);
  }
  
  &:hover {
    box-shadow: var(--client-shadow-md);
    transform: translateY(-2px);
    transition: all 0.3s ease;
  }
`;

const HostFilter: React.FC<HostSearchFilterProps> = ({
  }) => {
  const [searchWeddingTime, setSearchWeddingTime] = useState<'lunch' | 'dinner' | null>(null);
  const [searchWeddingDate, setSearchWeddingDate] = useState<Dayjs | null>(null);
  
  const [searchLoading, setSearchLoading] = useState(false);
  const [availableHosts, setAvailableHosts] = useState<User[]>([]);
  const options: CheckboxGroupProps<string>['options'] = [
    { label: '午宴', value: 'lunch' },
    { label: '晚宴', value: 'dinner' },
  ];
  // 查询可用主持人
  const searchAvailableHosts = async () => {
    if (!searchWeddingDate) {
      message.warning('请选择婚礼时间和日期');
      return;
    }
  
    setSearchLoading(true);
    try {
      const params: any = {
        weddingTime: searchWeddingTime,
        weddingDate: searchWeddingDate.format('YYYY-MM-DD')
      };
      
      
      const response = await scheduleService.getAvailableHosts(params);
      if (response.success && response.data?.users) {
        setAvailableHosts(response.data.users);
        message.success(`找到 ${response.data.total} 位可用主持人`);
      } else {
        setAvailableHosts([]);
        message.error(response.message || '查询失败');
      }
    } catch (error) {
      console.error('查询可用主持人失败:', error);
      message.error('查询失败，请稍后重试');
    } finally {
      setSearchLoading(false);
    }
  };
const onWeddingTimeChange = (e: RadioChangeEvent) => {
    setSearchWeddingTime(e.target.value);
  };
  return (
    <FilterContainer>
      {/* 可用主持人查询区域 */}

        <SearchForm>
          <FormItem>
            <DatePicker
              value={searchWeddingDate}
              onChange={setSearchWeddingDate}
              placeholder="选择婚礼日期"
              style={{ width: 200 }}
            />
          </FormItem>
          
          <FormItem>
            <Radio.Group block options={options} defaultValue="lunch" onChange={onWeddingTimeChange} /> 
          </FormItem>
          
          
          <FormItem>
            <Button 
              type="primary" 
              icon={<SearchOutlined />}
              onClick={searchAvailableHosts}
              loading={searchLoading}
              style={{
                background: 'var(--client-primary-color)',
                borderColor: 'var(--client-primary-color)'
              }}
            >
              查询
            </Button>
          </FormItem>
        </SearchForm>
        
        {/* 查询结果 */}
        {availableHosts.length > 0 && (
          <div>
            <Title level={5} style={{ marginBottom: 16, color: 'var(--client-text-primary)' }}>
              可用主持人 ({availableHosts.length}位)
            </Title>
            <Row gutter={[16, 16]}>
              {availableHosts.map(host => (
                <Col key={host.id} xs={24} sm={12} md={8} lg={6}>
                  <HostCard hoverable size="small">
                    <Card.Meta
                      avatar={<Avatar src={host.avatarUrl} icon={<UserOutlined />} />}
                      title={host.realName || host.username}
                      description={
                        <div>
                          <div>{host.specialties || '专业主持人'}</div>
                          {host.experienceYears && (
                            <div style={{ fontSize: '12px', color: 'var(--client-text-tertiary)' }}>
                              {host.experienceYears}年经验
                            </div>
                          )}
                        </div>
                      }
                    />
                  </HostCard>
                </Col>
              ))}
            </Row>
          </div>
        )}
    </FilterContainer>
  );
};

export default HostFilter;
export type { HostSearchFilterProps };