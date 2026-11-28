'use client';

import { Building2, CalendarClock, DollarSign, Tag } from 'lucide-react';
import { useCrmLocale } from './crm-locale-provider';
import { LintelKpiPill } from './lintel-kpi-pill';
import { LintelKpiStripRow } from './lintel-kpi-strip-row';
import { LintelPrimaryActions } from './lintel-primary-actions';
import { commissionMonthKpi, type CommissionMonthPoint } from './commission-chart';

export type OverviewListingKpis = {
  publicadas: number;
  emAprovacao: number;
  incompletas: number;
  isLoading?: boolean;
};

const AVG_DAYS_DEMO = 62;

export type OverviewKpiStripProps = {
  listingKpis?: OverviewListingKpis | null;
  commissionSeries12M?: CommissionMonthPoint[] | null;
  commissionCurrency?: 'BRL' | 'USD';
  commissionLoading?: boolean;
};

export function OverviewKpiStrip({
  listingKpis = null,
  commissionSeries12M = null,
  commissionCurrency = 'USD',
  commissionLoading = false,
}: OverviewKpiStripProps) {
  const { copy } = useCrmLocale();
  const ov = copy.overview;
  const co = copy.commission;
  const kpiLoading = listingKpis?.isLoading === true;

  const activeListings = kpiLoading ? '…' : String(listingKpis?.publicadas ?? 3);
  const underOffer = kpiLoading ? '…' : String(listingKpis?.emAprovacao ?? 10);
  const commission = commissionLoading
    ? '…'
    : commissionMonthKpi(commissionSeries12M, commissionCurrency);

  return (
    <LintelKpiStripRow animateEnter>
      <LintelKpiPill
        surface="inline"
        icon={<Building2 className="h-3.5 w-3.5" />}
        value={activeListings}
        label={ov.activeListings}
        loading={kpiLoading}
      />
      <LintelKpiPill
        surface="inline"
        icon={<Tag className="h-3.5 w-3.5" />}
        value={underOffer}
        label={ov.underOffer}
        loading={kpiLoading}
        tone="accentOrange"
      />
      <LintelKpiPill
        surface="inline"
        icon={<DollarSign className="h-3.5 w-3.5" />}
        value={commission}
        label={co.kpiThisMonth}
        loading={commissionLoading}
      />
      <LintelKpiPill
        surface="inline"
        icon={<CalendarClock className="h-3.5 w-3.5" />}
        value={String(AVG_DAYS_DEMO)}
        label={ov.avgDaysOnMarket}
        tone="accentViolet"
      />
      <LintelPrimaryActions variant="listings" className="ml-0.5 shrink-0" />
    </LintelKpiStripRow>
  );
}
