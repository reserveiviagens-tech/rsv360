'use client';



import React, { memo, useRef, useState } from 'react';

import { Clock, MoreHorizontal } from 'lucide-react';

import { useCrmLocale } from '../lintel/crm-locale-provider';
import { lintelClientAvatarColor, LINTEL_TW_CLASSES } from '../lintel/lintel-theme';

import { agentById } from './deals-agents';

import { DealCardOverflowMenu, type DealCardMenuHandlers } from './deal-card-menu';
import { DealStageMiniBar, DealStageMiniBarSkeleton } from './deal-stage-mini-bar';



export type DealStage = 'viewing' | 'offer' | 'negotiation' | 'under_contract' | 'closed';



export type DealDeltaTone = 'mint' | 'apricot' | 'cobalt';



export interface Deal {

  id: string;

  agentId: string;

  agentName: string;

  propertyId: string;

  propertyName: string;

  location: string;

  propertyType: string;

  beds: number;

  baths: number;

  sqft: number;

  price: number;

  commission: number;

  stage: DealStage;

  nextStep?: string;

  createdAt: string;

  updatedAt: string;

  listingSource?: 'zillow' | 'realtor' | 'direct';

  status: 'active' | 'won' | 'lost' | 'pending';

  notes?: string;

  imageUrl?: string;

  clientName?: string;

  priceDelta?: string;

  deltaTone?: DealDeltaTone;

  timelineLeft?: string;

  listingKind?: 'sale' | 'rent';

  askingPrice?: number;

  streetAddress?: string;

  clientEmail?: string;

  clientPhone?: string;

  clientCity?: string;

  targetCloseDate?: string;

  offerNote?: string;

  /** Lintel-style deep link slug (e.g. dhollisspen) */
  deepLinkSlug?: string;

}



export const DEAL_PROPERTY_IMAGES: Record<string, string> = {

  prop_101: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=480&q=80',

  prop_102: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=480&q=80',

  prop_103: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=480&q=80',

  prop_104: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=480&q=80',

  prop_105: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=480&q=80',

  prop_106: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=480&q=80',

};



const DELTA_CLASS: Record<DealDeltaTone, string> = {

  mint: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',

  apricot: 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300',

  cobalt: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300',

};



function clientInitials(name: string): string {

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {

    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();

  }

  return name.slice(0, 2).toUpperCase();

}



function clientTone(name: string): string {
  return lintelClientAvatarColor(name);
}



export function formatPrice(value: number, kind: 'sale' | 'rent' = 'sale'): string {

  if (kind === 'rent' && value < 50_000) {

    return `$${value.toLocaleString('en-US')}/mo`;

  }

  return value.toLocaleString('en-US', {

    style: 'currency',

    currency: 'USD',

    minimumFractionDigits: 0,

    maximumFractionDigits: 0,

  });

}



export function formatColumnTotal(deals: Deal[]): string {

  const sum = deals.reduce((a, d) => a + d.price, 0);

  if (sum >= 1_000_000) return `$${(sum / 1_000_000).toFixed(2)}M`;

  if (sum >= 1_000) return `$${(sum / 1_000).toFixed(1)}K`;

  return formatPrice(sum);

}



export function inferListingKind(deal: Deal): 'sale' | 'rent' {

  if (deal.listingKind) return deal.listingKind;

  const loc = deal.location.toLowerCase();

  if (loc.includes('rent') || loc.includes('locação') || (deal.price < 50_000 && deal.propertyType === 'Apartment')) {

    return 'rent';

  }

  return 'sale';

}



export function DealCardSkeleton() {

  return (

    <div
      className={`w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 ${LINTEL_TW_CLASSES.surfaceElevated}`}
    >

      <div className="lintel-shimmer h-[120px] w-full" />

      <div className="space-y-2 px-3 py-3">

        <div className="lintel-shimmer h-4 w-3/4 rounded" />

        <div className="lintel-shimmer h-3 w-1/2 rounded" />

        <div className="lintel-shimmer h-4 w-full rounded" />

        <DealStageMiniBarSkeleton className="pt-1" />

      </div>

    </div>

  );

}



export type DealCardProps = {

  deal: Deal;

  onDragStart: (id: string) => void;

  onDragEnd?: () => void;

  isDragging?: boolean;

  enterDelayMs?: number;

  loading?: boolean;

  onOpen?: () => void;

  menuHandlers?: DealCardMenuHandlers;

};



export const DealCard = memo(function DealCard({

  deal,

  onDragStart,

  onDragEnd,

  isDragging = false,

  enterDelayMs = 0,

  loading = false,

  onOpen,

  menuHandlers,

}: DealCardProps) {

  const { copy } = useCrmLocale();

  const d = copy.deals;

  const kind = inferListingKind(deal);

  const img = deal.imageUrl ?? DEAL_PROPERTY_IMAGES[deal.propertyId] ?? DEAL_PROPERTY_IMAGES.prop_106;

  const delta = deal.priceDelta ?? d.atAsk;

  const tone = deal.deltaTone ?? 'mint';

  const client = deal.clientName ?? '—';

  const left = deal.timelineLeft ?? deal.nextStep ?? '';

  const badge = kind === 'rent' ? d.listingRent.toUpperCase() : d.listingSale.toUpperCase();

  const agent = agentById(deal.agentId);

  const agentAvatar = agent?.avatarUrl;

  const showSoldStamp = deal.stage === 'closed' || deal.status === 'won';



  const [imageReady, setImageReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);



  if (loading) {

    return <DealCardSkeleton />;

  }



  const imageLoading = !imageReady;



  return (

    <article

      className={`lintel-deal-card-enter group relative z-0 w-full overflow-visible rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:z-10 hover:shadow-md dark:border-white/10 ${LINTEL_TW_CLASSES.surfaceElevated} ${

        isDragging ? 'lintel-deal-dragging cursor-grabbing' : 'cursor-grab active:cursor-grabbing'

      }`}

      style={{ animationDelay: `${enterDelayMs}ms` }}

      draggable

      onDragStart={(e) => {

        onDragStart(deal.id);

        e.dataTransfer.setData('text/plain', deal.id);

        e.dataTransfer.effectAllowed = 'move';

      }}

      onDragEnd={() => onDragEnd?.()}

      onClick={() => onOpen?.()}

      onKeyDown={(e) => {

        if (e.key === 'Enter' || e.key === ' ') {

          e.preventDefault();

          onOpen?.();

        }

      }}

      role="button"

      tabIndex={0}

    >

      <div className="relative z-[1] h-[120px] w-full bg-slate-100 dark:bg-gray-800">

        {imageLoading ? <div className="lintel-shimmer absolute inset-0" aria-hidden /> : null}

        {/* eslint-disable-next-line @next/next/no-img-element */}

        <img

          src={img}

          alt=""

          className={`h-full w-full rounded-t-lg object-cover transition-opacity duration-500 ${

            imageLoading ? 'opacity-0' : 'opacity-100'

          }`}

          onLoad={() => setImageReady(true)}

        />

        <span className="absolute left-2 top-2 rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-800">

          {badge}

        </span>

        <div className="absolute right-2 top-2">

          <button

            ref={menuBtnRef}

            type="button"

            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition hover:scale-105"

            aria-label={d.cardMenuAria}

            aria-expanded={menuOpen}

            aria-haspopup="menu"

            onClick={(e) => {

              e.stopPropagation();

              if (menuHandlers) setMenuOpen((v) => !v);

              else onOpen?.();

            }}

            onMouseDown={(e) => e.stopPropagation()}

          >

            <MoreHorizontal className="h-3.5 w-3.5" />

          </button>

          {menuHandlers ? (

            <DealCardOverflowMenu

              deal={deal}

              open={menuOpen}

              onOpenChange={setMenuOpen}

              handlers={menuHandlers}

              anchorRef={menuBtnRef}

            />

          ) : null}

        </div>

        {showSoldStamp ? (

          <span

            className="pointer-events-none absolute bottom-2 right-2 -rotate-12 bg-emerald-600/90 px-3 py-1 text-[10px] font-bold italic tracking-wide text-white"

            aria-hidden

          >

            SOLD

          </span>

        ) : null}

      </div>



      <h4 className="mt-2 truncate px-3 text-sm font-bold text-slate-900 dark:text-white">{deal.propertyName}</h4>



      <div className="mt-1 flex items-center gap-1.5 px-3">

        <span

          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold ${LINTEL_TW_CLASSES.textInk}`}

          style={{ backgroundColor: clientTone(client) }}

          aria-hidden

        >

          {clientInitials(client)}

        </span>

        <span className="truncate text-xs text-slate-500">{client}</span>

      </div>



      <div className="mt-2 flex items-center justify-between px-3">

        <span className="text-sm font-extrabold text-slate-900 dark:text-white">

          {formatPrice(deal.price, kind)}

        </span>

        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${DELTA_CLASS[tone]}`}>{delta}</span>

      </div>



      <DealStageMiniBar stage={deal.stage} animateDelayMs={enterDelayMs + 120} className="px-3 pb-2" />

      <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 dark:border-gray-800">

        <span className="flex min-w-0 items-center gap-1 text-[10px] text-slate-400">

          <Clock className="h-3 w-3 shrink-0" aria-hidden />

          <span className="truncate">{left}</span>

        </span>

        {/* eslint-disable-next-line @next/next/no-img-element */}

        <img

          src={agentAvatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(deal.agentName)}&size=40`}

          alt=""

          className="h-5 w-5 shrink-0 rounded-full object-cover"

          title={deal.agentName}

        />

      </div>

    </article>

  );

});


