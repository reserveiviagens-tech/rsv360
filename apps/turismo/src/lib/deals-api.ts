import { fase1ApiBase } from './fase1-api';

export type DealsApiStage =
  | 'viewing'
  | 'offer'
  | 'negotiation'
  | 'under_contract'
  | 'closed';

export type DealsApiDeal = {
  id: string;
  agentId: string;
  agentName: string;
  propertyId: string;
  propertyName: string;
  location: string;
  propertyType: string;
  beds: number;
  baths: number;
  sqft: number;
  price: number;
  commission: number;
  stage: DealsApiStage;
  nextStep?: string;
  createdAt: string;
  updatedAt: string;
  listingSource?: 'zillow' | 'realtor' | 'direct';
  status: 'active' | 'won' | 'lost' | 'pending';
  notes?: string;
};

function authHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function parseJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof json.error === 'string'
        ? json.error
        : res.statusText || 'Erro ao comunicar com a API de deals';
    throw new Error(msg);
  }
  return json as T;
}

export type CreateDealPayload = {
  propertyName: string;
  price?: number;
  propertyType?: string;
  location?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  commission?: number;
  stage?: DealsApiStage;
  nextStep?: string;
  notes?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  leadId?: string;
};

export const dealsApi = {
  async list(): Promise<DealsApiDeal[]> {
    const res = await fetch(`${fase1ApiBase()}/api/v1/deals`, { headers: authHeaders() });
    const body = await parseJson<{ success: boolean; data: { items: DealsApiDeal[] } }>(res);
    return body.data?.items ?? [];
  },

  async create(payload: CreateDealPayload): Promise<DealsApiDeal> {
    const res = await fetch(`${fase1ApiBase()}/api/v1/deals`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const body = await parseJson<{ success: boolean; data: DealsApiDeal }>(res);
    return body.data;
  },

  async patchStage(dealId: string, stage: DealsApiStage): Promise<DealsApiDeal> {
    const res = await fetch(`${fase1ApiBase()}/api/v1/deals/${encodeURIComponent(dealId)}/stage`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ stage }),
    });
    const body = await parseJson<{ success: boolean; data: DealsApiDeal }>(res);
    return body.data;
  },
};
