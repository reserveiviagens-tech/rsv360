'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  Check,
  Mail,
  MessageCircle,
  Phone,
  Share2,
  User,
  X,
} from 'lucide-react';
import { lintelBtnGhost, lintelBtnPrimary } from '../lintel/overview-primitives';
import { useCrmLocale } from '../lintel/crm-locale-provider';
import { agentById } from './deals-agents';
import {
  STAGE_ORDER,
  buyerEmailFromName,
  buyerPhoneDemo,
  dealAskingPrice,
  dealsOnSameProperty,
  formatPrice,
  inferListingKind,
  offerBarPercent,
  propertyAddressLine,
  stageIndex,
  weightedCommission,
} from './deal-detail-data';
import { Deal, DEAL_PROPERTY_IMAGES, type DealStage } from './deal-card';

const STAGE_BAR: Record<DealStage, string> = {
  viewing: 'bg-slate-400',
  offer: 'bg-orange-500',
  negotiation: 'bg-blue-500',
  under_contract: 'bg-slate-900',
  closed: 'bg-emerald-500',
};

const STAGE_DOT: Record<DealStage, string> = {
  viewing: 'bg-slate-500',
  offer: 'bg-orange-500',
  negotiation: 'bg-blue-500',
  under_contract: 'bg-slate-900 dark:bg-white',
  closed: 'bg-emerald-500',
};

function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export interface DealDetailModalProps {
  deal: Deal;
  allDeals: Deal[];
  onClose: () => void;
  onSave?: (dealId: string, patch: Partial<Deal>) => void;
  onStageChange?: (dealId: string, stage: DealStage) => void;
  onMarkLost?: (deal: Deal) => void;
  onOpenProperty?: (deal: Deal) => void;
  onMessageBuyer?: (deal: Deal) => void;
  onSelectDeal?: (deal: Deal) => void;
  onCopyLink?: (deal: Deal) => void;
}

export function DealDetailModal({
  deal,
  allDeals,
  onClose,
  onSave,
  onStageChange,
  onMarkLost,
  onOpenProperty,
  onMessageBuyer,
  onSelectDeal,
  onCopyLink,
}: DealDetailModalProps) {
  const { copy } = useCrmLocale();
  const d = copy.deals;
  const dm = d.detailModal;
  const kind = inferListingKind(deal);
  const asking = dealAskingPrice(deal);
  const weighted = weightedCommission(deal);
  const img = deal.imageUrl ?? DEAL_PROPERTY_IMAGES[deal.propertyId] ?? DEAL_PROPERTY_IMAGES.prop_106;

  const [offerAmount, setOfferAmount] = useState(String(deal.price));
  const [closeDate, setCloseDate] = useState(deal.targetCloseDate ?? '');
  const [note, setNote] = useState(deal.offerNote ?? deal.notes ?? '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    setOfferAmount(String(deal.price));
    setCloseDate(deal.targetCloseDate ?? '');
    setNote(deal.offerNote ?? deal.notes ?? '');
  }, [deal.id, deal.notes, deal.offerNote, deal.price, deal.targetCloseDate]);

  const offers = useMemo(() => dealsOnSameProperty(deal, allDeals), [deal, allDeals]);
  const stageLabel = d.stages[deal.stage]?.label ?? deal.stage;
  const pct = asking > 0 ? (((deal.price - asking) / asking) * 100).toFixed(1) : '0';
  const vsAsking =
    deal.priceDelta ?? (Number(pct) === 0 ? d.atAsk : `${Number(pct) > 0 ? '+' : ''}${pct}%`);

  const buyerEmail = deal.clientEmail ?? buyerEmailFromName(deal.clientName ?? 'buyer');
  const buyerPhone = deal.clientPhone ?? buyerPhoneDemo();
  const buyerCity = deal.clientCity ?? deal.location.split('·')[0]?.trim() ?? '—';
  const agent = agentById(deal.agentId);
  const buyerContext = dm.buyerContext
    .replace('{city}', buyerCity)
    .replace('{agent}', agent?.name ?? deal.agentName);

  const save = useCallback(() => {
    const price = Number.parseInt(offerAmount.replace(/\D/g, ''), 10);
    onSave?.(deal.id, {
      price: Number.isFinite(price) ? price : deal.price,
      targetCloseDate: closeDate,
      offerNote: note,
    });
    onClose();
  }, [closeDate, deal.id, deal.price, note, offerAmount, onClose, onSave]);

  const offerBarClass = (row: Deal): string => {
    if (row.status === 'won' || row.stage === 'closed') return 'bg-emerald-600';
    return STAGE_BAR[row.stage] ?? 'bg-slate-900';
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/20 p-4 pt-8 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deal-detail-title"
      onClick={onClose}
    >
      <div
        className="lintel-deal-detail-enter my-auto w-full max-w-[800px] overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#121722]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <p id="deal-detail-title" className="text-sm font-semibold text-slate-800 dark:text-white">
              {kind === 'rent' ? dm.rentOffer : dm.saleOffer}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <span className={`h-1.5 w-1.5 rounded-full ${STAGE_DOT[deal.stage]}`} aria-hidden />
              {stageLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {onCopyLink ? (
              <button
                type="button"
                onClick={() => onCopyLink(deal)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                aria-label={dm.copyLinkAria}
                title={d.cardMenu.copyLink}
              >
                <Share2 className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              aria-label={d.closeDetail}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="grid max-h-[min(85vh,880px)] gap-6 overflow-y-auto p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="min-w-0 space-y-4">
            <div className="relative h-[220px] w-full overflow-hidden rounded-xl bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="h-full w-full object-cover" />
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
                aria-hidden
              />
              {deal.stage === 'closed' || deal.status === 'won' ? (
                <span className="absolute right-3 top-3 rounded bg-emerald-600/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  SOLD
                </span>
              ) : null}
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <h2 className="text-lg font-bold leading-tight sm:text-xl">{deal.propertyName}</h2>
                <p className="text-xs text-white/85 sm:text-sm">{propertyAddressLine(deal)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-medium text-slate-500">{dm.offerLabel}</p>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {formatPrice(deal.price, kind)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">{dm.askingLabel}</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatPrice(asking, kind)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">{dm.vsAsking}</p>
                  <span className="inline-block rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                    {vsAsking}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">{dm.commissionLabel}</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatPrice(deal.commission)}
                    <span className="text-[11px] font-medium text-slate-400">
                      {' '}
                      · {formatPrice(weighted)} {dm.weightedSuffix}
                    </span>
                  </p>
                  {deal.stage === 'closed' ? (
                    <span className="text-[11px] text-slate-400"> · {dm.earned}</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <nav className="flex gap-1" aria-label="Deal stage">
                {STAGE_ORDER.map((stage, i) => {
                  const active = deal.stage === stage;
                  const done = stageIndex(stage) < stageIndex(deal.stage);
                  const show = done || active;
                  return (
                    <div
                      key={stage}
                      className={`min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 ${
                        active ? 'h-2' : 'h-1.5'
                      }`}
                    >
                      {show ? (
                        <div
                          className={`lintel-deal-column-bar h-full w-full rounded-full ${STAGE_BAR[stage]}`}
                          style={{ animationDelay: `${i * 65}ms` }}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </nav>
              <div className="mt-1.5 flex gap-1">
                {STAGE_ORDER.map((stage) => (
                  <p
                    key={stage}
                    className={`min-w-0 flex-1 truncate text-center text-[10px] font-medium ${
                      deal.stage === stage ? 'text-slate-900 dark:text-white' : 'text-slate-500'
                    }`}
                  >
                    {stage === 'closed' ? dm.soldStage : d.stages[stage]?.label ?? stage}
                  </p>
                ))}
              </div>
              {onStageChange ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {dm.moveToQuick}
                  </span>
                  {STAGE_ORDER.map((stage) => {
                    const isCurrent = deal.stage === stage;
                    const label =
                      stage === 'closed' ? dm.soldStage : d.stages[stage]?.label ?? stage;
                    return (
                      <button
                        key={stage}
                        type="button"
                        disabled={isCurrent}
                        onClick={() => onStageChange(deal.id, stage)}
                        className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-all ${
                          isCurrent
                            ? 'cursor-default bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-500">
                {dm.offerAmount}
                <input
                  type="text"
                  inputMode="numeric"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-[#1d222c] dark:text-white"
                />
              </label>
              <label className="block text-xs font-bold text-slate-500">
                {dm.closedOn}
                <div className="relative mt-1">
                  <input
                    type="date"
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-[#1d222c] dark:text-white"
                  />
                  <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </label>
            </div>
            <label className="block text-xs font-bold text-slate-500">
              {dm.note}
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 dark:border-slate-700 dark:bg-[#1d222c] dark:text-slate-100"
              />
            </label>

            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" className={lintelBtnPrimary} onClick={save}>
                <Check className="h-4 w-4" aria-hidden />
                {dm.saveChanges}
              </button>
              <button
                type="button"
                className={lintelBtnGhost}
                onClick={() => {
                  onMarkLost?.(deal);
                  onClose();
                }}
              >
                <X className="h-4 w-4" aria-hidden />
                {dm.markLost}
              </button>
            </div>
          </div>

          <div className="min-w-0 space-y-6 border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 dark:border-slate-800">
            <section>
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{dm.offersTitle}</h3>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {offers.length}
                </span>
              </div>
              <p className="mb-4 text-[11px] text-slate-500">{dm.offersSubtitle}</p>
              <ul className="space-y-2">
                {offers.map((row, rowIdx) => {
                  const active = row.id === deal.id;
                  const rowAsking = dealAskingPrice(row);
                  const pctBar = offerBarPercent(row.price, rowAsking);
                  const rowStage = d.stages[row.stage]?.label ?? row.stage;
                  const closed = row.stage === 'closed' || row.status === 'won';
                  const body = (
                    <>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                            {clientInitials(row.clientName ?? '?')}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                              {row.clientName}
                            </p>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                                closed ? 'text-emerald-700' : 'text-slate-500'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  closed ? 'bg-emerald-500' : STAGE_DOT[row.stage]
                                }`}
                              />
                              {rowStage}
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-slate-900 dark:text-white">
                          {formatPrice(row.price, kind)}
                        </span>
                      </div>
                      <div className="relative h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`lintel-deal-offer-bar-fill absolute left-0 top-0 h-full rounded-full ${offerBarClass(row)}`}
                          style={{
                            width: `${Math.min(pctBar, 100)}%`,
                            animationDelay: `${rowIdx * 0.08 + 0.05}s`,
                          }}
                        />
                        <div
                          className="absolute top-0 h-full w-0.5 bg-slate-500/80"
                          style={{ left: '100%', transform: 'translateX(-1px)' }}
                          title={dm.askingLabel}
                        />
                      </div>
                    </>
                  );
                  return (
                    <li key={row.id}>
                      {active || !onSelectDeal ? (
                        <div
                          className={
                            active
                              ? 'rounded-xl border border-blue-200/90 bg-blue-50/50 p-3 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/25'
                              : 'rounded-xl px-2 py-2'
                          }
                        >
                          {body}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="w-full rounded-xl border border-transparent px-2 py-2 text-left transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
                          onClick={() => onSelectDeal(row)}
                        >
                          {body}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">{dm.buyerTitle}</h3>
              <div className="flex items-start gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                  aria-hidden
                >
                  {clientInitials(deal.clientName ?? 'Buyer')}
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                    {deal.clientName}
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800">
                      {dm.buyerBadge}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">{buyerContext}</p>
                </div>
              </div>
              <a
                href={`mailto:${buyerEmail}`}
                className="mt-4 flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
              >
                <Mail className="h-4 w-4" />
                {buyerEmail}
              </a>
              <a
                href={`tel:${buyerPhone.replace(/\D/g, '')}`}
                className="mt-2 flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
              >
                <Phone className="h-4 w-4" />
                {buyerPhone}
              </a>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className={lintelBtnPrimary} onClick={() => onMessageBuyer?.(deal)}>
                  <MessageCircle className="h-4 w-4" />
                  {dm.message}
                </button>
                <a href={`tel:${buyerPhone.replace(/\D/g, '')}`} className={lintelBtnGhost}>
                  <Phone className="h-4 w-4" />
                  {dm.call}
                </a>
                <button type="button" className={lintelBtnGhost}>
                  <User className="h-4 w-4" />
                  {dm.profile}
                </button>
              </div>
            </section>

            <button
              type="button"
              className={`${lintelBtnGhost} w-full justify-between`}
              onClick={() => onOpenProperty?.(deal)}
            >
              {dm.openProperty}
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
