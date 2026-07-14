import { getSessionCookie } from 'better-auth/cookies';
import { NextRequest, NextResponse } from 'next/server';

const publicRoutes = ['/sign-in'];

export default function proxy(request: NextRequest) {
  const { pathname: rawPathname } = request.nextUrl;
  const pathname =
    rawPathname !== '/' && rawPathname.endsWith('/') ? rawPathname.slice(0, -1) : rawPathname;
  const sessionCookie = getSessionCookie(request);

  // Authenticated user landing on a public auth route → send to dashboard
  if (publicRoutes.includes(pathname) && sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Unauthenticated user on any protected route → send to sign-in
  if (!publicRoutes.includes(pathname) && !sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
