'use client';

import { useEffect, useMemo } from 'react';
import { MessageCircle } from 'lucide-react';
import { useCrmLocale } from './crm-locale-provider';
import { useCrmLiveChat } from './crm-live-chat-provider';
import { CrmLiveChatRail } from './crm-live-chat-rail';

export function CrmLiveChatMobile() {
  const { copy } = useCrmLocale();
  const p = copy.propertyDetail;
  const { mobileChatOpen, openLiveChatUi, closeMobileChat, chatThreads } = useCrmLiveChat();

  const unreadTotal = useMemo(
    () => Object.values(chatThreads).reduce((sum, t) => sum + t.unreadBadge, 0),
    [chatThreads],
  );

  useEffect(() => {
    if (!mobileChatOpen || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileChatOpen]);

  return (
    <>
      <button
        type="button"
        onClick={openLiveChatUi}
        aria-label={p.openLiveChatFabAria}
        className="fixed bottom-5 right-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full border border-white/80 bg-[#121722] text-white shadow-lg transition-transform hover:scale-105 active:scale-95 lg:hidden dark:border-white/10 dark:bg-white dark:text-[#121722]"
      >
        <MessageCircle className="h-6 w-6" aria-hidden />
        {unreadTotal > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#ff8a3d] px-1 text-[10px] font-black text-white">
            {unreadTotal}
          </span>
        ) : (
          <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-[#138a63] ring-2 ring-[#121722] dark:ring-white" />
        )}
      </button>

      {mobileChatOpen ? (
        <div className="fixed inset-0 z-[85] lg:hidden" role="presentation">
          <button
            type="button"
            className="lintel-overview-enter absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            aria-label={copy.common.close}
            onClick={closeMobileChat}
          />
          <div className="lintel-chat-sheet absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-[28px] border border-white/80 bg-white/95 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-[#171b23]/98">
            <div className="flex justify-center pt-2 pb-1" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
            <div className="min-h-0 flex-1 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <CrmLiveChatRail presentation="sheet" onCloseSheet={closeMobileChat} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
