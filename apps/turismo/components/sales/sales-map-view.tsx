'use client';

import { useMemo, useState } from 'react';
import type { PortfolioMapPin, PortfolioMapPriceTone } from '../lintel/portfolio-map';
import { PortfolioMapCanvas } from '../lintel/portfolio-map';
import { useCrmLocale } from '../lintel/crm-locale-provider';
import { LINTEL_SALES_TW } from '../lintel/lintel-theme';
import type { SalesListing } from './sales-data';

function listingPriceTone(item: SalesListing): PortfolioMapPriceTone {
  if (item.status === 'offer') return 'offer';
  if (item.status === 'sold') return 'sold';
  if (item.status === 'draft') return 'draft';
  return 'listing';
}

function listingToPin(item: SalesListing, sm: ReturnType<typeof useCrmLocale>['copy']['salesModule']): PortfolioMapPin {
  const kind =
    item.status === 'offer' ? 'offer' : item.status === 'active' ? 'sale' : 'closed';
  const statusLabel =
    item.status === 'draft'
      ? sm.statusDraft
      : item.status === 'active'
        ? sm.statusForSale
        : item.status === 'offer'
          ? sm.statusUnderOffer
          : sm.statusSold;
  const areaShort = item.area.split(',')[0]?.trim() ?? item.area;
  return {
    id: item.slug,
    top: item.mapTop,
    left: item.mapLeft,
    kind,
    title: item.name,
    location: areaShort,
    statusLabel,
    price: item.priceShort ?? item.price,
    thumb: item.photo,
    priceTone: listingPriceTone(item),
  };
}

const STATUS_DOT: Record<SalesListing['status'], string> = {
  draft: 'bg-slate-900',
  active: 'bg-slate-900',
  offer: 'bg-orange-500',
  sold: 'bg-emerald-500',
};

export function SalesMapView({
  items,
  onSelect,
}: {
  items: SalesListing[];
  onSelect: (item: SalesListing) => void;
}) {
  const { copy } = useCrmLocale();
  const sm = copy.salesModule;
  const [activePinId, setActivePinId] = useState<string | null>(null);

  const pins = useMemo(() => items.map((item) => listingToPin(item, sm)), [items, sm]);
  const bySlug = useMemo(() => new Map(items.map((i) => [i.slug, i])), [items]);

  const handlePinSelect = (pin: PortfolioMapPin) => {
    const listing = bySlug.get(pin.id);
    if (listing) onSelect(listing);
  };

  const mapCountLabel = sm.mapHomesOnMap.replace('{n}', String(items.length));

  const statusLabel = (item: SalesListing) =>
    item.status === 'draft'
      ? sm.statusDraft
      : item.status === 'active'
        ? sm.statusForSale
        : item.status === 'offer'
          ? sm.statusUnderOffer
          : sm.statusSold;

  return (
    <div
      className={`flex min-h-[31.25rem] flex-col gap-4 rounded-2xl bg-white p-2 shadow-sm lg:h-[calc(100vh-21rem)] lg:min-h-[31.25rem] lg:flex-row ${LINTEL_SALES_TW.mapSurfaceDark}`}
    >
      <div className="h-full min-h-[18rem] w-full shrink-0 lg:h-full lg:w-[45%]">
        <PortfolioMapCanvas
          heightClass="h-full min-h-[18rem]"
          activePinId={activePinId}
          onPinHover={setActivePinId}
          onPinSelect={handlePinSelect}
          pins={pins}
          pinVariant="price"
          mapSurfaceClass="bg-slate-200 dark:bg-slate-800"
        />
      </div>

      <div className="flex h-full min-h-0 w-full flex-col pr-1 lg:w-[55%]">
        <div className="py-2 pl-2">
          <span className="text-xs font-medium text-slate-400">{mapCountLabel}</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-2 scrollbar-thin">
          {items.map((item) => {
            const active = activePinId === item.slug;
            const areaShort = item.area.split(',')[0]?.trim() ?? item.area;
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setActivePinId(item.slug)}
                onMouseLeave={() => setActivePinId(null)}
                onClick={() => onSelect(item)}
                className={[
                  'flex min-h-[4.5rem] w-full items-center justify-between gap-3 border-b border-slate-100 py-3 text-left transition-colors dark:border-slate-800',
                  active ? 'bg-slate-50 dark:bg-white/[0.04]' : 'hover:bg-slate-50/80 dark:hover:bg-white/[0.03]',
                ].join(' ')}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.photo}
                    alt=""
                    className="h-12 w-16 shrink-0 rounded-md object-cover"
                  />
                  <div className="min-w-0 flex flex-col">
                    <span className="truncate text-sm font-bold text-slate-900 dark:text-white">{item.name}</span>
                    <span className="truncate text-xs text-slate-500">
                      {areaShort} · {item.beds} bd · {item.sqft} ft²
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">{item.price}</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[item.status]}`} aria-hidden />
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
                      {statusLabel(item)}
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
