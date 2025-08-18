import { AuthStorage } from '../utils/auth';

// 使用统一的AuthStorage来管理token
export const getToken = (): string | null => {
  return AuthStorage.getAccessToken();
};

export const setToken = (token: string): void => {
  AuthStorage.setAccessToken(token);
};

export const removeToken = (): void => {
  AuthStorage.removeAccessToken();
};

export const isLoggedIn = (): boolean => {
  return AuthStorage.hasValidAuth();
};