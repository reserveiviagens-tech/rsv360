'use client';

import React from 'react';
import { LINTEL_SALES_TW } from '../lintel/lintel-theme';

/** Espelha SalesCrmModule (layout Lintel Sales). */
export function SalesSkeleton() {
  return (
    <div className="lintel-rentals-enter flex flex-col gap-4" aria-busy="true" aria-label="Carregando vendas">
      <SalesHeaderSkeleton />
      <div className="lintel-rentals-skeleton-stagger flex flex-col gap-4">
        <div className="lintel-shimmer min-h-[72px] rounded-2xl" />

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <div className="lintel-shimmer h-[26px] w-[13.5rem] max-w-full rounded-full" />
            {[40, 52, 58, 72, 48].map((w, i) => (
              <div key={i} className="lintel-shimmer h-[26px] rounded-full" style={{ width: `${w}px` }} />
            ))}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {[72, 78, 68].map((w, i) => (
              <div key={i} className="lintel-shimmer h-[26px] rounded-full" style={{ width: `${w}px` }} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <SalesCardSkeleton key={idx} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SalesHeaderSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-start xl:justify-between xl:gap-3">
      <div className="min-w-0 shrink-0 space-y-1.5">
        <div className="lintel-shimmer h-7 w-28 max-w-full rounded-lg" />
        <div className="lintel-shimmer h-5 w-20 rounded-md" />
      </div>
      <div className="min-w-0 flex-1 xl:flex xl:justify-end">
        <div className="flex w-full min-w-0 flex-nowrap items-center justify-start gap-2 overflow-x-auto pb-0.5 sm:justify-end">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="lintel-shimmer h-8 w-[7.25rem] max-w-[9.5rem] shrink-0 rounded-full" />
          ))}
          <div className="lintel-shimmer h-8 w-[6.75rem] shrink-0 rounded-full" />
          <div className="lintel-shimmer h-8 w-[5.5rem] shrink-0 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function SalesCardSkeleton() {
  return (
    <div
      className={`flex min-h-[336px] flex-col rounded-2xl border border-white/80 bg-white/40 p-2 dark:border-white/10 ${LINTEL_SALES_TW.skeletonMutedDark}`}
    >
      <div className="lintel-shimmer mb-2 h-[8.5rem] w-full rounded-[10px]" />
      <div className="flex flex-1 flex-col px-1 pb-1">
        <div className="mb-1 flex justify-between gap-2">
          <div className="lintel-shimmer h-3.5 w-14 rounded-md" />
          <div className="lintel-shimmer h-3 w-16 rounded-full" />
        </div>
        <div className="lintel-shimmer mb-1 h-3 w-3/4 rounded-md" />
        <div className="lintel-shimmer mb-0.5 h-2.5 w-full rounded-md" />
        <div className="lintel-shimmer mb-2 h-2.5 w-2/3 rounded-md" />
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="lintel-shimmer h-2.5 w-6 rounded-md" />
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-2 dark:border-gray-800">
          <div className="lintel-shimmer h-2.5 w-4/5 rounded-md" />
          <div className="lintel-shimmer h-5 w-5 rounded-full" />
        </div>
      </div>
    </div>
  );
}
