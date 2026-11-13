'use client';

import React from 'react';
import { X } from 'lucide-react';
import { lintelBtnGhost, lintelIconBtn } from '../lintel/overview-primitives';
import { useCrmLocale } from '../lintel/crm-locale-provider';

export function RentalsPanelExpand({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { copy } = useCrmLocale();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm lintel-overview-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rentals-panel-expand-title"
      onClick={onClose}
    >
      <div
        className="lintel-rent-panel-expand max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[26px] border border-white/80 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#171b23]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="rentals-panel-expand-title" className="text-lg font-black text-gray-900 dark:text-white">
            {title}
          </h2>
          <button type="button" onClick={onClose} className={`h-9 w-9 ${lintelIconBtn}`} aria-label={copy.common.close}>
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose} className={`${lintelBtnGhost} px-4 py-2`}>
            {copy.common.close}
          </button>
        </div>
      </div>
    </div>
  );
}
