/**
 * lib/api.ts
 * Cliente axios centralizado para el backend NestJS.
 * Reemplaza todas las llamadas directas a Supabase SDK.
 */

import axios from 'axios';
import { toast } from 'sonner';
import { getAccessToken, clearSession } from '@/lib/auth';

const BASE_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api`;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // Necesario para que el browser envíe la cookie httpOnly del refreshToken al backend
  withCredentials: true,
});

// ── Interceptor: inyectar accessToken en cada request ────────────────────────
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Interceptor: manejar errores de respuesta ─────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Sin respuesta de red
    if (!error.response) {
      toast.error('Sin conexión a internet.');
      return Promise.reject(error);
    }

    const status = error.response.status;

    // 401 — intentar refresh, si falla limpiar sesión y redirigir
    if (status === 401 && !original._retry) {
      original._retry = true;
      try {
        // El refreshToken viaja automáticamente en la cookie httpOnly — no hay body
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        localStorage.setItem('accessToken', data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        clearSession();
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }

    // 400 — mostrar mensaje del servidor
    if (status === 400) {
      const message =
        error.response?.data?.message ||
        (Array.isArray(error.response?.data?.message)
          ? error.response.data.message.join(', ')
          : null) ||
        'Solicitud inválida.';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    }

    // 500+ — error genérico de servidor
    if (status >= 500) {
      toast.error('Error del servidor. Intenta de nuevo.');
    }

    return Promise.reject(error);
  }
);

export default api;
