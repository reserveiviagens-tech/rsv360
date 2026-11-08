export type OverviewContactRow = {
  id: string;
  name: string;
  kind: 'buyer' | 'seller' | 'tenant' | 'landlord';
  email: string;
  phone: string;
  city: string;
  budget: string;
  agent: string;
  lastContact: string;
  favorite: boolean;
};

type CarteiraUser = {
  id: number;
  name: string | null;
  email: string;
  role: string | null;
} | null;

export type CarteiraVinculoRow = {
  corretorId: number;
  proprietarioId: number;
  status: string;
  criadoEm: string | null;
  corretor: CarteiraUser;
  proprietario: CarteiraUser;
};

function formatLinkedSince(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function displayName(user: CarteiraUser, fallbackId: number): string {
  if (user?.name?.trim()) return user.name.trim();
  if (user?.email) return user.email.split('@')[0] ?? `Parceiro ${fallbackId}`;
  return `Parceiro ${fallbackId}`;
}

/** Carteira P0.5 → cards da aba Contatos (LGPD: e-mail já mascarado pela API). */
export function carteiraToOverviewContacts(
  items: CarteiraVinculoRow[],
  viewerRole: string,
): OverviewContactRow[] {
  const brokerView = viewerRole === 'corretor' || viewerRole === 'agente' || viewerRole === 'promotor';

  return items.map((row) => {
    const focus = brokerView ? row.proprietario : row.corretor;
    const counterpart = brokerView ? row.corretor : row.proprietario;
    const focusId = brokerView ? row.proprietarioId : row.corretorId;

    return {
      id: `carteira-${row.corretorId}-${row.proprietarioId}`,
      name: displayName(focus, focusId),
      kind: brokerView ? 'landlord' : 'seller',
      email: focus?.email ?? '—',
      phone: '—',
      city: row.status === 'ativo' ? 'Vínculo ativo' : 'Vínculo inativo',
      budget: row.status === 'ativo' ? 'Carteira RSV360°' : 'Inativo',
      agent: counterpart ? displayName(counterpart, counterpart.id) : '—',
      lastContact: formatLinkedSince(row.criadoEm),
      favorite: row.status === 'ativo',
    };
  });
}
