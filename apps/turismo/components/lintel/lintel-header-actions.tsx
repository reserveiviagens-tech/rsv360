'use client';

import { Command } from 'lucide-react';
import { lintelIconBtn } from './overview-primitives';
import { SearchBar } from './search-bar';
import { NotificationBell } from './notification-bell';
import { ThemeToggle } from './theme-toggle';
import { ProfileDropdown } from './profile-dropdown';

export type LintelHeaderActionsProps = {
  onDarkModeChange?: (isDark: boolean) => void;
  onOpenCommandPalette?: () => void;
};

export function LintelHeaderActions({
  onDarkModeChange,
  onOpenCommandPalette,
}: LintelHeaderActionsProps) {
  return (
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
      <ProfileDropdown />
    </div>
  );
}
