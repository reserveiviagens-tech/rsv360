'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { OverviewHeroListing } from '@/lib/overview-portfolio';

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
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('left');

  const totalItems = listings.length;
  if (totalItems === 0) return null;

  const currentListing = listings[currentIndex];
  const nextIndex = (currentIndex + 1) % totalItems;
  const prevIndex = (currentIndex - 1 + totalItems) % totalItems;

  const handlePrev = () => {
    setDirection('left');
    setCurrentIndex(prevIndex);
  };

  const handleNext = () => {
    setDirection('right');
    setCurrentIndex(nextIndex);
  };

  const goTo = (index: number) => {
    setDirection('left');
    setCurrentIndex(index);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-[26px] bg-white dark:bg-[#121722] shadow-md ${className}`}
    >
      {featuredBadge ? (
        <div className="absolute top-4 left-4 z-20">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold text-white">
            ★ {featuredBadge}
          </span>
        </div>
      ) : null}

      <div
        className="flex transition-transform duration-500 ease-out"
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
            <div className={`relative overflow-hidden ${slideMinHeightClass}`}>
              <img src={listing.img} alt={listing.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/20" />

              {(listing.tag || listing.type) && (
                <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/90 text-xs font-bold text-slate-700 shadow-sm">
                  {listing.tag ?? (listing.type ? TYPES[listing.type] : '')}
                </span>
              )}

              {/* Price */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                <h3 className="text-xl sm:text-2xl font-black text-white truncate">
                  {listing.name}
                </h3>
                <p className="text-xs text-white/80 mt-1">{listing.address}</p>
                {showPrice && (
                  <p className="text-lg sm:text-2xl font-black text-white mt-2">
                    {listing.priceMonthly
                      ? `R$ ${listing.priceMonthly}/mês`
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

      {/* Controls */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white dark:bg-[#121722] border-t border-slate-200 dark:border-slate-700">
        <div className="flex gap-2">
          <button
            onClick={handlePrev}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all hover:scale-110 active:scale-95"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
          <button
            onClick={handleNext}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all hover:scale-110 active:scale-95"
            aria-label="Próximo"
          >
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {listings.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-[#2f5bea] w-5'
                  : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400'
              }`}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
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
