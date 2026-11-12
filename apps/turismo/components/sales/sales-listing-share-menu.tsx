'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Facebook, Instagram, Link2, Mail } from 'lucide-react';
import { useCrmLocale } from '../lintel/crm-locale-provider';
import type { SalesListing } from './sales-data';
import { openSalesListingShare, type SalesShareChannel } from './sales-listing-share';

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.04-.1z" />
    </svg>
  );
}

const channelBtn =
  'flex h-9 w-9 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

export function SalesListingShareMenu({
  item,
  open,
  onClose,
  onCopied,
}: {
  item: SalesListing;
  open: boolean;
  onClose: () => void;
  onCopied?: () => void;
}) {
  const { copy } = useCrmLocale();
  const sm = copy.salesModule;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const run = useCallback(
    (channel: SalesShareChannel) => {
      const result = openSalesListingShare(channel, item, {
        emailSubject: sm.shareEmailSubject,
        copyPrompt: sm.shareCopyForPaste,
      });
      if (result === 'copied') onCopied?.();
      if (channel !== 'instagram' && channel !== 'tiktok') onClose();
    },
    [item, sm.shareCopyForPaste, sm.shareEmailSubject, onClose, onCopied],
  );

  if (!open) return null;

  const channels: {
    id: SalesShareChannel;
    label: string;
    className: string;
    icon: ReactNode;
  }[] = [
    {
      id: 'facebook',
      label: sm.shareFacebook,
      className: 'bg-[#1877f2] focus-visible:ring-[#1877f2]',
      icon: <Facebook className="h-4 w-4" strokeWidth={2.2} />,
    },
    {
      id: 'whatsapp',
      label: sm.shareWhatsApp,
      className: 'bg-[#25d366] focus-visible:ring-[#25d366]',
      icon: <WhatsAppGlyph className="h-4 w-4" />,
    },
    {
      id: 'instagram',
      label: sm.shareInstagram,
      className: 'bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] focus-visible:ring-[#dd2a7b]',
      icon: <Instagram className="h-4 w-4" strokeWidth={2.2} />,
    },
    {
      id: 'tiktok',
      label: sm.shareTikTok,
      className: 'bg-slate-900 focus-visible:ring-slate-900 dark:bg-white dark:text-slate-900',
      icon: <TikTokGlyph className="h-4 w-4" />,
    },
    {
      id: 'email',
      label: sm.shareEmail,
      className: 'bg-slate-600 focus-visible:ring-slate-500',
      icon: <Mail className="h-4 w-4" strokeWidth={2.2} />,
    },
  ];

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={sm.sharePanelAria}
      className="lintel-sales-share-enter absolute bottom-full left-1/2 z-[40] mb-2 w-max max-w-[calc(100%+1rem)] -translate-x-1/2 rounded-2xl border border-white/90 bg-white/95 p-2.5 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-[#1d222c]/95"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center gap-2 px-0.5">
        <Link2 className="h-3 w-3 text-slate-400" aria-hidden />
        <span className="truncate text-[9px] font-semibold text-slate-500">{item.name}</span>
      </div>
      <div className="flex items-center justify-center gap-2">
        {channels.map((ch) => (
          <button
            key={ch.id}
            type="button"
            className={`${channelBtn} ${ch.className}`}
            aria-label={ch.label}
            title={ch.label}
            onClick={() => run(ch.id)}
          >
            {ch.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
