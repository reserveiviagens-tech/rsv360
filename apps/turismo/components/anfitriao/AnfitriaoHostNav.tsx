'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAnfitriaoUnreadCount } from '@/hooks/useAnfitriao';

const TABS = [
  { id: 'hoje', label: 'Hoje', href: '/anfitriao', match: (p: string) => p === '/anfitriao' || p === '/anfitriao/' },
  {
    id: 'calendario',
    label: 'CalendÃ¡rio',
    href: '/anfitriao/calendario',
    match: (p: string) =>
      p.startsWith('/anfitriao/calendario') || p.includes('/disponibilidade'),
  },
  {
    id: 'anuncios',
    label: 'AnÃºncios',
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
    label: 'ComissÃµes',
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
 * Top host chrome â€” Airbnb-like primary tabs (not a left dropdown/rail).
 */
export function AnfitriaoHostNav({ className = '' }: Props) {
  const router = useRouter();
  const path = (router.asPath || router.pathname || '').split('?')[0];
  const isHome = path === '/anfitriao' || path === '/anfitriao/';
  const { user, isAuthenticated } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'manager';
  const { data: unreadCount = 0 } = useAnfitriaoUnreadCount({
    enabled: Boolean(isAuthenticated),
    pollMs: 20_000,
  });

  function handleVoltar() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    void router.push('/anfitriao');
  }

  return (
    <header className={`border-b border-slate-200 bg-white ${className}`}>
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 md:gap-4 md:px-6">
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleVoltar}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            data-testid="btn-anfitriao-voltar"
            aria-label="Voltar para a pÃ¡gina anterior"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Voltar</span>
          </button>
          <Link
            href="/anfitriao"
            prefetch={false}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition ${
              isHome
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
            }`}
            data-testid="btn-anfitriao-inicio"
            aria-label="Ir para o inÃ­cio do AnfitriÃ£o"
            aria-current={isHome ? 'page' : undefined}
          >
            <Home className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">InÃ­cio</span>
          </Link>
        </div>
        <Link
          href="/anfitriao"
          className="shrink-0 py-3 text-sm font-bold tracking-tight text-slate-900"
          prefetch={false}
        >
          AnfitriÃ£o
        </Link>
        <nav
          className="-mb-px flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="NavegaÃ§Ã£o do anfitriÃ£o"
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
                    ? `Mensagens, ${unreadCount} nÃ£o lida${unreadCount === 1 ? '' : 's'}`
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
              VerificaÃ§Ã£o
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
