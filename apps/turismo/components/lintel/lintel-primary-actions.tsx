'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Calendar,
  Flame,
  Inbox,
  KeyRound,
  Layers,
  MoreHorizontal,
  Plus,
} from 'lucide-react';
import { lintelBtnPrimary, lintelIconBtn } from './overview-primitives';
import type { LintelCreateModalId } from './lintel-create-modals';
import { useLintelCreate } from './lintel-create-provider';
import { useCrmLocale } from './crm-locale-provider';

const menuShell =
  'absolute right-0 top-full z-[70] mt-2 min-w-[240px] rounded-[22px] border border-slate-200/90 bg-white p-1.5 shadow-[0_20px_50px_rgba(15,23,42,0.12)] dark:border-slate-600/80 dark:bg-[#171b23]';

const menuItem =
  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-slate-800 transition hover:bg-slate-100/90 dark:text-slate-100 dark:hover:bg-white/5';

const menuDivider = 'my-1 border-t border-slate-100 dark:border-slate-700/80';

export type LintelPrimaryActionsVariant = 'listings' | 'deals' | 'rentals';

export type LintelPrimaryActionsProps = {
  variant?: LintelPrimaryActionsVariant;
  className?: string;
  /** Paridade Lintel Rentals: só CTA primário, sem botão "…". */
  hideOverflowMenu?: boolean;
};

export function LintelPrimaryActions({
  variant = 'listings',
  className = '',
  hideOverflowMenu = false,
}: LintelPrimaryActionsProps) {
  const { openCreate } = useLintelCreate();
  const { copy } = useCrmLocale();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const runModal = useCallback(
    (id: LintelCreateModalId) => {
      closeMenu();
      openCreate(id);
    },
    [closeMenu, openCreate],
  );

  const navigate = useCallback(
    (path: string) => {
      closeMenu();
      void router.push(path);
    },
    [closeMenu, router],
  );

  const primary =
    variant === 'deals'
      ? { label: copy.actions.recordOffer, modal: 'offer' as const, icon: Plus }
      : variant === 'rentals'
        ? { label: copy.rentals.primaryCta, modal: 'listing-rental' as const, icon: Plus }
        : { label: copy.actions.newListing, modal: 'listing-sale' as const, icon: Plus };

  const overflowItems = [
    { label: copy.actions.rentalListing, icon: KeyRound, onClick: () => runModal('listing-rental') },
    { label: copy.actions.bookViewing, icon: Calendar, onClick: () => runModal('viewing') },
    { label: copy.actions.newLead, icon: Flame, onClick: () => runModal('lead') },
    null,
    { label: copy.actions.openDealBoard, icon: Layers, onClick: () => navigate('/deals') },
    { label: copy.actions.openLeadInbox, icon: Inbox, onClick: () => navigate('/leads') },
  ] as const;

  return (
    <div ref={ref} className={`relative flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => openCreate(primary.modal)}
        className={`${lintelBtnPrimary} px-5 py-2.5`}
      >
        <primary.icon className="h-4 w-4" aria-hidden />
        {primary.label}
      </button>
      {hideOverflowMenu ? null : (
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className={`h-10 w-10 ${lintelIconBtn}`}
          aria-label={copy.actions.moreActions}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
      {menuOpen && !hideOverflowMenu ? (
        <div className={menuShell} role="menu">
          {overflowItems.map((item, index) =>
            item === null ? (
              <div key={`div-${index}`} className={menuDivider} role="separator" />
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={menuItem}
                onClick={item.onClick}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0 text-slate-600 dark:text-slate-300" aria-hidden />
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
