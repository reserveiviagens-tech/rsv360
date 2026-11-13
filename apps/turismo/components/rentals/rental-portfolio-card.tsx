'use client';

import React, { memo, useEffect, useMemo, useState } from 'react';
import { Calendar, FileText, Heart, KeyRound, MessageCircle, UserPlus } from 'lucide-react';
import { useCrmLocale } from '../lintel/crm-locale-provider';
import { LINTEL_RENTALS_TW } from '../lintel/lintel-theme';
import { lintelBtnGhost, lintelBtnPrimary, lintelIconBtn } from '../lintel/overview-primitives';
import type { RentalPortfolioItem } from './rentals-data';
import { isRentalFavorite, setRentalFavorite } from './rental-favorites';

export type RentalCardAction = 'viewing' | 'lead' | 'contact';

export function RentalPortfolioCardSkeleton() {
  return (
    <div className={`rounded-[22px] border border-white/80 bg-white/70 p-3.5 dark:border-white/10 ${LINTEL_RENTALS_TW.skeletonDark}`}>
      <div className="lintel-shimmer mb-3 h-44 w-full rounded-2xl" />
      <div className="lintel-shimmer mb-2 h-3.5 w-2/3 rounded-md" />
      <div className="lintel-shimmer mb-3 h-2.5 w-1/2 rounded-md" />
      <div className="flex justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
        <div className="lintel-shimmer h-3 w-20 rounded-md" />
        <div className="lintel-shimmer h-7 w-16 rounded-full" />
      </div>
    </div>
  );
}

const STATUS_DOT: Record<RentalPortfolioItem['listingStatus'], string> = {
  leased: LINTEL_RENTALS_TW.statusLeased,
  application: LINTEL_RENTALS_TW.statusApplication,
  for_rent: LINTEL_RENTALS_TW.statusForRent,
};

const UNIT_GRID_COLS = 16;

export const RentalPortfolioCard = memo(function RentalPortfolioCard({
  item,
  enterDelayMs = 0,
  loading = false,
  lintelUniformHeight = false,
  onAction,
}: {
  item?: RentalPortfolioItem;
  enterDelayMs?: number;
  loading?: boolean;
  lintelUniformHeight?: boolean;
  onAction?: (action: RentalCardAction, item: RentalPortfolioItem) => void;
}) {
  const { copy } = useCrmLocale();
  const r = copy.rentals;
  const [imageReady, setImageReady] = useState(false);
  const [fav, setFav] = useState(false);
  const [favToast, setFavToast] = useState<string | null>(null);

  useEffect(() => {
    if (item) setFav(isRentalFavorite(item.id));
  }, [item?.id]);

  const statusLabel = useMemo(() => {
    if (!item) return '';
    if (item.listingStatus === 'leased') return r.statusLeased;
    if (item.listingStatus === 'application') return r.statusApplication;
    return r.statusForRent;
  }, [item, r.statusApplication, r.statusForRent, r.statusLeased]);

  if (loading || !item) return <RentalPortfolioCardSkeleton />;

  const occupancy = item.units > 0 ? (item.occupied / item.units) * 100 : 0;
  const imageLoading = !imageReady;
  const unitCells = Math.min(item.units, 64);

  const footerText =
    item.listingStatus === 'leased' && item.leaseEndsInDays != null
      ? r.leaseEndsIn.replace('{days}', String(item.leaseEndsInDays))
      : item.vacantUnits != null && item.nextLeaseEndDays != null
        ? r.vacantFooter
            .replace('{vacant}', String(item.vacantUnits))
            .replace('{days}', String(item.nextLeaseEndDays))
        : item.vacantUnits != null
          ? r.vacantFooter.replace('{vacant}', String(item.vacantUnits)).replace('{days}', '—')
          : `${item.occupied}/${item.units} ${r.unitsLetLabel}`;

  const toggleFav = () => {
    const next = !fav;
    setFav(next);
    setRentalFavorite(item.id, next);
    const msg = next ? r.favoriteSaved : r.favoriteRemoved;
    setFavToast(msg);
    window.setTimeout(() => setFavToast(null), 1800);
  };

  const runAction = (action: RentalCardAction, e: React.MouseEvent) => {
    e.stopPropagation();
    onAction?.(action, item);
  };

  return (
    <article
      className={`group lintel-rental-card-enter flex h-full flex-col justify-between rounded-2xl border border-white/80 bg-white/70 p-3 shadow-xs backdrop-blur-md transition-shadow hover:shadow-md dark:border-white/10 ${LINTEL_RENTALS_TW.cardSurfaceDark} ${
        lintelUniformHeight ? 'min-h-[290px]' : ''
      }`}
      style={{ animationDelay: `${enterDelayMs}ms` }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="relative mb-2.5 h-[7.875rem] shrink-0 overflow-hidden rounded-[10px] bg-gray-100 dark:bg-gray-800">
          {imageLoading ? <div className="lintel-shimmer absolute inset-0" aria-hidden /> : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.photo}
            alt=""
            className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={() => setImageReady(true)}
          />
          <span className="absolute left-2.5 top-2.5 z-[2] inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-black text-gray-900 shadow-sm backdrop-blur">
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[item.listingStatus]}`} aria-hidden />
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFav();
            }}
            className={`absolute right-2.5 top-2.5 z-[2] h-8 w-8 ${lintelIconBtn} ${
              fav ? `border bg-white ${LINTEL_RENTALS_TW.favoriteActive}` : ''
            }`}
            aria-label={r.favoriteAria}
            aria-pressed={fav}
          >
            <Heart className={`h-3.5 w-3.5 ${fav ? 'fill-current' : ''}`} />
          </button>
          {favToast ? (
            <span className="lintel-overview-enter absolute left-1/2 top-2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full bg-black/75 px-2 py-0.5 text-[9px] font-bold text-white">
              {favToast}
            </span>
          ) : null}

          <div className="lintel-rental-card-actions absolute inset-0 z-[1] flex flex-col items-stretch justify-end gap-1.5 bg-gradient-to-t from-black/70 via-black/35 to-transparent p-3 opacity-100 transition-opacity md:justify-center md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            <button
              type="button"
              className={`${lintelBtnPrimary} w-full justify-center py-2 text-[11px]`}
              onClick={(e) => runAction('viewing', e)}
            >
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {r.cardBookViewing}
            </button>
            <button
              type="button"
              className={`${lintelBtnGhost} w-full justify-center border-white/30 bg-white/90 py-2 text-[11px] text-gray-900 dark:border-white/20 dark:text-white ${LINTEL_RENTALS_TW.ghostBtnDark}`}
              onClick={(e) => runAction('lead', e)}
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden />
              {r.cardRegisterRequest}
            </button>
            <button
              type="button"
              className={`${lintelBtnGhost} w-full justify-center border-white/30 bg-white/90 py-2 text-[11px] text-gray-900 dark:border-white/20 dark:text-white ${LINTEL_RENTALS_TW.ghostBtnDark}`}
              onClick={(e) => runAction('contact', e)}
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              {r.cardMessageOwner}
            </button>
          </div>
        </div>

        <div className="mb-1.5 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <b className="text-sm font-extrabold text-gray-900 dark:text-white">{item.rent}</b>
            <h4 className="text-[11px] font-bold text-gray-900 dark:text-white">{item.name}</h4>
            <p className="text-[9.5px] text-gray-500">
              {item.type} · {item.area}
            </p>
            <p className="truncate text-[8.5px] text-gray-400">{item.address}</p>
          </div>
          {!lintelUniformHeight && (item.applications ?? 0) > 0 ? (
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${LINTEL_RENTALS_TW.applicationBadge}`}>
              <FileText className="h-3 w-3" aria-hidden />
              {r.applicationBadge.replace('{n}', String(item.applications))}
            </span>
          ) : null}
          {lintelUniformHeight && (item.applications ?? 0) > 0 ? (
            <span className="inline-flex h-4 shrink-0 items-center rounded-full bg-orange-50 px-2 text-[9px] font-bold text-orange-600">
              {r.applicationBadge.replace('{n}', String(item.applications))}
            </span>
          ) : null}
        </div>

        {!lintelUniformHeight && (item.tags?.length ?? 0) > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1">
            {item.tags!.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-gray-200/80 bg-gray-50 px-2 py-0.5 text-[9px] font-bold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className={`mt-auto min-h-[4rem] rounded-lg p-2 dark:bg-gray-800/50 ${LINTEL_RENTALS_TW.occPanel}`}>
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-gray-500">
            <span>
              {item.occupied} / {item.units} {r.unitsLetLabel}
            </span>
            <span className="text-gray-900 dark:text-white">{Math.round(occupancy)}%</span>
          </div>
          <div className={`mb-1.5 h-1 overflow-hidden rounded-full dark:bg-gray-700 ${LINTEL_RENTALS_TW.occTrack}`}>
            <div
              className={`lintel-rent-occ-bar h-full rounded-full ${LINTEL_RENTALS_TW.occBar}`}
              style={{ width: `${occupancy}%` }}
            />
          </div>
          <div
            className="lintel-rental-unit-grid grid min-h-[14px] gap-[3px]"
            style={{
              gridTemplateColumns: `repeat(${item.units > 1 ? UNIT_GRID_COLS : 8}, minmax(0, 1fr))`,
            }}
            aria-label={`${item.occupied} of ${item.units} occupied`}
          >
            {item.units > 1
              ? Array.from({ length: unitCells }).map((_, i) => (
                  <span
                    key={i}
                    className={`lintel-rental-unit-cell h-[5px] w-full max-w-[5px] justify-self-center rounded-[1px] ${
                      i < item.occupied
                        ? LINTEL_RENTALS_TW.unitFilled
                        : `${LINTEL_RENTALS_TW.unitEmpty} dark:bg-gray-600`
                    }`}
                  />
                ))
              : null}
          </div>
        </div>
      </div>

      <div
        className={`mt-2 flex items-center justify-between gap-2 border-t pt-2 text-[10px] dark:border-gray-800 ${LINTEL_RENTALS_TW.cardFooterBorder}`}
      >
        <span className="flex min-w-0 items-center gap-1.5 font-medium text-gray-500">
          {item.listingStatus === 'leased' ? (
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <KeyRound className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )}
          <span className="truncate">{footerText}</span>
        </span>
        {item.agentAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.agentAvatarUrl}
            alt=""
            className="h-[18px] w-[18px] shrink-0 rounded-full border border-white object-cover shadow-sm"
          />
        ) : null}
      </div>
    </article>
  );
});
