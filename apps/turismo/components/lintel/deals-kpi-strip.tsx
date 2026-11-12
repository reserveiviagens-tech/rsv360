'use client';

import { Calendar, Layers, Trophy, TrendingUp } from 'lucide-react';
import { useCrmLocale } from './crm-locale-provider';
import { LintelKpiPill } from './lintel-kpi-pill';
import { LintelKpiStripRow } from './lintel-kpi-strip-row';
import { LintelPrimaryActions } from './lintel-primary-actions';

export type DealsKpiStripProps = {
  openDeals: number;
  weightedCommission: string;
  closingCount: number;
  closingCommissionBadge?: string | null;
  winRate: number;
  lintelLayout?: boolean;
};

export function DealsKpiStrip({
  openDeals,
  weightedCommission,
  closingCount,
  closingCommissionBadge = null,
  winRate,
  lintelLayout = false,
}: DealsKpiStripProps) {
  const { copy } = useCrmLocale();
  const d = copy.deals;
  const surface = lintelLayout ? 'inline' : 'card';
  const valueClass = lintelLayout
    ? 'text-xl font-bold leading-none text-slate-900 dark:text-white'
    : undefined;

  return (
    <LintelKpiStripRow
      className={`flex-wrap justify-end ${lintelLayout ? 'gap-6 xl:gap-8' : ''}`}
    >
      <LintelKpiPill
        surface={surface}
        valueClassName={valueClass}
        icon={<Layers className="h-3.5 w-3.5" />}
        value={String(openDeals)}
        label={d.openDealsKpi}
      />
      <LintelKpiPill
        surface={surface}
        valueClassName={valueClass}
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        value={weightedCommission}
        label={d.weightedCommissionKpi}
      />
      <LintelKpiPill
        surface={surface}
        valueClassName={valueClass}
        icon={<Calendar className="h-3.5 w-3.5" />}
        value={String(closingCount)}
        label={d.closingThisMonthKpi}
        tone="accentOrange"
        valueSuffix={
          closingCommissionBadge ? (
            <span className="shrink-0 text-[9px] font-bold text-[#f97316]">({closingCommissionBadge})</span>
          ) : undefined
        }
      />
      <LintelKpiPill
        surface={surface}
        valueClassName={valueClass}
        icon={<Trophy className="h-3.5 w-3.5" />}
        value={`${winRate}%`}
        label={d.winRateKpi}
        tone="accentViolet"
      />
      <LintelPrimaryActions
        variant="deals"
        hideOverflowMenu={lintelLayout}
        className="ml-0.5 shrink-0"
      />
    </LintelKpiStripRow>
  );
}
