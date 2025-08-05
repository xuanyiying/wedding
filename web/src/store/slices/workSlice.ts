import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Work, SortOrder, WorkStatus } from '../../types';

interface WorkState {
  works: Work[];
  currentWork: Work | null;
  categories: string[];
  loading: boolean;
  error: string | null;
  filters: {
    published?: boolean;
    category?: string;
    status?: WorkStatus;
    featured?: boolean;
    search?: string;
  };
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  sortBy: 'createdAt' | 'updatedAt' | 'title' | 'viewCount';
  sortOrder: SortOrder;
}

const initialState: WorkState = {
  works: [],
  currentWork: null,
  categories: [],
  loading: false,
  error: null,
  filters: {},
  pagination: {
    current: 1,
    pageSize: 12,
    total: 0,
  },
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const workSlice = createSlice({
  name: 'work',
  initialState,
  reducers: {
    // 设置加载状态
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    // 设置错误
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // 清除错误
    clearError: (state) => {
      state.error = null;
    },
    
    // 设置作品列表
    setWorks: (state, action: PayloadAction<{
      works: Work[];
      total: number;
    }>) => {
      state.works = action.payload.works;
      state.pagination.total = action.payload.total;
    },
    
    // 添加作品
    addWork: (state, action: PayloadAction<Work>) => {
      state.works.unshift(action.payload);
      state.pagination.total += 1;
    },
    
    // 更新作品
    updateWork: (state, action: PayloadAction<Work>) => {
      const index = state.works.findIndex(w => w.id === action.payload.id);
      if (index !== -1) {
        state.works[index] = action.payload;
      }
      
      // 如果是当前选中的作品，也要更新
      if (state.currentWork?.id === action.payload.id) {
        state.currentWork = action.payload;
      }
    },
    
    // 删除作品
    removeWork: (state, action: PayloadAction<string>) => {
      state.works = state.works.filter(w => w.id !== action.payload);
      state.pagination.total -= 1;
      
      // 如果删除的是当前选中的作品，清除选中状态
      if (state.currentWork?.id === action.payload) {
        state.currentWork = null;
      }
    },
    
    // 设置当前作品
    setCurrentWork: (state, action: PayloadAction<Work | null>) => {
      state.currentWork = action.payload;
    },
    
    // 设置分类列表
    setCategories: (state, action: PayloadAction<string[]>) => {
      state.categories = action.payload;
    },
    
    // 设置过滤器
    setFilters: (state, action: PayloadAction<WorkState['filters']>) => {
      state.filters = { ...state.filters, ...action.payload };
      // 重置分页到第一页
      state.pagination.current = 1;
    },
    
    // 清除过滤器
    clearFilters: (state) => {
      state.filters = {};
      state.pagination.current = 1;
    },
    
    // 设置分页
    setPagination: (state, action: PayloadAction<Partial<WorkState['pagination']>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    
    // 设置排序
    setSorting: (state, action: PayloadAction<{
      sortBy: WorkState['sortBy'];
      sortOrder: WorkState['sortOrder'];
    }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
      // 重置分页到第一页
      state.pagination.current = 1;
    },
    
    // 切换作品特色状态
    toggleWorkFeatured: (state, action: PayloadAction<string>) => {
      const work = state.works.find(w => w.id === action.payload);
      if (work) {
        work.isFeatured = !work.isFeatured;
      }
      
      // 如果是当前选中的作品，也要更新
      if (state.currentWork?.id === action.payload) {
        state.currentWork.isFeatured = !state.currentWork.isFeatured;
      }
    },
    
    // 批量更新作品状态
    batchUpdateWorkStatus: (state, action: PayloadAction<{
      ids: string[];
      status: WorkStatus;
    }>) => {
      const { ids, status } = action.payload;
      state.works.forEach(work => {
        if (ids.includes(work.id)) {
          work.status = status;
        }
      });
    },
    
    // 批量删除作品
    batchRemoveWorks: (state, action: PayloadAction<string[]>) => {
      const ids = action.payload;
      state.works = state.works.filter(w => !ids.includes(w.id));
      state.pagination.total -= ids.length;
      
      // 如果删除的包含当前选中的作品，清除选中状态
      if (state.currentWork && ids.includes(state.currentWork.id)) {
        state.currentWork = null;
      }
    },
    
    // 增加作品浏览量
    incrementWorkViewCount: (state, action: PayloadAction<string>) => {
      const work = state.works.find(w => w.id === action.payload);
      if (work) {
        work.viewCount = (work.viewCount || 0) + 1;
      }
      
      // 如果是当前选中的作品，也要更新
      if (state.currentWork?.id === action.payload) {
        state.currentWork.viewCount = (state.currentWork.viewCount || 0) + 1;
      }
    },
    
    // 重置状态
    resetWorkState: (state) => {
      state.works = [];
      state.currentWork = null;
      state.loading = false;
      state.error = null;
      state.filters = {};
      state.pagination = {
        current: 1,
        pageSize: 12,
        total: 0,
      };
    },
  },
});

export const {
  setLoading,
  setError,
  clearError,
  setWorks,
  addWork,
  updateWork,
  removeWork,
  setCurrentWork,
  setCategories,
  setFilters,
  clearFilters,
  setPagination,
  setSorting,
  toggleWorkFeatured,
  batchUpdateWorkStatus,
  batchRemoveWorks,
  incrementWorkViewCount,
  resetWorkState,
} = workSlice.actions;

export default workSlice.reducer;

// Selectors
export const selectWork = (state: { work: WorkState }) => state.work;
export const selectWorks = (state: { work: WorkState }) => state.work.works;
export const selectCurrentWork = (state: { work: WorkState }) => state.work.currentWork;
export const selectCategories = (state: { work: WorkState }) => state.work.categories;
export const selectWorkLoading = (state: { work: WorkState }) => state.work.loading;
export const selectWorkError = (state: { work: WorkState }) => state.work.error;
export const selectWorkFilters = (state: { work: WorkState }) => state.work.filters;
export const selectWorkPagination = (state: { work: WorkState }) => state.work.pagination;
export const selectWorkSorting = (state: { work: WorkState }) => ({
  sortBy: state.work.sortBy,
  sortOrder: state.work.sortOrder,
});

// 复合选择器
export const selectFilteredWorks = (state: { work: WorkState }) => {
  const { works, filters } = state.work;
  
  return works.filter(work => {
    // 分类过滤
    if (filters.category && work.category !== filters.category) {
      return false;
    }
    
    // 状态过滤
    if (filters.status && work.status !== filters.status) {
      return false;
    }
    
    // 特色过滤
    if (filters.featured !== undefined && work.isFeatured !== filters.featured) {
      return false;
    }
    
    // 发布状态过滤
    if (filters.published !== undefined && work.status !== 'published') {
      return false;
    }
    
    // 搜索过滤
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        work.title.toLowerCase().includes(searchLower) ||
        (work.description || '').toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });
};

export const selectFeaturedWorks = (state: { work: WorkState }) => {
  return state.work.works.filter(work => work.isFeatured && work.status === 'published');
};

export const selectPublishedWorks = (state: { work: WorkState }) => {
  return state.work.works.filter(work => work.status === 'published');
};