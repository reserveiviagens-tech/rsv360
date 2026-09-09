'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AnfitriaoRoleGuard from '../../../components/AnfitriaoRoleGuard';
import { AnfitriaoHostNav } from '../../../components/anfitriao/AnfitriaoHostNav';
import { useAuth } from '@/context/AuthContext';
import { fase1Api } from '@/lib/fase1-api';

type VerifItem = {
  id: number;
  titulo: string;
  hotelId: string | null;
  statusPublicacao: string;
  verificacaoLocal: {
    status: string;
    metodo: string | null;
    enviadoEm: string | null;
    evidencias: Array<{ url?: string; tipo?: string }>;
    motivoRejeicao?: string | null;
  };
};

export default function StaffVerificacaoLocalPage() {
  const { user } = useAuth();
  const role = String(user?.role ?? '');
  const isStaff = role === 'admin' || role === 'manager';
  const [status, setStatus] = useState<'enviado' | 'aprovado' | 'rejeitado' | 'all'>('enviado');
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['anfitriao', 'verificacoes-local', status],
    queryFn: () => fase1Api.anfitriaoListarVerificacoesLocal(status),
    enabled: isStaff,
  });

  const decidir = useMutation({
    mutationFn: ({
      id,
      action,
      motivo,
    }: {
      id: number;
      action: 'aprovar' | 'rejeitar';
      motivo?: string;
    }) =>
      action === 'aprovar'
        ? fase1Api.anfitriaoAprovarVerificacaoLocal(id)
        : fase1Api.anfitriaoRejeitarVerificacaoLocal(id, motivo),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['anfitriao', 'verificacoes-local'] });
    },
  });

  const items = (list.data?.data ?? []) as VerifItem[];

  if (!isStaff) {
    return (
      <AnfitriaoRoleGuard>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-slate-600">
          Acesso restrito a admin/manager.
        </div>
      </AnfitriaoRoleGuard>
    );
  }

  return (
    <AnfitriaoRoleGuard>
      <Head>
        <title>Verificação de localização | Staff</title>
      </Head>
      <div className="min-h-screen bg-slate-50">
        <AnfitriaoHostNav />
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
          <h1 className="text-2xl font-bold">Verificação de localização</h1>
          <p className="mt-1 text-sm text-slate-600">
            Fila staff para aprovar ou rejeitar evidências enviadas pelo anfitrião.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {(['enviado', 'aprovado', 'rejeitado', 'all'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  status === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {list.isError && (
            <p className="mt-4 text-sm text-red-600">{(list.error as Error).message}</p>
          )}
          {decidir.isError && (
            <p className="mt-2 text-sm text-red-600">{(decidir.error as Error).message}</p>
          )}

          <ul className="mt-6 space-y-4">
            {items.length === 0 && !list.isLoading ? (
              <li className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                Nenhuma verificação neste filtro.
              </li>
            ) : null}
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/anfitriao/unidades/${item.id}?secao=verificacao`}
                      className="font-semibold text-slate-900 underline"
                    >
                      #{item.id} · {item.titulo}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      Hotel {item.hotelId ?? '—'} · status {item.verificacaoLocal.status}
                      {item.verificacaoLocal.enviadoEm
                        ? ` · enviado ${item.verificacaoLocal.enviadoEm.slice(0, 10)}`
                        : ''}
                    </p>
                  </div>
                  {item.verificacaoLocal.status === 'enviado' ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={decidir.isPending}
                        onClick={() => decidir.mutate({ id: item.id, action: 'aprovar' })}
                        className="rounded bg-emerald-700 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        disabled={decidir.isPending}
                        onClick={() =>
                          decidir.mutate({
                            id: item.id,
                            action: 'rejeitar',
                            motivo: 'Evidências insuficientes',
                          })
                        }
                        className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 disabled:opacity-50"
                      >
                        Rejeitar
                      </button>
                    </div>
                  ) : null}
                </div>
                {item.verificacaoLocal.evidencias?.length ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {item.verificacaoLocal.evidencias.map((ev, idx) =>
                      ev.url ? (
                        <li key={`${item.id}-${idx}`}>
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-sky-700 underline"
                          >
                            Evidência {idx + 1}
                            {ev.tipo ? ` (${ev.tipo})` : ''}
                          </a>
                        </li>
                      ) : null,
                    )}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AnfitriaoRoleGuard>
  );
}
