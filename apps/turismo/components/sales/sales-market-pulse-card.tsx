'use client';

import { useCallback, useState } from 'react';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { useCrmLocale } from '../lintel/crm-locale-provider';
import { lintelIconBtn } from '../lintel/overview-primitives';
import { SAMPLE_SALES_LISTINGS, SALES_MARKET_PULSE, type SalesListing } from './sales-data';

const COLS = 4;

export function SalesMarketPulseCard({ onSelect }: { onSelect: (listing: SalesListing) => void }) {
  const { copy } = useCrmLocale();
  const sm = copy.salesModule;
  const rows = SALES_MARKET_PULSE;
  const [expanded, setExpanded] = useState(false);
  const [revealEpoch, setRevealEpoch] = useState(0);

  const toggleExpanded = useCallback(() => {
    setExpanded((was) => {
      if (!was) setRevealEpoch((e) => e + 1);
      return !was;
    });
  }, []);

  return (
    <section
      className={[
        'lintel-market-pulse-card rounded-xl border border-white/60 bg-white/40 p-4 shadow-xs backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06]',
        expanded ? 'lintel-market-pulse-card--expanded' : '',
      ].join(' ')}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex flex-wrap items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
          <TrendingUp className="h-4 w-4 text-gray-500" aria-hidden />
          {sm.marketPulseTitle}
          <span className="text-[11px] font-medium text-gray-400">{sm.marketPulseSubtitle}</span>
        </h3>
        <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-orange-500" /> {sm.legendAbove}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> {sm.legendBelow}
          </span>
          <button
            type="button"
            className={`h-7 w-7 ${lintelIconBtn} transition-colors`}
            aria-expanded={expanded}
            aria-label={expanded ? sm.collapsePulseAria : sm.expandPulseAria}
            onClick={toggleExpanded}
          >
            <ArrowUpRight
              className={[
                'h-3.5 w-3.5 transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
                expanded ? 'rotate-90' : '',
              ].join(' ')}
            />
          </button>
        </div>
      </div>

      <div
        className={[
          'lintel-market-pulse-body overflow-hidden',
          expanded ? 'lintel-market-pulse-body--expanded' : 'lintel-market-pulse-body--collapsed',
        ].join(' ')}
      >
        <div className="lintel-market-pulse-grid grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          {rows.map((row, idx) => {
            const listing = SAMPLE_SALES_LISTINGS.find((l) => l.slug === row.slug);
            const pct = row.deltaPct;
            const isDeferRow = idx >= COLS;
            return (
              <button
                key={row.slug}
                type="button"
                onClick={() => listing && onSelect(listing)}
                className={[
                  'lintel-market-pulse-cell group min-w-0 rounded-lg py-0.5 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]',
                  isDeferRow ? 'lintel-market-pulse-cell--defer' : 'lintel-market-pulse-cell--primary',
                  expanded && isDeferRow ? 'lintel-market-pulse-cell--defer-in' : '',
                ].join(' ')}
                style={
                  expanded && isDeferRow
                    ? { animationDelay: `${(idx - COLS) * 55}ms` }
                    : undefined
                }
              >
                <div className="mb-1.5 flex items-center justify-between gap-1">
                  <span className="truncate text-[10px] font-bold text-slate-800 dark:text-gray-200">
                    {row.name.length > 18 ? `${row.name.slice(0, 16)}…` : row.name}
                  </span>
                  <span
                    className={[
                      'lintel-market-pulse-pct shrink-0 text-[9px] font-black tabular-nums',
                      row.above ? 'text-orange-500' : 'text-emerald-600',
                      expanded && isDeferRow ? 'lintel-market-pulse-pct--in' : '',
                    ].join(' ')}
                    style={
                      expanded && isDeferRow
                        ? { animationDelay: `${(idx - COLS) * 55 + 80}ms` }
                        : undefined
                    }
                  >
                    {pct > 0 ? '+' : ''}
                    {pct}%
                  </span>
                </div>
                <MarketPulseDivergingBar
                  above={row.above}
                  pct={pct}
                  isDeferRow={isDeferRow}
                  expanded={expanded}
                  rowIndex={isDeferRow ? idx - COLS : idx}
                  revealEpoch={revealEpoch}
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MarketPulseDivergingBar({
  above,
  pct,
  isDeferRow,
  expanded,
  rowIndex,
  revealEpoch,
}: {
  above: boolean;
  pct: number;
  isDeferRow: boolean;
  expanded: boolean;
  rowIndex: number;
  revealEpoch: number;
}) {
  const widthPct = Math.min(50, Math.abs(pct) * 5.5);
  const shouldAnimate = !isDeferRow || expanded;
  const animKey = isDeferRow ? `defer-${revealEpoch}-${rowIndex}` : `primary-${rowIndex}`;

  return (
    <div className="relative h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className="absolute left-1/2 top-0 z-[1] h-full w-px -translate-x-1/2 bg-slate-200 dark:bg-slate-600"
        aria-hidden
      />
      {shouldAnimate ? (
        <div
          key={animKey}
          className={[
            'lintel-market-pulse-bar-fill lintel-market-pulse-bar-fill--play absolute top-0 h-full',
            above ? 'left-1/2 rounded-r-full bg-orange-500' : 'right-1/2 rounded-l-full bg-emerald-500',
            isDeferRow ? 'lintel-market-pulse-bar-fill--defer' : 'lintel-market-pulse-bar-fill--primary',
          ].join(' ')}
          style={{
            width: `${widthPct}%`,
            transformOrigin: above ? 'left center' : 'right center',
            animationDelay: isDeferRow ? `${rowIndex * 55 + 120}ms` : `${rowIndex * 40}ms`,
          }}
        />
      ) : (
        <div
          className={[
            'absolute top-0 h-full opacity-0',
            above ? 'left-1/2' : 'right-1/2',
          ].join(' ')}
          style={{ width: `${widthPct}%` }}
          aria-hidden
        />
      )}
    </div>
  );
}
