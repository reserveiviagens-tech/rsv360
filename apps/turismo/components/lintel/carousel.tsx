'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { OverviewHeroListing } from '@/lib/overview-portfolio';
import { lintelEase, lintelIconBtn } from './overview-primitives';

export interface HeroListing {
  id: string;
  name: string;
  address: string;
  price: string;
  priceMonthly?: string;
  img: string;
  type?: 'house' | 'villa' | 'apartment' | 'condo';
  beds?: number;
  baths?: number;
  sqft?: number;
  featured?: boolean;
  tag?: string;
  metaLine?: string;
  bedsLabel?: string;
  bathsLabel?: string;
  sqftLabel?: string;
}

interface CarouselProps {
  listings: HeroListing[];
  onSelect?: (listing: HeroListing) => void;
  showPrice?: boolean;
  showStats?: boolean;
  /** Badge superior (ex.: Featured listing) */
  featuredBadge?: string;
  className?: string;
  slideMinHeightClass?: string;
  /** Lintel: setas + contador sobre a imagem, sem barra branca inferior. */
  controlsVariant?: 'footer' | 'lintel-overlay';
}

const TYPES = {
  house: 'Casa',
  villa: 'Vila',
  apartment: 'Apartamento',
  condo: 'Condominial',
};

export function Carousel({
  listings,
  onSelect,
  showPrice = true,
  showStats = true,
  featuredBadge,
  className = '',
  slideMinHeightClass = 'h-56 sm:h-64 md:h-72 lg:h-80',
  controlsVariant = 'footer',
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isLintelOverlay = controlsVariant === 'lintel-overlay';

  const totalItems = listings.length;
  if (totalItems === 0) return null;

  const nextIndex = (currentIndex + 1) % totalItems;
  const prevIndex = (currentIndex - 1 + totalItems) % totalItems;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prevIndex);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(nextIndex);
  };

  const goTo = (index: number) => {
    setCurrentIndex(index);
  };

  const pageLabel = `${String(currentIndex + 1).padStart(2, '0')} / ${String(totalItems).padStart(2, '0')}`;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white shadow-md dark:bg-[#121722] ${
        isLintelOverlay ? 'flex h-full flex-col' : ''
      } ${className}`}
    >
      {featuredBadge ? (
        <div className="pointer-events-none absolute left-4 top-4 z-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
            ★ {featuredBadge}
          </span>
        </div>
      ) : null}

      {isLintelOverlay ? (
        <div className="pointer-events-none absolute right-4 top-4 z-20">
          <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-bold tabular-nums text-white backdrop-blur-md">
            {pageLabel}
          </span>
        </div>
      ) : null}

      <div
        className={`flex transition-transform duration-500 ease-out ${isLintelOverlay ? 'min-h-0 flex-1' : ''}`}
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="min-w-full cursor-pointer"
            onClick={() => onSelect?.(listing)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelect?.(listing);
            }}
            aria-label={`Ver detalhes de ${listing.name}`}
          >
            <div
              className={`relative overflow-hidden ${slideMinHeightClass} ${
                isLintelOverlay ? 'h-full min-h-[380px]' : ''
              }`}
            >
              <img src={listing.img} alt={listing.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/20" />

              {!featuredBadge && (listing.tag || listing.type) ? (
                <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                  {listing.tag ?? (listing.type ? TYPES[listing.type] : '')}
                </span>
              ) : null}

              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                <h3 className="truncate text-xl font-black text-white sm:text-2xl">{listing.name}</h3>
                <p className="mt-1 text-xs text-white/80">{listing.address}</p>
                {showPrice && (
                  <p className="mt-2 text-lg font-black text-white sm:text-2xl">
                    {listing.priceMonthly
                      ? `R$ ${listing.priceMonthly}/mês`
                      : listing.price.startsWith('US$') || listing.price.startsWith('$')
                        ? `US$ ${listing.price.replace(/^(US\$|\$)\s*/, '')}`
                        : `US$ ${listing.price}`}
                  </p>
                )}
                {showStats && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-white/90">
                    {listing.bedsLabel ? (
                      <span className="rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">{listing.bedsLabel}</span>
                    ) : listing.beds ? (
                      <span>{listing.beds} quartos</span>
                    ) : null}
                    {listing.bathsLabel ? (
                      <span className="rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">{listing.bathsLabel}</span>
                    ) : listing.baths ? (
                      <span>{listing.baths} banheiros</span>
                    ) : null}
                    {listing.sqftLabel ? (
                      <span className="rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">{listing.sqftLabel}</span>
                    ) : listing.sqft ? (
                      <span>{listing.sqft} m²</span>
                    ) : null}
                  </div>
                )}
                {listing.metaLine ? (
                  <p className="mt-2 border-t border-white/20 pt-2 text-xs font-medium text-white/80">{listing.metaLine}</p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isLintelOverlay ? (
        <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className={`pointer-events-auto h-9 w-9 ${lintelIconBtn} bg-white/90 text-gray-800 shadow-md hover:bg-white dark:bg-white/90 dark:text-gray-900`}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className={`pointer-events-auto h-9 w-9 ${lintelIconBtn} bg-white/90 text-gray-800 shadow-md hover:bg-white dark:bg-white/90 dark:text-gray-900`}
            aria-label="Próximo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-[#121722] sm:px-6">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrev}
              className={`rounded-xl p-2 transition-all hover:scale-110 hover:bg-slate-100 active:scale-95 dark:hover:bg-slate-700 ${lintelEase}`}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className={`rounded-xl p-2 transition-all hover:scale-110 hover:bg-slate-100 active:scale-95 dark:hover:bg-slate-700 ${lintelEase}`}
              aria-label="Próximo"
            >
              <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {listings.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goTo(index)}
                className={`h-2.5 rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-5 bg-[#2f5bea]'
                    : 'w-2.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600'
                }`}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function mapOverviewHeroToCarousel(listings: OverviewHeroListing[]): HeroListing[] {
  return listings.map((h, index) => {
    const brl = h.price.startsWith('R$');
    return {
      id: `overview-hero-${index}`,
      name: h.title,
      address: h.location,
      price: brl ? h.price : h.price.replace(/^\$/, ''),
      priceMonthly: brl ? h.price.replace(/^R\$\s*/, '') : undefined,
      img: h.img,
      tag: h.tag,
      metaLine: h.stats,
      bedsLabel: h.beds !== '—' ? h.beds : undefined,
      bathsLabel: h.baths !== '—' ? h.baths : undefined,
      sqftLabel: h.sqft !== '—' ? h.sqft : undefined,
      featured: true,
    };
  });
}
