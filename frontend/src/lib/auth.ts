const API_URL = process.env.NODE_ENV === 'production' ? 'https://tourneytru-backend.onrender.com/api' : 'http://localhost:3001/api' 'http://localhost:3001/api';

export interface AuthUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string | null;
    profilePicture?: string | null;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export function saveSession(user: AuthUser, tokens: AuthTokens) {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    // Cookie ligera para el middleware de Next.js (sin datos sensibles)
    document.cookie = `accessToken=${tokens.accessToken}; path=/; SameSite=Strict`;
}

export function clearSession() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    // Limpiar cookie
    document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
}

export function getUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
        return JSON.parse(raw) as AuthUser;
    } catch {
        return null;
    }
}

export function isLoggedIn(): boolean {
    return !!getAccessToken();
}

export async function apiFetch(path: string, options: RequestInit = {}) {
    const token = getAccessToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (res.status === 401) {
        // Intentar refrescar el token
        const refreshed = await tryRefresh();
        if (refreshed) {
            headers['Authorization'] = `Bearer ${getAccessToken()}`;
            return fetch(`${API_URL}${path}`, { ...options, headers });
        }
        clearSession();
        window.location.href = '/login';
    }

    return res;
}

async function tryRefresh(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) return false;

        const data = await res.json();
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        return true;
    } catch {
        return false;
    }
}
