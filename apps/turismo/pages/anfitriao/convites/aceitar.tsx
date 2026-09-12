'use client';

import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import AnfitriaoRoleGuard from '../../../components/AnfitriaoRoleGuard';
import { fase1Api } from '@/lib/fase1-api';

type PageState = 'idle' | 'loading' | 'success' | 'error' | 'missing_token';

export default function AceitarConviteCoanfitriaoPage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>('idle');
  const [titulo, setTitulo] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const token =
    typeof router.query.token === 'string' ? router.query.token.trim() : '';

  const acceptInvite = useCallback(async () => {
    if (!token) {
      setState('missing_token');
      return;
    }
    setState('loading');
    setErrorMsg(null);
    try {
      const res = await fase1Api.anfitriaoAceitarConvitePorToken(token);
      setTitulo(typeof res.data?.titulo === 'string' ? res.data.titulo : null);
      setState('success');
    } catch (e) {
      setErrorMsg((e as Error).message || 'Não foi possível aceitar o convite.');
      setState('error');
    }
  }, [token]);

  useEffect(() => {
    if (!router.isReady) return;
    if (!token) {
      setState('missing_token');
      return;
    }
    void acceptInvite();
  }, [router.isReady, token, acceptInvite]);

  return (
    <AnfitriaoRoleGuard>
      <Head>
        <title>Aceitar convite | Anfitrião</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {state === 'loading' || state === 'idle' ? (
            <>
              <h1 className="text-xl font-bold text-slate-900">Aceitando convite…</h1>
              <p className="mt-2 text-sm text-slate-500">Aguarde enquanto confirmamos seu acesso.</p>
            </>
          ) : null}

          {state === 'success' ? (
            <>
              <h1 className="text-xl font-bold text-slate-900">Convite aceito</h1>
              <p className="mt-2 text-sm text-slate-600">
                {titulo
                  ? `Você agora é coanfitrião da unidade "${titulo}".`
                  : 'Seu convite foi aceito com sucesso.'}
              </p>
              <Link
                href="/anfitriao/unidades"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Ver minhas unidades
              </Link>
            </>
          ) : null}

          {state === 'missing_token' ? (
            <>
              <h1 className="text-xl font-bold text-slate-900">Link inválido</h1>
              <p className="mt-2 text-sm text-slate-600">
                Este link não contém um token de convite válido. Verifique o e-mail recebido ou peça um
                novo convite ao anfitrião.
              </p>
              <Link
                href="/anfitriao/unidades"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ir para unidades
              </Link>
            </>
          ) : null}

          {state === 'error' ? (
            <>
              <h1 className="text-xl font-bold text-slate-900">Não foi possível aceitar</h1>
              <p className="mt-2 text-sm text-slate-600">
                {errorMsg ?? 'Convite inválido, expirado ou e-mail da sessão diferente do convite.'}
              </p>
              <button
                type="button"
                className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => void acceptInvite()}
              >
                Tentar novamente
              </button>
              <Link
                href="/anfitriao/unidades"
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Ver minhas unidades
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </AnfitriaoRoleGuard>
  );
}
