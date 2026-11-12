'use client';

import type { DealStage } from './deal-card';
import { STAGE_ORDER, stageIndex } from './deal-detail-data';

const SEGMENT_FILL: Record<DealStage, string> = {
  viewing: 'bg-slate-400',
  offer: 'bg-orange-500',
  negotiation: 'bg-blue-500',
  under_contract: 'bg-slate-900',
  closed: 'bg-emerald-500',
};

export type DealStageMiniBarProps = {
  stage: DealStage;
  /** Stagger base delay for enter animation (ms). */
  animateDelayMs?: number;
  className?: string;
};

export function DealStageMiniBar({ stage, animateDelayMs = 0, className = '' }: DealStageMiniBarProps) {
  const current = stageIndex(stage);

  return (
    <div
      className={`flex gap-0.5 ${className}`}
      role="img"
      aria-label={stage}
    >
      {STAGE_ORDER.map((seg, i) => {
        const filled = i <= current;
        return (
          <div
            key={seg}
            className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          >
            {filled ? (
              <div
                className={`lintel-deal-column-bar h-full w-full rounded-full ${SEGMENT_FILL[seg]}`}
                style={{ animationDelay: `${animateDelayMs + i * 70}ms` }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function DealStageMiniBarSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`flex gap-0.5 ${className}`} aria-hidden>
      {STAGE_ORDER.map((seg) => (
        <div key={seg} className="lintel-shimmer h-1 min-w-0 flex-1 rounded-full" />
      ))}
    </div>
  );
}
