import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EnhancedUploadProgress, EnhancedUploadResult, EnhancedUploadStatusType } from '../types/enhanced-upload.types';

// 上传会话状态
interface UploadSession {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: EnhancedUploadStatusType;
  progress: EnhancedUploadProgress;
  result?: EnhancedUploadResult;
  error?: Error;
  createdAt: number;
  updatedAt: number;
}

// 上传状态存储
interface UploadState {
  // 上传会话列表
  sessions: Record<string, UploadSession>;
  // 上传模式配置
  uploadMode: 'direct' | 'server';
  // 是否启用断点续传
  resumableEnabled: boolean;
  // 是否启用自动重试
  autoRetryEnabled: boolean;
  // 最大重试次数
  maxRetries: number;
  // 重试延迟(毫秒)
  retryDelay: number;
  // 上传并发数
  concurrentUploads: number;
  // 分片大小(字节)
  chunkSize: number;

  // 添加上传会话
  addSession: (session: UploadSession) => void;
  // 更新上传会话
  updateSession: (id: string, updates: Partial<UploadSession>) => void;
  // 删除上传会话
  removeSession: (id: string) => void;
  // 清理过期会话
  cleanupSessions: (maxAge?: number) => void;
  // 更新上传配置
  updateConfig: (config: Partial<Omit<UploadState, 'sessions' | keyof UploadStateActions>>) => void;
  // 获取所有活跃会话
  getActiveSessions: () => UploadSession[];
  // 获取所有已完成会话
  getCompletedSessions: () => UploadSession[];
  // 获取所有失败会话
  getFailedSessions: () => UploadSession[];
  // 重置所有会话
  resetAllSessions: () => void;
}

// 上传状态操作
type UploadStateActions = Pick<
  UploadState,
  'addSession' | 'updateSession' | 'removeSession' | 'cleanupSessions' |
  'updateConfig' | 'getActiveSessions' | 'getCompletedSessions' |
  'getFailedSessions' | 'resetAllSessions'
>;

// 创建上传状态存储
export const useUploadStore = create<UploadState>()(
  persist(
    (set, get) => ({
      // 初始状态
      sessions: {},
      uploadMode: 'direct',
      resumableEnabled: true,
      autoRetryEnabled: true,
      maxRetries: 3,
      retryDelay: 1000,
      concurrentUploads: 3,
      chunkSize: 5 * 1024 * 1024, // 5MB

      // 添加上传会话
      addSession: (session) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [session.id]: session
          }
        }));
      },

      // 更新上传会话
      updateSession: (id: string, updates: Partial<UploadSession>) => {
        set((state) => {
          const session = state.sessions[id];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [id]: {
                ...session,
                ...updates,
                updatedAt: Date.now()
              }
            }
          };
        });
      },

      // 删除上传会话
      removeSession: (id) => {
        set((state) => {
          const { [id]: _, ...rest } = state.sessions;
          return { sessions: rest };
        });
      },

      // 清理过期会话
      cleanupSessions: (maxAge = 7 * 24 * 60 * 60 * 1000) => { // 默认7天
        const now = Date.now();
        set((state) => {
          const sessions = { ...state.sessions };
          Object.keys(sessions).forEach((id) => {
            const session = sessions[id];
            if (now - session.updatedAt > maxAge) {
              delete sessions[id];
            }
          });
          return { sessions };
        });
      },

      // 更新上传配置
      updateConfig: (config) => {
        set((state) => ({ ...state, ...config }));
      },

      // 获取所有活跃会话
      getActiveSessions: () => {
        const { sessions } = get();
        return Object.values(sessions).filter(
          (session: UploadSession) => session.status === 'uploading' || session.status === 'preparing' || session.status === 'paused'
        );
      },

      // 获取所有已完成会话
      getCompletedSessions: () => {
        const { sessions } = get();
        return Object.values(sessions).filter((session: UploadSession) => session.status === 'completed');
      },

      // 获取所有失败会话
      getFailedSessions: () => {
        const { sessions } = get();
        return Object.values(sessions).filter((session: UploadSession) => session.status === 'failed');
      },

      // 重置所有会话
      resetAllSessions: () => {
        set({ sessions: {} });
      }
    }),
    {
      name: 'wedding-upload-storage',
      partialize: (state) => ({
        sessions: state.sessions,
        uploadMode: state.uploadMode,
        resumableEnabled: state.resumableEnabled,
        autoRetryEnabled: state.autoRetryEnabled,
        maxRetries: state.maxRetries,
        retryDelay: state.retryDelay,
        concurrentUploads: state.concurrentUploads,
        chunkSize: state.chunkSize
      })
    }
  )
);