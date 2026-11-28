import * as React from 'react';
import { cn } from '../lib/cn';
import { rsvTouchTargetPx } from '../tokens';

export function getStepperValueAfterDelta(
  value: number,
  delta: number,
  min: number,
  max: number,
): number {
  return Math.min(max, Math.max(min, value + delta));
}

const touchTargetStyle: React.CSSProperties = {
  minWidth: rsvTouchTargetPx,
  minHeight: rsvTouchTargetPx,
};

export interface NumericStepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange: (next: number) => void;
  className?: string;
  'aria-label'?: string;
}

export function NumericStepper({
  value,
  min = 0,
  max = 99,
  step = 1,
  disabled = false,
  onChange,
  className,
  'aria-label': ariaLabel = 'Quantidade',
}: NumericStepperProps) {
  const dec = () => {
    if (disabled) return;
    onChange(getStepperValueAfterDelta(value, -step, min, max));
  };
  const inc = () => {
    if (disabled) return;
    onChange(getStepperValueAfterDelta(value, step, min, max));
  };

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div
      className={cn('rsv-numeric-stepper inline-flex items-center gap-2', className)}
      data-rsv-numeric-stepper
      data-touch-min-px={rsvTouchTargetPx}
    >
      <button
        type="button"
        className="rsv-stepper-btn rsv-stepper-dec flex items-center justify-center rounded-md border text-lg font-medium disabled:opacity-40"
        style={touchTargetStyle}
        onClick={dec}
        disabled={disabled || atMin}
        aria-label="Diminuir quantidade"
      >
        −
      </button>
      <span className="rsv-stepper-value min-w-[2ch] text-center tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="rsv-stepper-btn rsv-stepper-inc flex items-center justify-center rounded-md border text-lg font-medium disabled:opacity-40"
        style={touchTargetStyle}
        onClick={inc}
        disabled={disabled || atMax}
        aria-label="Aumentar quantidade"
      >
        +
      </button>
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}