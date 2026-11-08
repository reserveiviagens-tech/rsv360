'use client';

import { useCallback, useState } from 'react';
import { Deal, DEAL_STAGES, DealCard, formatPrice, type DealStage } from './deal-card';

export type KanbanColumnId = DealStage;

export interface KanbanColumnProps {
  stage: KanbanColumnId;
  deals: Deal[];
  dragOverStage: KanbanColumnId | null;
  onDragStart: (id: string) => void;
  onDragOverColumn: (stage: KanbanColumnId) => void;
  onDragLeaveColumn: () => void;
  onDropOnColumn: (stage: KanbanColumnId, dealId: string) => void;
  onCardClick: (deal: Deal) => void;
}

export function KanbanColumn({
  stage,
  deals,
  dragOverStage,
  onDragStart,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropOnColumn,
  onCardClick,
}: KanbanColumnProps) {
  const stageDef = DEAL_STAGES.find((s) => s.id === stage);
  const stageLabel = stageDef?.label ?? stage;
  const isTarget = dragOverStage === stage;

  return (
    <div className="flex h-full min-h-[280px] w-full min-w-0 flex-col rounded-xl border border-slate-200/80 bg-slate-50/30 md:max-w-none lg:min-w-[18rem] lg:max-w-[20rem] lg:flex-shrink-0 lg:border-r lg:bg-transparent lg:last:border-r-0">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-slate-900">{stageLabel}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            {deals.length}
          </span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
          {stageDef?.hint}
        </span>
      </div>

      <div
        className={`min-h-[300px] flex-1 space-y-3 overflow-y-auto px-3 py-3 transition-colors ${
          isTarget ? 'bg-blue-50/60 ring-1 ring-inset ring-blue-200/80' : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          onDragOverColumn(stage);
        }}
        onDragLeave={onDragLeaveColumn}
        onDrop={(e) => {
          e.preventDefault();
          const dealId = e.dataTransfer.getData('text/plain');
          if (dealId) {
            onDropOnColumn(stage, dealId);
          }
          onDragLeaveColumn();
        }}
      >
        {deals.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-8 text-[11px] text-slate-400">
            Nenhum negócio
          </div>
        ) : (
          deals
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((deal) => (
              <div key={deal.id} className="relative">
                <DealCard deal={deal} onDragStart={onDragStart} />
                <button
                  type="button"
                  onClick={() => onCardClick(deal)}
                  className="absolute inset-0 h-full w-full cursor-pointer rounded-2xl bg-transparent"
                  aria-label={`Abrir detalhes de ${deal.propertyName}`}
                />
              </div>
            ))
        )}
      </div>
    </div>
  );
}

export interface DealsKanbanProps {
  deals: Deal[];
  activeAgentFilter: string;
  onAgentFilterChange: (agentId: string) => void;
  onDealClick: (deal: Deal) => void;
  onDealStageChange?: (dealId: string, stage: DealStage) => void;
}

export function DealsKanban({
  deals,
  activeAgentFilter,
  onAgentFilterChange,
  onDealClick,
  onDealStageChange,
}: DealsKanbanProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<KanbanColumnId | null>(null);

  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id);
  }, []);

  const handleDropOnColumn = useCallback(
    (targetStage: KanbanColumnId, dealId: string) => {
      setDraggedId(null);
      if (onDealStageChange) {
        onDealStageChange(dealId, targetStage);
      }
    },
    [onDealStageChange],
  );

  const filteredDeals = deals.filter((d) => {
    if (!activeAgentFilter) return true;
    return d.agentId === activeAgentFilter;
  });

  const groupedByStage = DEAL_STAGES.map((stage) => ({
    stage: stage.id,
    deals: filteredDeals.filter((d) => d.stage === stage.id),
  }));

  return (
    <div className="mx-auto flex max-w-[calc(100%-2rem)] flex-col gap-4 overflow-hidden md:h-[calc(100vh-220px)] md:flex-row">
      <div className="flex w-full flex-shrink-0 flex-col border-b border-slate-200/80 p-4 md:h-full md:w-64 md:border-b-0 md:border-r">
        <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto md:max-h-none md:flex-col md:space-y-3 md:gap-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">Agentes</span>
            <button
              type="button"
              onClick={() => onAgentFilterChange('')}
              className="text-[10px] text-slate-400 transition hover:text-slate-600"
            >
              Limpar
            </button>
          </div>
          {[
            { id: 'agent_1', name: 'Imani Brooks' },
            { id: 'agent_2', name: 'Jordan Ellis' },
            { id: 'agent_3', name: 'Camila Duarte' },
            { id: 'agent_4', name: 'Henrik Dahl' },
          ].map((agent) => (
            <label
              key={agent.id}
              className={`flex cursor-pointer items-center gap-2 rounded-xl p-2 transition-all ${
                activeAgentFilter === agent.id
                  ? 'border border-[#2f5bea] bg-[#121722] text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="agentFilter"
                value={agent.id}
                checked={activeAgentFilter === agent.id}
                onChange={() => onAgentFilterChange(agent.id)}
                className="sr-only"
              />
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: activeAgentFilter === agent.id ? '#2f5bea' : '#9ca3af',
                }}
              />
              <span className="text-xs font-medium">{agent.name}</span>
            </label>
          ))}
        </div>

        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Comissão Total
          </div>
          <div className="text-2xl font-black text-[#121722]">
            {formatPrice(filteredDeals.reduce((sum, d) => sum + d.commission, 0))}
          </div>
          {draggedId ? (
            <p className="mt-2 text-[10px] text-slate-400">Arrastando card…</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-2 md:grid md:grid-cols-2 md:overflow-y-auto lg:flex lg:flex-row lg:gap-0 lg:overflow-x-auto lg:overflow-y-hidden lg:p-0">
        {groupedByStage.map(({ stage, deals: columnDeals }) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            deals={columnDeals}
            dragOverStage={dragOverStage}
            onDragStart={handleDragStart}
            onDragOverColumn={setDragOverStage}
            onDragLeaveColumn={() => setDragOverStage(null)}
            onDropOnColumn={handleDropOnColumn}
            onCardClick={onDealClick}
          />
        ))}
      </div>
    </div>
  );
}
