import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type Booking, SortOrder, ScheduleStatus, BookingStatus } from '../../types';

interface BookingState {
  bookings: Booking[];
  currentBooking: Booking | null;
  loading: boolean;
  error: string | null;
  filters: {
    status?: ScheduleStatus;
    dateRange?: {
      start: string;
      end: string;
    };
    search?: string;
  };
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  sortBy: 'createdAt' | 'updatedAt' | 'eventDate' | 'clientName';
  sortOrder: SortOrder;
  statistics: {
    total: number;
    [BookingStatus.PENDING]: number;
    [BookingStatus.CONFIRMED]: number;
    [BookingStatus.CANCELLED]: number;
    [BookingStatus.COMPLETED]: number;
    thisMonth: number;
    thisWeek: number;
  };
}

const initialState: BookingState = {
  bookings: [],
  currentBooking: null,
  loading: false,
  error: null,
  filters: {},
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0,
  },
  sortBy: 'createdAt',
  sortOrder: 'desc',
  statistics: {
    total: 0,
    [BookingStatus.PENDING]: 0,
    [BookingStatus.CONFIRMED]: 0,
    [BookingStatus.CANCELLED]: 0,
    [BookingStatus.COMPLETED]: 0,
    thisMonth: 0,
    thisWeek: 0,
  },
};

const bookingSlice = createSlice({
  name: 'booking',
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
    
    // 设置预约列表
    setBookings: (state, action: PayloadAction<{
      bookings: Booking[];
      total: number;
    }>) => {
      state.bookings = action.payload.bookings;
      state.pagination.total = action.payload.total;
    },
    
    // 添加预约
    addBooking: (state, action: PayloadAction<Booking>) => {
      state.bookings.unshift(action.payload);
      state.pagination.total += 1;
      
      // 更新统计
      state.statistics.total += 1;
      if (action.payload.status in state.statistics) {
        state.statistics[action.payload.status as keyof typeof state.statistics]++;
      }
    },
    
    // 更新预约
    updateBooking: (state, action: PayloadAction<Booking>) => {
      const index = state.bookings.findIndex(b => b.id === action.payload.id);
      if (index !== -1) {
        const oldBooking = state.bookings[index];
        state.bookings[index] = action.payload;
        
        // 更新统计（如果状态发生变化）
        if (oldBooking.status !== action.payload.status) {
          if (oldBooking.status in state.statistics) {
            state.statistics[oldBooking.status as keyof typeof state.statistics]--;
          }
          if (action.payload.status in state.statistics) {
            state.statistics[action.payload.status as keyof typeof state.statistics]++;
          }
        }
      }
      
      // 如果是当前选中的预约，也要更新
      if (state.currentBooking?.id === action.payload.id) {
        state.currentBooking = action.payload;
      }
    },
    
    // 删除预约
    removeBooking: (state, action: PayloadAction<string>) => {
      const booking = state.bookings.find((b: Booking) => b.id === action.payload);
      if (booking) {
        state.bookings = state.bookings.filter(b => b.id !== action.payload);
        state.pagination.total -= 1;
        
        // 更新统计
        state.statistics.total -= 1;
        if (booking.status in state.statistics) {
          state.statistics[booking.status as keyof typeof state.statistics]--;
        }
      }
      
      // 如果删除的是当前选中的预约，清除选中状态
      if (state.currentBooking?.id === action.payload) {
        state.currentBooking = null;
      }
    },
    
    // 设置当前预约
    setCurrentBooking: (state, action: PayloadAction<Booking | null>) => {
      state.currentBooking = action.payload;
    },
    
    // 设置过滤器
    setFilters: (state, action: PayloadAction<BookingState['filters']>) => {
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
    setPagination: (state, action: PayloadAction<Partial<BookingState['pagination']>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    
    // 设置排序
    setSorting: (state, action: PayloadAction<{
      sortBy: BookingState['sortBy'];
      sortOrder: SortOrder;
    }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
      // 重置分页到第一页
      state.pagination.current = 1;
    },
    
    // 设置统计数据
    setStatistics: (state, action: PayloadAction<BookingState['statistics']>) => {
      state.statistics = action.payload;
    },
    
    // 批量更新预约状态
    batchUpdateBookingStatus: (state, action: PayloadAction<{
      ids: string[];
      status: BookingStatus;
    }>) => {
      const { ids, status } = action.payload;
      
      state.bookings.forEach((booking: Booking) => {
        if (ids.includes(booking.id)) {
          const oldStatus = booking.status;
          booking.status = status;
          
          // 更新统计
          if (oldStatus in state.statistics) {
            state.statistics[oldStatus as keyof typeof state.statistics]--;
          }
          if (status in state.statistics) {
            state.statistics[status as keyof typeof state.statistics]++;
          }
        }
      });
    },
    
    // 批量删除预约
    batchRemoveBookings: (state, action: PayloadAction<string[]>) => {
      const ids = action.payload;
      
      // 更新统计
      ids.forEach(id => {
        const booking = state.bookings.find((b: Booking) => b.id === id);
        if (booking) {
          state.statistics.total -= 1;
          if (booking.status in state.statistics) {
            state.statistics[booking.status as keyof typeof state.statistics]--;
          }
        }
      });
      
      state.bookings = state.bookings.filter((b: Booking) => !ids.includes(b.id));
      state.pagination.total -= ids.length;
      
      // 如果删除的包含当前选中的预约，清除选中状态
      if (state.currentBooking && ids.includes(state.currentBooking.id)) {
        state.currentBooking = null;
      }
    },
    
    // 确认预约
    confirmBooking: (state, action: PayloadAction<string>) => {
      const booking = state.bookings.find((b: Booking) => b.id === action.payload);
      if (booking && booking.status === BookingStatus.PENDING) {
        booking.status = BookingStatus.CONFIRMED;
        
        // 更新统计
        state.statistics[BookingStatus.PENDING]--;
        state.statistics[BookingStatus.CONFIRMED]++;
      }
      
      // 如果是当前选中的预约，也要更新
      if (state.currentBooking?.id === action.payload && state.currentBooking.status === BookingStatus.PENDING) {
        state.currentBooking.status = BookingStatus.CONFIRMED;
      }
    },
    
    // 取消预约
    cancelBooking: (state, action: PayloadAction<{
      id: string;
      reason?: string;
    }>) => {
      const { id, reason } = action.payload;
      const booking = state.bookings.find((b: Booking) => b.id === id);
      
      if (booking && booking.status !== BookingStatus.CANCELLED) {
        const oldStatus = booking.status;
        booking.status = BookingStatus.CANCELLED;
        if (reason) {
          booking.cancelReason = reason;
        }
        
        // 更新统计
        if (oldStatus in state.statistics) {
          state.statistics[oldStatus as keyof typeof state.statistics]--;
        }
        state.statistics[BookingStatus.CANCELLED]++;
      }
      
      // 如果是当前选中的预约，也要更新
      if (state.currentBooking?.id === id && state.currentBooking.status !== BookingStatus.CANCELLED) {
        state.currentBooking.status = BookingStatus.CANCELLED;
        if (reason) {
          state.currentBooking = {
            ...state.currentBooking,
            cancelReason: reason
          };
        }
      }
    },
    
    // 完成预约
    completeBooking: (state, action: PayloadAction<string>) => {
      const booking = state.bookings.find(b => b.id === action.payload);
      if (booking && booking.status === BookingStatus.CONFIRMED) {
        booking.status = BookingStatus.COMPLETED;
        
        // 更新统计
        state.statistics[BookingStatus.CONFIRMED]--;
        state.statistics[BookingStatus.COMPLETED]++;
      }
      
      // 如果是当前选中的预约，也要更新
      if (state.currentBooking?.id === action.payload && state.currentBooking.status === BookingStatus.CONFIRMED) {
        state.currentBooking.status = BookingStatus.COMPLETED;
      }
    },
    
    // 重置状态
    resetBookingState: (state) => {
      state.bookings = [];
      state.currentBooking = null;
      state.loading = false;
      state.error = null;
      state.filters = {};
      state.pagination = {
        current: 1,
        pageSize: 10,
        total: 0,
      };
      state.statistics = {
        total: 0,
        [BookingStatus.PENDING]: 0,
        [BookingStatus.CONFIRMED]: 0,
        [BookingStatus.CANCELLED]: 0,
        [BookingStatus.COMPLETED]: 0,
        thisMonth: 0,
        thisWeek: 0,
      };
    },
  },
});

export const {
  setLoading,
  setError,
  clearError,
  setBookings,
  addBooking,
  updateBooking,
  removeBooking,
  setCurrentBooking,
  setFilters,
  clearFilters,
  setPagination,
  setSorting,
  setStatistics,
  batchUpdateBookingStatus,
  batchRemoveBookings,
  confirmBooking,
  cancelBooking,
  completeBooking,
  resetBookingState,
} = bookingSlice.actions;

export default bookingSlice.reducer;

// Selectors
export const selectBooking = (state: { booking: BookingState }) => state.booking;
export const selectBookings = (state: { booking: BookingState }) => state.booking.bookings;
export const selectCurrentBooking = (state: { booking: BookingState }) => state.booking.currentBooking;
export const selectBookingLoading = (state: { booking: BookingState }) => state.booking.loading;
export const selectBookingError = (state: { booking: BookingState }) => state.booking.error;
export const selectBookingFilters = (state: { booking: BookingState }) => state.booking.filters;
export const selectBookingPagination = (state: { booking: BookingState }) => state.booking.pagination;
export const selectBookingSorting = (state: { booking: BookingState }) => ({
  sortBy: state.booking.sortBy,
  sortOrder: state.booking.sortOrder,
});
export const selectBookingStatistics = (state: { booking: BookingState }) => state.booking.statistics;

// 复合选择器
export const selectFilteredBookings = (state: { booking: BookingState }) => {
  const { bookings, filters } = state.booking;
  
  return bookings.filter(booking => {
    // 状态过滤
    if (filters.status && booking.status !== filters.status) {
      return false;
    }
    
    // 日期范围过滤
    if (filters.dateRange) {
      const weddingDate = new Date(booking.eventDate);
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      
      if (weddingDate < startDate || weddingDate > endDate) {
        return false;
      }
    }
    
    // 搜索过滤
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        booking.clientName.toLowerCase().includes(searchLower) ||
        booking.clientPhone.toLowerCase().includes(searchLower) ||
        booking.eventAddress?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });
};

export const selectPendingBookings = (state: { booking: BookingState }) => {
  return state.booking.bookings.filter(booking => booking.status === BookingStatus.PENDING);
};

export const selectUpcomingBookings = (state: { booking: BookingState }) => {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  return state.booking.bookings.filter(booking => {
    const weddingDate = new Date(booking.eventDate);
    return booking.status === BookingStatus.CONFIRMED && weddingDate >= now && weddingDate <= nextWeek;
  });
};