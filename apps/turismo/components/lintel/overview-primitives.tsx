import React from 'react';

/** Motion/easing alinhado ao demo Lintel (Code and Chill) — uso na aba Overview. */

/** Skeleton → conteúdo (referência: pagina Overview.mp4 do owner). */
export const OVERVIEW_BOOT_MS = 580;

export const lintelLayoutEase =
  'duration-500 ease-[cubic-bezier(0.2,0,0,1)]';

export const lintelEase = 'duration-150 ease-[cubic-bezier(0.2,0,0,1)]';

export function lintelGreeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
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
    <div className="lintel-overview-enter space-y-4" aria-busy="true" aria-label="Carregando overview">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="lintel-shimmer h-14 w-64 rounded-2xl" />
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="lintel-shimmer h-14 w-36 rounded-2xl" />
          ))}
          <div className="lintel-shimmer h-10 w-32 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="lintel-shimmer min-h-[380px] rounded-[26px] md:col-span-7" />
            <div className="lintel-shimmer min-h-[380px] rounded-[26px] md:col-span-5" />
          </div>
          <div className="lintel-shimmer h-48 rounded-[26px]" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="lintel-shimmer h-72 rounded-[26px] md:col-span-4" />
            <div className="lintel-shimmer h-72 rounded-[26px] md:col-span-5" />
            <div className="lintel-shimmer h-72 rounded-[26px] md:col-span-3" />
          </div>
        </div>
        <div className="lintel-shimmer min-h-[480px] rounded-[26px] lg:col-span-4 lg:min-h-[calc(100vh-140px)]" />
      </div>
    </div>
  );
}
