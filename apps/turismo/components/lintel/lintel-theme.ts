/** Tema Lintel — sincronizado entre ThemeToggle e menu de perfil (localStorage `theme`). */

export type LintelTheme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';

export function readLintelTheme(): LintelTheme {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY) as LintelTheme | null;
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

export function writeLintelTheme(theme: LintelTheme): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, theme);
  applyLintelThemeToDocument(theme);
}

export function resolveIsDark(theme: LintelTheme): boolean {
  if (typeof window === 'undefined') return false;
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyLintelThemeToDocument(theme: LintelTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolveIsDark(theme));
}
