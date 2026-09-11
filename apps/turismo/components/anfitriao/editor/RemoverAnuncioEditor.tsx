'use client';

import { useState } from 'react';

/** Card preview — reflects archive state. */
export function summarizeRemoverAnuncioClient(archived?: boolean): string {
  return archived ? 'Arquivado' : 'Arquivar (soft-delete)';
}

function PanelTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

type Props = {
  archived?: boolean;
  onArquivar?: (motivo?: string) => Promise<void>;
};

export function RemoverAnuncioEditor({ archived = false, onArquivar }: Props) {
  const [motivo, setMotivo] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleArquivar() {
    if (!onArquivar || archived || loading) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const trimmed = motivo.trim();
      await onArquivar(trimmed ? trimmed : undefined);
      setSuccess('Anúncio arquivado. Ele não aparecerá mais no catálogo público.');
      setConfirmed(false);
    } catch (e) {
      setError((e as Error).message || 'Não foi possível arquivar o anúncio.');
    } finally {
      setLoading(false);
    }
  }

  if (archived) {
    return (
      <div>
        <PanelTitle
          title="Remover anúncio"
          hint="Este anúncio está arquivado e oculto do catálogo."
        />
        <p
          className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
          role="status"
        >
          Anúncio arquivado. Para reativar, entre em contato com o suporte Reservei.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PanelTitle
        title="Remover anúncio"
        hint="Arquiva o anúncio (soft-delete) — não exclui dados permanentemente."
      />
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Arquivar oculta o anúncio do catálogo público e define o status como Não anunciado. A ação
        é registrada em auditoria. Para pausar temporariamente, use Status do anúncio.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="motivo-arquivar" className="block text-sm font-medium text-slate-700">
            Motivo (opcional)
          </label>
          <textarea
            id="motivo-arquivar"
            rows={3}
            maxLength={200}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={loading}
            placeholder="Ex.: encerramento temporário da propriedade"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
          <p className="mt-1 text-xs text-slate-500">{motivo.length}/200 — não inclua dados pessoais.</p>
        </div>

        <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={loading}
            className="mt-0.5"
          />
          <span>Entendo que o anúncio será arquivado e removido do catálogo público.</span>
        </label>

        {error ? (
          <p className="text-sm text-red-600" role="alert" aria-live="polite">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm text-green-700" role="status" aria-live="polite">
            {success}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void handleArquivar()}
          disabled={!onArquivar || !confirmed || loading}
          aria-busy={loading}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Arquivando…' : 'Arquivar anúncio'}
        </button>
      </div>
    </div>
  );
}
