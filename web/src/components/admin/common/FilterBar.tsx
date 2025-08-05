import React from 'react';
import { Space, Input, Select, DatePicker, Button } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import styled from 'styled-components';


const { Search } = Input;
const { RangePicker } = DatePicker;

const FilterContainer = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: center;
  padding: 16px;
  background: var(--admin-bg-container);
  border-radius: 8px;
  border: 1px solid var(--admin-border-color);
  
  .ant-select {
    min-width: 120px;
  }
  
  .ant-input-search {
    min-width: 200px;
  }
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    
    .ant-select,
    .ant-input-search {
      min-width: auto;
      width: 100%;
    }
  }
`;

interface FilterOption {
  label: string;
  value: string | number;
}

interface FilterConfig {
  key: string;
  type: 'search' | 'select' | 'dateRange' | 'date';
  placeholder?: string;
  options?: FilterOption[];
  allowClear?: boolean;
  mode?: 'multiple' | 'tags';
  style?: React.CSSProperties;
}

interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onReset?: () => void;
  showReset?: boolean;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  values,
  onChange,
  onReset,
  showReset = true,
  loading = false,
  className,
  style,
}) => {
  const renderFilter = (filter: FilterConfig) => {
    const commonProps = {
      key: filter.key,
      value: values[filter.key],
      onChange: (value: any) => onChange(filter.key, value),
      placeholder: filter.placeholder,
      allowClear: filter.allowClear ?? true,
      style: filter.style,
      disabled: loading,
    };

    switch (filter.type) {
      case 'search':
        return (
          <Search
            {...commonProps}
            prefix={<SearchOutlined />}
            enterButton
            onSearch={(value) => onChange(filter.key, value)}
          />
        );

      case 'select':
        return (
          <Select
            {...commonProps}
            mode={filter.mode}
            options={filter.options}
          />
        );

      case 'dateRange':
        return (
          <RangePicker
            {...commonProps}
            placeholder={filter.placeholder ? [filter.placeholder, filter.placeholder] : undefined}
          />
        );

      case 'date':
        return (
          <DatePicker
            {...commonProps}
          />
        );

      default:
        return null;
    }
  };

  return (
    <FilterContainer className={className} style={style}>
      <Space wrap size="middle" style={{ flex: 1 }}>
        {filters.map(renderFilter)}
      </Space>
      
      {showReset && onReset && (
        <Button
          icon={<ReloadOutlined />}
          onClick={onReset}
          disabled={loading}
        >
          重置
        </Button>
      )}
    </FilterContainer>
  );
};

export default FilterBar;