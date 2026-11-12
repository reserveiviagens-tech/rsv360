'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { dealsApi } from '@/lib/deals-api';
import { DealsKpiStrip } from '../lintel/deals-kpi-strip';
import { useCrmLiveChatOptional } from '../lintel/crm-live-chat-provider';
import { useCrmLocale } from '../lintel/crm-locale-provider';
import { lintelSegment } from '../lintel/overview-primitives';
import { DEAL_AGENT_DIRECTORY } from './deals-agents';
import { dealPropertySlug, dealToChatPropertyPayload } from './deal-card-helpers';
import type { DealCardMenuHandlers } from './deal-card-menu';
import { Deal, formatPrice, inferListingKind, type DealStage } from './deal-card';
import { SAMPLE_DEALS } from './data/sample-deals';
import {
  buildShareableDealUrl,
  copyTextToClipboard,
  dealDeepLinkSlug,
  findDealByDeepLink,
  readDealKeyFromHash,
  resolveDealDeepLinkKey,
  writeDealHash,
  type DealsDeepLinkContext,
} from './deals-deep-link';
import { DealsKanban, type ListingKindFilter } from './deals-kanban';

const DealDetailModal = dynamic(
  () => import('./deal-detail-modal').then((mod) => mod.DealDetailModal),
  { ssr: false },
);

export const DEALS_PAGE_BOOT_MS = 540;

const STAGE_WEIGHT: Record<DealStage, number> = {
  viewing: 0.35,
  offer: 0.55,
  negotiation: 0.72,
  under_contract: 0.9,
  closed: 1,
};

function formatCommissionCompact(value: number): string {
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return formatPrice(value);
}

export type DealsCrmModuleProps = {
  isActive?: boolean;
  bootOnActivate?: boolean;
  /** Where this module is mounted — drives query params on /deals vs /overview */
  deepLinkContext?: DealsDeepLinkContext;
};

type SoldToast = {
  dealId: string;
  snapshot: Deal;
};

export function DealsCrmModule({
  isActive = true,
  bootOnActivate = true,
  deepLinkContext = 'deals-page',
}: DealsCrmModuleProps) {
  const router = useRouter();
  const liveChat = useCrmLiveChatOptional();
  const { copy, locale } = useCrmLocale();
  const d = copy.deals;
  const [deals, setDeals] = useState<Deal[]>(SAMPLE_DEALS);
  const [soldToast, setSoldToast] = useState<SoldToast | null>(null);
  const [linkCopyToast, setLinkCopyToast] = useState<string | null>(null);
  const [activeAgentIds, setActiveAgentIds] = useState<string[]>([]);
  const [listingFilter, setListingFilter] = useState<ListingKindFilter>('all');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);
  const [cardsBootLoading, setCardsBootLoading] = useState(bootOnActivate);

  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    void dealsApi
      .list()
      .then((items) => {
        if (cancelled || !items || items.length === 0) return;
        setDeals((prev) => {
          const prevMap = new Map(prev.map((d) => [d.id, d]));
          // Atualiza ou adiciona itens da API preservando campos visuais do demo local
          const mergedApiDeals: Deal[] = items.map((apiItem) => {
            const existing = prevMap.get(apiItem.id);
            return {
              ...(existing || {}),
              ...(apiItem as Deal),
              // Garante persistência dos campos ricos se a API não os fornecer
              imageUrl: (apiItem as Deal).imageUrl || existing?.imageUrl,
              deepLinkSlug: (apiItem as Deal).deepLinkSlug || existing?.deepLinkSlug,
              askingPrice: (apiItem as Deal).askingPrice || existing?.askingPrice,
            };
          });
          const apiIds = new Set(items.map((i) => i.id));
          // Mantém itens do demo que a API não possui
          const demoOnly = prev.filter((d) => !apiIds.has(d.id));
          return [...mergedApiDeals, ...demoOnly];
        });
      })
      .catch(() => {
        /* mantém SAMPLE_DEALS */
      });
    return () => {
      cancelled = true;
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    if (!bootOnActivate) {
      setCardsBootLoading(false);
      return;
    }
    setCardsBootLoading(true);
    const id = window.setTimeout(() => setCardsBootLoading(false), DEALS_PAGE_BOOT_MS);
    return () => window.clearTimeout(id);
  }, [isActive, bootOnActivate]);

  const filteredDeals = useMemo(() => {
    let rows = deals;
    if (activeAgentIds.length > 0) {
      rows = rows.filter((deal) => activeAgentIds.includes(deal.agentId));
    }
    if (listingFilter !== 'all') {
      rows = rows.filter((deal) => {
        const kind =
          deal.listingKind ??
          (deal.location.toLowerCase().includes('rent') || deal.price < 50_000 ? 'rent' : 'sale');
        return kind === listingFilter;
      });
    }
    return rows;
  }, [deals, activeAgentIds, listingFilter]);

  const openDealsCount = useMemo(
    () => filteredDeals.filter((row) => row.stage !== 'closed').length,
    [filteredDeals],
  );

  const weightedCommission = useMemo(
    () =>
      filteredDeals.reduce((sum, deal) => sum + deal.commission * (STAGE_WEIGHT[deal.stage] ?? 0.5), 0),
    [filteredDeals],
  );

  const closingThisMonth = useMemo(() => {
    const rows = filteredDeals.filter((row) => row.stage === 'under_contract');
    return {
      count: rows.length,
      commission: rows.reduce((sum, deal) => sum + deal.commission, 0),
    };
  }, [filteredDeals]);

  const winRate = useMemo((): number | null => {
    const won = filteredDeals.filter(
      (row) => row.stage === 'closed' || row.status === 'won',
    ).length;
    const lost = filteredDeals.filter((row) => row.status === 'lost').length;
    const decided = won + lost;
    if (decided === 0) return null;
    return Math.round((won / decided) * 100);
  }, [filteredDeals]);

  const toggleAgent = useCallback((agentId: string) => {
    setActiveAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId],
    );
  }, []);

  const handleStageChange = useCallback(
    (dealId: string, stage: DealStage) => {
      const previous = deals;
      setStageError(null);
      setDeals((prev) =>
        prev.map((row) =>
          row.id === dealId ? { ...row, stage, updatedAt: new Date().toISOString().slice(0, 10) } : row,
        ),
      );
      void dealsApi.patchStage(dealId, stage).catch(() => {
        setDeals(previous);
        setStageError(d.stageSaveError);
      });
    },
    [deals, d.stageSaveError],
  );

  const handleMarkSold = useCallback(
    (deal: Deal) => {
      const previous = deals;
      const next: Deal = {
        ...deal,
        stage: 'closed',
        status: 'won',
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      setSoldToast({ dealId: deal.id, snapshot: deal });
      setDeals((prev) => prev.map((row) => (row.id === deal.id ? next : row)));
      void dealsApi.patchStage(deal.id, 'closed').catch(() => {
        setDeals(previous);
        setSoldToast(null);
        setStageError(d.stageSaveError);
      });
    },
    [deals, d.stageSaveError],
  );

  const handleMarkLost = useCallback(
    (deal: Deal) => {
      setDeals((prev) =>
        prev.map((row) =>
          row.id === deal.id ? { ...row, status: 'lost', updatedAt: new Date().toISOString().slice(0, 10) } : row,
        ),
      );
    },
    [],
  );

  const syncDealUrl = useCallback(
    (deal: Deal | null) => {
      if (!router.isReady) return;
      const slug = deal ? dealDeepLinkSlug(deal) : null;
      writeDealHash(slug);

      if (deepLinkContext === 'overview') {
        if (slug) {
          void router.replace(
            { pathname: '/overview', query: { tab: 'deals', deal: slug } },
            undefined,
            { shallow: true },
          );
        } else {
          void router.replace({ pathname: '/overview', query: { tab: 'deals' } }, undefined, {
            shallow: true,
          });
        }
        return;
      }

      const nextQuery = { ...router.query };
      if (slug) nextQuery.deal = slug;
      else delete nextQuery.deal;
      void router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
    },
    [deepLinkContext, router],
  );

  const openDealDetail = useCallback(
    (deal: Deal) => {
      setSelectedDeal(deal);
      syncDealUrl(deal);
    },
    [syncDealUrl],
  );

  const closeDealDetail = useCallback(() => {
    setSelectedDeal(null);
    syncDealUrl(null);
  }, [syncDealUrl]);

  const buildCardMenuHandlers = useCallback(
    (deal: Deal): DealCardMenuHandlers => ({
      onOpenDeal: () => openDealDetail(deal),
      onMoveToStage: (stage) => handleStageChange(deal.id, stage),
      onMarkSold: () => handleMarkSold(deal),
      onMarkLost: () => handleMarkLost(deal),
      onMessageClient: () => {
        const first = (deal.clientName ?? '').trim().split(/\s+/)[0];
        liveChat?.expandChat();
        if (first) {
          liveChat?.setChatMessage(locale === 'en' ? `Hi ${first}, ` : `Olá ${first}, `);
        }
      },
      onOpenProperty: () => {
        const kind = inferListingKind(deal);
        const tab = kind === 'rent' ? 'rentals' : 'sales';
        const slug = dealPropertySlug(deal.propertyName);
        void router.push({
          pathname: '/overview',
          query: kind === 'rent' ? { tab } : { tab, property: slug },
        });
        liveChat?.openPropertyFromChat(dealToChatPropertyPayload(deal));
      },
      onCopyLink: () => {
        const url = buildShareableDealUrl(deal, deepLinkContext);
        void copyTextToClipboard(url).then((ok) => {
          setLinkCopyToast(ok ? d.cardMenu.copyLinkToast : d.cardMenu.copyLinkError);
        });
      },
    }),
  [
    d.cardMenu.copyLinkError,
    d.cardMenu.copyLinkToast,
    deepLinkContext,
    handleMarkLost,
    handleMarkSold,
    handleStageChange,
    liveChat,
    locale,
    openDealDetail,
    router,
  ],
  );

  useEffect(() => {
    if (!isActive || !router.isReady) return;

    const key = resolveDealDeepLinkKey(router.query.deal);
    if (!key) return;

    if (deepLinkContext === 'overview' && router.query.tab !== 'deals') {
      void router.replace(
        { pathname: '/overview', query: { tab: 'deals', deal: key } },
        undefined,
        { shallow: true },
      );
    } else if (typeof router.query.deal !== 'string' && readDealKeyFromHash()) {
      const nextQuery = { ...router.query, deal: key };
      void router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
    }

    const match = findDealByDeepLink(key, deals);
    if (match) setSelectedDeal(match);
  }, [isActive, router.isReady, router.query.deal, router.query.tab, deals, deepLinkContext, router]);

  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;
    const onHash = () => {
      const key = readDealKeyFromHash();
      if (!key) return;
      const match = findDealByDeepLink(key, deals);
      if (match) setSelectedDeal(match);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [isActive, deals]);

  const undoSold = useCallback(() => {
    if (!soldToast) return;
    setDeals((prev) =>
      prev.map((row) => (row.id === soldToast.dealId ? soldToast.snapshot : row)),
    );
    setSoldToast(null);
    void dealsApi.patchStage(soldToast.dealId, soldToast.snapshot.stage).catch(() => {
      setStageError(d.stageSaveError);
    });
  }, [soldToast, d.stageSaveError]);

  useEffect(() => {
    if (!soldToast) return;
    const id = window.setTimeout(() => setSoldToast(null), 8000);
    return () => window.clearTimeout(id);
  }, [soldToast]);

  useEffect(() => {
    if (!linkCopyToast) return;
    const id = window.setTimeout(() => setLinkCopyToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [linkCopyToast]);

  if (!isActive) return null;

  return (
    <div className="lintel-rentals-enter flex w-full min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-start xl:justify-between xl:gap-3">
        <h1 className="min-w-0 shrink-0 text-3xl font-bold leading-none tracking-tight text-slate-900 dark:text-white">
          {copy.nav.deals}
        </h1>
        <div className="min-w-0 flex-1 xl:flex xl:justify-end">
          <DealsKpiStrip
            lintelLayout
            openDeals={openDealsCount}
            weightedCommission={formatPrice(Math.round(weightedCommission))}
            closingCount={closingThisMonth.count}
            closingCommissionBadge={
              closingThisMonth.commission > 0
                ? formatCommissionCompact(closingThisMonth.commission)
                : undefined
            }
            winRate={winRate}
          />
        </div>
      </div>

      {stageError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {stageError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="lintel-deals-agent-strip">
          {DEAL_AGENT_DIRECTORY.map((agent) => {
            const pressed = activeAgentIds.includes(agent.id);
            return (
              <button
                key={agent.id}
                type="button"
                aria-pressed={pressed}
                onClick={() => toggleAgent(agent.id)}
                className={`lintel-deals-agent-btn ${pressed ? 'is-pressed' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={agent.avatarUrl}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover ring-2 ring-white dark:ring-slate-700"
                />
                {agent.shortName}
              </button>
            );
          })}
        </div>
        <div className="inline-flex gap-1 rounded-full bg-white p-1 text-sm font-semibold shadow-sm dark:bg-gray-800">
          {(['all', 'sale', 'rent'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setListingFilter(key)}
              className={lintelSegment(listingFilter === key)}
            >
              {key === 'all' ? d.filterAll : key === 'sale' ? d.filterSale : d.filterRent}
            </button>
          ))}
        </div>
      </div>

      <DealsKanban
        deals={deals}
        activeAgentIds={activeAgentIds}
        listingFilter={listingFilter}
        cardsBootLoading={cardsBootLoading}
        onDealClick={openDealDetail}
        onDealStageChange={handleStageChange}
        buildCardMenuHandlers={buildCardMenuHandlers}
      />

      {linkCopyToast ? (
        <div
          className="lintel-deal-card-menu-enter pointer-events-none fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          <div className="rounded-full border border-slate-800/10 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
            {linkCopyToast}
          </div>
        </div>
      ) : null}

      {soldToast ? (
        <div
          className="lintel-deal-card-menu-enter pointer-events-none fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-3"
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-slate-800/10 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
            <span>
              {d.cardMenu.soldToast
                .replace('{property}', soldToast.snapshot.propertyName)
                .replace('{commission}', formatPrice(soldToast.snapshot.commission))}
            </span>
            <button
              type="button"
              className="rounded-full bg-[#ff8a3d] px-3 py-1 text-xs font-bold text-white transition hover:bg-[#f97316]"
              onClick={undoSold}
            >
              {d.cardMenu.undo}
            </button>
          </div>
        </div>
      ) : null}

      {selectedDeal ? (
        <DealDetailModal
          deal={selectedDeal}
          allDeals={deals}
          onClose={closeDealDetail}
          onSave={(dealId, patch) => {
            setDeals((prev) => prev.map((row) => (row.id === dealId ? { ...row, ...patch } : row)));
          }}
          onMarkLost={handleMarkLost}
          onOpenProperty={(row) => buildCardMenuHandlers(row).onOpenProperty()}
          onMessageBuyer={(row) => buildCardMenuHandlers(row).onMessageClient()}
          onSelectDeal={openDealDetail}
        />
      ) : null}
    </div>
  );
}
