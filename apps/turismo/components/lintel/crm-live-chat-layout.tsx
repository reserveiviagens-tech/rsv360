'use client';

import type { ReactNode } from 'react';
import { CrmLiveChatRail } from './crm-live-chat-rail';
import { CrmLiveChatMobile } from './crm-live-chat-mobile';
import { useCrmLiveChat } from './crm-live-chat-provider';

export function CrmLiveChatLayout({ children }: { children: ReactNode }) {
  const { isChatCollapsed } = useCrmLiveChat();

  return (
    <div
      className={`lintel-shell-body flex w-full items-start transition-[gap] duration-500 ease-[cubic-bezier(0.2,0,0,1)] ${
        isChatCollapsed
          ? 'lintel-shell-body--chat-collapsed gap-2 lg:gap-3'
          : 'lintel-shell-body--chat-open gap-3 lg:gap-4'
      }`}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <aside
        className={`hidden shrink-0 lg:block lintel-chat-panel transition-[width] duration-500 ease-[cubic-bezier(0.2,0,0,1)] ${
          isChatCollapsed ? 'w-12' : 'w-[min(20rem,24vw)] lintel-chat-panel-enter'
        }`}
      >
        <CrmLiveChatRail />
      </aside>
      <CrmLiveChatMobile />
    </div>
  );
}
