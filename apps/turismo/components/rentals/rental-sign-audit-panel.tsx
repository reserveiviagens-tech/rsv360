'use client';

import React, { useEffect, useState } from 'react';
import { History, Loader2, X } from 'lucide-react';
import { fetchRentalSignEvents, type RentalSignAuditEvent } from '../../src/lib/rental-contract-api';

type Props = {
  requestId: string;
  unitId: string;
  signerName: string;
  onClose: () => void;
};

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export function RentalSignAuditPanel({ requestId, unitId, signerName, onClose }: Props) {
  const [items, setItems] = useState<RentalSignAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRentalSignEvents(requestId, unitId)
      .then(setItems)
      .catch(() => setError('Não foi possível carregar o histórico'))
      .finally(() => setLoading(false));
  }, [requestId, unitId]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="rental-sign-audit-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-gray-500" aria-hidden />
            <div>
              <h2 id="rental-sign-audit-title" className="text-sm font-bold text-gray-900 dark:text-white">
                Histórico de auditoria
              </h2>
              <p className="text-[10px] text-gray-500">{signerName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <section className="max-h-[min(60vh,420px)] overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="flex items-center gap-2 text-xs text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Carregando…
            </p>
          ) : null}
          {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
          {!loading && !error && items.length === 0 ? (
            <p className="text-xs text-gray-500">Nenhum evento registrado.</p>
          ) : null}
          <ol className="space-y-3">
            {items.map((ev) => (
              <li key={ev.id} className="relative border-l-2 border-gray-200 pl-3 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{ev.label}</p>
                <p className="text-[10px] text-gray-500">{formatWhen(ev.occurredAt)}</p>
                {ev.actor ? (
                  <p className="text-[10px] text-gray-400">Ator: {ev.actor}</p>
                ) : null}
                {ev.metadata?.clientIp ? (
                  <p className="text-[10px] text-gray-400">IP: {String(ev.metadata.clientIp)}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}