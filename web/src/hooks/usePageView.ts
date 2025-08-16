import { useEffect, useState } from 'react';
import { PageViewService } from '../services/pageViewService';
import type { PageViewStats } from '../services/pageViewService';

/**
 * 页面访问统计Hook
 */
export const usePageView = (pageType: 'team_member' | 'work' | 'team' | 'team_page', pageId: string) => {
  const [stats, setStats] = useState<PageViewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 记录页面访问
  useEffect(() => {
    if (pageType && pageId) {
      PageViewService.recordPageView(pageType, pageId);
    }
  }, [pageType, pageId]);

  // 获取访问统计
  const fetchStats = async () => {
    if (!pageType || !pageId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await PageViewService.getPageViewStats(pageType, pageId);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 刷新统计数据
  const refreshStats = () => {
    fetchStats();
  };

  return {
    stats,
    loading,
    error,
    refreshStats,
  };
};

/**
 * 批量页面访问统计Hook
 */
export const useBatchPageView = (pageType: 'team_member' | 'work' | 'team' | 'team_page', pageIds: string[]) => {
  const [statsMap, setStatsMap] = useState<Record<string, PageViewStats>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatchStats = async () => {
    if (!pageType || !pageIds.length) return;

    setLoading(true);
    setError(null);

    try {
      const data = await PageViewService.getBatchPageViewStats(pageType, pageIds);
      setStatsMap(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取批量统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatchStats();
  }, [pageType, pageIds.join(',')]);

  return {
    statsMap,
    loading,
    error,
    refreshStats: fetchBatchStats,
  };
};