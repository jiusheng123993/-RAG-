import { useAuthStore } from './stores/authStore.js';

const apiBase = 'http://localhost:3000/api';

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) as unknown : null;

  if (!response.ok) {
    const error = typeof data === 'object' && data !== null && 'error' in data ? String(data.error) : '请求失败';
    throw new Error(error);
  }

  return data as T;
}
