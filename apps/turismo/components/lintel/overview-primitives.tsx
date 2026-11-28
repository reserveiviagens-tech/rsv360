import React from 'react';
import type { CrmLocale } from './crm-locale';

/** Motion/easing alinhado ao demo Lintel (Code and Chill) — uso na aba Overview. */

/** Skeleton → conteúdo (referência: pagina Overview.mp4 do owner). */
export const OVERVIEW_BOOT_MS = 580;

/** Shimmer + draw da curva após o skeleton (referência: caregamento da comissão.mp4). */
export const COMMISSION_REVEAL_MS = 780;
/** Demo Lintel: reveal curto para alinhar ao vídeo side-by-side (sem gráfico vazio). */
export const COMMISSION_REVEAL_DEMO_MS = 200;

export const lintelLayoutEase =
  'duration-500 ease-[cubic-bezier(0.2,0,0,1)]';

/** Superfície de card Overview — ~14px radius (paridade Lintel 902×1068). */
export const lintelOverviewCard =
  'rounded-2xl border border-white/80 bg-white/70 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#171b23]/80';

/** Largura útil do grid com rail fechado (≈1328px @ 1440p). */
export const LINTEL_OVERVIEW_CONTENT_MAX_PX = 1328;

export const lintelEase = 'duration-150 ease-[cubic-bezier(0.2,0,0,1)]';

export function lintelGreeting(date = new Date()): string {
  return lintelGreetingLocalized('pt', date);
}

export function lintelGreetingLocalized(locale: CrmLocale, date = new Date()): string {
  const h = date.getHours();
  if (locale === 'en') {
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Primeiro nome ou parte local do e-mail — cabe em uma linha no header. */
export function lintelDisplayFirstName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'Parceiro';

  let token = trimmed;
  if (token.includes('@')) {
    token = (token.split('@')[0] ?? token).trim();
  }
  token = (token.split(/[._+\-\s]/)[0] ?? token).trim();
  if (!token) return 'Parceiro';
  if (token.length <= 2) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

export const lintelBtnPrimary = [
  'inline-flex items-center justify-center gap-1.5 rounded-full font-black text-xs',
  'bg-[#121722] text-white shadow-md',
  'dark:bg-white dark:text-[#121722]',
  'hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.96] active:shadow-sm',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5bea]/40 focus-visible:ring-offset-2',
  'transition-all',
  lintelEase,
  'will-change-transform',
].join(' ');

export const lintelBtnGhost = [
  'inline-flex items-center justify-center gap-1 rounded-full border text-xs font-bold',
  'border-gray-200/80 dark:border-gray-700/80 bg-white/70 dark:bg-gray-800/70',
  'hover:-translate-y-0.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-[0.97]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5bea]/30',
  'transition-all',
  lintelEase,
  'will-change-transform',
].join(' ');

export const lintelIconBtn = [
  'inline-flex items-center justify-center rounded-full border backdrop-blur',
  'border-gray-200/80 dark:border-gray-700/80 bg-white/70 dark:bg-gray-800/70',
  'text-gray-700 dark:text-gray-200',
  'hover:scale-105 active:scale-95',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5bea]/30',
  'transition-transform',
  lintelEase,
].join(' ');

export const lintelNavTab = (active: boolean) =>
  [
    'px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap',
    'transition-all',
    lintelEase,
    active
      ? 'bg-[#121722] text-white dark:bg-white dark:text-[#121722] shadow-sm scale-[1.02]'
      : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98]',
  ].join(' ');

/** Badge laranja no canto do tab (referência Lintel). */
export const lintelNavTabBadge =
  'inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-[#ff8a3d] px-1.5 py-0.5 text-[10px] font-black leading-none text-white';

export function LintelNavTabBadge({ value }: { value: string | number }) {
  return <span className={lintelNavTabBadge}>{value}</span>;
}

/** KPI compacto do header Overview (referência Lintel). */
export const lintelKpiPill =
  'lintel-kpi-pill flex w-auto min-w-0 max-w-[9.5rem] shrink-0 items-center gap-2 rounded-2xl border border-white/80 bg-white/70 px-2.5 py-1.5 shadow-xs backdrop-blur dark:border-white/10 dark:bg-[#171b23]/80 sm:max-w-[10.25rem]';

/** KPI do header Overview — sem caixa (referência Lintel). */
export const lintelKpiPillInline =
  'lintel-kpi-pill lintel-kpi-pill--inline flex w-auto min-w-[7.5rem] max-w-[10rem] shrink-0 items-center gap-2 border-0 bg-transparent px-0 py-0 shadow-none backdrop-blur-none dark:bg-transparent sm:max-w-[10.5rem]';

export const lintelKpiIcon =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200/60 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300';

export const lintelSegment = (pressed: boolean) =>
  [
    'px-2.5 py-1 rounded-full text-[11px] font-bold transition-all',
    lintelEase,
    pressed
      ? 'bg-white dark:bg-gray-700 shadow-xs text-gray-900 dark:text-white scale-[1.02]'
      : 'text-gray-400 hover:text-gray-600 active:scale-95',
  ].join(' ');

export function OverviewSkeleton() {
  return (
    <div className="lintel-overview-enter" aria-busy="true" aria-label="Carregando overview">
      {/* Espelha overview-lintel-hero + KPI strip (RSV360ExecutiveDashboard). */}
      <section className="overview-lintel-hero lintel-overview-hero mb-3 flex min-w-0 flex-col gap-2 sm:gap-2.5 xl:mb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="lintel-shimmer h-9 w-52 max-w-full shrink-0 rounded-xl sm:h-10 sm:w-56" />
        <div className="min-w-0 flex-1 xl:flex xl:justify-end xl:pl-4">
          <div className="lintel-kpi-strip flex w-full min-w-0 flex-nowrap items-center justify-start gap-2 overflow-x-auto pb-0.5 sm:justify-end md:gap-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="lintel-shimmer h-9 w-[7.5rem] max-w-[10rem] shrink-0 rounded-2xl sm:h-10" />
            ))}
            <div className="lintel-shimmer h-9 w-[7.25rem] shrink-0 rounded-full sm:h-10" />
          </div>
        </div>
      </section>

      <div className="lintel-overview-main grid grid-cols-1 gap-0">
        <div className="lintel-overview-skeleton-stagger flex flex-col gap-4">
          <div className="lintel-overview-bento grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
            <div className="flex flex-col gap-4 lg:col-span-7">
              <div className="lintel-overview-commission lintel-shimmer min-h-[300px] rounded-2xl" />
              <div className="lintel-overview-pipeline lintel-shimmer min-h-[200px] rounded-2xl" />
            </div>
            <div className="lintel-overview-featured lintel-shimmer min-h-[380px] rounded-2xl lg:col-span-5 lg:min-h-full" />
          </div>

          <div className="lintel-overview-row-3 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
            <div className="lintel-overview-agenda lintel-shimmer min-h-[340px] rounded-2xl lg:col-span-4 lg:min-h-[420px]" />
            <div className="lintel-overview-map lintel-shimmer min-h-[340px] rounded-2xl lg:col-span-5 lg:min-h-[420px]" />
            <div className="lintel-overview-rentals lintel-shimmer min-h-[340px] rounded-2xl lg:col-span-3 lg:min-h-[420px]" />
          </div>

          <div className="lintel-overview-row-4 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
            <div className="lintel-overview-agents lintel-shimmer min-h-[280px] rounded-2xl lg:col-span-5 lg:min-h-[410px]" />
            <div className="lintel-overview-activity lintel-shimmer min-h-[280px] rounded-2xl lg:col-span-7 lg:min-h-[410px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
