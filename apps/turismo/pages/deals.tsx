'use client';

import { useCallback, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Deal, DEAL_STAGES, formatPrice, type DealStage } from '../components/deals/deal-card';
import { SAMPLE_DEALS } from '../components/deals/data/sample-deals';
import { DealsKanban } from '../components/deals/deals-kanban';

const MOCK_AGENTS = [
  { id: '', name: 'Todos' },
  { id: 'agent_1', name: 'Imani Brooks' },
  { id: 'agent_2', name: 'Jordan Ellis' },
  { id: 'agent_3', name: 'Camila Duarte' },
  { id: 'agent_4', name: 'Henrik Dahl' },
];

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>(SAMPLE_DEALS);
  const [activeAgentFilter, setActiveAgentFilter] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const filteredDeals = deals.filter((d) => {
    if (!activeAgentFilter) return true;
    return d.agentId === activeAgentFilter;
  });

  const totalCommission = filteredDeals.reduce((sum, d) => sum + d.commission, 0);

  const handleStageChange = useCallback((dealId: string, stage: DealStage) => {
    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId ? { ...d, stage, updatedAt: new Date().toISOString().slice(0, 10) } : d,
      ),
    );
    // TODO: PATCH /api/deals/{id}/stage quando endpoint existir
  }, []);

  return (
    <>
      <Head>
        <title>Deals | RSV360</title>
        <meta name="description" content="Gestão de portfólio de negócios e comissões" />
      </Head>

      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f1116]">
        <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700/50 dark:bg-[#121722] sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#121722] text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">Deals</h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/anfitriao/admin/carteira-corretor"
                className="text-xs font-medium text-slate-500 underline underline-offset-2 transition hover:text-slate-700 dark:hover:text-slate-300"
              >
                Ver carteira completa
              </Link>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl bg-[#121722] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#1a1f29] hover:shadow-md"
              >
                Novo negócio
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Negócios Ativos</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{filteredDeals.length}</p>
            </div>
            <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 to-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Comissão Total</p>
              <p className="mt-1 text-2xl font-black text-[#121722]">{formatPrice(totalCommission)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Em Negociação</p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {filteredDeals.filter((d) => d.stage === 'negotiation').length}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Fechados</p>
              <p className="mt-1 text-2xl font-black text-[#121722]">
                {filteredDeals.filter((d) => d.stage === 'closed').length}
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-semibold text-slate-700">Filtro por Agente</span>
              <div className="flex flex-wrap gap-2">
                {MOCK_AGENTS.map((agent) => (
                  <button
                    key={agent.id || 'all'}
                    type="button"
                    onClick={() => setActiveAgentFilter(agent.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      activeAgentFilter === agent.id
                        ? 'bg-[#121722] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {agent.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <DealsKanban
              deals={deals}
              activeAgentFilter={activeAgentFilter}
              onAgentFilterChange={setActiveAgentFilter}
              onDealClick={setSelectedDeal}
              onDealStageChange={handleStageChange}
            />
          </div>
        </main>

        {selectedDeal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#121722]">
              <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
                <div>
                  <h2 className="truncate text-lg font-black text-slate-900 dark:text-white">
                    {selectedDeal.propertyName}
                  </h2>
                  <p className="text-xs text-slate-500">{selectedDeal.location}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDeal(null)}
                  className="rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Fechar detalhes"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4 p-6">
                <p className="text-sm text-slate-600">
                  Estágio: {DEAL_STAGES.find((s) => s.id === selectedDeal.stage)?.label}
                </p>
                <p className="text-xl font-black">{formatPrice(selectedDeal.price)}</p>
                <p className="text-sm text-slate-500">{selectedDeal.nextStep}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
