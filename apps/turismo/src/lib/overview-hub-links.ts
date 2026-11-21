export type OverviewHubTab = 'deals' | 'leads' | 'contacts' | 'rentals' | 'sales' | 'overview';

export type OverviewHubDeepLink = {
  tab: OverviewHubTab;
  deal?: string;
  lead?: string;
  rental?: string;
  property?: string;
};

export function buildOverviewHubPath(link: OverviewHubDeepLink): string {
  if (link.tab === 'overview') return '/overview';

  const params = new URLSearchParams({ tab: link.tab });
  if (link.deal) params.set('deal', link.deal);
  if (link.lead) params.set('lead', link.lead);
  if (link.rental) params.set('rental', link.rental);
  if (link.property) params.set('property', link.property);

  return `/overview?${params.toString()}`;
}

export const OVERVIEW_HUB_PIPELINE_TABS: { id: Exclude<OverviewHubTab, 'overview' | 'sales'>; label: string }[] = [
  { id: 'deals', label: 'Deals' },
  { id: 'leads', label: 'Leads' },
  { id: 'contacts', label: 'Contatos' },
  { id: 'rentals', label: 'Locações' },
];