/** Tema Lintel — sincronizado entre ThemeToggle e menu de perfil (localStorage `theme`). */

/**
 * Tokens de cor RSV/Lintel (fonte única). Valores hex sem `#` para reuso em style/JS;
 * classes Tailwind em `LINTEL_TW_CLASSES` (scan do JIT).
 */
export const LINTEL_THEME_TOKENS = {
  surfaceDark: '121722',
  surfaceElevatedDark: '1d222c',
  ink: '121722',
  accentOrange: 'ff8a3d',
  accentOrangeStrong: 'f97316',
  clientAvatarTones: ['f4a582', 'ff8a3d', '2f5bea', '138a63', 'c4b5fd'] as const,
} as const;

/** Classes Tailwind pré-montadas — único lugar com hex arbitrário no CRM Deals. */
export const LINTEL_TW_CLASSES = {
  surfaceDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceDark}]`,
  surfaceElevated: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceElevatedDark}]`,
  textInk: `text-[#${LINTEL_THEME_TOKENS.ink}]`,
  bgAccentOrange: `bg-[#${LINTEL_THEME_TOKENS.accentOrange}]`,
  hoverAccentOrangeStrong: `hover:bg-[#${LINTEL_THEME_TOKENS.accentOrangeStrong}]`,
  textAccentOrangeStrong: `text-[#${LINTEL_THEME_TOKENS.accentOrangeStrong}]`,
} as const;

export function lintelClientAvatarColor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  const hex =
    LINTEL_THEME_TOKENS.clientAvatarTones[sum % LINTEL_THEME_TOKENS.clientAvatarTones.length] ??
    LINTEL_THEME_TOKENS.clientAvatarTones[0];
  return `#${hex}`;
}

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
