import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// Deep import — Edge must not pull the @rsv360/shared barrel (schema/Node deps).
import { assertCookieMutationOrigin } from '../../packages/shared/dist/http/cors-origins.js';
import { verifyAdminToken } from '@/lib/admin-token';
import {
  buildPrimarySiteUrl,
  isLabApiPath,
  isLabUiPath,
  isMarketingLabMode,
  isStaticAssetPath,
  isTheaterUiPath,
} from '@/lib/app-mode';
import { isMarketingLabAuthRequired } from '@/lib/sso-config';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Paths that must not run cookie-CSRF (no session cookie auth / external callbacks). */
function isCookieCsrfExemptApiPath(pathname: string): boolean {
  if (!pathname.startsWith('/api/')) return true;
  if (pathname.startsWith('/api/webhooks/')) return true;
  if (pathname.startsWith('/api/auth/google/')) return true;
  if (pathname.startsWith('/api/auth/facebook/')) return true;
  // Login / 2FA mint the cookie; CSRF applies after session exists.
  if (pathname === '/api/admin/auth/login' || pathname === '/api/admin/auth/2fa') {
    return true;
  }
  return false;
}

function hasCookieSession(req: NextRequest): boolean {
  return Boolean(
    req.cookies.get('admin_token')?.value ||
      req.cookies.get('auth_token')?.value ||
      // PR-10c-pré-a — HttpOnly refresh must trigger CSRF on /api/auth/refresh|logout
      req.cookies.get('rsv360_refresh_token')?.value,
  );
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isStaticAssetPath(pathname)) {
    return NextResponse.next();
  }

  // Aruanda C4 — theater mocks stay out of APP_MODE=public path.
  if (!isMarketingLabMode() && isTheaterUiPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    url.searchParams.set('teatro', 'oculto');
    return NextResponse.redirect(url);
  }

  // PR-16b — CSRF for mutating API calls that carry session cookies (fail-closed Origin/Referer).
  if (
    !SAFE_METHODS.has(req.method.toUpperCase()) &&
    hasCookieSession(req) &&
    !isCookieCsrfExemptApiPath(pathname)
  ) {
    const check = assertCookieMutationOrigin({
      origin: req.headers.get('origin'),
      referer: req.headers.get('referer'),
    });
    if (!check.ok) {
      return NextResponse.json(
        { success: false, error: 'Origem da requisição não permitida.' },
        { status: 403 },
      );
    }
  }

  // Corrigir URL malformada: group-travel + http://... (concatenação incorreta)
  if (pathname.includes('group-travelhttp')) {
    const correctPathMatch = pathname.match(/.*(\/group-travel\/[^?]*)/);
    if (correctPathMatch) {
      const url = req.nextUrl.clone();
      url.pathname = correctPathMatch[1];
      return NextResponse.redirect(url);
    }
  }

  if (isMarketingLabMode()) {
    if (isLabApiPath(pathname)) {
      return NextResponse.next();
    }

    if (pathname === '/') {
      const url = req.nextUrl.clone();
      url.pathname = '/lab';
      return NextResponse.redirect(url);
    }

    if (!isLabUiPath(pathname)) {
      return NextResponse.redirect(buildPrimarySiteUrl(pathname, search));
    }

    if (isMarketingLabAuthRequired()) {
      const publicLabPaths = ['/login', '/auth/sso', '/recuperar-senha', '/redefinir-senha', '/admin/login'];
      const isPublicLab = publicLabPaths.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
      );
      if (!isPublicLab) {
        const userToken = req.cookies.get('auth_token')?.value;
        if (!userToken) {
          const url = req.nextUrl.clone();
          url.pathname = '/login';
          url.searchParams.set('redirect', pathname);
          url.searchParams.set('sso', '1');
          return NextResponse.redirect(url);
        }
      }
    }
  }

  // Protect admin area except login + MFA enrollment (enrollment_token in query, not admin cookie).
  const adminPublicExact = ['/admin/login', '/admin/mfa-enroll'];
  const isAdminPublic = adminPublicExact.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (pathname.startsWith('/admin') && !isAdminPublic) {
    const adminToken = req.cookies.get('admin_token')?.value;
    const adminPayload = await verifyAdminToken(adminToken);
    if (!adminPayload) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('from', pathname);
      url.searchParams.delete('token');
      return NextResponse.redirect(url);
    }
  }

  const userProtectedRoutes = [
    '/perfil',
    '/minhas-reservas',
    '/dashboard',
    '/dashboard-rsv',
    '/pricing/dashboard',
  ];
  const requiresUserAuth = userProtectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (requiresUserAuth) {
    const userToken = req.cookies.get('auth_token')?.value;
    const adminToken = req.cookies.get('admin_token')?.value;
    const adminPayload = await verifyAdminToken(adminToken);
    const hasAccess = Boolean(userToken || adminPayload);
    if (!hasAccess) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
