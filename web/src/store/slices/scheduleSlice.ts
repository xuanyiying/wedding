import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type Schedule, type CalendarEvent, type ScheduleStatus, type EventType, ViewMode } from '../../types';

interface ScheduleState {
  schedules: Schedule[];
  currentSchedule: Schedule | null;
  calendarEvents: CalendarEvent[];
  selectedDate: string | null;
  viewMode: ViewMode;
  loading: boolean;
  error: string | null;
  filters: {
    status?: ScheduleStatus;
    eventType?: EventType;
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

const initialState: ScheduleState = {
  schedules: [],
  currentSchedule: null,
  calendarEvents: [],
  selectedDate: null,
  viewMode: ViewMode.MONTH,
  loading: false,
  error: null,
  filters: {},
};

const scheduleSlice = createSlice({
  name: 'schedule',
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
    
    // 设置日程列表
    setSchedules: (state, action: PayloadAction<Schedule[]>) => {
      state.schedules = action.payload;
    },
    
    // 添加日程
    addSchedule: (state, action: PayloadAction<Schedule>) => {
      state.schedules.push(action.payload);
    },
    
    // 更新日程
    updateSchedule: (state, action: PayloadAction<Schedule>) => {
      const index = state.schedules.findIndex(s => s.id === action.payload.id);
      if (index !== -1) {
        state.schedules[index] = action.payload;
      }
      
      // 如果是当前选中的日程，也要更新
      if (state.currentSchedule?.id === action.payload.id) {
        state.currentSchedule = action.payload;
      }
    },
    
    // 删除日程
    removeSchedule: (state, action: PayloadAction<string>) => {
      state.schedules = state.schedules.filter(s => s.id !== action.payload);
      
      // 如果删除的是当前选中的日程，清除选中状态
      if (state.currentSchedule?.id === action.payload) {
        state.currentSchedule = null;
      }
    },
    
    // 设置当前日程
    setCurrentSchedule: (state, action: PayloadAction<Schedule | null>) => {
      state.currentSchedule = action.payload;
    },
    
    // 设置日历事件
    setCalendarEvents: (state, action: PayloadAction<CalendarEvent[]>) => {
      state.calendarEvents = action.payload;
    },
    
    // 添加日历事件
    addCalendarEvent: (state, action: PayloadAction<CalendarEvent>) => {
      state.calendarEvents.push(action.payload);
    },
    
    // 更新日历事件
    updateCalendarEvent: (state, action: PayloadAction<CalendarEvent>) => {
      const index = state.calendarEvents.findIndex(e => e.id === action.payload.id);
      if (index !== -1) {
        state.calendarEvents[index] = action.payload;
      }
    },
    
    // 删除日历事件
    removeCalendarEvent: (state, action: PayloadAction<string>) => {
      state.calendarEvents = state.calendarEvents.filter(e => e.id !== action.payload);
    },
    
    // 设置选中日期
    setSelectedDate: (state, action: PayloadAction<string | null>) => {
      state.selectedDate = action.payload;
    },
    
    // 设置视图模式
    setViewMode: (state, action: PayloadAction<ViewMode>) => {
      state.viewMode = action.payload;
    },
    
    // 设置过滤器
    setFilters: (state, action: PayloadAction<ScheduleState['filters']>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    // 清除过滤器
    clearFilters: (state) => {
      state.filters = {};
    },
    
    // 批量更新日程状态
    batchUpdateScheduleStatus: (state, action: PayloadAction<{
      ids: string[];
      status: ScheduleStatus;
    }>) => {
      const { ids, status } = action.payload;
      state.schedules.forEach(schedule => {
        if (ids.includes(schedule.id)) {
          schedule.status = status;
        }
      });
    },
    
    // 重置状态
    resetScheduleState: (state) => {
      state.schedules = [];
      state.currentSchedule = null;
      state.calendarEvents = [];
      state.selectedDate = null;
      state.loading = false;
      state.error = null;
      state.filters = {};
    },
  },
});

export const {
  setLoading,
  setError,
  clearError,
  setSchedules,
  addSchedule,
  updateSchedule,
  removeSchedule,
  setCurrentSchedule,
  setCalendarEvents,
  addCalendarEvent,
  updateCalendarEvent,
  removeCalendarEvent,
  setSelectedDate,
  setViewMode,
  setFilters,
  clearFilters,
  batchUpdateScheduleStatus,
  resetScheduleState,
} = scheduleSlice.actions;

export default scheduleSlice.reducer;

// Selectors
export const selectSchedule = (state: { schedule: ScheduleState }) => state.schedule;
export const selectSchedules = (state: { schedule: ScheduleState }) => state.schedule.schedules;
export const selectCurrentSchedule = (state: { schedule: ScheduleState }) => state.schedule.currentSchedule;
export const selectCalendarEvents = (state: { schedule: ScheduleState }) => state.schedule.calendarEvents;
export const selectSelectedDate = (state: { schedule: ScheduleState }) => state.schedule.selectedDate;
export const selectViewMode = (state: { schedule: ScheduleState }) => state.schedule.viewMode;
export const selectScheduleLoading = (state: { schedule: ScheduleState }) => state.schedule.loading;
export const selectScheduleError = (state: { schedule: ScheduleState }) => state.schedule.error;
export const selectScheduleFilters = (state: { schedule: ScheduleState }) => state.schedule.filters;

// 复合选择器
export const selectFilteredSchedules = (state: { schedule: ScheduleState }) => {
  const { schedules, filters } = state.schedule;
  
  return schedules.filter(schedule => {
    // 状态过滤
    if (filters.status && schedule.status !== filters.status) {
      return false;
    }
    
    // 日期范围过滤
    if (filters.dateRange) {
      const scheduleDate = new Date(schedule.weddingDate);
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      
      if (scheduleDate < startDate || scheduleDate > endDate) {
        return false;
      }
    }
    
    return true;
  });
};

export const selectAvailableSchedules = (state: { schedule: ScheduleState }) => {
  return state.schedule.schedules.filter(schedule => schedule.status === 'available');
};