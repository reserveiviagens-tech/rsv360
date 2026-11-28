'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { LintelCreateModalHost, type LintelCreateModalId } from './lintel-create-modals';
import type { LintelCreatePrefill } from './lintel-create-prefill';

export type LintelCreateOpenOptions = {
  prefill?: LintelCreatePrefill;
};

type LintelCreateContextValue = {
  openCreate: (id: LintelCreateModalId, options?: LintelCreateOpenOptions) => void;
};

const LintelCreateContext = createContext<LintelCreateContextValue | null>(null);

export function LintelCreateProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<LintelCreateModalId | null>(null);
  const [prefill, setPrefill] = useState<LintelCreatePrefill | null>(null);

  const openCreate = useCallback((id: LintelCreateModalId, options?: LintelCreateOpenOptions) => {
    setPrefill(options?.prefill ?? null);
    setModal(id);
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
    setPrefill(null);
  }, []);

  const value = useMemo(() => ({ openCreate }), [openCreate]);

  return (
    <LintelCreateContext.Provider value={value}>
      {children}
      <LintelCreateModalHost modal={modal} prefill={prefill} onClose={closeModal} />
    </LintelCreateContext.Provider>
  );
}

export function useLintelCreate(): LintelCreateContextValue {
  const ctx = useContext(LintelCreateContext);
  if (!ctx) {
    throw new Error('useLintelCreate requires LintelCreateProvider');
  }
  return ctx;
}

export function useLintelCreateOptional(): LintelCreateContextValue | null {
  return useContext(LintelCreateContext);
}
