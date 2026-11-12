'use client';

import React, { memo, useEffect, useState } from 'react';
import { ArrowUpRight, BarChart3 } from 'lucide-react';
import { useCrmLocale } from '../lintel/crm-locale-provider';
import { lintelIconBtn } from '../lintel/overview-primitives';
import { RENT_ROLL_MONTHS, RENT_ROLL_SERIES } from './rentals-data';
import { RentalsPanelExpand } from './rentals-panel-expand';

const ROLL_CEILING = 380;

function RentRollBars({
  loading,
  tall,
  variant = 'lintel',
}: {
  loading: boolean;
  tall?: boolean;
  variant?: 'lintel' | 'legacy';
}) {
  const trackH = tall ? 'h-[7.5rem]' : 'h-[6.25rem]';
  const isLintel = variant === 'lintel';

  return (
    <div
      className={`flex items-end gap-1.5 border-t border-gray-100 pt-4 dark:border-gray-800 ${
        tall ? 'min-h-[11rem]' : 'min-h-[9rem]'
      }`}
    >
      {RENT_ROLL_SERIES.map((val, i) => {
        const heightPct = Math.max(12, (val / ROLL_CEILING) * 100);
        const isLast = i === RENT_ROLL_SERIES.length - 1;
        return (
          <div key={RENT_ROLL_MONTHS[i]} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <div className={`flex w-full items-end justify-center ${trackH}`}>
              {loading ? (
                <div className="lintel-shimmer h-[70%] w-8 rounded-lg" />
              ) : isLintel ? (
                <div
                  className={`flex w-8 items-end justify-center rounded-lg bg-[#f1f3f6] dark:bg-gray-800/90 ${trackH}`}
                >
                  <div
                    className={`lintel-rent-roll-bar w-full rounded-lg ${
                      isLast ? 'bg-[#f38b4a]' : 'bg-[#3563e9]'
                    }`}
                    style={
                      {
                        height: `${heightPct}%`,
                        animationDelay: `${i * 40}ms`,
                      } as React.CSSProperties
                    }
                  />
                </div>
              ) : (
                <div className={`relative flex w-full flex-1 items-end justify-center ${trackH}`}>
                  <div
                    className="absolute inset-x-0 bottom-0 h-full rounded-xl bg-gray-100/90 dark:bg-gray-800/80"
                    aria-hidden
                  />
                  <div
                    className={`lintel-rent-roll-bar relative z-[1] w-[72%] rounded-full ${
                      isLast ? 'bg-[#ff8a3d]' : 'bg-[#2f5bea]'
                    }`}
                    style={
                      {
                        height: `${heightPct}%`,
                        animationDelay: `${i * 40}ms`,
                      } as React.CSSProperties
                    }
                  />
                </div>
              )}
            </div>
            <span className="text-[10px] font-bold text-gray-400">{RENT_ROLL_MONTHS[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

export const RentRollChart = memo(function RentRollChart({
  loading = false,
  totalDisplay = '$363,150',
  variant = 'lintel',
}: {
  loading?: boolean;
  totalDisplay?: string;
  variant?: 'lintel' | 'legacy';
}) {
  const { copy } = useCrmLocale();
  const r = copy.rentals;
  const [expanded, setExpanded] = useState(false);
  const [revealKey, setRevealKey] = useState(0);

  useEffect(() => {
    if (!loading) setRevealKey((k) => k + 1);
  }, [loading]);

  const body = (
    <>
      {loading ? (
        <div className="lintel-shimmer mb-3 h-9 w-48 max-w-full rounded-lg" />
      ) : (
        <div key={revealKey} className="lintel-rent-roll-total mb-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[22px] font-extrabold leading-none tracking-tight text-gray-900 dark:text-white">
              {totalDisplay}
            </span>
            <span className="text-[10px] font-medium text-gray-400">
              {r.rentRollSubtitle}
              {variant === 'lintel' ? (
                <>
                  <br />
                  {r.rentRollSubtitleUnits}
                </>
              ) : (
                <span className="ml-1">{r.rentRollSubtitleUnits}</span>
              )}
            </span>
          </div>
          {variant === 'legacy' ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#138a63]/12 px-2.5 py-1 text-[11px] font-bold text-[#138a63]">
                {r.rentRollGrowth}
              </span>
              <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-800 dark:border-gray-700 dark:bg-[#1d222c] dark:text-white">
                {r.rentRollLeasesSigned}
              </span>
            </div>
          ) : null}
        </div>
      )}
      <RentRollBars loading={loading} variant={variant} />
      {!loading ? (
        <p className="mt-3 text-[11px] font-medium text-gray-400">{r.rentRollChartFootnote}</p>
      ) : (
        <div className="lintel-shimmer mt-3 h-3 w-56 max-w-full rounded-md" />
      )}
    </>
  );

  return (
    <>
      <div className="rounded-2xl border border-white/80 bg-white/70 p-5 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#171b23]/80">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <BarChart3 className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
            {r.rentRollTitle}
          </h3>
          <button
            type="button"
            aria-label={r.rentRollExpandAria}
            onClick={() => setExpanded(true)}
            className={`h-8 w-8 shrink-0 ${lintelIconBtn}`}
            disabled={loading}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {body}
      </div>

      <RentalsPanelExpand open={expanded} title={r.rentRollTitle} onClose={() => setExpanded(false)}>
        <div className="lintel-rent-roll-total mb-4 flex flex-wrap items-center gap-2">
          <span className="text-4xl font-black text-gray-900 dark:text-white">{totalDisplay}</span>
          <span className="text-sm text-gray-500">{r.rentRollSubtitle}</span>
        </div>
        <RentRollBars loading={false} tall variant={variant} />
        <p className="mt-3 text-xs text-gray-400">{r.rentRollChartFootnote}</p>
      </RentalsPanelExpand>
    </>
  );
});
