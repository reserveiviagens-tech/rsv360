'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

type MgmTrackerProps = {
  /** Capability pública já resolvida pela página — não inferir por formato. */
  publicToken?: string;
};

function parsePositiveIntRef(raw: string | null): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

/**
 * Tracking MGM silencioso. Idempotência persistente = backend.
 * useRef evita POST duplicado na mesma montagem (não em refresh/nova aba).
 */
export function MgmTracker({ publicToken }: MgmTrackerProps) {
  const searchParams = useSearchParams();
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;

    const token = publicToken?.trim();
    if (!token) return;

    const indicadorId = parsePositiveIntRef(searchParams.get('ref'));
    if (indicadorId == null) return;

    const canalRaw = searchParams.get('canal');
    const canal =
      typeof canalRaw === 'string' && canalRaw.trim()
        ? canalRaw.trim().slice(0, 64)
        : undefined;

    sentRef.current = true;

    const body: { indicadorId: number; canal?: string } = { indicadorId };
    if (canal) body.canal = canal;

    void fetch(`/api/cotacao/proposta/${encodeURIComponent(token)}/indicacao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => undefined);
  }, [publicToken, searchParams]);

  return null;
}
