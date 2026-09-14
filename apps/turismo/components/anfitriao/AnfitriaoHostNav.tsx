'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useAnfitriaoUnreadCount } from '@/hooks/useAnfitriao';

const TABS = [
  { id: 'hoje', label: 'Hoje', href: '/anfitriao', match: (p: string) => p === '/anfitriao' || p === '/anfitriao/' },
  {
    id: 'calendario',
    label: 'Calendário',
    href: '/anfitriao/calendario',
    match: (p: string) =>
      p.startsWith('/anfitriao/calendario') || p.includes('/disponibilidade'),
  },
  {
    id: 'anuncios',
    label: 'Anúncios',
    href: '/anfitriao/unidades',
    match: (p: string) =>
      p.startsWith('/anfitriao/unidades') && !p.includes('/disponibilidade'),
  },
  {
    id: 'mensagens',
    label: 'Mensagens',
    href: '/anfitriao/mensagens',
    match: (p: string) => p.startsWith('/anfitriao/mensagens'),
  },
  {
    id: 'reservas',
    label: 'Reservas',
    href: '/anfitriao/reservas',
    match: (p: string) => p.startsWith('/anfitriao/reservas'),
  },
  {
    id: 'desempenho',
    label: 'Desempenho',
    href: '/anfitriao/desempenho',
    match: (p: string) => p.startsWith('/anfitriao/desempenho'),
  },
  {
    id: 'tarifas',
    label: 'Tarifas',
    href: '/anfitriao/tarifas',
    match: (p: string) => p.startsWith('/anfitriao/tarifas'),
  },
  {
    id: 'comissoes',
    label: 'Comissões',
    href: '/anfitriao/comissoes',
    match: (p: string) => p.startsWith('/anfitriao/comissoes'),
  },
  {
    id: 'importar',
    label: 'Importar',
    href: '/anfitriao/importar',
    match: (p: string) => p.startsWith('/anfitriao/importar'),
  },
] as const;

type Props = {
  className?: string;
};

/**
 * Top host chrome — Airbnb-like primary tabs (not a left dropdown/rail).
 */
export function AnfitriaoHostNav({ className = '' }: Props) {
  const router = useRouter();
  const path = (router.asPath || router.pathname || '').split('?')[0];
  const { user, isAuthenticated } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'manager';
  const { data: unreadCount = 0 } = useAnfitriaoUnreadCount({
    enabled: Boolean(isAuthenticated),
    pollMs: 20_000,
  });

  return (
    <header className={`border-b border-slate-200 bg-white ${className}`}>
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 md:px-6">
        <Link
          href="/anfitriao"
          className="shrink-0 py-3 text-sm font-bold tracking-tight text-slate-900"
          prefetch={false}
        >
          Anfitrião
        </Link>
        <nav
          className="-mb-px flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Navegação do anfitrião"
        >
          {TABS.map((tab) => {
            const active = tab.match(path);
            const showUnread = tab.id === 'mensagens' && unreadCount > 0;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                prefetch={false}
                className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm transition ${
                  active
                    ? 'border-slate-900 font-semibold text-slate-900'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                }`}
                aria-label={
                  showUnread
                    ? `Mensagens, ${unreadCount} não lida${unreadCount === 1 ? '' : 's'}`
                    : undefined
                }
              >
                {tab.label}
                {showUnread ? (
                  <span
                    className="min-w-[1.25rem] rounded-full bg-teal-600 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white"
                    aria-hidden
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
          {isStaff ? (
            <Link
              href="/anfitriao/admin/verificacao-local"
              prefetch={false}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm transition ${
                path.startsWith('/anfitriao/admin/verificacao-local')
                  ? 'border-slate-900 font-semibold text-slate-900'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              Verificação
            </Link>
          ) : null}
        </nav>
        <Link
          href="/anfitriao/perfil"
          className={`hidden shrink-0 text-xs font-medium sm:inline ${
            path.startsWith('/anfitriao/perfil')
              ? 'text-slate-900'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          prefetch={false}
        >
          Perfil
        </Link>
        <Link
          href="/dashboard"
          className="hidden shrink-0 text-xs font-medium text-slate-500 hover:text-slate-800 sm:inline"
          prefetch={false}
        >
          Dashboard
        </Link>
      </div>
    </header>
  );
}
