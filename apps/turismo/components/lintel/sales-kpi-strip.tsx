'use client';

import { Building2, DollarSign, LayoutGrid, List, Map, Tag, TrendingUp } from 'lucide-react';
import { useCrmLocale } from './crm-locale-provider';
import { LintelKpiPill } from './lintel-kpi-pill';
import { LintelKpiStripRow } from './lintel-kpi-strip-row';
import { LintelPrimaryActions } from './lintel-primary-actions';
import type { SalesViewMode } from '../sales/sales-data';

export type SalesKpiStripProps = {
  activeCount?: number;
  underOfferCount?: number;
  soldThisYear?: number;
  soldVolumeLabel?: string | null;
  avgPricePerUnit?: string;
  lintelLayout?: boolean;
  viewMode?: SalesViewMode;
  onViewModeChange?: (mode: SalesViewMode) => void;
};

const viewBtn = (active: boolean, lintel?: boolean) =>
  lintel
    ? [
        'inline-flex h-7 items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold transition-all',
        active
          ? 'bg-white text-slate-900 shadow-sm dark:bg-[#1d222c] dark:text-white'
          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
      ].join(' ')
    : [
        'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[10px] font-bold transition-colors',
        active
          ? 'bg-[#121722] text-white dark:bg-white dark:text-[#121722]'
          : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200',
      ].join(' ');

export function SalesKpiStrip({
  activeCount = 6,
  underOfferCount = 2,
  soldThisYear = 22,
  soldVolumeLabel = '$35.46M',
  avgPricePerUnit = '$643',
  lintelLayout = false,
  viewMode = 'grid',
  onViewModeChange,
}: SalesKpiStripProps) {
  const { copy } = useCrmLocale();
  const s = copy.salesModule;
  const surface = lintelLayout ? 'inline' : 'card';
  const valueClass = lintelLayout ? 'text-base font-black leading-none text-gray-900 dark:text-white' : undefined;

  return (
    <LintelKpiStripRow className="flex-wrap justify-end">
      <LintelKpiPill
        surface={surface}
        valueClassName={valueClass}
        icon={<Building2 className="h-3.5 w-3.5" />}
        value={String(activeCount)}
        label={s.activeListingsKpi}
      />
      <LintelKpiPill
        surface={surface}
        valueClassName={valueClass}
        icon={<Tag className="h-3.5 w-3.5" />}
        value={String(underOfferCount)}
        label={s.underOfferKpi}
        tone="accentOrange"
      />
      <LintelKpiPill
        surface={surface}
        valueClassName={valueClass}
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        value={String(soldThisYear)}
        label={s.soldThisYearKpi}
        valueSuffix={
          soldVolumeLabel ? (
            <span className="shrink-0 text-[9px] font-bold text-[#2563eb]">({soldVolumeLabel})</span>
          ) : undefined
        }
      />
      <LintelKpiPill
        surface={surface}
        valueClassName={valueClass}
        icon={<DollarSign className="h-3.5 w-3.5" />}
        value={avgPricePerUnit}
        label={s.avgPricePerSqftKpi}
        tone="accentViolet"
      />
      {lintelLayout ? (
        <div className="flex shrink-0 items-center gap-2">
          <LintelPrimaryActions variant="listings" hideOverflowMenu className="ml-0 shrink-0" />
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800/80">
            <button
              type="button"
              className={viewBtn(viewMode === 'grid', true)}
              onClick={() => onViewModeChange?.('grid')}
            >
              <LayoutGrid className="h-3 w-3" aria-hidden />
              {s.viewGrid}
            </button>
            <button
              type="button"
              className={viewBtn(viewMode === 'list', true)}
              onClick={() => onViewModeChange?.('list')}
            >
              <List className="h-3 w-3" aria-hidden />
              {s.viewList}
            </button>
            <button
              type="button"
              className={viewBtn(viewMode === 'map', true)}
              onClick={() => onViewModeChange?.('map')}
            >
              <Map className="h-3 w-3" aria-hidden />
              {s.viewMap}
            </button>
          </div>
        </div>
      ) : (
        <LintelPrimaryActions variant="listings" className="ml-0.5 shrink-0" />
      )}
    </LintelKpiStripRow>
  );
}
