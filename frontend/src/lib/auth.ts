const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api`;

export interface AuthUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string | null;
    profilePicture?: string | null;
    scorekeeperLeagueId?: string | null;
    maxLeagues?: number | null;
    maxTournamentsPerLeague?: number | null;
    maxTeamsPerTournament?: number | null;
    maxPlayersPerTeam?: number | null;
    planLabel?: string | null;
    delegateTeamId?: string | null;
    delegateTournamentId?: string | null;
    isDelegateActive?: boolean | null;
    forcePasswordChange?: boolean;
}

export interface AuthTokens {
    accessToken?: string;
    refreshToken?: string;
}

export function saveSession(user: AuthUser) {
    localStorage.setItem('user', JSON.stringify(user));
}

export async function clearSession() {
    localStorage.removeItem('user');
    try {
        await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {
        // La sesi?n local ya qued? limpia; ignoramos errores remotos.
    }
}

export function getAccessToken(): string | null {
    return null;
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
    return !!getUser();
}

export async function apiFetch(path: string, options: RequestInit = {}) {
    if (!API_URL.startsWith('http')) {
        console.warn('apiFetch called but NEXT_PUBLIC_API_URL is not configured.');
        return new Response(JSON.stringify({ error: 'Legacy API not configured' }), { status: 503 });
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    const doFetch = () => fetch(`${API_URL}${path}`, {
        ...options,
        headers,
        credentials: 'include',
    });

    let res = await doFetch();

    if (res.status === 401) {
        const refreshed = await tryRefresh();
        if (refreshed) {
            res = await doFetch();
        } else {
            await clearSession();
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
    }

    return res;
}

async function tryRefresh(): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
        });
        return res.ok;
    } catch {
        return false;
    }
}
