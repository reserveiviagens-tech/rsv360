/**
 * RSV360 Onda 4 — design tokens (F-019).
 * Constants only; does not override apps/site-publico shadcn --primary.
 */

export const rsvColors = {
  midnight: '#0F172A',
  amber: '#D97706',
  amberBright: '#F59E0B',
  action: '#16A34A',
  canvas: '#F8FAFC',
  textPrimary: '#111827',
  textMuted: '#4B5563',
} as const;

export type RsvColorToken = keyof typeof rsvColors;

export const rsvLayout = {
  containerMaxPx: 1360,
  containerMaxClass: 'max-w-7xl',
  containerPaddingClasses: 'px-4 sm:px-6 lg:px-8',
} as const;

/** Minimum touch target (WCAG / mobile ingressos steppers). */
export const rsvTouchTargetPx = 44 as const;

/** Fluid type scale for hero titles and price emphasis (does not change site font-family). */
export const rsvTypography = {
  fluidTitle: 'clamp(1.5rem, 1.1rem + 1.75vw, 2.25rem)',
  fluidPrice: 'clamp(1.25rem, 1rem + 1.25vw, 1.875rem)',
} as const;

/**
 * Named z-index scale for Onda 4 overlays (not applied to existing site-publico z-40/z-50).
 */
export const rsvZIndex = {
  base: 10,
  header: 100,
  dropdown: 200,
  modal: 500,
  cartBar: 1100,
} as const;

/** CaldasAI offset above CartStickyBar when cart has items (mobile). */
export const rsvAssistantCartOffsetPx = 88 as const;

export const rsvCssVarNames = {
  colorMidnight: '--rsv-color-midnight',
  colorAmber: '--rsv-color-amber',
  colorAmberBright: '--rsv-color-amber-bright',
  colorAction: '--rsv-color-action',
  colorCanvas: '--rsv-color-canvas',
  colorTextPrimary: '--rsv-color-text-primary',
  colorTextMuted: '--rsv-color-text-muted',
  containerMax: '--rsv-container-max',
  touchTarget: '--rsv-touch-target',
  zCartBar: '--rsv-z-cart-bar',
  assistantBottomOffset: '--rsv-assistant-bottom-offset',
} as const;