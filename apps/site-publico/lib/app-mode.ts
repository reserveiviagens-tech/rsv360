export type AppMode = 'public' | 'marketing-lab';

const rawMode =
  process.env.RSV360_APP_MODE ?? process.env.NEXT_PUBLIC_APP_MODE ?? 'public';

export const APP_MODE: AppMode =
  rawMode === 'marketing-lab' ? 'marketing-lab' : 'public';

export const PRIMARY_SITE_URL = (
  process.env.NEXT_PUBLIC_PRIMARY_SITE_URL ?? 'http://localhost:5000'
).replace(/\/$/, '');

const LAB_ROUTE_PREFIXES = [
  '/lab',
  '/analytics',
  '/marketing',
  '/crm',
  '/admin',
  '/pricing',
  '/dashboard-estatisticas',
  '/dashboard',
  '/login',
  '/auth/sso',
  '/recuperar-senha',
  '/redefinir-senha',
  // Cotação Interativa v2 — permanece no S2 (API :3002), não no site B2C :5000
  '/proposta',
  '/cotacao',
  '/roteiro',
  // Anúncio público por slug personalizado (anfitrião)
  '/h',
] as const;

/** Theater / mock surfaces — hidden from APP_MODE=public (Aruanda C4). */
const THEATER_ROUTE_PREFIXES = [
  '/leiloes',
  '/insurance',
  '/marketplace',
  '/ui-demo',
  '/admin/ui-demo',
  '/admin/pwa-demo',
  '/flash-deals',
] as const;

export function isMarketingLabMode(): boolean {
  return APP_MODE === 'marketing-lab';
}

export function isStaticAssetPath(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?|ttf)$/i.test(pathname)
  );
}

export function isLabApiPath(pathname: string): boolean {
  return pathname.startsWith('/api');
}

export function isLabUiPath(pathname: string): boolean {
  return LAB_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isTheaterUiPath(pathname: string): boolean {
  return THEATER_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function buildPrimarySiteUrl(pathname: string, search: string): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${PRIMARY_SITE_URL}${path}${search}`;
}
