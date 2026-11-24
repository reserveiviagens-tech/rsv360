/** Demo hub contact ids — mirrors Overview demo cards in RSV360ExecutiveDashboard. */
const DEMO_CONTACT_ID_BY_NORMALIZED_NAME: Readonly<Record<string, string>> = {
  'priya natarajan': 'c1',
  'spencer hale': 'c2',
  'omar saleh': 'c3',
  'camila duarte': 'c4',
  'marcus adebayo': 'c5',
  'grace liu': 'c6',
  'ben okoro': 'c7',
};

export function normalizeBuyerDisplayName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Resolves overview `?contact=` id for demo buyer names; API-only names return null. */
export function resolveBuyerContactId(clientName: string | undefined): string | null {
  if (!clientName?.trim()) return null;
  return DEMO_CONTACT_ID_BY_NORMALIZED_NAME[normalizeBuyerDisplayName(clientName)] ?? null;
}

export function buildOverviewContactHubPath(contactId: string): string {
  const params = new URLSearchParams({ tab: 'contacts', contact: contactId.trim() });
  return `/overview?${params.toString()}`;
}