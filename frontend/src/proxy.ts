import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = ['/admin', '/game'];
const AUTH_ROUTES = ['/login', '/register'];

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('accessToken')?.value;

    const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
    const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));

    if (isProtected && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (isAuthRoute && token) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/game/:path*', '/login', '/register'],
};
