'use client';

import { useState } from 'react';

export type CompSetEntryView = {
  id: string;
  nome: string;
  precoNoite?: number;
  precoMin?: number;
  precoMax?: number;
  notas?: string;
  atualizadoEm?: string;
};

type Props = {
  value: CompSetEntryView[];
  isMaster: boolean;
  busy: boolean;
  onSave: (next: CompSetEntryView[]) => void;
};

const MAX = 8;

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatMoney(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return '';
  return String(n);
}

function parseMoney(raw: string): number | undefined {
  const t = raw.trim().replace(',', '.');
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100) / 100;
}

function CompSetPanelInner({ value, isMaster, busy, onSave }: Props) {
  const [draft, setDraft] = useState<CompSetEntryView[]>(value);
  const [err, setErr] = useState<string | null>(null);

  function updateRow(id: string, patch: Partial<CompSetEntryView>) {
    setDraft((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    if (draft.length >= MAX) {
      setErr(`Máximo de ${MAX} concorrentes`);
      return;
    }
    setErr(null);
    setDraft((prev) => [
      ...prev,
      {
        id: newId(),
        nome: '',
        atualizadoEm: new Date().toISOString(),
      },
    ]);
  }

  function removeRow(id: string) {
    setDraft((prev) => prev.filter((r) => r.id !== id));
  }

  function handleSave() {
    setErr(null);
    for (const row of draft) {
      if (!row.nome.trim()) {
        setErr('Informe o nome de cada concorrente');
        return;
      }
      if (row.precoNoite == null && row.precoMin == null && row.precoMax == null) {
        setErr('Informe preço por noite ou faixa (mín/máx)');
        return;
      }
      if (row.precoMin != null && row.precoMax != null && row.precoMin > row.precoMax) {
        setErr('Mínimo não pode ser maior que o máximo');
        return;
      }
    }
    onSave(
      draft.map((r) => ({
        ...r,
        nome: r.nome.trim(),
        atualizadoEm: new Date().toISOString(),
      })),
    );
  }

  const prices = draft
    .map((r) => {
      if (r.precoNoite != null) return r.precoNoite;
      if (r.precoMin != null && r.precoMax != null) return (r.precoMin + r.precoMax) / 2;
      return r.precoMin ?? r.precoMax ?? null;
    })
    .filter((n): n is number => n != null);
  const media =
    prices.length > 0
      ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
      : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Comp-set manual</h3>
      <p className="mt-1 text-xs text-slate-500">
        Referência de preços de concorrentes (digitado por você — sem scrape OTA).
      </p>

      {draft.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">Nenhum concorrente cadastrado.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {draft.map((row) => (
            <li key={row.id} className="rounded-xl border border-slate-100 p-3">
              <label className="block text-xs text-slate-600">
                Nome
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  maxLength={60}
                  disabled={!isMaster || busy}
                  value={row.nome}
                  onChange={(e) => updateRow(row.id, { nome: e.target.value })}
                />
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <label className="block text-xs text-slate-600">
                  Noite (R$)
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    disabled={!isMaster || busy}
                    value={formatMoney(row.precoNoite)}
                    onChange={(e) =>
                      updateRow(row.id, { precoNoite: parseMoney(e.target.value) })
                    }
                  />
                </label>
                <label className="block text-xs text-slate-600">
                  Mín
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    disabled={!isMaster || busy}
                    value={formatMoney(row.precoMin)}
                    onChange={(e) =>
                      updateRow(row.id, { precoMin: parseMoney(e.target.value) })
                    }
                  />
                </label>
                <label className="block text-xs text-slate-600">
                  Máx
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    disabled={!isMaster || busy}
                    value={formatMoney(row.precoMax)}
                    onChange={(e) =>
                      updateRow(row.id, { precoMax: parseMoney(e.target.value) })
                    }
                  />
                </label>
              </div>
              {isMaster ? (
                <button
                  type="button"
                  className="mt-2 text-xs text-rose-700 hover:underline disabled:opacity-40"
                  disabled={busy}
                  onClick={() => removeRow(row.id)}
                >
                  Remover
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {media != null ? (
        <p className="mt-2 text-xs text-slate-600">
          Média de referência: R$ {media.toFixed(2)}
        </p>
      ) : null}

      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}

      {isMaster ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            disabled={busy || draft.length >= MAX}
            onClick={addRow}
          >
            Adicionar
          </button>
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            disabled={busy}
            onClick={handleSave}
          >
            Salvar comp-set
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Remount when API value identity changes so draft resets. */
export function CompSetPanel(props: Props) {
  const key = props.value.map((v) => `${v.id}:${v.atualizadoEm ?? ''}`).join('|') || 'empty';
  return <CompSetPanelInner key={key} {...props} />;
}
