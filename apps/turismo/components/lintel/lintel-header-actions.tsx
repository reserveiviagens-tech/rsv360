'use client';

import React, { useCallback, useState } from 'react';
import { Command } from 'lucide-react';
import { lintelIconBtn } from './overview-primitives';
import { SearchBar } from './search-bar';
import { NotificationBell } from './notification-bell';
import { ThemeToggle } from './theme-toggle';
import { ProfileDropdown } from './profile-dropdown';
import { LintelCreateModalHost, type LintelCreateModalId } from './lintel-create-modals';
import { useLintelCreateOptional } from './lintel-create-provider';

export type LintelHeaderActionsProps = {
  onDarkModeChange?: (isDark: boolean) => void;
  onOpenCommandPalette?: () => void;
};

export const LintelHeaderActions = React.memo(function LintelHeaderActions({
  onDarkModeChange,
  onOpenCommandPalette,
}: LintelHeaderActionsProps) {
  const createCtx = useLintelCreateOptional();
  const [fallbackModal, setFallbackModal] = useState<LintelCreateModalId | null>(null);
  const openCreate = useCallback(
    (id: LintelCreateModalId) => {
      if (createCtx) createCtx.openCreate(id);
      else setFallbackModal(id);
    },
    [createCtx],
  );

  return (
    <>
    <div className="flex items-center gap-2">
      <div className="hidden w-44 lg:block xl:w-52">
        <SearchBar />
      </div>
      {onOpenCommandPalette ? (
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className={`h-10 w-10 ${lintelIconBtn}`}
          title="Command palette (⌘K)"
          aria-label="Abrir command palette"
        >
          <Command className="h-4 w-4" />
        </button>
      ) : null}
      <NotificationBell />
      <ThemeToggle onResolvedThemeChange={onDarkModeChange} />
      <ProfileDropdown onOpenCommandPalette={onOpenCommandPalette} onOpenCreate={openCreate} />
    </div>
    {!createCtx ? (
      <LintelCreateModalHost modal={fallbackModal} onClose={() => setFallbackModal(null)} />
    ) : null}
    </>
  );
});
