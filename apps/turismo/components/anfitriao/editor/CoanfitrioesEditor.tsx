'use client';

import { useEffect, useState } from 'react';
import { fase1Api } from '@/lib/fase1-api';
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
  unidadeId?: number;
  currentUserEmail?: string;
  onRefresh?: () => void | Promise<void>;
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

function emailsMatch(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function isInviteExpiredClient(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return false;
  return expiry.getTime() <= Date.now();
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
  saving,
  smsConfigured,
}: {
  onCancel: () => void;
  onSave: (
    item: Omit<CoanfitriaoItem, 'id' | 'status'> & { email: string; telefone?: string },
  ) => void | Promise<void>;
  disabled: boolean;
  saving?: boolean;
  smsConfigured?: boolean | null;
}) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [papel, setPapel] = useState<CoanfitriaoItem['papel']>('tudo');

  const canSave = nome.trim().length > 0 && email.trim().length > 0 && !disabled && !saving;

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
          E-mail de convite é enviado quando SMTP ou SendGrid estiver configurado. SMS opcional quando
          Twilio estiver configurado e um telefone for informado.
        </p>
        {smsConfigured === false ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            SMS indisponível neste ambiente — defina TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e
            TWILIO_PHONE_NUMBER no servidor.
          </p>
        ) : null}
        {smsConfigured === true ? (
          <p className="mt-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-900">
            Twilio configurado — SMS será enviado se informar telefone.
          </p>
        ) : null}
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
        E-mail
        <input
          type="email"
          required
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="E-mail do coanfitrião"
          placeholder="cohost@test.local"
        />
      </label>
      <label className="block text-sm">
        Telefone (opcional, SMS)
        <input
          type="tel"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          aria-label="Telefone do coanfitrião para SMS"
          placeholder="(11) 99999-9999"
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
            void onSave({
              nome: nome.trim(),
              email: email.trim(),
              telefone: telefone.trim() || undefined,
              papel,
            });
          }}
        >
          {saving ? 'Salvando…' : 'Adicionar'}
        </button>
      </div>
    </div>
  );
}

export function CoanfitrioesEditor({
  value,
  onChange,
  unidadeId,
  currentUserEmail,
  onRefresh,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);
  const [smsConfigured, setSmsConfigured] = useState<boolean | null>(null);
  const list = Array.isArray(value) ? value : [];
  const atMax = list.length >= COANFITRIOES_MAX;
  const useApi = unidadeId != null;

  useEffect(() => {
    let cancelled = false;
    void fase1Api
      .anfitriaoSmsConfigStatus()
      .then((res) => {
        if (!cancelled) setSmsConfigured(Boolean(res.data?.configured));
      })
      .catch(() => {
        if (!cancelled) setSmsConfigured(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshFromServer() {
    if (onRefresh) await onRefresh();
  }

  function formatDispatchNotice(
    emailStatus?: 'sent' | 'skipped' | 'failed',
    smsStatus?: 'sent' | 'skipped' | 'failed',
    hasPhone?: boolean,
  ): string | null {
    const parts: string[] = [];
    if (emailStatus === 'skipped') {
      parts.push('E-mail não enviado — configure SMTP ou SendGrid no servidor.');
    } else if (emailStatus === 'failed') {
      parts.push('E-mail não pôde ser enviado; o convite foi salvo.');
    }
    if (hasPhone) {
      if (smsStatus === 'sent') {
        parts.push('SMS enviado.');
      } else if (smsStatus === 'skipped') {
        parts.push('SMS não enviado — configure Twilio no servidor.');
      } else if (smsStatus === 'failed') {
        parts.push('SMS não pôde ser enviado; o convite foi salvo.');
      }
    }
    return parts.length > 0 ? parts.join(' ') : null;
  }

  async function handleInvite(
    draft: Omit<CoanfitriaoItem, 'id' | 'status'> & { email: string; telefone?: string },
  ) {
    setActionError(null);
    setDispatchNotice(null);
    if (useApi) {
      setBusy(true);
      try {
        const res = await fase1Api.anfitriaoConvidarCoanfitriao(unidadeId, draft);
        onChange(res.data as CoanfitrioesValue);
        setDispatchNotice(
          formatDispatchNotice(res.emailStatus, res.smsStatus, Boolean(draft.telefone)),
        );
        await refreshFromServer();
        setAdding(false);
      } catch (e) {
        setActionError((e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }
    onChange([
      ...list,
      {
        id: newCoanfitriaoId(),
        nome: draft.nome,
        email: draft.email,
        papel: draft.papel,
        status: 'pendente',
      },
    ]);
    setAdding(false);
  }

  async function handleResend(coId: string) {
    setActionError(null);
    setDispatchNotice(null);
    if (!useApi) return;
    setBusy(true);
    try {
      const res = await fase1Api.anfitriaoReenviarCoanfitriao(unidadeId, coId);
      onChange(res.data as CoanfitrioesValue);
      const item = list.find((c) => c.id === coId);
      const notice = formatDispatchNotice(
        res.emailStatus,
        res.smsStatus,
        Boolean(item?.telefone),
      );
      if (notice) {
        setDispatchNotice(`Convite reenviado. ${notice}`);
      } else if (res.emailStatus === 'sent') {
        setDispatchNotice('Convite reenviado por e-mail.');
      }
      await refreshFromServer();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(coId: string) {
    setActionError(null);
    if (useApi) {
      setBusy(true);
      try {
        const res = await fase1Api.anfitriaoRevogarCoanfitriao(unidadeId, coId);
        onChange(res.data as CoanfitrioesValue);
        await refreshFromServer();
      } catch (e) {
        setActionError((e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }
    onChange(list.map((c) => (c.id === coId ? { ...c, status: 'revogado' as const } : c)));
  }

  async function handleAccept(coId: string) {
    setActionError(null);
    if (!useApi) return;
    setBusy(true);
    try {
      const res = await fase1Api.anfitriaoAceitarCoanfitriao(unidadeId, coId);
      onChange(res.data as CoanfitrioesValue);
      await refreshFromServer();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(coId: string) {
    setActionError(null);
    if (useApi) {
      setBusy(true);
      try {
        const res = await fase1Api.anfitriaoRemoverCoanfitriao(unidadeId, coId);
        onChange(res.data as CoanfitrioesValue);
        await refreshFromServer();
      } catch (e) {
        setActionError((e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }
    onChange(list.filter((c) => c.id !== coId));
  }

  if (adding) {
    return (
      <AddCoanfitriaoForm
        disabled={atMax}
        saving={busy}
        smsConfigured={smsConfigured}
        onCancel={() => setAdding(false)}
        onSave={handleInvite}
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

      {actionError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      {dispatchNotice ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {dispatchNotice}
        </p>
      ) : null}

      {list.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Nenhum coanfitrião adicionado. Ao convidar, enviamos e-mail automaticamente se o servidor
          tiver SMTP ou SendGrid configurado.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {list.map((item) => {
            const expired = item.status === 'pendente' && isInviteExpiredClient(item.expiresAt);
            const canAccept =
              item.status === 'pendente' &&
              !expired &&
              currentUserEmail &&
              item.email &&
              emailsMatch(item.email, currentUserEmail);

            return (
              <li key={item.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold ${
                        item.status === 'revogado'
                          ? 'text-slate-400 line-through'
                          : 'text-slate-900'
                      }`}
                    >
                      {item.nome}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{papelLabel(item.papel)}</p>
                    {item.email ? (
                      <p className="mt-0.5 truncate text-xs text-slate-600">{item.email}</p>
                    ) : null}
                    {item.telefone ? (
                      <p className="mt-0.5 truncate text-xs text-slate-500">{item.telefone}</p>
                    ) : null}
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {STATUS_LABEL[item.status]}
                    </p>
                    {expired ? (
                      <p className="mt-1 text-xs text-slate-400">Convite expirado — reenvie para renovar</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {item.status === 'pendente' && useApi ? (
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                        onClick={() => void handleResend(item.id)}
                      >
                        {busy ? 'Enviando…' : 'Reenviar convite'}
                      </button>
                    ) : null}
                    {canAccept ? (
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-40"
                        onClick={() => void handleAccept(item.id)}
                      >
                        Aceitar convite
                      </button>
                    ) : null}
                    {item.status !== 'revogado' ? (
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                        onClick={() => void handleRevoke(item.id)}
                      >
                        Revogar
                      </button>
                    ) : null}
                    {item.status === 'pendente' || item.status === 'revogado' ? (
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
                        onClick={() => void handleRemove(item.id)}
                      >
                        Remover
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        disabled={atMax || busy}
        className="w-full rounded-xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => setAdding(true)}
      >
        {atMax ? `Máximo de ${COANFITRIOES_MAX} coanfitriões` : '+ Adicionar coanfitrião'}
      </button>
    </div>
  );
}
