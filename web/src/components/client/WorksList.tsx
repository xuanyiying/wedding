import React, { useState, useEffect, useMemo } from 'react';
import { Input, Select, Pagination, Spin } from 'antd';
import styled from 'styled-components';
import { workService } from '../../services';
import { type Work, WorkCategory, WorkType } from '../../types';
import { DEFAULT_WORK_PAGE_SIZE } from '../../constants';
import { useDebounce } from '../../hooks/';
import WorkCard from './WorkCard';
import WorkDetailModal from './WorkDetailModal';

const { Search } = Input;
const { Option } = Select;

const WorksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 32px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
  }
`;

const FilterSection = styled.div`
  background: var(--client-bg-container);
  padding: 24px;
  border-radius: var(--client-border-radius-lg);
  border: 1px solid var(--client-border-color);
  margin-bottom: 32px;
  box-shadow: var(--client-shadow-sm);
`;

const FilterRow = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const FilterItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  label {
    font-weight: 500;
    color: var(--client-text-primary);
    white-space: nowrap;
  }
`;

const PaginationContainer = styled.div`
  text-align: center;
`;

interface WorksListProps {
  showFilters?: boolean;
  showPagination?: boolean;
  initialParams?: object;
  limit?: number;
}

const WorksList: React.FC<WorksListProps> = ({ showFilters = true, showPagination = true, initialParams = {}, limit = DEFAULT_WORK_PAGE_SIZE }) => {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const debouncedSearchText = useDebounce(searchText, 500);
  const memoizedInitialParams = useMemo(() => initialParams, [JSON.stringify(initialParams)]);

  useEffect(() => {
    const fetchWorks = async () => {
      setLoading(true);
      try {
        const params = {
          page: currentPage,
          limit: limit,
          title: debouncedSearchText,
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          type: selectedType === 'all' ? undefined : selectedType,
          status: 'published',
          ...memoizedInitialParams,
        };
        const response = await workService.getWorks(params);
        setWorks(response.data?.works || []);
        setTotal(response.data?.total || 0);
      } catch (error) {
        console.error('Failed to fetch works:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorks();
  }, [currentPage, debouncedSearchText, selectedCategory, selectedType, memoizedInitialParams, limit]);

  const handleCardClick = (work: Work) => {
    setSelectedWork(work);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedWork(null);
  };

  return (
    <div>
      {showFilters && (
        <FilterSection>
          <FilterRow>
            <FilterItem style={{ flex: 1 }}>
              <Search
                placeholder="搜索作品..."
                onSearch={setSearchText}
                enterButton
              />
            </FilterItem>
            <FilterItem>
              <label>分类:</label>
              <Select value={selectedCategory} onChange={setSelectedCategory} style={{ width: 120 }}>
                <Option value="all">全部</Option>
                {Object.values(WorkCategory).map(cat => (
                  <Option key={cat} value={cat}>{cat}</Option>
                ))}
              </Select>
            </FilterItem>
            <FilterItem>
              <label>类型:</label>
              <Select value={selectedType} onChange={setSelectedType} style={{ width: 120 }}>
                <Option value="all">全部</Option>
                {Object.values(WorkType).map(type => (
                  <Option key={type} value={type}>{type}</Option>
                ))}
              </Select>
            </FilterItem>
          </FilterRow>
        </FilterSection>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <WorksGrid>
          {works && works.length > 0 && works.map(work => (
            <WorkCard key={work.id} work={work} onClick={handleCardClick} />
          ))}
        </WorksGrid>
      )}

      {showPagination && total > limit && (
        <PaginationContainer>
          <Pagination
            current={currentPage}
            total={total}
            pageSize={limit}
            onChange={setCurrentPage}
            showSizeChanger={false}
          />
        </PaginationContainer>
      )}

      <WorkDetailModal
        work={selectedWork}
        visible={modalVisible}
        onClose={handleModalClose}
      />
    </div>
  );
};

export default WorksList;