import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = ['/admin', '/game'];
const AUTH_ROUTES = ['/login', '/register'];

function getAuthenticatedRedirectPath(request: NextRequest) {
    const role = request.cookies.get('tt_role')?.value;

    if (role && ['admin', 'organizer', 'scorekeeper', 'presi', 'delegado'].includes(role)) {
        return '/admin/dashboard';
    }

    if (role === 'streamer') {
        return '/dashboard';
    }

    return '/';
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const hasSession = request.cookies.get('tt_session')?.value === '1';

    const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
    const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));

    if (isProtected && !hasSession) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (isAuthRoute && hasSession) {
        return NextResponse.redirect(new URL(getAuthenticatedRedirectPath(request), request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/game/:path*', '/login', '/register'],
};
