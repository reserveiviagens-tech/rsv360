'use client';

import type { ReactNode } from 'react';
import { CrmLocaleProvider } from './crm-locale-provider';
import { LintelCreateProvider } from './lintel-create-provider';
import { CrmLiveChatLayout } from './crm-live-chat-layout';
import { CrmLiveChatProvider } from './crm-live-chat-provider';

/** Shell do módulo CRM parceiro: idioma PT/EN + modais Create + Live Chat persistente. */
export function RsvCrmShell({ children }: { children: ReactNode }) {
  return (
    <CrmLocaleProvider>
      <LintelCreateProvider>
        <CrmLiveChatProvider>
          <CrmLiveChatLayout>{children}</CrmLiveChatLayout>
        </CrmLiveChatProvider>
      </LintelCreateProvider>
    </CrmLocaleProvider>
  );
}
