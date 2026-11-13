'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useCrmLocale } from '../lintel/crm-locale-provider';
import { SalesKpiStrip } from '../lintel/sales-kpi-strip';
import { SalesListTable } from './sales-list-table';
import { SalesMapView } from './sales-map-view';
import { SalesMarketPulseCard } from './sales-market-pulse-card';
import { SalesPropertyCard } from './sales-property-card';
import { SalesToolbarSelect } from './sales-toolbar-select';
import {
  SAMPLE_SALES_LISTINGS,
  salesFilterCounts,
  salesMatchesBeds,
  salesMatchesFilter,
  salesMatchesType,
  sortSalesListings,
  type SalesBedsFilter,
  type SalesListing,
  type SalesSortKey,
  type SalesStatusFilter,
  type SalesTypeFilter,
  type SalesViewMode,
} from './sales-data';
import { LINTEL_SALES_TW } from '../lintel/lintel-theme';
import { SalesSkeleton } from './sales-skeleton';

export const SALES_PAGE_BOOT_MS = 580;

export type { SalesViewMode } from './sales-data';

export type SalesCrmModuleProps = {
  onSelectListing: (listing: SalesListing) => void;
  isActive?: boolean;
  bootOnActivate?: boolean;
};

export function SalesCrmModule({
  onSelectListing,
  isActive = true,
  bootOnActivate = true,
}: SalesCrmModuleProps) {
  const { copy } = useCrmLocale();
  const sm = copy.salesModule;
  const [filter, setFilter] = useState<SalesStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<SalesTypeFilter>('any');
  const [bedsFilter, setBedsFilter] = useState<SalesBedsFilter>('any');
  const [sortKey, setSortKey] = useState<SalesSortKey>('newest');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<SalesViewMode>('grid');
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!isActive) return;
    if (!bootOnActivate) {
      setPageLoading(false);
      return;
    }
    setPageLoading(true);
    const id = window.setTimeout(() => setPageLoading(false), SALES_PAGE_BOOT_MS);
    return () => window.clearTimeout(id);
  }, [isActive, bootOnActivate]);

  const counts = useMemo(() => salesFilterCounts(SAMPLE_SALES_LISTINGS), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = SAMPLE_SALES_LISTINGS.filter((item) => {
      if (!salesMatchesFilter(item, filter)) return false;
      if (!salesMatchesType(item, typeFilter)) return false;
      if (!salesMatchesBeds(item, bedsFilter)) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.area.toLowerCase().includes(q)
      );
    });
    return sortSalesListings(rows, sortKey);
  }, [filter, search, typeFilter, bedsFilter, sortKey]);

  const typeOptions = useMemo(
    () =>
      [
        { value: 'any' as const, label: sm.filterAnyType },
        { value: 'house' as const, label: sm.typeHouse },
        { value: 'villa' as const, label: sm.typeVilla },
        { value: 'cabin' as const, label: sm.typeCabin },
        { value: 'estate' as const, label: sm.typeEstate },
      ],
    [sm],
  );

  const bedsOptions = useMemo(
    () =>
      [
        { value: 'any' as const, label: sm.filterAnyBeds },
        { value: '2' as const, label: sm.beds2Plus },
        { value: '3' as const, label: sm.beds3Plus },
        { value: '4' as const, label: sm.beds4Plus },
        { value: '5' as const, label: sm.beds5Plus },
      ],
    [sm],
  );

  const sortOptions = useMemo(
    () =>
      [
        { value: 'newest' as const, label: sm.sortNewestListings },
        { value: 'dom-desc' as const, label: sm.sortDomDesc },
        { value: 'price-desc' as const, label: sm.sortPriceHigh },
        { value: 'price-asc' as const, label: sm.sortPriceLow },
      ],
    [sm],
  );

  const typeButtonLabel = typeOptions.find((o) => o.value === typeFilter)?.label ?? sm.filterAnyType;
  const bedsButtonLabel = bedsOptions.find((o) => o.value === bedsFilter)?.label ?? sm.filterAnyBeds;
  const sortButtonLabel = sortOptions.find((o) => o.value === sortKey)?.label ?? sm.sortNewest;

  const filterPills: { key: SalesStatusFilter; label: string; count: number }[] = [
    { key: 'all', label: sm.filterAll, count: counts.all },
    { key: 'draft', label: sm.filterDraft, count: counts.draft },
    { key: 'active', label: sm.filterForSale, count: counts.active },
    { key: 'offer', label: sm.filterUnderOffer, count: counts.offer },
    { key: 'sold', label: sm.filterSold, count: counts.sold },
  ];

  const chipClass = (active: boolean) =>
    active
      ? `inline-flex h-[26px] items-center gap-1 rounded-full px-2.5 text-[11px] font-bold text-white ${LINTEL_SALES_TW.chipActive}`
      : `inline-flex h-[26px] items-center gap-1 rounded-full border border-gray-200/80 bg-white px-2.5 text-[11px] font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 ${LINTEL_SALES_TW.chipInactiveDark}`;

  if (!isActive) return null;

  if (pageLoading) {
    return <SalesSkeleton />;
  }

  return (
    <div className="lintel-rentals-enter flex flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-start xl:justify-between xl:gap-3">
        <h1 className="min-w-0 shrink-0 leading-none">
          <span className="block text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            {sm.pageTitleMain}
          </span>
          <span className={`block text-lg font-bold ${LINTEL_SALES_TW.pageTitleAccent}`}>
            {sm.pageTitleAccent}
          </span>
        </h1>
        <div className="min-w-0 flex-1 xl:flex xl:justify-end">
          <SalesKpiStrip
            lintelLayout
            activeCount={6}
            underOfferCount={2}
            soldThisYear={22}
            soldVolumeLabel="$35.46M"
            avgPricePerUnit="$643"
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
      </div>

      <SalesMarketPulseCard onSelect={onSelectListing} />

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div
            className={`flex h-[26px] w-full min-w-[12.5rem] max-w-[13.5rem] items-center gap-2 rounded-full border border-gray-200/90 bg-white px-3 shadow-xs dark:border-gray-700 ${LINTEL_SALES_TW.searchDark}`}
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={sm.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
            />
          </div>
          {filterPills.map(({ key, label, count }) => (
            <button key={key} type="button" className={chipClass(filter === key)} onClick={() => setFilter(key)}>
              {label} <span className="tabular-nums opacity-80">{count}</span>
            </button>
          ))}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <SalesToolbarSelect
            ariaLabel={sm.selectTypeAria}
            value={typeFilter}
            options={typeOptions}
            onChange={setTypeFilter}
            buttonLabel={typeButtonLabel}
          />
          <SalesToolbarSelect
            ariaLabel={sm.selectBedsAria}
            value={bedsFilter}
            options={bedsOptions}
            onChange={setBedsFilter}
            buttonLabel={bedsButtonLabel}
          />
          <SalesToolbarSelect
            ariaLabel={sm.selectSortAria}
            value={sortKey}
            options={sortOptions}
            onChange={setSortKey}
            buttonLabel={sortButtonLabel}
          />
        </div>
      </div>

      {viewMode === 'map' ? (
        <SalesMapView items={filtered} onSelect={onSelectListing} />
      ) : viewMode === 'list' ? (
        <SalesListTable items={filtered} onSelect={onSelectListing} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((item, idx) => (
            <SalesPropertyCard key={item.id} item={item} enterDelayMs={idx * 40} onSelect={onSelectListing} />
          ))}
        </div>
      )}
    </div>
  );
}
