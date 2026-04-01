
// Storage helpers
const STORAGE_KEY = 'access_token';

export const getTokenFromStorage = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};
export const saveTokenToStorage = (token: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch (error) {
    console.error('Failed to save token', error);
  }
};
export const removeTokenFromStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to remove token', error);
  }
};
