'use client';

import { useState } from 'react';

const CONJUNTO_COR_TOKENS = ['slate', 'amber', 'emerald', 'sky', 'rose'] as const;
type ConjuntoCorToken = (typeof CONJUNTO_COR_TOKENS)[number];
const CONJUNTO_COR_HEX: Record<ConjuntoCorToken, string> = {
  slate: '#64748b',
  amber: '#f59e0b',
  emerald: '#10b981',
  sky: '#0ea5e9',
  rose: '#f43f5e',
};

export type ConjuntoRegrasView = {
  id: string;
  nome: string;
  cor: string;
  precoPorNoite?: number;
  ajustePct?: number;
  minNoites?: number;
  maxNoites?: number;
  checkinDiasBloqueados?: number[];
};

type Props = {
  conjuntos: ConjuntoRegrasView[];
  isMaster: boolean;
  busy: boolean;
  smartPricingAtivo: boolean;
  applyRange: { de: string; ate: string } | null;
  onBack: () => void;
  onSave: (next: ConjuntoRegrasView[]) => Promise<void>;
  onApply: (conjuntoId: string, de: string, ate: string) => Promise<void>;
};

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function corHex(cor: string): string {
  const t = cor.trim().toLowerCase();
  if ((CONJUNTO_COR_TOKENS as readonly string[]).includes(t)) {
    return CONJUNTO_COR_HEX[t as ConjuntoCorToken];
  }
  return cor.startsWith('#') ? cor : `#${cor}`;
}

function emptyDraft(): Omit<ConjuntoRegrasView, 'id'> {
  return {
    nome: '',
    cor: 'slate',
    precoPorNoite: undefined,
    ajustePct: undefined,
    minNoites: undefined,
    maxNoites: undefined,
    checkinDiasBloqueados: [],
  };
}

export function ConjuntosRegrasPanel({
  conjuntos,
  isMaster,
  busy,
  smartPricingAtivo,
  applyRange,
  onBack,
  onSave,
  onApply,
}: Props) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [applyId, setApplyId] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  function startCreate() {
    setEditingId('new');
    setDraft(emptyDraft());
    setLocalError(null);
  }

  function startEdit(c: ConjuntoRegrasView) {
    setEditingId(c.id);
    setDraft({
      nome: c.nome,
      cor: c.cor,
      precoPorNoite: c.precoPorNoite,
      ajustePct: c.ajustePct,
      minNoites: c.minNoites,
      maxNoites: c.maxNoites,
      checkinDiasBloqueados: c.checkinDiasBloqueados ?? [],
    });
    setLocalError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(emptyDraft());
    setLocalError(null);
  }

  async function commitSave() {
    if (!isMaster) return;
    const nome = draft.nome.trim();
    if (!nome) {
      setLocalError('Informe um nome para o conjunto');
      return;
    }
    const item: ConjuntoRegrasView = {
      id:
        editingId === 'new'
          ? crypto.randomUUID()
          : (editingId as string),
      nome: nome.slice(0, 60),
      cor: draft.cor,
      ...(draft.precoPorNoite != null && draft.precoPorNoite !== ('' as unknown as number)
        ? { precoPorNoite: Number(draft.precoPorNoite) }
        : {}),
      ...(draft.ajustePct != null && draft.ajustePct !== ('' as unknown as number)
        ? { ajustePct: Number(draft.ajustePct) }
        : {}),
      ...(draft.minNoites != null ? { minNoites: Number(draft.minNoites) } : {}),
      ...(draft.maxNoites != null ? { maxNoites: Number(draft.maxNoites) } : {}),
      ...(draft.checkinDiasBloqueados?.length
        ? { checkinDiasBloqueados: [...draft.checkinDiasBloqueados].sort((a, b) => a - b) }
        : {}),
    };

    let next: ConjuntoRegrasView[];
    if (editingId === 'new') {
      if (conjuntos.length >= 20) {
        setLocalError('Máximo 20 conjuntos');
        return;
      }
      next = [...conjuntos, item];
    } else {
      next = conjuntos.map((c) => (c.id === editingId ? item : c));
    }

    await onSave(next);
    cancelEdit();
  }

  async function remove(id: string) {
    if (!isMaster) return;
    if (typeof window !== 'undefined' && !window.confirm('Excluir este conjunto de regras?')) {
      return;
    }
    await onSave(conjuntos.filter((c) => c.id !== id));
    if (applyId === id) setApplyId('');
  }

  async function handleApply() {
    if (!applyRange || !applyId) {
      setLocalError('Selecione noites no calendário e um conjunto para aplicar');
      return;
    }
    setLocalError(null);
    await onApply(applyId, applyRange.de, applyRange.ate);
  }

  function toggleCheckinDia(d: number) {
    setDraft((prev) => {
      const cur = prev.checkinDiasBloqueados ?? [];
      const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d];
      return { ...prev, checkinDiasBloqueados: next };
    });
  }

  if (editingId != null) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-sm text-slate-600 underline"
            onClick={cancelEdit}
            disabled={busy}
          >
            Voltar
          </button>
          <h3 className="text-base font-semibold text-slate-900">
            {editingId === 'new' ? 'Novo conjunto' : 'Editar conjunto'}
          </h3>
        </div>

        <label className="block text-sm font-medium text-slate-800">
          Nome
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={draft.nome}
            maxLength={60}
            disabled={!isMaster || busy}
            onChange={(e) => setDraft((p) => ({ ...p, nome: e.target.value }))}
            placeholder="Ex.: Alta temporada"
          />
        </label>

        <div>
          <p className="text-sm font-medium text-slate-800">Cor</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CONJUNTO_COR_TOKENS.map((token) => (
              <button
                key={token}
                type="button"
                disabled={!isMaster || busy}
                aria-label={token}
                className={`h-8 w-8 rounded-full border-2 ${
                  draft.cor === token ? 'border-slate-900' : 'border-transparent'
                }`}
                style={{ backgroundColor: CONJUNTO_COR_HEX[token] }}
                onClick={() => setDraft((p) => ({ ...p, cor: token }))}
              />
            ))}
          </div>
        </div>

        <label className="block text-sm font-medium text-slate-800">
          Preço por noite (opcional — tem prioridade sobre %)
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            inputMode="decimal"
            disabled={!isMaster || busy}
            value={draft.precoPorNoite ?? ''}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                precoPorNoite: e.target.value === '' ? undefined : Number(e.target.value),
              }))
            }
            placeholder="Ex.: 350"
          />
        </label>

        <label className="block text-sm font-medium text-slate-800">
          Ajuste % (opcional, -50 a 50)
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            inputMode="decimal"
            disabled={!isMaster || busy}
            value={draft.ajustePct ?? ''}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                ajustePct: e.target.value === '' ? undefined : Number(e.target.value),
              }))
            }
            placeholder="Ex.: 15"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm font-medium text-slate-800">
            Mín. noites
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              inputMode="numeric"
              disabled={!isMaster || busy}
              value={draft.minNoites ?? ''}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  minNoites: e.target.value === '' ? undefined : Number(e.target.value),
                }))
              }
            />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Máx. noites
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              inputMode="numeric"
              disabled={!isMaster || busy}
              value={draft.maxNoites ?? ''}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  maxNoites: e.target.value === '' ? undefined : Number(e.target.value),
                }))
              }
            />
          </label>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-800">Bloquear check-in (opcional)</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {WEEKDAY_LABELS.map((label, i) => {
              const on = draft.checkinDiasBloqueados?.includes(i);
              return (
                <button
                  key={label}
                  type="button"
                  disabled={!isMaster || busy}
                  className={`rounded-lg px-2 py-1 text-xs font-medium ${
                    on ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                  onClick={() => toggleCheckinDia(i)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {localError && <p className="text-sm text-red-600">{localError}</p>}

        {isMaster && (
          <button
            type="button"
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white disabled:opacity-50"
            disabled={busy}
            onClick={() => void commitSave()}
          >
            Salvar conjunto
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="text-sm text-slate-600 underline"
          onClick={onBack}
          disabled={busy}
        >
          Voltar
        </button>
        {isMaster && (
          <button
            type="button"
            className="text-sm font-semibold text-slate-900 underline"
            disabled={busy || conjuntos.length >= 20}
            onClick={startCreate}
          >
            + Novo
          </button>
        )}
      </div>

      <p className="text-sm text-slate-500">
        Presets de preço e disponibilidade salvos no anúncio. Ao aplicar, o preço fixo tem
        prioridade sobre o ajuste percentual.
      </p>

      {smartPricingAtivo && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Preço Inteligente ativo: regras de preço do conjunto não serão aplicadas ao calendário
          (bloqueios de check-in ainda podem ser aplicados).
        </p>
      )}

      {conjuntos.length === 0 ? (
        <p className="text-sm text-slate-600">Nenhum conjunto criado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {conjuntos.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: corHex(c.cor) }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{c.nome}</p>
                <p className="truncate text-xs text-slate-500">
                  {c.precoPorNoite != null
                    ? `R$ ${c.precoPorNoite}/noite`
                    : c.ajustePct != null
                      ? `${c.ajustePct > 0 ? '+' : ''}${c.ajustePct}%`
                      : 'Sem regra de preço'}
                  {c.checkinDiasBloqueados?.length
                    ? ` · ${c.checkinDiasBloqueados.length} dia(s) check-in bloq.`
                    : ''}
                </p>
              </div>
              {isMaster && (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="text-xs font-medium text-slate-700 underline"
                    disabled={busy}
                    onClick={() => startEdit(c)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="text-xs font-medium text-red-700 underline"
                    disabled={busy}
                    onClick={() => void remove(c.id)}
                  >
                    Excluir
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {conjuntos.length > 0 && isMaster && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-900">Aplicar ao calendário</p>
          {applyRange ? (
            <p className="text-xs text-slate-600">
              Intervalo: {applyRange.de} → {applyRange.ate}
            </p>
          ) : (
            <p className="text-xs text-amber-800">
              Selecione noites no calendário (modo seleção múltipla) para definir o intervalo.
            </p>
          )}
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={applyId}
            disabled={busy}
            onChange={(e) => setApplyId(e.target.value)}
          >
            <option value="">Escolha um conjunto…</option>
            {conjuntos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            disabled={busy || !applyRange || !applyId}
            onClick={() => void handleApply()}
          >
            Aplicar conjunto
          </button>
        </div>
      )}

      {localError && <p className="text-sm text-red-600">{localError}</p>}
    </div>
  );
}
