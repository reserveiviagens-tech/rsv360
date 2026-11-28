import Link from 'next/link';
import Head from 'next/head';
import { usePropostas } from '@/hooks/useFase1Modules';

export default function PropostasListPage() {
  const { data, isLoading } = usePropostas();
  const items = (data as { data?: unknown[] })?.data ?? [];

  return (
    <>
      <Head>
        <title>Propostas | Turismo RSV360</title>
      </Head>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Propostas</h1>
              <p className="text-sm text-slate-600">Módulo Fase 1 — migração Sistema A → B</p>
            </div>
            <div className="flex gap-2">
              <Link href="/orcamentos" className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                Orçamentos
              </Link>
              <Link
                href="/gerador-propostas-rioquente"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                Rio Quente / Aviva
              </Link>
              <Link href="/propostas/nova" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
                Nova proposta
              </Link>
              <Link href="/modulos" className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                Hub Fase 4
              </Link>
            </div>
          </div>

          {isLoading && <p className="text-slate-600">Carregando...</p>}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{p.id}</td>
                    <td className="px-4 py-3 font-medium">{p.titulo}</td>
                    <td className="px-4 py-3">{p.clienteNome}</td>
                    <td className="px-4 py-3">{p.status}</td>
                    <td className="px-4 py-3">
                      <Link href={`/propostas/${p.id}`} className="text-blue-600 hover:underline">
                        Editar
                      </Link>
                      {' · '}
                      <Link href={`/propostas/${p.id}/atendimento`} className="text-blue-600 hover:underline">
                        HITL
                      </Link>
                    </td>
                  </tr>
                ))}
                {!isLoading && items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Nenhuma proposta. Crie a partir de um{' '}
                      <Link href="/orcamentos" className="text-blue-600 underline">
                        orçamento
                      </Link>
                      .
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {items.some((p) => p.orcamentoId) && (
            <p className="mt-4 text-xs text-slate-500">
              Dica: use orçamentos para gerar propostas com um clique.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
