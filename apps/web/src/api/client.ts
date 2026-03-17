import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const isDev = import.meta.env.DEV;

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isDev) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
