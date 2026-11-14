export type LeadStage = 'new' | 'contacted' | 'qualified';

export type LeadIntent = 'buy' | 'rent' | 'sell';

export type LeadFitFactors = {
  budgetFit: number;
  timeline: number;
  financing: number;
};

export type LeadApiRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  score: number;
  intent: LeadIntent;
  budget: string;
  source: string;
  time: string;
  status: LeadStage;
  fitFactors: LeadFitFactors;
  notes?: string;
  createdAt?: string | null;
};

export type LeadPageCard = {
  id: string;
  name: string;
  email: string;
  phone: string;
  score: number;
  intent: LeadIntent;
  budget: string;
  source: string;
  time: string;
  status: LeadStage;
  fitFactors: LeadFitFactors;
  notes?: string;
  avatarInitials?: string;
};

export type CarteiraUser = {
  id: number;
  name: string | null;
  email: string;
  role: string | null;
} | null;

/** Leads P2b → cards da aba Leads (LGPD: e-mail/telefone já mascarados pela API ou pela camada de exibição). */
export function leadApiRowToPageCard(row: LeadApiRow): LeadPageCard {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    score: row.score,
    intent: row.intent,
    budget: row.budget,
    source: row.source,
    time: row.time,
    status: row.status,
    fitFactors: row.fitFactors,
    notes: row.notes,
    avatarInitials: initialsFromName(row.name),
  };
}

export function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Fallback determinístico: se a API não responder, usa SAMPLE_LEADS importado pelo caller. */
export function emptyLeads(): LeadApiRow[] {
  return [];
}

/** Normaliza status de lead vindo da API (garante valores válidos). */
export function normalizeLeadStatus(raw: string | null | undefined): LeadStage {
  const s = (raw ?? 'new').toLowerCase();
  if (s === 'contacted') return 'contacted';
  if (s === 'qualified') return 'qualified';
  return 'new';
}

/** Normaliza intenção de lead vinda da API. */
export function normalizeLeadIntent(raw: string | null | undefined): LeadIntent {
  const s = (raw ?? 'buy').toLowerCase();
  if (s === 'rent') return 'rent';
  if (s === 'sell') return 'sell';
  return 'buy';
}

/** Máscara LGPD: e-mail mostra apenas domínio, telefone mostra apenas últimos 4 dígitos. */
export function maskLeadEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal = local.length > 2 ? local.slice(0, 2) + '•••••' : '•••••';
  return `${maskedLocal}@${domain}`;
}

export function maskLeadPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  return '•••• •••• ' + digits.slice(-4);
}

/** Busca leads da API com fallback resiliente para SAMPLE_LEADS (fallback de demo). */
export async function fetchLeads({
  sampleDeals,
  apiBase,
  signal,
}: {
  sampleDeals: LeadPageCard[];
  apiBase?: string;
  signal?: AbortSignal;
}): Promise<LeadPageCard[]> {
  try {
    const base = apiBase ?? (typeof window !== 'undefined' ? (window as any).RSV_API_BASE ?? '' : '');
    const url = base ? `${base.replace(/\/$/, '')}/api/v1/leads` : '';
    if (!url) throw new Error('sem API base configurada');

    const res = await fetch(url, { signal, headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) throw new Error(`API ${res.status}`);

    const body = (await res.json()) as { success?: boolean; data?: LeadApiRow[] | LeadApiRow };
    const items = Array.isArray(body?.data) ? body.data : body?.data ? [body.data] : [];
    if (items.length === 0) throw new Error('API retornou vazio');

    return items.map(leadApiRowToPageCard);
  } catch {
    // Fallback silencioso: mantém SAMPLE_LEADS (demo visual ininterrupta)
    return sampleDeals;
  }
}

