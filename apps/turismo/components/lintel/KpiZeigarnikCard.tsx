'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import { clampZeigarnikProgress } from './tokens';
import { lintelOverviewCard } from './overview-primitives';

export function KpiZeigarnikCard({
  title,
  metric,
  subcopy,
  progressPercent,
  actionLabel,
  onAction,
  loading,
  className,
}: {
  title: string;
  metric: string;
  subcopy?: string;
  /** 0–100 — tração / pendências (efeito Zeigarnik). */
  progressPercent: number;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  className?: string;
}) {
  const progress = clampZeigarnikProgress(progressPercent);
  const showAction = Boolean(actionLabel && onAction);

  return (
    <section
      className={cn(
        lintelOverviewCard,
        'flex flex-col gap-3 border border-[var(--lintel-bg-subtle)] bg-[var(--lintel-bg-surface)] p-4',
        className,
      )}
      aria-labelledby="lintel-zeigarnik-title"
    >
      <motionHeader title={title} metric={metric} loading={loading} />
      <div className="space-y-2">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-[var(--lintel-bg-subtle)]"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={title}
        >
          <div
            className="h-full rounded-full bg-[var(--lintel-brand-gold)] transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {subcopy ? (
          <p className="text-[11px] font-medium leading-snug text-slate-600 dark:text-slate-400">
            {subcopy}
          </p>
        ) : null}
      </div>
      {showAction ? (
        <button
          type="button"
          onClick={onAction}
          className="lintel-tabular-nums w-fit rounded-full border border-[var(--lintel-brand-gold)] bg-[var(--lintel-brand-gold-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--lintel-brand-navy)] transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lintel-brand-gold)]"
        >
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}

function motionHeader({
  title,
  metric,
  loading,
}: {
  title: string;
  metric: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3
          id="lintel-zeigarnik-title"
          className="text-[11px] font-bold uppercase tracking-wide text-[var(--lintel-brand-navy)] dark:text-slate-200"
        >
          {title}
        </h3>
        <p
          className={cn(
            'lintel-tabular-nums mt-1 text-2xl font-black text-[var(--lintel-brand-navy)] dark:text-white',
            loading && 'lintel-shimmer inline-block min-h-[1.75rem] min-w-[4rem] rounded',
          )}
          aria-busy={loading}
        >
          {loading ? '\u00a0' : metric}
        </p>
      </div>
    </div>
  );
}