'use client';

import React, { memo, useCallback, useState } from 'react';
import { Bath, BedDouble, Eye, Heart, Link2, MessageCircle, Ruler, Tag } from 'lucide-react';
import { useCrmLocale } from '../lintel/crm-locale-provider';
import { useLintelCreateOptional } from '../lintel/lintel-create-provider';
import { lintelIconBtn } from '../lintel/overview-primitives';
import { SalesListingShareMenu } from './sales-listing-share-menu';
import type { SalesListing } from './sales-data';

const STATUS_DOT: Record<SalesListing['status'], string> = {
  draft: 'bg-slate-400',
  active: 'bg-[#2563eb]',
  offer: 'bg-[#f97316]',
  sold: 'bg-slate-600',
};

export const SalesPropertyCard = memo(function SalesPropertyCard({
  item,
  onSelect,
  enterDelayMs = 0,
}: {
  item: SalesListing;
  onSelect: (item: SalesListing) => void;
  enterDelayMs?: number;
}) {
  const { copy } = useCrmLocale();
  const sm = copy.salesModule;
  const lintelCreate = useLintelCreateOptional();
  const [fav, setFav] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const onShareCopied = useCallback(() => {
    setShareFeedback(sm.shareLinkCopied);
    window.setTimeout(() => setShareFeedback(null), 2800);
  }, [sm.shareLinkCopied]);

  const statusLabel =
    item.status === 'draft'
      ? sm.statusDraft
      : item.status === 'active'
        ? sm.statusForSale
        : item.status === 'offer'
          ? sm.statusUnderOffer
          : sm.statusSold;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(item);
      }}
      className="lintel-rental-card-enter group flex min-h-[336px] cursor-pointer flex-col rounded-2xl border border-white/80 bg-white/70 p-2 shadow-xs backdrop-blur-md transition-shadow hover:shadow-md dark:border-white/10 dark:bg-[#171b23]/80"
      style={{ animationDelay: `${enterDelayMs}ms` }}
    >
      <div className="relative mb-2 h-[8.5rem] shrink-0 overflow-hidden rounded-[10px] bg-gray-100 dark:bg-gray-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.photo} alt="" className="h-full w-full object-cover" />
        <span className="absolute left-2 top-2 z-[2] inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-black text-gray-900 shadow-sm">
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[item.status]}`} aria-hidden />
          {statusLabel}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setFav((v) => !v);
          }}
          className={`absolute right-2 top-2 z-[2] h-7 w-7 ${lintelIconBtn} ${
            fav ? 'border-[#ff4d6d]/30 text-[#ff4d6d]' : ''
          }`}
          aria-pressed={fav}
          aria-label={sm.favoriteAria}
        >
          <Heart className={`h-3 w-3 ${fav ? 'fill-current' : ''}`} />
        </button>
        <div className="absolute inset-x-2 bottom-2 z-[2] flex justify-around gap-1 rounded-lg bg-white/90 px-1 py-1 opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <SalesListingShareMenu
            item={item}
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            onCopied={onShareCopied}
          />
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1 rounded-md px-1 py-1 text-[9px] font-bold text-gray-800 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              lintelCreate?.openCreate('viewing', {
                prefill: {
                  rentalProperty: { id: item.id, name: item.name, address: item.address, area: item.area },
                },
              });
            }}
          >
            <Eye className="h-3 w-3" aria-hidden />
            {sm.cardQuickViewing}
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1 rounded-md px-1 py-1 text-[9px] font-bold text-gray-800 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              lintelCreate?.openCreate('offer', {
                prefill: {
                  rentalProperty: { id: item.id, name: item.name, address: item.address, area: item.area },
                },
              });
            }}
          >
            <Tag className="h-3 w-3" aria-hidden />
            {sm.cardQuickOffer}
          </button>
          <button
            type="button"
            className={`relative flex flex-1 items-center justify-center gap-1 rounded-md px-1 py-1 text-[9px] font-bold hover:bg-gray-100 ${
              shareOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-800'
            }`}
            aria-expanded={shareOpen}
            aria-haspopup="dialog"
            onClick={(e) => {
              e.stopPropagation();
              setShareOpen((v) => !v);
            }}
          >
            <Link2 className="h-3 w-3" aria-hidden />
            {sm.cardQuickShare}
          </button>
        </div>
        {shareFeedback ? (
          <p
            role="status"
            className="pointer-events-none absolute inset-x-2 bottom-14 z-[35] rounded-md bg-slate-900/90 px-2 py-1 text-center text-[9px] font-semibold text-white"
          >
            {shareFeedback}
          </p>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-1 pb-1">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <span className="text-sm font-extrabold text-gray-900 dark:text-white">{item.price}</span>
          {item.bestOfferLabel ? (
            <span className="shrink-0 rounded-full bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold text-orange-600">
              {sm.bestOffer.replace('{price}', item.bestOfferLabel)}
            </span>
          ) : null}
        </div>
        <h4 className="text-[11px] font-bold leading-tight text-gray-900 dark:text-white">{item.name}</h4>
        <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-gray-500">{item.address}</p>
        <p className="text-[9px] text-gray-400">{item.area}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9px] font-semibold text-gray-500">
          <span className="inline-flex items-center gap-0.5">
            <BedDouble className="h-3 w-3 opacity-60" aria-hidden />
            {item.beds}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Bath className="h-3 w-3 opacity-60" aria-hidden />
            {item.baths}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Ruler className="h-3 w-3 opacity-60" aria-hidden />
            {item.sqft} ft²
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#f1f5f9] pt-2 text-[9px] font-medium text-gray-400 dark:border-gray-800">
          <span className="min-w-0 truncate">
            {item.dom} {sm.daysOnMarket} · {item.views}{' '}
            <Eye className="mb-px inline h-3 w-3" aria-hidden /> · {item.inquiries ?? 0}{' '}
            <MessageCircle className="mb-px inline h-3 w-3" aria-hidden />
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.agentAvatarUrl}
            alt=""
            className="h-5 w-5 shrink-0 rounded-full border border-white object-cover shadow-sm"
          />
        </div>
      </div>
    </article>
  );
});
