'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getCrmCopy, type CrmCopy } from './crm-copy';
import { readCrmLocale, writeCrmLocale, type CrmLocale } from './crm-locale';

type CrmLocaleContextValue = {
  locale: CrmLocale;
  setLocale: (locale: CrmLocale) => void;
  copy: CrmCopy;
};

const CrmLocaleContext = createContext<CrmLocaleContextValue | null>(null);

export function CrmLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<CrmLocale>('pt');

  useEffect(() => {
    setLocaleState(readCrmLocale());
  }, []);

  const setLocale = useCallback((next: CrmLocale) => {
    setLocaleState(next);
    writeCrmLocale(next);
  }, []);

  const copy = useMemo(() => getCrmCopy(locale), [locale]);

  const value = useMemo(() => ({ locale, setLocale, copy }), [locale, setLocale, copy]);

  return <CrmLocaleContext.Provider value={value}>{children}</CrmLocaleContext.Provider>;
}

export function useCrmLocale(): CrmLocaleContextValue {
  const ctx = useContext(CrmLocaleContext);
  if (!ctx) {
    throw new Error('useCrmLocale requires CrmLocaleProvider');
  }
  return ctx;
}

export function useCrmLocaleOptional(): CrmLocaleContextValue | null {
  return useContext(CrmLocaleContext);
}
