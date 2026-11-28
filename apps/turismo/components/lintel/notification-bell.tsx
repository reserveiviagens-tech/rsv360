'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle, Clock, X } from 'lucide-react';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'success',
    title: 'Negócio fechado',
    message: 'Casa Alva foi vendida com sucesso.',
    timestamp: 'há 5 min',
    read: false,
  },
  {
    id: 'n2',
    type: 'info',
    title: 'Novo lead',
    message: '4 leads novos nas últimas 24h.',
    timestamp: 'há 15 min',
    read: false,
  },
  {
    id: 'n3',
    type: 'warning',
    title: 'Contrato próximo vencimento',
    message: '3 contratos vencendo em 30 dias.',
    timestamp: 'há 1 hora',
    read: false,
  },
];

function TypeIcon({ type }: { type: NotificationType }) {
  if (type === 'success') return <CheckCircle className="h-4 w-4" />;
  if (type === 'warning') return <AlertTriangle className="h-4 w-4" />;
  if (type === 'error') return <X className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [unreadCount, setUnreadCount] = useState(
    () => MOCK_NOTIFICATIONS.filter((n) => !n.read).length,
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id && !n.read) {
          setUnreadCount((c) => Math.max(0, c - 1));
          return { ...n, read: true };
        }
        return n;
      }),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl border border-slate-200 p-2 transition-all hover:scale-110 hover:bg-slate-100 active:scale-95 dark:border-slate-600 dark:hover:bg-slate-700"
        aria-label={`Notificações: ${unreadCount} não lidas`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff8a3d] text-[10px] font-black text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-[#121722]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Bell className="h-4 w-4" />
              Notificações
            </h3>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs font-medium text-[#138a63] hover:underline"
              >
                Marcar todas como lidas
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Nenhuma notificação</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-slate-100 px-4 py-3 transition-all hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50 ${
                    !n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800">
                      <TypeIcon type={n.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{n.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{n.timestamp}</p>
                    </div>
                    {!n.read ? (
                      <button
                        type="button"
                        onClick={() => markAsRead(n.id)}
                        className="text-slate-400 transition hover:text-slate-600"
                        aria-label="Marcar como lida"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
