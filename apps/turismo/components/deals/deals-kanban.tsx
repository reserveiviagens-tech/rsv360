'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
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

function isKanbanStage(id: unknown): id is KanbanColumnId {
  return typeof id === 'string' && (KANBAN_STAGE_ORDER as string[]).includes(id);
}

const DraggableDealCard = memo(function DraggableDealCard({
  deal,
  isOverlay,
  enterDelayMs,
  onOpen,
  menuHandlers,
  dimmed,
}: {
  deal: Deal;
  isOverlay?: boolean;
  enterDelayMs: number;
  onOpen: () => void;
  menuHandlers?: import('./deal-card-menu').DealCardMenuHandlers;
  dimmed?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    disabled: isOverlay,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 50 : undefined }
    : undefined;

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={`${dimmed ? 'opacity-35' : ''} ${isOverlay ? 'cursor-grabbing shadow-2xl ring-2 ring-[rgb(var(--lintel-drop-target-ring)/0.35)]' : ''}`}
      {...(isOverlay ? {} : { ...listeners, ...attributes })}
    >
      <DealCard
        deal={deal}
        useNativeDrag={false}
        isDragging={isDragging || Boolean(isOverlay)}
        enterDelayMs={enterDelayMs}
        onDragStart={() => undefined}
        onOpen={onOpen}
        menuHandlers={menuHandlers}
      />
    </div>
  );
});

export interface KanbanColumnProps {
  stage: KanbanColumnId;
  deals: Deal[];
  isDropActive: boolean;
  activeDragDealId: string | null;
  cardsBootLoading: boolean;
  registerColumnScroll: (stageId: string, el: HTMLDivElement | null) => void;
  onCardClick: (deal: Deal) => void;
  buildCardMenuHandlers?: (deal: Deal) => import('./deal-card-menu').DealCardMenuHandlers;
}

export const KanbanColumn = memo(function KanbanColumn({
  stage,
  deals,
  isDropActive,
  activeDragDealId,
  cardsBootLoading,
  registerColumnScroll,
  onCardClick,
  buildCardMenuHandlers,
}: KanbanColumnProps) {
  const { copy } = useCrmLocale();
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const stageDef = copy.deals.stages[stage];
  const columnTotal = formatColumnTotal(deals);
  const highlighted = isDropActive || isOver;

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
    <motion.div
      data-stage={stage}
      layout
      animate={{ scale: highlighted ? 1.015 : 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className={`lintel-deals-kanban-column snap-start transition-shadow ${highlighted ? 'is-drop-target' : ''}`}
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
        ref={(el) => {
          setNodeRef(el);
          registerColumnScroll(stage, el);
        }}
        className="lintel-deals-kanban-column-body lintel-kanban-col-scroll"
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
              <DraggableDealCard
                key={deal.id}
                deal={deal}
                dimmed={activeDragDealId === deal.id}
                enterDelayMs={idx * 45}
                onOpen={() => onCardClick(deal)}
                menuHandlers={buildCardMenuHandlers?.(deal)}
              />
            ))
        )}
      </div>
    </motion.div>
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
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [overStage, setOverStage] = useState<KanbanColumnId | null>(null);
  const { boardRef, registerColumnScroll, onDragStart: armScroll, onDragEnd: disarmScroll } = useKanbanAutoScroll();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
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

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const deal = filteredDeals.find((d) => d.id === event.active.id);
      setActiveDeal(deal ?? null);
      armScroll();
    },
    [armScroll, filteredDeals],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDeal(null);
      setOverStage(null);
      disarmScroll();
      const dealId = String(event.active.id);
      const targetStage = isKanbanStage(event.over?.id) ? event.over.id : null;
      if (!targetStage) return;
      const current = filteredDeals.find((d) => d.id === dealId);
      if (!current || current.stage === targetStage) return;
      onDealStageChange?.(dealId, targetStage);
    },
    [disarmScroll, filteredDeals, onDealStageChange],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={({ over }) => {
        setOverStage(isKanbanStage(over?.id) ? over.id : null);
      }}
    >
      <div className="flex flex-col gap-2">
        {activeDeal ? (
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
                isDropActive={overStage === stage}
                activeDragDealId={activeDeal?.id ?? null}
                cardsBootLoading={cardsBootLoading}
                registerColumnScroll={registerColumnScroll}
                onCardClick={onDealClick}
                buildCardMenuHandlers={buildCardMenuHandlers}
              />
            ))}
          </div>
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {activeDeal ? (
          <DraggableDealCard
            deal={activeDeal}
            isOverlay
            enterDelayMs={0}
            onOpen={() => onDealClick(activeDeal)}
            menuHandlers={buildCardMenuHandlers?.(activeDeal)}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});