import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// 类型化的useDispatch hook
export const useAppDispatch = () => useDispatch<AppDispatch>();

// 类型化的useSelector hook
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;