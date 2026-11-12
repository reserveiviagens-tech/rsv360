/** Idioma do módulo CRM parceiro (UI Lintel-style, marca RSV 360). */

export type CrmLocale = 'pt' | 'en';

export const CRM_LOCALE_STORAGE_KEY = 'rsv360.crm.locale';

export const CRM_BRAND_NAME = 'RSV 360';

export function readCrmLocale(): CrmLocale {
  if (typeof window === 'undefined') return 'pt';
  const stored = localStorage.getItem(CRM_LOCALE_STORAGE_KEY);
  return stored === 'en' ? 'en' : 'pt';
}

export function writeCrmLocale(locale: CrmLocale): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CRM_LOCALE_STORAGE_KEY, locale);
  document.documentElement.lang = locale === 'pt' ? 'pt-BR' : 'en';
}
