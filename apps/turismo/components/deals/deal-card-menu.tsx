'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronRight,
  Home,
  Link2,
  MessageCircle,
  Trophy,
  X,
} from 'lucide-react';
import { useCrmLocale } from '../lintel/crm-locale-provider';
import type { Deal, DealStage } from './deal-card';

const STAGE_ORDER: DealStage[] = ['viewing', 'offer', 'negotiation', 'under_contract', 'closed'];

const menuBtn =
  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-white/10';

export type DealCardMenuHandlers = {
  onOpenDeal: () => void;
  onMoveToStage: (stage: DealStage) => void;
  onMarkSold: () => void;
  onMarkLost: () => void;
  onMessageClient: () => void;
  onOpenProperty: () => void;
  onCopyLink: () => void;
};

export function DealCardOverflowMenu({
  deal,
  open,
  onOpenChange,
  handlers,
  anchorRef,
}: {
  deal: Deal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handlers: DealCardMenuHandlers;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const { copy } = useCrmLocale();
  const m = copy.deals.cardMenu;
  const menuId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const clientFirst = (deal.clientName ?? '').trim().split(/\s+/)[0] ?? m.messageFallback;

  const close = useCallback(() => {
    setMoveOpen(false);
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) {
      setMoveOpen(false);
      return;
    }
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close, anchorRef]);

  if (!open) return null;

  const canMarkSold = deal.stage !== 'closed' && deal.status !== 'won';
  const canMarkLost = deal.status !== 'lost';

  return (
    <div
      ref={panelRef}
      id={menuId}
      role="menu"
      aria-label={copy.deals.cardMenuAria}
      className="lintel-deal-card-menu-enter absolute right-0 top-full z-[80] mt-1 w-[11.25rem] overflow-visible rounded-xl border border-slate-200/90 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-[#1d222c]"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        role="menuitem"
        className={menuBtn}
        onClick={() => {
          close();
          handlers.onOpenDeal();
        }}
      >
        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        {m.openDeal}
      </button>

      <button
        type="button"
        role="menuitem"
        className={menuBtn}
        onClick={() => {
          close();
          handlers.onCopyLink();
        }}
      >
        <Link2 className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        {m.copyLink}
      </button>

      <div className="relative">
        <button
          type="button"
          role="menuitem"
          aria-expanded={moveOpen}
          className={`${menuBtn} justify-between`}
          onClick={() => setMoveOpen((v) => !v)}
        >
          <span className="pl-[1.625rem]">{m.moveTo}</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />
        </button>
        {moveOpen ? (
          <div
            role="menu"
            aria-label={m.moveSubmenuAria}
            className="border-t border-slate-100 py-0.5 dark:border-white/10"
          >
            {STAGE_ORDER.map((stage) => {
              const label = copy.deals.stages[stage]?.label ?? stage;
              const disabled = deal.stage === stage;
              return (
                <button
                  key={stage}
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  className={`${menuBtn} pl-8 ${disabled ? 'cursor-default opacity-40' : ''}`}
                  onClick={() => {
                    if (disabled) return;
                    close();
                    handlers.onMoveToStage(stage);
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {canMarkSold ? (
        <button
          type="button"
          role="menuitem"
          className={menuBtn}
          onClick={() => {
            close();
            handlers.onMarkSold();
          }}
        >
          <Trophy className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          {m.markSold}
        </button>
      ) : null}

      {canMarkLost ? (
        <button
          type="button"
          role="menuitem"
          className={menuBtn}
          onClick={() => {
            close();
            handlers.onMarkLost();
          }}
        >
          <X className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          {m.markLost}
        </button>
      ) : null}

      <button
        type="button"
        role="menuitem"
        className={menuBtn}
        onClick={() => {
          close();
          handlers.onMessageClient();
        }}
      >
        <MessageCircle className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        {m.messageClient.replace('{name}', clientFirst)}
      </button>

      <button
        type="button"
        role="menuitem"
        className={menuBtn}
        onClick={() => {
          close();
          handlers.onOpenProperty();
        }}
      >
        <Home className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        {m.openProperty}
      </button>
    </div>
  );
}
