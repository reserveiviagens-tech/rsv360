'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Building, FileText, LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function ProfileDropdown() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const initial = (user?.name?.charAt(0) || 'U').toUpperCase();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2f5bea] text-sm font-bold text-white transition hover:scale-105 active:scale-95"
        aria-label="Menu do perfil"
        aria-expanded={open}
      >
        {initial}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-600 dark:bg-[#121722]">
          <div className="border-b border-slate-100 px-3 py-3 dark:border-slate-700">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {user?.name || 'Usuário'}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {user?.email || 'sem email'}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#2f5bea]/10 px-2 py-0.5 text-[10px] font-bold text-[#2f5bea]">
              <Building className="h-3 w-3" />
              {user?.role || 'admin'}
            </span>
          </div>
          <nav className="py-1">
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50"
              onClick={() => setOpen(false)}
            >
              <Settings className="h-4 w-4" />
              Configurações
            </Link>
            <Link
              href="/anfitriao/perfil"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50"
              onClick={() => setOpen(false)}
            >
              <User className="h-4 w-4" />
              Meu perfil
            </Link>
            <Link
              href="/documents"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50"
              onClick={() => setOpen(false)}
            >
              <FileText className="h-4 w-4" />
              Documentos
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
