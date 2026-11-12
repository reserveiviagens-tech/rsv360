'use client';

import { Bath, BedDouble, Eye } from 'lucide-react';
import { useCrmLocale } from '../lintel/crm-locale-provider';
import type { SalesListing } from './sales-data';

const STATUS_DOT: Record<SalesListing['status'], string> = {
  draft: 'bg-slate-400',
  active: 'bg-[#2563eb]',
  offer: 'bg-[#f97316]',
  sold: 'bg-slate-600',
};

export function SalesListTable({
  items,
  onSelect,
}: {
  items: SalesListing[];
  onSelect: (item: SalesListing) => void;
}) {
  const { copy } = useCrmLocale();
  const sm = copy.salesModule;

  const statusLabel = (item: SalesListing) =>
    item.status === 'draft'
      ? sm.statusDraft
      : item.status === 'active'
        ? sm.statusForSale
        : item.status === 'offer'
          ? sm.statusUnderOffer
          : sm.statusSold;

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/80 bg-white/70 shadow-xs dark:border-white/10 dark:bg-[#171b23]/80">
      <table className="w-full min-w-[720px] border-collapse text-left text-[11px]">
        <thead>
          <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:border-gray-800">
            <th className="px-3 py-2.5 font-bold">{sm.tableColListing}</th>
            <th className="px-3 py-2.5">{sm.tableColStatus}</th>
            <th className="px-3 py-2.5">{sm.tableColPrice}</th>
            <th className="px-3 py-2.5">{sm.tableColBeds}</th>
            <th className="px-3 py-2.5 text-right">{sm.tableColMetrics}</th>
            <th className="px-3 py-2.5">{sm.tableColOffers}</th>
            <th className="px-3 py-2.5 text-right">{sm.tableColAgent}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect(item);
              }}
              className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50/80 dark:border-gray-800/80 dark:hover:bg-white/[0.03]"
            >
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.photo} alt="" className="h-9 w-12 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-gray-900 dark:text-white">{item.name}</p>
                    <p className="truncate text-[10px] text-gray-500">{item.address}</p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <span className="inline-flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-200">
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[item.status]}`} />
                  {statusLabel(item)}
                </span>
              </td>
              <td className="px-3 py-2.5 font-extrabold text-gray-900 dark:text-white">{item.price}</td>
              <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex items-center gap-0.5">
                    <BedDouble className="h-3 w-3 opacity-60" aria-hidden />
                    {item.beds}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Bath className="h-3 w-3 opacity-60" aria-hidden />
                    {item.baths}
                  </span>
                </span>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">
                {item.sqft} ft² · {item.dom} DOM · {item.views}{' '}
                <Eye className="mb-px inline h-3 w-3" aria-hidden />
              </td>
              <td className="px-3 py-2.5">
                {item.bestOfferLabel || item.estimate ? (
                  <span className="rounded-md bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold text-orange-600">
                    {sm.bestOffer.replace('{price}', item.bestOfferLabel ?? item.estimate ?? '—')}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-right">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.agentAvatarUrl}
                  alt=""
                  className="ml-auto h-6 w-6 rounded-full border border-white object-cover shadow-sm"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
