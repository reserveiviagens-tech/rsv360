'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, Mic, Paperclip, Pause, Play, Send, X } from 'lucide-react';
import { lintelIconBtn } from './overview-primitives';
import { useCrmLocale } from './crm-locale-provider';
import { useCrmLiveChat } from './crm-live-chat-provider';
import type { CrmChatMessage, CrmChatPropertyPayload } from './crm-live-chat-data';

export type CrmChatId = 'hollis' | 'ashby' | 'omar' | 'nora';

export type CrmChatThread = {
  id: string;
  name: string;
  unreadBadge: number;
  avatarImg?: string;
  avatarInitials?: string;
  property: { name: string; location: string; thumb: string };
  messages: CrmChatMessage[];
};

export function CrmLiveChatRail({
  presentation = 'sidebar',
  onCloseSheet,
}: {
  presentation?: 'sidebar' | 'sheet';
  onCloseSheet?: () => void;
}) {
  const { copy } = useCrmLocale();
  const p = copy.propertyDetail;
  const isSheet = presentation === 'sheet';
  const shellClass = isSheet
    ? 'flex h-[min(78vh,680px)] flex-col rounded-[22px] border-0 bg-transparent p-2 shadow-none'
    : 'lintel-chat-panel flex h-[calc(100vh-140px)] flex-col rounded-[26px] border border-white/80 bg-white/70 p-4 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#171b23]/80 sticky top-4';
  const chat = useCrmLiveChat();
  const {
    isChatCollapsed,
    setIsChatCollapsed,
    activeChatId,
    setActiveChatId,
    chatThreads,
    chatMessage,
    setChatMessage,
    voicePlaying,
    setVoicePlaying,
    sendTextMessage,
    openPropertyFromChat,
  } = chat;

  const active = chatThreads[activeChatId];

  if (!isSheet && isChatCollapsed) {
    return (
      <div className="lintel-chat-rail-collapsed sticky top-4 flex h-[calc(100vh-140px)] w-full flex-col items-center bg-transparent py-1">
        <button
          type="button"
          onClick={() => setIsChatCollapsed(false)}
          className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-black/[0.04] hover:text-gray-800 dark:hover:bg-white/[0.06] dark:hover:text-white"
          title={p.expandChat}
          aria-label={p.expandChat}
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-1 flex-col items-center gap-3">
          {(['hollis', 'ashby', 'omar', 'nora'] as const).map((chatKey) => {
            const th = chatThreads[chatKey];
            const isActive = activeChatId === chatKey;
            return (
              <button
                key={chatKey}
                type="button"
                onClick={() => {
                  setActiveChatId(chatKey);
                  setIsChatCollapsed(false);
                }}
                className="relative cursor-pointer transition-all hover:scale-105"
                title={th.name}
              >
                {th.avatarImg ? (
                  <div className={`h-9 w-9 overflow-hidden rounded-full p-0.5 ${isActive ? 'ring-2 ring-[#2f5bea]' : ''}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={th.avatarImg} alt="" className="h-full w-full rounded-full object-cover" />
                  </div>
                ) : (
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white ${isActive ? 'ring-2 ring-[#2f5bea]' : ''}`}
                  >
                    {th.avatarInitials}
                  </div>
                )}
                {th.unreadBadge > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff8a3d] text-[9px] font-black text-white">
                    {th.unreadBadge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <span className="my-2 h-2.5 w-2.5 animate-pulse rounded-full bg-[#138a63]" title={`23 ${p.online}`} />
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
        <div className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
          {isSheet ? (
            <span>{p.liveChat}</span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsChatCollapsed(true)}
                className="mr-0.5 rounded-lg p-1 text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
                title={p.collapseChat}
              >
                <ChevronRight className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
              {p.liveChat}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-[#138a63]/15 px-2.5 py-0.5 text-xs font-bold text-[#138a63]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#138a63]" /> 23 {p.online}
        </span>
        {isSheet && onCloseSheet ? (
          <button
            type="button"
            onClick={onCloseSheet}
            aria-label={copy.common.close}
            className={`h-8 w-8 ${lintelIconBtn}`}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto border-b border-gray-100 py-2.5 dark:border-gray-800">
        {(['hollis', 'ashby', 'omar', 'nora'] as const).map((chatKey) => {
          const th = chatThreads[chatKey];
          const isActive = activeChatId === chatKey;
          return (
            <button
              key={chatKey}
              type="button"
              onClick={() => setActiveChatId(chatKey)}
              className="group relative flex cursor-pointer flex-col items-center transition-all hover:scale-105"
            >
              <div
                className={`h-9 w-9 rounded-full p-0.5 transition-all ${
                  isActive ? 'ring-2 ring-[#2f5bea]' : 'ring-1 ring-transparent hover:ring-gray-300'
                }`}
              >
                {th.avatarImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={th.avatarImg} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                    {th.avatarInitials}
                  </div>
                )}
              </div>
              {th.unreadBadge > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff8a3d] text-[9px] font-black text-white">
                  {th.unreadBadge}
                </span>
              ) : null}
              <span
                className={`mt-1 text-[10px] font-bold transition-colors ${
                  isActive ? 'text-[#2f5bea]' : 'text-gray-500 group-hover:text-gray-800 dark:group-hover:text-gray-200'
                }`}
              >
                {th.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="py-2">
        <PropertyChip
          property={active.property}
          onClick={() =>
            openPropertyFromChat({
              id: active.id,
              name: active.property.name,
              subtitle: active.property.location,
              thumb: active.property.thumb,
              kind: active.property.location.includes('/mo') ? 'rental' : 'sale',
            })
          }
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-2 text-xs">
        {active.messages.map((msg, idx) => (
          <ChatMessageBubble
            key={msg.id ?? `m-${idx}`}
            msg={msg}
            voicePlaying={voicePlaying}
            setVoicePlaying={setVoicePlaying}
            onOpenProperty={openPropertyFromChat}
          />
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendTextMessage(chatMessage);
        }}
        className="shrink-0 border-t border-gray-100 pt-2 dark:border-gray-800"
      >
        <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white p-1 shadow-inner dark:border-gray-700 dark:bg-gray-800">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder={p.messagePlaceholder}
            className="flex-1 bg-transparent px-3 text-xs text-gray-900 outline-none dark:text-white"
          />
          <button type="button" className="rounded-full p-1.5 text-gray-400 hover:text-gray-600" aria-hidden>
            <Paperclip className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="rounded-full p-1.5 text-gray-400 hover:text-gray-600" aria-hidden>
            <Mic className="h-3.5 w-3.5" />
          </button>
          <button
            type="submit"
            className="flex items-center gap-1 rounded-full bg-[#121722] px-3 py-1.5 text-xs font-black text-white transition-all hover:brightness-110 dark:bg-white dark:text-[#121722]"
          >
            <Send className="h-3 w-3" />
            {p.send}
          </button>
        </div>
      </form>
    </div>
  );
}

function PropertyChip({
  onClick,
  property,
}: {
  onClick: () => void;
  property: CrmChatThread['property'];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-gray-200/60 bg-white/80 p-2 text-left text-xs transition-all hover:bg-gray-50 dark:border-gray-700/60 dark:bg-gray-800/80 dark:hover:bg-gray-750"
    >
      <span className="flex min-w-0 items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={property.thumb} alt="" className="h-8 w-10 shrink-0 rounded-lg object-cover" />
        <span className="min-w-0">
          <b className="block truncate leading-tight text-gray-900 dark:text-white">{property.name}</b>
          <span className="text-[11px] text-gray-400">{property.location}</span>
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
    </button>
  );
}

function ChatMessageBubble({
  msg,
  voicePlaying,
  setVoicePlaying,
  onOpenProperty,
}: {
  msg: CrmChatMessage;
  voicePlaying: boolean;
  setVoicePlaying: (v: boolean) => void;
  onOpenProperty: (p: CrmChatPropertyPayload) => void;
}) {
  const reactions = msg.reactions;

  if (msg.type === 'audio') {
    return (
      <div className="lintel-chat-msg-enter flex max-w-[85%] flex-col items-start">
        <MessageMeta msg={msg} />
        <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-xs border border-gray-200/60 bg-white p-2.5 shadow-xs dark:border-gray-700/60 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setVoicePlaying(!voicePlaying)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2f5bea] text-white"
          >
            {voicePlaying ? <Pause className="h-3 w-3" /> : <Play className="ml-0.5 h-3 w-3" />}
          </button>
          <div className="h-1 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-full rounded-full bg-[#2f5bea] ${voicePlaying ? 'w-2/3 animate-pulse' : 'w-1/3'}`}
            />
          </div>
          <span className="text-[10px] font-bold text-gray-400">{msg.audioDuration}</span>
        </div>
        <Reactions reactions={reactions} />
      </div>
    );
  }

  if (msg.type === 'photos') {
    return (
      <div className="lintel-chat-msg-enter flex max-w-[85%] flex-col items-end self-end">
        <MessageMeta msg={msg} align="end" />
        <div className="rounded-2xl rounded-tr-xs border border-gray-200/60 bg-white p-2 shadow-xs dark:border-gray-700/60 dark:bg-gray-800">
          <div className="grid w-48 grid-cols-2 gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                msg.thumb ??
                'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=300&q=80'
              }
              alt=""
              className="h-16 w-full rounded-xl object-cover"
            />
            <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-indigo-50 text-base font-black text-[#2f5bea] dark:bg-indigo-950">
              +4
            </div>
          </div>
          <span className="mt-1.5 block text-[10px] font-medium text-gray-400">{msg.photoCount}</span>
        </div>
        <Reactions reactions={reactions} />
      </div>
    );
  }

  if (msg.type === 'property') {
    const prop = msg.property;
    const extra = prop.extraPhotos ?? 4;
    return (
      <div className={`lintel-chat-msg-enter flex max-w-[90%] flex-col ${msg.isSelf ? 'items-end self-end' : 'items-start'}`}>
        <MessageMeta msg={msg} align={msg.isSelf ? 'end' : 'start'} />
        <button
          type="button"
          onClick={() => onOpenProperty(prop)}
          className="cursor-pointer rounded-2xl border border-gray-200/60 bg-white p-2 text-left shadow-xs transition-all hover:shadow-md dark:border-gray-700/60 dark:bg-gray-800"
        >
          <div className="grid w-52 grid-cols-2 gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={prop.thumb} alt="" className="col-span-1 h-20 w-full rounded-xl object-cover" />
            <div className="flex flex-col gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={prop.thumb} alt="" className="h-9 w-full rounded-lg object-cover opacity-90" />
              <div className="flex h-9 items-center justify-center rounded-lg bg-[#2f5bea]/10 text-sm font-black text-[#2f5bea]">
                +{extra}
              </div>
            </div>
          </div>
          <div className="mt-2 border-t border-gray-100 pt-2 dark:border-gray-700">
            <b className="block text-xs font-black text-gray-900 dark:text-white">{prop.name}</b>
            <span className="text-[10px] text-gray-400">{prop.subtitle}</span>
          </div>
        </button>
        <Reactions reactions={reactions} />
      </div>
    );
  }

  return (
    <div className={`lintel-chat-msg-enter flex max-w-[85%] flex-col ${msg.isSelf ? 'items-end self-end' : 'items-start'}`}>
      <MessageMeta msg={msg} align={msg.isSelf ? 'end' : 'start'} />
      <div
        className={`rounded-2xl border p-3 leading-relaxed shadow-xs ${
          msg.isSelf
            ? 'rounded-tr-xs border-transparent bg-[#121722] text-white dark:bg-white dark:text-[#121722]'
            : 'rounded-tl-xs border-gray-200/60 bg-white text-gray-800 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-200'
        }`}
      >
        {msg.text}
      </div>
      <Reactions reactions={reactions} />
    </div>
  );
}

function MessageMeta({ msg, align = 'start' }: { msg: CrmChatMessage; align?: 'start' | 'end' }) {
  return (
    <div className={`mb-1 flex items-center gap-1.5 ${align === 'end' ? 'mr-1 justify-end' : 'ml-1'}`}>
      {align === 'end' ? (
        <>
          <span className="text-[10px] text-gray-400">{msg.time}</span>
          <span className="font-bold text-gray-800 dark:text-gray-200">{msg.sender}</span>
        </>
      ) : (
        <>
          <span className="font-bold text-gray-800 dark:text-gray-200">{msg.sender}</span>
          <span className="text-[10px] text-gray-400">{msg.time}</span>
        </>
      )}
    </div>
  );
}

function Reactions({ reactions }: { reactions?: string[] }) {
  if (!reactions?.length) return null;
  return (
    <div className="mt-1 flex gap-1">
      {reactions.map((r, ri) => (
        <span
          key={ri}
          className="rounded-full border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] dark:border-gray-700 dark:bg-gray-800"
        >
          {r}
        </span>
      ))}
    </div>
  );
}
