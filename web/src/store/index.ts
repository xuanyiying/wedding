import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from './api';
import authSlice from './slices/authSlice';
import appSlice from './slices/appSlice';
import scheduleSlice from './slices/scheduleSlice';
import workSlice from './slices/workSlice';
import bookingSlice from './slices/bookingSlice';

export const store = configureStore({
  reducer: {
    // API slice
    [api.reducerPath]: api.reducer,

    // Feature slices
    auth: authSlice,
    app: appSlice,
    schedule: scheduleSlice,
    work: workSlice,
    booking: bookingSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [api.util.resetApiState.type],
      },
    }).concat(api.middleware),
  devTools: process.env.NODE_ENV !== 'prod',
});

// 启用查询/缓存生命周期
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 类型化的hooks
export { useAppDispatch, useAppSelector } from './hooks';