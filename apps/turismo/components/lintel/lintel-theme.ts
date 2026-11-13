/** Tema Lintel — sincronizado entre ThemeToggle e menu de perfil (localStorage `theme`). */

/**
 * Tokens de cor RSV/Lintel (fonte única). Valores hex sem `#` para reuso em style/JS;
 * classes Tailwind em `LINTEL_TW_CLASSES` (scan do JIT).
 */
export const LINTEL_THEME_TOKENS = {
  surfaceDark: '121722',
  surfaceElevatedDark: '1d222c',
  surfaceColumnDark: '171b23',
  ink: '121722',
  accentOrange: 'ff8a3d',
  accentOrangeStrong: 'f97316',
  accentOrangeDeep: 'c45c12',
  accentBlue: '2f5bea',
  accentGreen: '138a63',
  accentChartBlue: '2563eb',
  accentTitleBlue: '3563e9',
  favorite: 'ff4d6d',
  surfaceMutedLight: 'f8f9fb',
  borderSlack: 'e2e8f0',
  borderHeader: 'f1f5f9',
  chartTrackLight: 'f1f3f6',
  chartBarApricot: 'f38b4a',
  brandFacebook: '1877f2',
  brandWhatsApp: '25d366',
  brandInstagramStart: 'f58529',
  brandInstagramMid: 'dd2a7b',
  brandInstagramEnd: '8134af',
  clientAvatarTones: ['f4a582', 'ff8a3d', '2f5bea', '138a63', 'c4b5fd'] as const,
} as const;

/**
 * Kanban Deals (swimlanes + agent strip) — valores espelhados em
 * `apps/turismo/styles/globals.css` como `--lintel-kanban-*` / `--lintel-deals-*`.
 */
export const LINTEL_KANBAN_THEME = {
  surfaceCard: 'ffffff',
  kanbanCanvas: 'f4f5f7',
  /** rgb components for `rgb(var(--lintel-kanban-canvas-dark-rgb) / 0.55)` */
  kanbanCanvasDarkRgb: '14 17 23',
  columnBorder: 'e2e8f0',
  columnSurfaceDark: '171b23',
  headerBorder: 'f1f5f9',
  agentStripDarkRgb: '23 27 35',
  agentPressedDarkRgb: '29 34 44',
  stageViewing: '9ca3af',
  stageOffer: LINTEL_THEME_TOKENS.accentOrangeStrong,
  stageNegotiation: '3b82f6',
  stageUnderContract: '111827',
  stageUnderContractDark: 'ffffff',
  stageClosed: '10b981',
  dropTargetRing: '2f5bea',
} as const;

export function lintelCssHex(hexWithoutHash: string): string {
  return `#${hexWithoutHash}`;
}

/** Classes Tailwind pré-montadas — único lugar com hex arbitrário no CRM Deals. */
export const LINTEL_TW_CLASSES = {
  surfaceDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceDark}]`,
  surfaceElevated: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceElevatedDark}]`,
  textInk: `text-[#${LINTEL_THEME_TOKENS.ink}]`,
  bgAccentOrange: `bg-[#${LINTEL_THEME_TOKENS.accentOrange}]`,
  hoverAccentOrangeStrong: `hover:bg-[#${LINTEL_THEME_TOKENS.accentOrangeStrong}]`,
  textAccentOrangeStrong: `text-[#${LINTEL_THEME_TOKENS.accentOrangeStrong}]`,
} as const;

/** Rentals — chips, KPIs, cards (Fatia 3a; hex só neste mapa). */
export const LINTEL_RENTALS_TW = {
  chipActive: `bg-[#${LINTEL_THEME_TOKENS.ink}] dark:bg-white dark:text-[#${LINTEL_THEME_TOKENS.ink}]`,
  chipInactiveDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceElevatedDark}]`,
  kpiBadgeBlue: `bg-[#${LINTEL_THEME_TOKENS.accentBlue}]/12 text-[#${LINTEL_THEME_TOKENS.accentBlue}]`,
  kpiBadgeOrange: `bg-[#${LINTEL_THEME_TOKENS.accentOrange}]/15 text-[#${LINTEL_THEME_TOKENS.accentOrangeDeep}]`,
  searchDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceColumnDark}]`,
  popoverDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceElevatedDark}]`,
  sortActive: `text-[#${LINTEL_THEME_TOKENS.accentBlue}]`,
  cardSurfaceDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceColumnDark}]/80`,
  skeletonDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceColumnDark}]/80`,
  statusLeased: `bg-[#${LINTEL_THEME_TOKENS.accentGreen}]`,
  statusApplication: `bg-[#${LINTEL_THEME_TOKENS.accentOrange}]`,
  statusForRent: `bg-[#${LINTEL_THEME_TOKENS.accentBlue}]`,
  favoriteActive: `border-[#${LINTEL_THEME_TOKENS.favorite}]/30 text-[#${LINTEL_THEME_TOKENS.favorite}]`,
  applicationBadge: `bg-[#${LINTEL_THEME_TOKENS.accentOrange}]/15 text-[#${LINTEL_THEME_TOKENS.accentOrangeDeep}]`,
  ghostBtnDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceElevatedDark}]/90`,
  occPanel: `bg-[#${LINTEL_THEME_TOKENS.surfaceMutedLight}]`,
  occTrack: `bg-[#${LINTEL_THEME_TOKENS.borderSlack}]`,
  occBar: `bg-[#${LINTEL_THEME_TOKENS.accentChartBlue}]`,
  unitFilled: `bg-[#${LINTEL_THEME_TOKENS.accentChartBlue}]`,
  unitEmpty: `bg-[#${LINTEL_THEME_TOKENS.borderSlack}]`,
  cardFooterBorder: `border-[#${LINTEL_THEME_TOKENS.borderHeader}]`,
  toneBlueBadge: `bg-[#${LINTEL_THEME_TOKENS.accentBlue}]/12 text-[#${LINTEL_THEME_TOKENS.accentBlue}]`,
  toneApricotBadge: `bg-[#${LINTEL_THEME_TOKENS.accentOrange}]/15 text-[#${LINTEL_THEME_TOKENS.accentOrangeDeep}]`,
  toneBluePill: `text-[#${LINTEL_THEME_TOKENS.accentBlue}] bg-[#${LINTEL_THEME_TOKENS.accentBlue}]/10`,
  toneApricotPill: `text-[#${LINTEL_THEME_TOKENS.accentOrangeDeep}] bg-[#${LINTEL_THEME_TOKENS.accentOrange}]/12`,
  eventSignTag: `bg-[#${LINTEL_THEME_TOKENS.accentBlue}]/12 text-[#${LINTEL_THEME_TOKENS.accentBlue}]`,
  eventLeaseEndTag: `bg-[#${LINTEL_THEME_TOKENS.accentOrange}]/12 text-[#${LINTEL_THEME_TOKENS.accentOrangeDeep}]`,
  toastBar: `bg-[#${LINTEL_THEME_TOKENS.ink}] dark:bg-white dark:text-[#${LINTEL_THEME_TOKENS.ink}]`,
  toastUndoOnDark: `dark:bg-[#${LINTEL_THEME_TOKENS.ink}]/10 dark:hover:bg-[#${LINTEL_THEME_TOKENS.ink}]/20`,
  signedBadge: `bg-[#${LINTEL_THEME_TOKENS.accentGreen}]/12 text-[#${LINTEL_THEME_TOKENS.accentGreen}]`,
  actionApricotIcon: `border-[#${LINTEL_THEME_TOKENS.accentOrange}]/35 bg-[#${LINTEL_THEME_TOKENS.accentOrange}]/10 text-[#${LINTEL_THEME_TOKENS.accentOrangeDeep}]`,
  actionBlueIcon: `border-[#${LINTEL_THEME_TOKENS.accentBlue}]/40 bg-[#${LINTEL_THEME_TOKENS.accentBlue}]/10 text-[#${LINTEL_THEME_TOKENS.accentBlue}]`,
  panelSolidDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceColumnDark}]`,
  skeletonMutedDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceColumnDark}]/40`,
  endingBadge: `bg-[#${LINTEL_THEME_TOKENS.accentOrange}]/15 text-[#${LINTEL_THEME_TOKENS.accentOrangeDeep}]`,
  textAccentDeep: `text-[#${LINTEL_THEME_TOKENS.accentOrangeDeep}]`,
  chartTrack: `bg-[#${LINTEL_THEME_TOKENS.chartTrackLight}]`,
  chartBarTitleBlue: `bg-[#${LINTEL_THEME_TOKENS.accentTitleBlue}]`,
  chartBarApricot: `bg-[#${LINTEL_THEME_TOKENS.chartBarApricot}]`,
  chartBarAccentBlue: `bg-[#${LINTEL_THEME_TOKENS.accentBlue}]`,
  chartBarAccentOrange: `bg-[#${LINTEL_THEME_TOKENS.accentOrange}]`,
  legacyChipDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceElevatedDark}]`,
} as const;

/** Sales — chips, título, listagem/cards (Fatia 3b; hex só neste mapa). */
export const LINTEL_SALES_TW = {
  chipActive: `bg-[#${LINTEL_THEME_TOKENS.ink}] dark:bg-white dark:text-[#${LINTEL_THEME_TOKENS.ink}]`,
  chipInactiveDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceElevatedDark}]`,
  pageTitleAccent: `text-[#${LINTEL_THEME_TOKENS.accentTitleBlue}]`,
  searchDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceColumnDark}]`,
  statusActive: `bg-[#${LINTEL_THEME_TOKENS.accentChartBlue}]`,
  statusOffer: `bg-[#${LINTEL_THEME_TOKENS.accentOrangeStrong}]`,
  cardSurfaceDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceColumnDark}]/80`,
  tableSurfaceDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceColumnDark}]/80`,
  favoriteActive: `border-[#${LINTEL_THEME_TOKENS.favorite}]/30 text-[#${LINTEL_THEME_TOKENS.favorite}]`,
  cardFooterBorder: `border-[#${LINTEL_THEME_TOKENS.borderHeader}]`,
  toolbarMenuDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceColumnDark}]`,
  toolbarChipDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceElevatedDark}]`,
  mapSurfaceDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceColumnDark}]`,
  skeletonMutedDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceColumnDark}]/40`,
  sharePanelDark: `dark:bg-[#${LINTEL_THEME_TOKENS.surfaceElevatedDark}]/95`,
  shareFacebook: `bg-[#${LINTEL_THEME_TOKENS.brandFacebook}] focus-visible:ring-[#${LINTEL_THEME_TOKENS.brandFacebook}]`,
  shareWhatsApp: `bg-[#${LINTEL_THEME_TOKENS.brandWhatsApp}] focus-visible:ring-[#${LINTEL_THEME_TOKENS.brandWhatsApp}]`,
  shareInstagram: `bg-gradient-to-br from-[#${LINTEL_THEME_TOKENS.brandInstagramStart}] via-[#${LINTEL_THEME_TOKENS.brandInstagramMid}] to-[#${LINTEL_THEME_TOKENS.brandInstagramEnd}] focus-visible:ring-[#${LINTEL_THEME_TOKENS.brandInstagramMid}]`,
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
