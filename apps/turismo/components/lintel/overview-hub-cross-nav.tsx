'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import { buildOverviewHubPath, OVERVIEW_HUB_PIPELINE_TABS } from '@/lib/overview-hub-links';

type Props = {
  activeTab: string;
  dealId?: string;
  leadId?: string;
  rentalId?: string;
};

export function OverviewHubCrossNav({ activeTab, dealId, leadId, rentalId }: Props) {
  const router = useRouter();

  return (
    <nav
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200/80 bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-white/5"
      aria-label="Navegação pipeline CRM"
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-1">Hub</span>
      {OVERVIEW_HUB_PIPELINE_TABS.map((tab) => {
        const href = buildOverviewHubPath({
          tab: tab.id,
          deal: tab.id === 'deals' ? dealId : undefined,
          lead: tab.id === 'leads' ? leadId : undefined,
          rental: tab.id === 'rentals' ? rentalId : undefined,
        });
        const isActive = activeTab === tab.id;
        return (
          <Link
            key={tab.id}
            href={href}
            className={`h-8 px-3 rounded-full text-xs font-bold transition-all ${
              isActive
                ? 'bg-[#2f5bea] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10'
            }`}
            onClick={(e) => {
              if (router.pathname === '/overview') {
                e.preventDefault();
                void router.replace(href, undefined, { shallow: true });
              }
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}