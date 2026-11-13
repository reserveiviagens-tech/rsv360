'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  Command,
  Flame,
  Home,
  KeyRound,
  Globe,
  Monitor,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  Tag,
  User,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  applyLintelThemeToDocument,
  type LintelTheme,
  readLintelTheme,
  writeLintelTheme,
} from './lintel-theme';
import type { LintelCreateModalId } from './lintel-create-modals';
import { getCrmCopy } from './crm-copy';
import type { CrmLocale } from './crm-locale';
import { useCrmLocaleOptional } from './crm-locale-provider';

const menuShell =
  'min-w-[220px] rounded-[22px] border border-slate-200/90 bg-white p-1.5 shadow-[0_20px_50px_rgba(15,23,42,0.12)] dark:border-slate-600/80 dark:bg-[#171b23]';

const menuItem =
  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-slate-800 transition hover:bg-slate-100/90 dark:text-slate-100 dark:hover:bg-white/5';

const menuDivider = 'my-1 border-t border-slate-100 dark:border-slate-700/80';

type ProfileDropdownProps = {
  onOpenCommandPalette?: () => void;
  onOpenCreate?: (id: LintelCreateModalId) => void;
};

export function ProfileDropdown({ onOpenCommandPalette, onOpenCreate }: ProfileDropdownProps) {
  const { user } = useAuth();
  const crmCtx = useCrmLocaleOptional();
  const copy = crmCtx?.copy ?? getCrmCopy('pt');
  const crmLocale = crmCtx?.locale ?? 'pt';
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [theme, setTheme] = useState<LintelTheme>('system');

  useEffect(() => {
    setTheme(readLintelTheme());
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreateOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const closeAll = useCallback(() => {
    setOpen(false);
    setCreateOpen(false);
  }, []);

  const openCreateModal = useCallback(
    (id: LintelCreateModalId) => {
      closeAll();
      onOpenCreate?.(id);
    },
    [closeAll, onOpenCreate],
  );

  const setThemeChoice = (next: LintelTheme) => {
    setTheme(next);
    writeLintelTheme(next);
    applyLintelThemeToDocument(next);
  };

  const handleResetDemo = () => {
    const role = user?.role;
    if (role !== 'admin' && role !== 'manager') {
      window.alert('Apenas staff pode repor dados de demonstração.');
      return;
    }
    if (
      !window.confirm(
        'Repor dados de demonstração apenas neste navegador? Não altera reservas ou dados reais no servidor.',
      )
    ) {
      return;
    }
    const preserve = new Set([
      'access_token',
      'authToken',
      'refresh_token',
      'refreshToken',
      'theme',
      'rsv360.crm.locale',
    ]);
    Object.keys(localStorage).forEach((key) => {
      if (!preserve.has(key)) localStorage.removeItem(key);
    });
    sessionStorage.clear();
    closeAll();
    window.location.reload();
  };

  const initial = (user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase();

  const setLocaleChoice = (next: CrmLocale) => {
    crmCtx?.setLocale(next);
  };

  const createItems = [
    { label: copy.createItems.listingSale, icon: Home, modal: 'listing-sale' as const },
    { label: copy.createItems.listingRental, icon: KeyRound, modal: 'listing-rental' as const },
    null,
    { label: copy.createItems.offer, icon: Tag, modal: 'offer' as const },
    { label: copy.createItems.lead, icon: Flame, modal: 'lead' as const },
    { label: copy.createItems.contact, icon: User, modal: 'contact' as const },
    { label: copy.createItems.viewing, icon: Calendar, modal: 'viewing' as const },
  ] as const;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (open) setCreateOpen(false);
        }}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-200 ring-2 ring-white transition hover:scale-105 active:scale-95 dark:ring-slate-800"
        aria-label={copy.profile.menuProfile}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {user?.name ? (
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{initial}</span>
        ) : (
          <span className="text-sm font-bold text-slate-700">{initial}</span>
        )}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-[60] mt-2 flex flex-row-reverse items-start gap-2">
          <div className={menuShell} role="menu">
            <button
              type="button"
              role="menuitem"
              className={menuItem}
              onClick={() => setCreateOpen((v) => !v)}
              aria-expanded={createOpen}
            >
              <Plus className="h-[18px] w-[18px] shrink-0 text-slate-600 dark:text-slate-300" aria-hidden />
              {copy.profile.create}
            </button>

            <button
              type="button"
              role="menuitem"
              className={menuItem}
              onClick={() => {
                onOpenCommandPalette?.();
                closeAll();
              }}
            >
              <Command className="h-[18px] w-[18px] shrink-0 text-slate-600 dark:text-slate-300" aria-hidden />
              {copy.profile.keyboardShortcuts}
            </button>

            <MenuDivider />

            <button
              type="button"
              role="menuitemradio"
              aria-checked={crmLocale === 'pt'}
              className={menuItem}
              onClick={() => setLocaleChoice('pt')}
              disabled={!crmCtx}
            >
              <Globe className="h-[18px] w-[18px] shrink-0" aria-hidden />
              {copy.profile.languagePt}
              {crmLocale === 'pt' ? <Check className="ml-auto h-4 w-4 text-[#2f5bea]" aria-hidden /> : null}
            </button>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={crmLocale === 'en'}
              className={menuItem}
              onClick={() => setLocaleChoice('en')}
              disabled={!crmCtx}
            >
              <Globe className="h-[18px] w-[18px] shrink-0" aria-hidden />
              {copy.profile.languageEn}
              {crmLocale === 'en' ? <Check className="ml-auto h-4 w-4 text-[#2f5bea]" aria-hidden /> : null}
            </button>

            <MenuDivider />

            <button
              type="button"
              role="menuitemradio"
              aria-checked={theme === 'light'}
              className={menuItem}
              onClick={() => setThemeChoice('light')}
            >
              <Sun className="h-[18px] w-[18px] shrink-0" aria-hidden />
              {copy.profile.light}
              {theme === 'light' ? <Check className="ml-auto h-4 w-4 text-[#2f5bea]" aria-hidden /> : null}
            </button>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={theme === 'dark'}
              className={menuItem}
              onClick={() => setThemeChoice('dark')}
            >
              <Moon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              {copy.profile.dark}
              {theme === 'dark' ? <Check className="ml-auto h-4 w-4 text-[#2f5bea]" aria-hidden /> : null}
            </button>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={theme === 'system'}
              className={menuItem}
              onClick={() => setThemeChoice('system')}
            >
              <Monitor className="h-[18px] w-[18px] shrink-0" aria-hidden />
              {copy.profile.matchSystem}
              {theme === 'system' ? <Check className="ml-auto h-4 w-4 text-[#2f5bea]" aria-hidden /> : null}
            </button>

            <MenuDivider />

            <button
              type="button"
              role="menuitem"
              className={`${menuItem} text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30`}
              onClick={handleResetDemo}
            >
              <RotateCcw className="h-[18px] w-[18px] shrink-0" aria-hidden />
              {copy.profile.resetDemo}
            </button>
          </div>

          {createOpen ? (
            <div className={menuShell} role="menu" aria-label={copy.profile.createMenu}>
              {createItems.map((item, index) =>
                item === null ? (
                  <div key={`div-${index}`} className={menuDivider} />
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    className={menuItem}
                    onClick={() => openCreateModal(item.modal)}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0 text-slate-600 dark:text-slate-300" aria-hidden />
                    {item.label}
                  </button>
                ),
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuDivider() {
  return <div className={menuDivider} role="separator" />;
}
