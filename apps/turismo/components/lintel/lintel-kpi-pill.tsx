'use client';

import React from 'react';
import { lintelKpiIcon, lintelKpiPill, lintelKpiPillInline } from './overview-primitives';

export type LintelKpiTone = 'default' | 'accentOrange' | 'accentViolet';
export type LintelKpiSurface = 'card' | 'inline';

export function LintelKpiPill({
  icon,
  value,
  label,
  loading,
  tone = 'default',
  valueSuffix,
  surface = 'card',
  valueClassName,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  loading?: boolean;
  tone?: LintelKpiTone;
  valueSuffix?: React.ReactNode;
  surface?: LintelKpiSurface;
  /** Override do tamanho do valor (ex.: aba Locações Lintel). */
  valueClassName?: string;
}) {
  const shellClass = surface === 'inline' ? lintelKpiPillInline : lintelKpiPill;
  const toneClass =
    tone === 'accentOrange'
      ? 'text-orange-600 dark:text-orange-400'
      : tone === 'accentViolet'
        ? 'text-violet-600 dark:text-violet-400'
        : 'text-gray-900 dark:text-white';
  const valueClass = valueClassName ?? `text-sm font-black leading-none ${toneClass}`;

  return (
    <div className={shellClass}>
      <span className={lintelKpiIcon} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <span className="flex min-w-0 items-center gap-1">
          <span
            className={`block truncate ${valueClass} ${
              loading ? 'lintel-shimmer inline-block min-h-[0.875rem] min-w-[2rem] rounded' : ''
            }`}
            aria-busy={loading}
          >
            {loading ? '\u00a0' : value}
          </span>
          {valueSuffix}
        </span>
        <span className="block max-w-[6.5rem] text-[10px] font-semibold leading-tight text-gray-500 sm:max-w-[7.25rem]">
          {label}
        </span>
      </div>
    </div>
  );
}
