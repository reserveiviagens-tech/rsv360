'use client';

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Calendar, CalendarPlus, Check, RotateCcw } from 'lucide-react';
import { useCrmLocale } from '../lintel/crm-locale-provider';
import { lintelIconBtn } from '../lintel/overview-primitives';
import type { LeaseCalendarEventKind, LeaseCalendarItem } from './rentals-data';
import { RentalsPanelExpand } from './rentals-panel-expand';
import { loadLeaseCalendarState, saveLeaseCalendarState } from './lease-calendar-storage';

const DATE_BADGE: Record<LeaseCalendarItem['tone'], string> = {
  blue: 'bg-[#2f5bea]/12 text-[#2f5bea]',
  apricot: 'bg-[#ff8a3d]/15 text-[#c45c12]',
};

const TIME_PILL: Record<LeaseCalendarItem['tone'], string> = {
  blue: 'text-[#2f5bea] bg-[#2f5bea]/10',
  apricot: 'text-[#c45c12] bg-[#ff8a3d]/12',
};

const EVENT_TAG: Record<LeaseCalendarEventKind, string> = {
  sign: 'bg-[#2f5bea]/12 text-[#2f5bea]',
  lease_end: 'bg-[#ff8a3d]/12 text-[#c45c12]',
  review: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

const TOAST_MS = 5200;

type LeaseToast = {
  message: string;
  undo?: () => void;
};

function eventLabel(kind: LeaseCalendarEventKind, r: ReturnType<typeof useCrmLocale>['copy']['rentals']) {
  if (kind === 'sign') return r.leaseEventSign;
  if (kind === 'lease_end') return r.leaseEventEnd;
  return r.leaseEventReview;
}

function LeaseCalendarList({
  items,
  loading,
  className = '',
  scrollClassName = 'max-h-[17.5rem]',
  compactLintelLayout = false,
  signedIds,
  calendarIds,
  onMarkSigned,
  onUnmarkSigned,
  onAddToCalendar,
  onRemoveFromCalendar,
}: {
  items: LeaseCalendarItem[];
  loading: boolean;
  className?: string;
  scrollClassName?: string;
  compactLintelLayout?: boolean;
  signedIds: Set<string>;
  calendarIds: Set<string>;
  onMarkSigned: (id: string) => void;
  onUnmarkSigned: (id: string) => void;
  onAddToCalendar: (id: string) => void;
  onRemoveFromCalendar: (id: string) => void;
}) {
  const { copy } = useCrmLocale();
  const r = copy.rentals;
  const [toast, setToast] = useState<LeaseToast | null>(null);
  const toastTimer = useRef<number | null>(null);

  const clearToastTimer = useCallback(() => {
    if (toastTimer.current != null) {
      window.clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
  }, []);

  const showToast = useCallback(
    (message: string, undo?: () => void) => {
      clearToastTimer();
      setToast({ message, undo });
      toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
    },
    [clearToastTimer],
  );

  useEffect(() => () => clearToastTimer(), [clearToastTimer]);

  const runUndo = useCallback(() => {
    toast?.undo?.();
    setToast(null);
    clearToastTimer();
  }, [toast, clearToastTimer]);

  if (loading) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {[0, 1, 2, 3].map((idx) => (
          <div key={idx} className="lintel-shimmer h-[4.25rem] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {toast ? (
        <div
          className="lintel-overview-enter lintel-lease-toast mb-2 flex items-center justify-center gap-2 rounded-full bg-[#121722] px-2 py-1 text-[10px] font-bold text-white dark:bg-white dark:text-[#121722]"
          role="status"
        >
          <span className="px-1">{toast.message}</span>
          {toast.undo ? (
            <button
              type="button"
              onClick={runUndo}
              className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide hover:bg-white/25 dark:bg-[#121722]/10 dark:hover:bg-[#121722]/20"
            >
              {r.leaseUndoAction}
            </button>
          ) : null}
        </div>
      ) : null}
      <div className={`lintel-rent-calendar-scroll flex flex-col gap-0 overflow-y-auto pr-1 ${scrollClassName}`}>
        {items.map((item, idx) => {
          const signed = signedIds.has(item.id);
          const onCal = calendarIds.has(item.id);
          return (
            <div
              key={item.id}
              className={`lintel-rental-card-enter flex min-h-[2.5rem] items-center gap-2.5 border-b border-gray-100 py-2 last:border-b-0 dark:border-white/5 ${
                signed ? 'opacity-75' : ''
              }`}
              style={{ animationDelay: `${100 + idx * 50}ms` }}
            >
              <div
                className={`flex min-w-[2rem] flex-col items-center rounded-lg px-1.5 py-1 ${DATE_BADGE[item.tone]}`}
              >
                <span className="text-[8px] font-black uppercase tracking-wide">{item.monthLabel}</span>
                <span className="text-base font-black leading-none">{item.dayLabel}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className={`mb-0.5 flex flex-wrap items-center gap-1.5 ${compactLintelLayout ? 'hidden' : ''}`}>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${EVENT_TAG[item.eventKind]}`}
                  >
                    {eventLabel(item.eventKind, r)}
                  </span>
                  {signed ? (
                    <span className="rounded-full bg-[#138a63]/12 px-1.5 py-0.5 text-[9px] font-bold text-[#138a63]">
                      {r.leaseSignedBadge}
                    </span>
                  ) : null}
                  {onCal && !signed ? (
                    <span className="rounded-full bg-[#138a63]/12 px-1.5 py-0.5 text-[9px] font-bold text-[#138a63]">
                      {r.leaseOnCalendar}
                    </span>
                  ) : null}
                </div>
                <b
                  className={`block text-xs font-bold text-gray-900 dark:text-white ${
                    signed ? 'line-through' : ''
                  }`}
                >
                  {item.title}
                </b>
                <span className="text-[11px] text-gray-400">{item.sub}</span>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${TIME_PILL[item.tone]} ${
                  compactLintelLayout ? 'inline' : 'hidden sm:inline'
                }`}
              >
                {item.time}
              </span>
              {item.action === 'check' ? (
                signed ? (
                  <button
                    type="button"
                    className={`h-8 w-8 shrink-0 ${lintelIconBtn} border-[#ff8a3d]/35 bg-[#ff8a3d]/10 text-[#c45c12]`}
                    aria-label={r.leaseUndoSignAria}
                    onClick={() => {
                      onUnmarkSigned(item.id);
                      showToast(r.leaseUndoSignDone);
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`h-8 w-8 shrink-0 ${lintelIconBtn}`}
                    aria-label={r.leaseMarkSignedAria}
                    onClick={() => {
                      onMarkSigned(item.id);
                      showToast(r.leaseSignedDone, () => onUnmarkSigned(item.id));
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )
              ) : onCal ? (
                <button
                  type="button"
                  className={`h-8 w-8 shrink-0 ${lintelIconBtn} border-[#2f5bea]/40 bg-[#2f5bea]/10 text-[#2f5bea]`}
                  aria-label={r.leaseUndoCalendarAria}
                  onClick={() => {
                    onRemoveFromCalendar(item.id);
                    showToast(r.leaseUndoCalendarDone);
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  className={`h-8 w-8 shrink-0 ${lintelIconBtn}`}
                  aria-label={r.leaseAddCalendarAria}
                  onClick={() => {
                    onAddToCalendar(item.id);
                    showToast(r.leaseAddedToCalendar, () => onRemoveFromCalendar(item.id));
                  }}
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const LeaseCalendarPanel = memo(function LeaseCalendarPanel({
  items,
  loading = false,
  compactLintelLayout = false,
}: {
  items: LeaseCalendarItem[];
  loading?: boolean;
  compactLintelLayout?: boolean;
}) {
  const { copy } = useCrmLocale();
  const r = copy.rentals;
  const [expanded, setExpanded] = useState(false);
  const [signedIds, setSignedIds] = useState<Set<string>>(() => new Set());
  const [calendarIds, setCalendarIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const stored = loadLeaseCalendarState();
    setSignedIds(new Set(stored.signedIds));
    setCalendarIds(new Set(stored.calendarIds));
  }, []);

  useEffect(() => {
    if (loading) return;
    saveLeaseCalendarState({
      signedIds: [...signedIds],
      calendarIds: [...calendarIds],
    });
  }, [signedIds, calendarIds, loading]);

  const onMarkSigned = useCallback((id: string) => {
    setSignedIds((prev) => new Set(prev).add(id));
  }, []);

  const onUnmarkSigned = useCallback((id: string) => {
    setSignedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const onAddToCalendar = useCallback((id: string) => {
    setCalendarIds((prev) => new Set(prev).add(id));
  }, []);

  const onRemoveFromCalendar = useCallback((id: string) => {
    setCalendarIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const visibleItems = compactLintelLayout ? items.slice(0, 4) : items;

  const listProps = {
    items: visibleItems,
    signedIds,
    calendarIds,
    onMarkSigned,
    onUnmarkSigned,
    onAddToCalendar,
    onRemoveFromCalendar,
  };

  return (
    <>
      <div className="flex flex-col rounded-2xl border border-white/80 bg-white/70 p-5 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#171b23]/80">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <Calendar className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
            {r.leaseCalendarTitle}
          </h3>
          <div className="flex shrink-0 items-center gap-2">
            {loading ? (
              <div className="lintel-shimmer h-5 w-28 rounded-full" />
            ) : (
              <span className="rounded-full bg-[#ff8a3d]/15 px-2 py-0.5 text-[10px] font-bold text-[#c45c12]">
                {r.leaseEndingBadge}
              </span>
            )}
            <button
              type="button"
              aria-label={r.leaseCalendarExpandAria}
              onClick={() => setExpanded(true)}
              className={`h-8 w-8 ${lintelIconBtn}`}
              disabled={loading}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <LeaseCalendarList
          loading={loading}
          compactLintelLayout={compactLintelLayout}
          scrollClassName={compactLintelLayout ? 'max-h-[11.5rem]' : 'max-h-[17.5rem]'}
          {...listProps}
        />
      </div>

      <RentalsPanelExpand open={expanded} title={r.leaseCalendarTitle} onClose={() => setExpanded(false)}>
        <p className="mb-3 text-xs font-bold text-[#c45c12]">{r.leaseEndingBadge}</p>
        <LeaseCalendarList
          loading={false}
          scrollClassName="max-h-[28rem]"
          compactLintelLayout={compactLintelLayout}
          items={items}
          signedIds={signedIds}
          calendarIds={calendarIds}
          onMarkSigned={onMarkSigned}
          onUnmarkSigned={onUnmarkSigned}
          onAddToCalendar={onAddToCalendar}
          onRemoveFromCalendar={onRemoveFromCalendar}
        />
      </RentalsPanelExpand>
    </>
  );
});
