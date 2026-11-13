'use client';

import React from 'react';
import { LINTEL_RENTALS_TW } from '../lintel/lintel-theme';

/** Espelha RentalsCrmModule (layout Lintel Rentals). */
export function RentalsSkeleton() {
  return (
    <div className="lintel-rentals-enter flex flex-col gap-5" aria-busy="true" aria-label="Carregando locações">
      <RentalsHeaderSkeleton />
      <div className="lintel-rentals-skeleton-stagger flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lintel-shimmer min-h-[234px] rounded-2xl lg:col-span-7" />
          <div className="lintel-shimmer min-h-[234px] rounded-2xl lg:col-span-5" />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <div className="lintel-shimmer h-[26px] w-[14rem] max-w-full rounded-full" />
            {[52, 58, 54, 72].map((w, i) => (
              <div key={i} className="lintel-shimmer h-[26px] rounded-full" style={{ width: `${w}px` }} />
            ))}
          </div>
          <div className="lintel-shimmer h-[26px] w-[6.5rem] shrink-0 rounded-full" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <CardSkeleton key={idx} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RentalsHeaderSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center xl:justify-between xl:gap-3">
      <div className="lintel-shimmer h-8 w-36 max-w-full rounded-lg" />
      <div className="min-w-0 flex-1 xl:flex xl:justify-end">
        <div className="flex w-full min-w-0 flex-nowrap items-center justify-start gap-2 overflow-x-auto pb-0.5 sm:justify-end md:gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="lintel-shimmer h-9 w-[6.5rem] max-w-[9rem] shrink-0 rounded-xl" />
          ))}
          <div className="lintel-shimmer h-9 w-[6.75rem] shrink-0 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div
      className={`flex min-h-[290px] flex-col rounded-2xl border border-white/80 bg-white/40 p-3 dark:border-white/10 ${LINTEL_RENTALS_TW.skeletonMutedDark}`}
    >
      <div className="lintel-shimmer mb-2.5 h-[7.875rem] w-full rounded-[10px]" />
      <div className="lintel-shimmer mb-1.5 h-3.5 w-2/5 rounded-md" />
      <div className="lintel-shimmer mb-1 h-3 w-3/5 rounded-md" />
      <div className="lintel-shimmer mb-2 h-2.5 w-4/5 rounded-md" />
      <div className="mt-auto min-h-[4rem] rounded-lg bg-gray-100/80 p-2 dark:bg-gray-800/40">
        <div className="lintel-shimmer mb-2 h-2.5 w-full rounded-md" />
        <div className="lintel-shimmer h-1 w-full rounded-full" />
      </div>
      <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 dark:border-gray-800">
        <div className="lintel-shimmer h-2.5 w-2/3 rounded-md" />
        <div className="lintel-shimmer h-[18px] w-[18px] rounded-full" />
      </div>
    </div>
  );
}
