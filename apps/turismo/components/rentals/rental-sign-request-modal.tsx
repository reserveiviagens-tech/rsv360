'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { lintelBtnGhost, lintelBtnPrimary } from '../lintel/overview-primitives';
import type { RentalPortfolioItem } from './rentals-data';

export type RentalSignFormValues = {
  signerName: string;
  signerEmail: string;
  signerCpf: string;
  termMonths: number;
  depositType: 'caucao' | 'fiador' | 'seguro';
  startDate: string;
};

export function RentalSignRequestModal({
  item,
  onClose,
  onSubmit,
  busy,
}: {
  item: RentalPortfolioItem;
  onClose: () => void;
  onSubmit: (values: RentalSignFormValues) => Promise<void>;
  busy?: boolean;
}) {
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerCpf, setSignerCpf] = useState('');
  const [termMonths, setTermMonths] = useState(12);
  const [depositType, setDepositType] = useState<'caucao' | 'fiador' | 'seguro'>('caucao');
  const [startDate] = useState(() => new Date().toISOString().slice(0, 10));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Enviar contrato para assinatura</p>
            <p className="text-[11px] text-gray-500">{item.name} · {item.address}</p>
          </div>
          <button type="button" onClick={onClose} className={`${lintelBtnGhost} p-1`} aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit({ signerName, signerEmail, signerCpf, termMonths, depositType, startDate });
          }}
        >
          <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300">
            Nome do locatário
            <input
              required
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800"
            />
          </label>
          <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300">
            E-mail
            <input
              required
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800"
            />
          </label>
          <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300">
            CPF
            <input
              required
              inputMode="numeric"
              value={signerCpf}
              onChange={(e) => setSignerCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300">
              Prazo (meses)
              <input
                type="number"
                min={1}
                max={60}
                value={termMonths}
                onChange={(e) => setTermMonths(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800"
              />
            </label>
            <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300">
              Garantia
              <select
                value={depositType}
                onChange={(e) => setDepositType(e.target.value as typeof depositType)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="caucao">Caução</option>
                <option value="fiador">Fiador</option>
                <option value="seguro">Seguro fiança</option>
              </select>
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" className={`${lintelBtnGhost} flex-1 text-xs`} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" disabled={busy} className={`${lintelBtnPrimary} flex-1 text-xs`}>
              {busy ? 'Enviando…' : 'Gerar link de assinatura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}