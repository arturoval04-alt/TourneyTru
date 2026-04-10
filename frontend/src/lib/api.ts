/**
 * lib/api.ts
 * Cliente axios centralizado para el backend NestJS.
 */

import axios from 'axios';
import { toast } from 'sonner';
import { clearSession } from '@/lib/auth';

const BASE_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api`;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (!error.response) {
      toast.error('Sin conexi?n a internet.');
      return Promise.reject(error);
    }

    const status = error.response.status;

    if (status === 401 && !original._retry) {
      original._retry = true;
      try {
        await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        return api(original);
      } catch {
        await clearSession();
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }

    if (status === 400) {
      const message =
        error.response?.data?.message ||
        (Array.isArray(error.response?.data?.message)
          ? error.response.data.message.join(', ')
          : null) ||
        'Solicitud inv?lida.';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    }

    if (status >= 500) {
      toast.error('Error del servidor. Intenta de nuevo.');
    }

    return Promise.reject(error);
  }
);

export default api;
