'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useRouter } from 'next/router';
import { useCrmLocale } from './crm-locale-provider';
import {
  CRM_CHAT_OPEN_PROPERTY_KEY,
  CRM_LIVE_CHAT_ACTIVE_ID_KEY,
  CRM_LIVE_CHAT_COLLAPSED_KEY,
  CRM_RENTAL_FOCUS_ID_KEY,
  createInitialChatThreads,
  isPersistedCrmChatId,
  type CrmChatMessage,
  type CrmChatPropertyPayload,
} from './crm-live-chat-data';
import type { CrmChatId, CrmChatThread } from './crm-live-chat-rail';

type ThreadsState = Record<CrmChatId, CrmChatThread>;

type CrmLiveChatContextValue = {
  isChatCollapsed: boolean;
  setIsChatCollapsed: (v: boolean) => void;
  activeChatId: CrmChatId;
  setActiveChatId: (id: CrmChatId) => void;
  chatThreads: ThreadsState;
  setChatThreads: Dispatch<SetStateAction<ThreadsState>>;
  chatMessage: string;
  setChatMessage: (v: string) => void;
  voicePlaying: boolean;
  setVoicePlaying: (v: boolean) => void;
  sendTextMessage: (text: string) => void;
  sharePropertyCard: (payload: CrmChatPropertyPayload, opts?: { targetChat?: CrmChatId }) => void;
  openPropertyFromChat: (payload: CrmChatPropertyPayload) => void;
  expandChat: () => void;
  mobileChatOpen: boolean;
  openLiveChatUi: () => void;
  closeMobileChat: () => void;
};

function isMobileChatViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;
}

const CrmLiveChatContext = createContext<CrmLiveChatContextValue | null>(null);

const SELF_SENDER = 'Imani Brooks';

function readChatCollapsedFromSession(): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CRM_LIVE_CHAT_COLLAPSED_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    /* quota / private mode */
  }
  return null;
}

function persistChatCollapsedToSession(collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CRM_LIVE_CHAT_COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    /* quota / private mode */
  }
}

function readActiveChatIdFromSession(): CrmChatId | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CRM_LIVE_CHAT_ACTIVE_ID_KEY);
    if (raw && isPersistedCrmChatId(raw)) return raw;
  } catch {
    /* quota / private mode */
  }
  return null;
}

function persistActiveChatIdToSession(id: CrmChatId): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CRM_LIVE_CHAT_ACTIVE_ID_KEY, id);
  } catch {
    /* quota / private mode */
  }
}

export function CrmLiveChatProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { copy, locale } = useCrmLocale();
  const justNow = copy.propertyDetail.justNow;

  /** Lintel overview.mp4: rail fechado por padrão; usuário expande manualmente. */
  const [isChatCollapsed, setIsChatCollapsedState] = useState(true);
  const chatPrefHydratedRef = useRef(false);
  const userDismissedChatRef = useRef(false);
  const [activeChatId, setActiveChatIdState] = useState<CrmChatId>('hollis');

  const setActiveChatId = useCallback((id: CrmChatId) => {
    setActiveChatIdState(id);
    persistActiveChatIdToSession(id);
  }, []);
  const [chatThreads, setChatThreads] = useState<ThreadsState>(() => createInitialChatThreads());
  const [chatMessage, setChatMessage] = useState('');
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const setIsChatCollapsed = useCallback((collapsed: boolean) => {
    if (collapsed) {
      userDismissedChatRef.current = true;
    } else {
      userDismissedChatRef.current = false;
    }
    setIsChatCollapsedState(collapsed);
    persistChatCollapsedToSession(collapsed);
  }, []);

  const openLiveChatUi = useCallback(() => {
    userDismissedChatRef.current = false;
    setIsChatCollapsedState(false);
    persistChatCollapsedToSession(false);
    if (isMobileChatViewport()) setMobileChatOpen(true);
  }, []);

  const closeMobileChat = useCallback(() => setMobileChatOpen(false), []);

  const expandChat = openLiveChatUi;

  /** Restaura preferência do usuário após F5 (mesma aba). */
  useEffect(() => {
    if (chatPrefHydratedRef.current) return;
    chatPrefHydratedRef.current = true;
    const storedCollapsed = readChatCollapsedFromSession();
    if (storedCollapsed !== null) {
      userDismissedChatRef.current = storedCollapsed;
      setIsChatCollapsedState(storedCollapsed);
    }
    const storedThread = readActiveChatIdFromSession();
    if (storedThread !== null) {
      setActiveChatIdState(storedThread);
    }
  }, []);

  /** Query opcional `?chat=open` para demos (persiste como aberto). */
  useEffect(() => {
    if (isMobileChatViewport()) return;
    const q = router.asPath.includes('?') ? router.asPath.split('?')[1] : '';
    const chatQ = new URLSearchParams(q).get('chat');
    if (chatQ !== 'open') return;
    userDismissedChatRef.current = false;
    setIsChatCollapsedState(false);
    persistChatCollapsedToSession(false);
  }, [router.asPath]);

  const sendTextMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const newMsg: CrmChatMessage = {
        id: `msg_${Date.now()}`,
        sender: SELF_SENDER,
        time: justNow,
        type: 'text',
        text: trimmed,
        isSelf: true,
      };
      setChatThreads((prev) => ({
        ...prev,
        [activeChatId]: {
          ...prev[activeChatId],
          messages: [...prev[activeChatId].messages, newMsg],
        },
      }));
      setChatMessage('');
    },
    [activeChatId, justNow],
  );

  const openPropertyFromChat = useCallback(
    (payload: CrmChatPropertyPayload) => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(CRM_CHAT_OPEN_PROPERTY_KEY, JSON.stringify(payload));
        if (payload.kind === 'rental') {
          sessionStorage.setItem(CRM_RENTAL_FOCUS_ID_KEY, payload.id);
        }
      }
      void router.push({
        pathname: '/overview',
        query: { tab: payload.kind === 'rental' ? 'rentals' : 'sales' },
      });
    },
    [router],
  );

  const sharePropertyCard = useCallback(
    (payload: CrmChatPropertyPayload, opts?: { targetChat?: CrmChatId }) => {
      const threadId = opts?.targetChat ?? (payload.kind === 'rental' ? 'nora' : activeChatId);
      setActiveChatId(threadId);
      openLiveChatUi();

      const cardMsg: CrmChatMessage = {
        id: `prop_${Date.now()}`,
        sender: SELF_SENDER,
        time: justNow,
        type: 'property',
        isSelf: true,
        property: payload,
      };

      setChatThreads((prev) => {
        const thread = prev[threadId];
        return {
          ...prev,
          [threadId]: {
            ...thread,
            property: {
              name: payload.name,
              location: payload.subtitle,
              thumb: payload.thumb,
            },
            messages: [...thread.messages, cardMsg],
          },
        };
      });

      window.setTimeout(() => {
        setChatThreads((prev) => {
          const peer =
            threadId === 'nora'
              ? 'Nora Whitfield'
              : threadId === 'hollis'
                ? 'Spencer Hale'
                : prev[threadId].messages.find((m) => !m.isSelf)?.sender ?? 'Partner';
          const reply: CrmChatMessage = {
            id: `prop_reply_${Date.now()}`,
            sender: peer,
            time: justNow,
            type: 'text',
            text:
              locale === 'en'
                ? `Got it — I'll open ${payload.name} and review the details.`
                : `Recebi — vou abrir ${payload.name} e conferir os detalhes.`,
            isSelf: false,
          };
          return {
            ...prev,
            [threadId]: {
              ...prev[threadId],
              messages: [...prev[threadId].messages, reply],
            },
          };
        });
      }, 1400);
    },
    [activeChatId, locale, justNow, openLiveChatUi, setActiveChatId],
  );

  const value = useMemo(
    () => ({
      isChatCollapsed,
      setIsChatCollapsed,
      activeChatId,
      setActiveChatId,
      chatThreads,
      setChatThreads,
      chatMessage,
      setChatMessage,
      voicePlaying,
      setVoicePlaying,
      sendTextMessage,
      sharePropertyCard,
      openPropertyFromChat,
      expandChat,
      mobileChatOpen,
      openLiveChatUi,
      closeMobileChat,
    }),
    [
      isChatCollapsed,
      activeChatId,
      chatThreads,
      chatMessage,
      voicePlaying,
      sendTextMessage,
      sharePropertyCard,
      openPropertyFromChat,
      expandChat,
      mobileChatOpen,
      openLiveChatUi,
      closeMobileChat,
      setIsChatCollapsed,
      setActiveChatId,
    ],
  );

  return <CrmLiveChatContext.Provider value={value}>{children}</CrmLiveChatContext.Provider>;
}

export function useCrmLiveChat(): CrmLiveChatContextValue {
  const ctx = useContext(CrmLiveChatContext);
  if (!ctx) throw new Error('useCrmLiveChat requires CrmLiveChatProvider');
  return ctx;
}

export function useCrmLiveChatOptional(): CrmLiveChatContextValue | null {
  return useContext(CrmLiveChatContext);
}
