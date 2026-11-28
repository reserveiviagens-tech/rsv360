'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import { LINTEL_Z_INDEX } from './tokens';

export function StickyBottomBar({
  children,
  className,
  padding = 'comfortable',
}: {
  children: React.ReactNode;
  className?: string;
  padding?: 'compact' | 'comfortable';
}) {
  return (
    <div
      className={cn(
        'lintel-sticky-bottom-bar',
        padding === 'compact' ? 'px-3 py-2' : 'px-4 py-3 sm:px-6',
        className,
      )}
      style={{ zIndex: LINTEL_Z_INDEX.stickyBottom }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2">
        {children}
      </div>
    </div>
  );
}