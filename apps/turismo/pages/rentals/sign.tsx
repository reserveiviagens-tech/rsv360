'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { CheckCircle2, FileText, Loader2 } from 'lucide-react';
import {
  completePublicSign,
  fetchPublicSignView,
  publicSignPdfUrl,
} from '../../src/lib/rental-contract-api';

export default function RentalPublicSignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<Awaited<ReturnType<typeof fetchPublicSignView>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const requestId =
    typeof router.query.requestId === 'string'
      ? router.query.requestId
      : typeof router.query.token === 'string'
        ? ''
        : '';
  const token =
    typeof router.query.token === 'string'
      ? router.query.token
      : typeof router.query.requestId === 'string' && typeof router.query.t === 'string'
        ? router.query.t
        : '';

  const resolvedRequestId =
    requestId ||
    (typeof router.query.requestId === 'string' ? router.query.requestId : '');

  useEffect(() => {
    if (!router.isReady) return;
    const rid = String(router.query.requestId ?? '').trim();
    const tok = String(router.query.token ?? '').trim();
    if (!rid || !tok) {
      setError('Link incompleto. Verifique o e-mail de convite.');
      setLoading(false);
      return;
    }
    void fetchPublicSignView(rid, tok)
      .then((data) => {
        setView(data);
        if (data.status === 'signed') setDone(true);
      })
      .catch(() => setError('Link inválido ou expirado.'))
      .finally(() => setLoading(false));
  }, [router.isReady, router.query.requestId, router.query.token]);

  const onSign = useCallback(async () => {
    const rid = String(router.query.requestId ?? '').trim();
    const tok = String(router.query.token ?? '').trim();
    if (!accepted || !rid || !tok) return;
    setSubmitting(true);
    try {
      await completePublicSign(rid, tok);
      setDone(true);
    } catch {
      setError('Não foi possível concluir a assinatura. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }, [accepted, router.query.requestId, router.query.token]);

  const rid = String(router.query.requestId ?? resolvedRequestId).trim();
  const tok = String(router.query.token ?? token).trim();
  const pdfUrl = rid && tok ? publicSignPdfUrl(rid, tok) : '';

  return (
    <>
      <Head>
        <title>Assinatura de contrato · RSV360</title>
      </Head>
      <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Assinatura eletrônica</h1>
          <p className="mt-1 text-xs text-slate-500">Contrato de locação RSV360 Lintel</p>

          {loading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando…
            </div>
          ) : null}

          {error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null}

          {view && !loading ? (
            <div className="mt-6 space-y-4">
              <dl className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <div>
                  <dt className="font-semibold">Locatário</dt>
                  <dd>{view.signerName}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Imóvel</dt>
                  <dd>
                    {view.unitName} — {view.address}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Condições</dt>
                  <dd>
                    {view.termMonths} meses · R$ {view.monthlyRent.toLocaleString('pt-BR')}/mês · Garantia:{' '}
                    {view.depositType}
                  </dd>
                </div>
              </dl>

              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-orange-600 hover:bg-slate-50 dark:border-slate-700"
              >
                <FileText className="h-4 w-4" />
                Visualizar minuta (PDF)
              </a>

              {done || view.status === 'signed' ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <CheckCircle2 className="h-5 w-5" />
                  Contrato assinado com sucesso.
                </div>
              ) : view.status === 'expired' ? (
                <p className="text-sm text-amber-700">Este link expirou. Solicite um novo convite ao corretor.</p>
              ) : (
                <>
                  <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                      className="mt-0.5"
                    />
                    Li a minuta e aceito formalmente os termos do contrato de locação.
                  </label>
                  <button
                    type="button"
                    disabled={!accepted || submitting}
                    onClick={() => void onSign()}
                    className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
                  >
                    {submitting ? 'Registrando…' : 'Assinar digitalmente'}
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}