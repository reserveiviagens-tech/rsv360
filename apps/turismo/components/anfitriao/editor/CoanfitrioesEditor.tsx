'use client';

import { useState } from 'react';
import type { EditorMeta } from './editor-types';

export type CoanfitriaoItem = NonNullable<EditorMeta['coanfitrioes']>[number];
export type CoanfitrioesValue = NonNullable<EditorMeta['coanfitrioes']>;

export const COANFITRIOES_MAX = 10;
export const COANFITRIOES_NOME_MAX = 120;

export const COANFITRIOES_PAPEL_OPTIONS = [
  { id: 'calendario', label: 'Calendário e disponibilidade' },
  { id: 'mensagens', label: 'Mensagens com hóspedes' },
  { id: 'tudo', label: 'Tudo (calendário + mensagens)' },
] as const;

const STATUS_LABEL: Record<CoanfitriaoItem['status'], string> = {
  pendente: 'Convite pendente',
  ativo: 'Ativo',
  revogado: 'Revogado',
};

type Props = {
  value: CoanfitrioesValue;
  onChange: (next: CoanfitrioesValue) => void;
};

function newCoanfitriaoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cohost-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function papelLabel(papel: string): string {
  return COANFITRIOES_PAPEL_OPTIONS.find((p) => p.id === papel)?.label ?? papel;
}

export function summarizeCoanfitrioesClient(value: CoanfitrioesValue | undefined): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const active = value.filter((c) => c.status !== 'revogado').length;
  if (active === 0) return null;
  return active === 1 ? '1 coanfitrião' : `${active} coanfitriões`;
}

function AddCoanfitriaoForm({
  onCancel,
  onSave,
  disabled,
}: {
  onCancel: () => void;
  onSave: (item: Omit<CoanfitriaoItem, 'id' | 'status'> & { email?: string }) => void;
  disabled: boolean;
}) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState<CoanfitriaoItem['papel']>('tudo');

  const canSave = nome.trim().length > 0 && !disabled;

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
        onClick={onCancel}
      >
        ← Voltar
      </button>
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Adicionar coanfitrião</h2>
        <p className="mt-1 text-sm text-slate-500">
          Convite por e-mail com nível de permissão (SMS na fase 2)
        </p>
      </div>
      <label className="block text-sm">
        Nome
        <input
          type="text"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          value={nome}
          maxLength={COANFITRIOES_NOME_MAX}
          onChange={(e) => setNome(e.target.value.slice(0, COANFITRIOES_NOME_MAX))}
          aria-label="Nome do coanfitrião"
          placeholder="Nome completo"
        />
      </label>
      <label className="block text-sm">
        E-mail <span className="text-slate-400">(opcional)</span>
        <input
          type="email"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="E-mail do coanfitrião"
          placeholder="cohost@test.local"
        />
      </label>
      <label className="block text-sm">
        Permissão
        <select
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          value={papel}
          onChange={(e) => setPapel(e.target.value as CoanfitriaoItem['papel'])}
          aria-label="Papel do coanfitrião"
        >
          {COANFITRIOES_PAPEL_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!canSave}
          className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          onClick={() => {
            const trimmedEmail = email.trim();
            onSave({
              nome: nome.trim(),
              ...(trimmedEmail ? { email: trimmedEmail } : {}),
              papel,
            });
          }}
        >
          Adicionar
        </button>
      </div>
    </div>
  );
}

export function CoanfitrioesEditor({ value, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const list = Array.isArray(value) ? value : [];
  const atMax = list.length >= COANFITRIOES_MAX;

  if (adding) {
    return (
      <AddCoanfitriaoForm
        disabled={atMax}
        onCancel={() => setAdding(false)}
        onSave={(draft) => {
          onChange([
            ...list,
            {
              id: newCoanfitriaoId(),
              nome: draft.nome,
              ...(draft.email ? { email: draft.email } : {}),
              papel: draft.papel,
              status: 'pendente',
            },
          ]);
          setAdding(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Coanfitriões</h2>
        <p className="mt-1 text-sm text-slate-500">
          Pessoas de confiança que ajudam a gerenciar calendário e mensagens
        </p>
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Nenhum coanfitrião adicionado. Convites completos com RBAC chegam na fase 2.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {list.map((item) => (
            <li key={item.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      item.status === 'revogado' ? 'text-slate-400 line-through' : 'text-slate-900'
                    }`}
                  >
                    {item.nome}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{papelLabel(item.papel)}</p>
                  {item.email ? (
                    <p className="mt-0.5 truncate text-xs text-slate-600">{item.email}</p>
                  ) : null}
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {STATUS_LABEL[item.status]}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {item.status !== 'revogado' ? (
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() =>
                        onChange(
                          list.map((c) =>
                            c.id === item.id ? { ...c, status: 'revogado' as const } : c,
                          ),
                        )
                      }
                    >
                      Revogar
                    </button>
                  ) : null}
                  {item.status === 'pendente' || item.status === 'revogado' ? (
                    <button
                      type="button"
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      onClick={() => onChange(list.filter((c) => c.id !== item.id))}
                    >
                      Remover
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={atMax}
        className="w-full rounded-xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => setAdding(true)}
      >
        {atMax ? `Máximo de ${COANFITRIOES_MAX} coanfitriões` : '+ Adicionar coanfitrião'}
      </button>
    </div>
  );
}
