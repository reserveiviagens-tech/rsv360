'use client';

import type { ReactNode } from 'react';
import { useCrmLiveChatOptional } from './crm-live-chat-provider';

export function LintelKpiStripRow({
  children,
  className = '',
  animateEnter = false,
}: {
  children: ReactNode;
  className?: string;
  /** Entrada suave do header (ref. Overview.mp4). */
  animateEnter?: boolean;
}) {
  const chat = useCrmLiveChatOptional();
  const chatExpanded = Boolean(chat && !chat.isChatCollapsed);

  return (
    <div
      className={[
        'lintel-kpi-strip flex w-full min-w-0 flex-nowrap items-center justify-start gap-2 overflow-x-auto overscroll-x-contain pb-0.5 sm:justify-end md:gap-2.5',
        animateEnter ? 'lintel-kpi-strip-enter' : '',
        chatExpanded ? 'lintel-kpi-strip--chat-open gap-1.5' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
