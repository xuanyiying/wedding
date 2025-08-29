import { AuthStorage } from '../utils/auth';

// 使用统一的AuthStorage来管理token
export const getToken = (): string | null => {
  return AuthStorage.getAccessToken();
};

export const getRefreshToken = (): string | null => {
  return AuthStorage.getRefreshToken();
};

export const setToken = (token: string): void => {
  AuthStorage.setAccessToken(token);
};

export const setRefreshToken = (token: string): void => {
  AuthStorage.setRefreshToken(token);
};

export const removeToken = (): void => {
  AuthStorage.removeAccessToken();
};

export const removeRefreshToken = (): void => {
  AuthStorage.removeRefreshToken();
};

export const isLoggedIn = (): boolean => {
  return AuthStorage.hasValidAuth();
};