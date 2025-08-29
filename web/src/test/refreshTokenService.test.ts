import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import { refreshTokenService } from '../services/refreshTokenService';
import { AuthStorage } from '../utils/auth';
import { store } from '../store';
import { logout, refreshTokenSuccess } from '../store/slices/authSlice';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

// Mock AuthStorage
vi.mock('../utils/auth', () => ({
    AuthStorage: {
        getAccessToken: vi.fn(),
        setAccessToken: vi.fn(),
        getRefreshToken: vi.fn(),
        setRefreshToken: vi.fn(),
        clearAll: vi.fn(),
    },
}));

// Mock store
vi.mock('../store', () => ({
    store: {
        dispatch: vi.fn(),
    },
}));

// Mock authSlice actions
vi.mock('../store/slices/authSlice', () => ({
    logout: vi.fn(),
    refreshTokenSuccess: vi.fn(),
}));

describe('RefreshTokenService', () => {
    beforeEach(() => {
        // 清除所有mock
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('refreshAccessToken', () => {
        it('should refresh token successfully', async () => {
            // 模拟刷新令牌存在
            (AuthStorage.getRefreshToken as ReturnType<typeof vi.fn>).mockReturnValue('refresh-token');

            // 模拟API响应
            const mockResponse = {
                data: {
                    data: {
                        accessToken: 'new-access-token',
                        refreshToken: 'new-refresh-token',
                    },
                },
            };
            mockedAxios.post.mockResolvedValue(mockResponse);

            // 调用刷新令牌方法
            const result = await refreshTokenService.refreshAccessToken();

            // 验证结果
            expect(result).toBe('new-access-token');

            // 验证API调用
            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/v1/auth/refresh-token',
                { refreshToken: 'refresh-token' }
            );

            // 验证存储更新
            expect(AuthStorage.setAccessToken).toHaveBeenCalledWith('new-access-token');
            expect(AuthStorage.setRefreshToken).toHaveBeenCalledWith('new-refresh-token');

            // 验证Redux状态更新
            expect(store.dispatch).toHaveBeenCalledWith(
                refreshTokenSuccess({
                    accessToken: 'new-access-token',
                    refreshToken: 'new-refresh-token',
                })
            );
        });

        it('should handle refresh token not available', async () => {
            // 模拟刷新令牌不存在
            (AuthStorage.getRefreshToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

            // 调用刷新令牌方法
            const result = await refreshTokenService.refreshAccessToken();

            // 验证结果
            expect(result).toBeNull();

            // 验证清除认证信息
            expect(AuthStorage.clearAll).toHaveBeenCalled();

            // 验证Redux登出
            expect(store.dispatch).toHaveBeenCalledWith(logout());
        });

        it('should handle API error', async () => {
            // 模拟刷新令牌存在
            (AuthStorage.getRefreshToken as ReturnType<typeof vi.fn>).mockReturnValue('refresh-token');

            // 模拟API错误
            mockedAxios.post.mockRejectedValue(new Error('API Error'));

            // 调用刷新令牌方法
            const result = await refreshTokenService.refreshAccessToken();

            // 验证结果
            expect(result).toBeNull();

            // 验证清除认证信息
            expect(AuthStorage.clearAll).toHaveBeenCalled();

            // 验证Redux登出
            expect(store.dispatch).toHaveBeenCalledWith(logout());
        });
    });

    describe('isTokenExpiringSoon', () => {
        it('should return true when token is expiring soon', () => {
            // 创建一个即将过期的token (5分钟内过期)
            const now = Math.floor(Date.now() / 1000);
            const expiringSoonPayload = {
                exp: now + 180, // 3分钟后过期
            };

            const token = `header.${btoa(JSON.stringify(expiringSoonPayload))}.signature`;

            const result = refreshTokenService.isTokenExpiringSoon(token, 5);
            expect(result).toBe(true);
        });

        it('should return false when token is not expiring soon', () => {
            // 创建一个不会很快过期的token (30分钟后过期)
            const now = Math.floor(Date.now() / 1000);
            const notExpiringSoonPayload = {
                exp: now + 1800, // 30分钟后过期
            };

            const token = `header.${btoa(JSON.stringify(notExpiringSoonPayload))}.signature`;

            const result = refreshTokenService.isTokenExpiringSoon(token, 5);
            expect(result).toBe(false);
        });

        it('should return true when token parsing fails', () => {
            // 创建一个无效的token
            const invalidToken = 'invalid.token.here';

            const result = refreshTokenService.isTokenExpiringSoon(invalidToken, 5);
            expect(result).toBe(true);
        });
    });

    describe('getValidAccessToken', () => {
        it('should return null when no token available', async () => {
            // 模拟没有访问令牌
            (AuthStorage.getAccessToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

            const result = await refreshTokenService.getValidAccessToken();
            expect(result).toBeNull();
        });

        it('should return token when not expiring soon', async () => {
            // 创建一个不会很快过期的token (30分钟后过期)
            const now = Math.floor(Date.now() / 1000);
            const notExpiringSoonPayload = {
                exp: now + 1800, // 30分钟后过期
            };

            const token = `header.${btoa(JSON.stringify(notExpiringSoonPayload))}.signature`;

            // 模拟有访问令牌
            (AuthStorage.getAccessToken as ReturnType<typeof vi.fn>).mockReturnValue(token);

            const result = await refreshTokenService.getValidAccessToken();
            expect(result).toBe(token);
        });

        it('should refresh token when expiring soon', async () => {
            // 创建一个即将过期的token (3分钟内过期)
            const now = Math.floor(Date.now() / 1000);
            const expiringSoonPayload = {
                exp: now + 120, // 2分钟后过期
            };

            const token = `header.${btoa(JSON.stringify(expiringSoonPayload))}.signature`;

            // 模拟有访问令牌
            (AuthStorage.getAccessToken as ReturnType<typeof vi.fn>).mockReturnValue(token);

            // 模拟刷新成功
            const refreshSpy = vi.spyOn(refreshTokenService, 'refreshAccessToken').mockResolvedValue('new-token');

            const result = await refreshTokenService.getValidAccessToken();
            expect(result).toBe('new-token');
            expect(refreshSpy).toHaveBeenCalled();
        });
    });
});