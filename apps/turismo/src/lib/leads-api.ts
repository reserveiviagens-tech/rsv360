import { fase1ApiBase } from './fase1-api';
import type { LeadApiRow } from './overview-leads';

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
        : res.statusText || 'Erro ao comunicar com a API de leads';
    throw new Error(msg);
  }
  return json as T;
}

export type CreateLeadPayload = {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  source?: string;
  notes?: string;
};

export const leadsApi = {
  async list(signal?: AbortSignal): Promise<LeadApiRow[]> {
    const res = await fetch(`${fase1ApiBase()}/api/v1/leads`, { headers: authHeaders(), signal });
    const body = await parseJson<{ success: boolean; data: { items: LeadApiRow[] } }>(res);
    return body.data?.items ?? [];
  },

  async create(payload: CreateLeadPayload): Promise<LeadApiRow> {
    const res = await fetch(`${fase1ApiBase()}/api/v1/leads`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const body = await parseJson<{ success: boolean; data: LeadApiRow }>(res);
    return body.data;
  },

  async patchStatus(id: string, status: 'new' | 'contacted' | 'qualified'): Promise<LeadApiRow> {
    const res = await fetch(`${fase1ApiBase()}/api/v1/leads/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    const body = await parseJson<{ success: boolean; data: LeadApiRow }>(res);
    return body.data;
  },
};