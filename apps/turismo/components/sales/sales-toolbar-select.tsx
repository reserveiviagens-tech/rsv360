'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LINTEL_SALES_TW } from '../lintel/lintel-theme';

const menuShell = `absolute left-0 top-full z-[60] mt-2 min-w-[12rem] rounded-xl border border-gray-200/90 bg-white p-1 shadow-lg dark:border-gray-700 ${LINTEL_SALES_TW.toolbarMenuDark}`;

const menuItem = (active: boolean) =>
  [
    'flex w-full items-center rounded-lg px-3 py-2 text-left text-[11px] font-semibold transition-colors',
    active
      ? 'bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white'
      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/5',
  ].join(' ');

export type SalesToolbarSelectOption<T extends string> = {
  value: T;
  label: string;
};

export type SalesToolbarSelectProps<T extends string> = {
  ariaLabel: string;
  value: T;
  options: SalesToolbarSelectOption<T>[];
  onChange: (value: T) => void;
  buttonLabel: string;
  className?: string;
};

export function SalesToolbarSelect<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  buttonLabel,
  className = '',
}: SalesToolbarSelectProps<T>) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
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
  }, [open, close]);

  const chipClass = `inline-flex h-[26px] items-center gap-1 rounded-full border border-gray-200/80 bg-white px-2.5 text-[11px] font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 ${LINTEL_SALES_TW.toolbarChipDark}`;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        id={`${id}-trigger`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        className={chipClass}
        onClick={() => setOpen((v) => !v)}
      >
        {buttonLabel}
        <ChevronDown className={`h-3 w-3 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <ul id={`${id}-menu`} role="listbox" aria-labelledby={`${id}-trigger`} className={menuShell}>
          {options.map((opt) => (
            <li key={opt.value} role="option" aria-selected={opt.value === value}>
              <button
                type="button"
                className={menuItem(opt.value === value)}
                onClick={() => {
                  onChange(opt.value);
                  close();
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
