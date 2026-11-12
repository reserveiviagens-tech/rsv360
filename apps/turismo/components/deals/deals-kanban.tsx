'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';
import { useCrmLocale } from '../lintel/crm-locale-provider';
import {
  Deal,
  DealCard,
  DealCardSkeleton,
  formatColumnTotal,
  inferListingKind,
  type DealStage,
} from './deal-card';
import { useKanbanAutoScroll } from './use-kanban-auto-scroll';

const KANBAN_STAGE_ORDER: DealStage[] = ['viewing', 'offer', 'negotiation', 'under_contract', 'closed'];

export type ListingKindFilter = 'all' | 'sale' | 'rent';

export type KanbanColumnId = DealStage;

export interface KanbanColumnProps {
  stage: KanbanColumnId;
  deals: Deal[];
  dragOverStage: KanbanColumnId | null;
  draggedDealId: string | null;
  cardsBootLoading: boolean;
  registerColumnScroll: (stageId: string, el: HTMLDivElement | null) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOverColumn: (stage: KanbanColumnId) => void;
  onDragLeaveColumn: () => void;
  onDropOnColumn: (stage: KanbanColumnId, dealId: string) => void;
  onCardClick: (deal: Deal) => void;
  buildCardMenuHandlers?: (deal: Deal) => import('./deal-card-menu').DealCardMenuHandlers;
}

export const KanbanColumn = memo(function KanbanColumn({
  stage,
  deals,
  dragOverStage,
  draggedDealId,
  cardsBootLoading,
  registerColumnScroll,
  onDragStart,
  onDragEnd,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropOnColumn,
  onCardClick,
  buildCardMenuHandlers,
}: KanbanColumnProps) {
  const { copy } = useCrmLocale();
  const stageDef = copy.deals.stages[stage];
  const isTarget = dragOverStage === stage;
  const columnTotal = formatColumnTotal(deals);

  const title =
    stage === 'closed' ? (
      <span className="flex flex-col leading-tight">
        <span>{stageDef?.label ?? stage}</span>
        <span className="text-[9px] font-semibold text-gray-400">{copy.deals.closedThisMonth}</span>
      </span>
    ) : (
      <span>{stageDef?.label ?? stage}</span>
    );

  return (
    <div
      data-stage={stage}
      className={`lintel-deals-kanban-column snap-start transition-shadow ${isTarget ? 'is-drop-target' : ''}`}
    >
      <div className="lintel-deals-kanban-column-header">
        <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
          <span className="min-w-0 truncate text-[11px]">{title}</span>
          <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-gray-800 dark:text-gray-300">
            {deals.length}
          </span>
        </div>
        <span className="shrink-0 text-sm font-bold text-slate-800 dark:text-white">{columnTotal}</span>
      </div>

      <div
        ref={(el) => registerColumnScroll(stage, el)}
        className="lintel-deals-kanban-column-body lintel-kanban-col-scroll"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          onDragOverColumn(stage);
        }}
        onDragLeave={onDragLeaveColumn}
        onDrop={(e) => {
          e.preventDefault();
          const dealId = e.dataTransfer.getData('text/plain');
          if (dealId) onDropOnColumn(stage, dealId);
          onDragLeaveColumn();
        }}
      >
        {cardsBootLoading ? (
          <>
            <DealCardSkeleton />
            <DealCardSkeleton />
          </>
        ) : deals.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-12 text-[11px] text-gray-400 dark:border-gray-700">
            {copy.deals.emptyColumn}
          </div>
        ) : (
          deals
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map((deal, idx) => (
              <DealCard
                key={deal.id}
                deal={deal}
                isDragging={draggedDealId === deal.id}
                enterDelayMs={idx * 45}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onOpen={() => onCardClick(deal)}
                menuHandlers={buildCardMenuHandlers?.(deal)}
              />
            ))
        )}
      </div>
    </div>
  );
});

export interface DealsKanbanProps {
  deals: Deal[];
  activeAgentIds: string[];
  listingFilter: ListingKindFilter;
  cardsBootLoading?: boolean;
  onDealClick: (deal: Deal) => void;
  onDealStageChange?: (dealId: string, stage: DealStage) => void;
  buildCardMenuHandlers?: (deal: Deal) => import('./deal-card-menu').DealCardMenuHandlers;
}

export const DealsKanban = memo(function DealsKanban({
  deals,
  activeAgentIds,
  listingFilter,
  cardsBootLoading = false,
  onDealClick,
  onDealStageChange,
  buildCardMenuHandlers,
}: DealsKanbanProps) {
  const { copy } = useCrmLocale();
  const [dragOverStage, setDragOverStage] = useState<KanbanColumnId | null>(null);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const { boardRef, registerColumnScroll, onDragStart: armScroll, onDragEnd: disarmScroll } = useKanbanAutoScroll();

  const handleDragStart = useCallback(
    (id: string) => {
      setDraggedDealId(id);
      armScroll();
    },
    [armScroll],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedDealId(null);
    disarmScroll();
  }, [disarmScroll]);

  const handleDropOnColumn = useCallback(
    (targetStage: KanbanColumnId, dealId: string) => {
      handleDragEnd();
      onDealStageChange?.(dealId, targetStage);
    },
    [handleDragEnd, onDealStageChange],
  );

  const filteredDeals = useMemo(() => {
    let rows = deals;
    if (activeAgentIds.length > 0) {
      rows = rows.filter((d) => activeAgentIds.includes(d.agentId));
    }
    if (listingFilter !== 'all') {
      rows = rows.filter((d) => inferListingKind(d) === listingFilter);
    }
    return rows;
  }, [deals, activeAgentIds, listingFilter]);

  const groupedByStage = useMemo(() => {
    return KANBAN_STAGE_ORDER.map((stageId) => ({
      stage: stageId,
      deals: filteredDeals.filter((d) => d.stage === stageId),
    }));
  }, [filteredDeals]);

  return (
    <div className="flex flex-col gap-2">
      {draggedDealId ? (
        <p className="text-center text-[11px] font-medium text-gray-400" aria-live="polite">
          {copy.deals.dragging}
        </p>
      ) : null}
      <div className="lintel-deals-kanban-canvas">
        <div
          ref={boardRef}
          className="lintel-kanban-board-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        >
        {groupedByStage.map(({ stage, deals: columnDeals }) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            deals={columnDeals}
            dragOverStage={dragOverStage}
            draggedDealId={draggedDealId}
            cardsBootLoading={cardsBootLoading}
            registerColumnScroll={registerColumnScroll}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOverColumn={setDragOverStage}
            onDragLeaveColumn={() => setDragOverStage(null)}
            onDropOnColumn={handleDropOnColumn}
            onCardClick={onDealClick}
            buildCardMenuHandlers={buildCardMenuHandlers}
          />
        ))}
        </div>
      </div>
    </div>
  );
});
