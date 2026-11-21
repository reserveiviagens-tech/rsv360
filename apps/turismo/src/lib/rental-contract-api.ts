import { fase1ApiBase } from './fase1-api';

function authHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('rsv_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type RentalSignListItem = {
  id: string;
  unitId: string;
  status: 'pending' | 'signed' | 'expired' | 'revoked';
  signerName: string;
  signerCpfMasked?: string;
  termMonths: number;
  depositType: string;
  expiresAt: string;
  createdAt: string;
  signedAt?: string;
};

export async function downloadRentalContractPreview(body: {
  unitId: string;
  unitName: string;
  address: string;
  tenantName: string;
  monthlyRent: number;
  termMonths?: number;
  startDate: string;
  depositType?: 'caucao' | 'fiador' | 'seguro';
}): Promise<Blob> {
  const res = await fetch(`${fase1ApiBase()}/api/v1/rental-contracts/preview`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Não foi possível gerar a minuta do contrato');
  return res.blob();
}

export async function requestRentalSign(body: {
  unitId: string;
  unitName: string;
  address: string;
  monthlyRent: number;
  startDate: string;
  signerEmail: string;
  signerName: string;
  signerCpf: string;
  termMonths: number;
  depositType: 'caucao' | 'fiador' | 'seguro';
}): Promise<{
  requestId: string;
  signingToken: string;
  expiresAt: string;
  publicSignUrl: string;
  emailInvite?: { sent: boolean; skipped: boolean };
}> {
  const res = await fetch(`${fase1ApiBase()}/api/v1/rental-contracts/sign-request`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    success: boolean;
    data?: {
      requestId: string;
      signingToken: string;
      expiresAt: string;
      publicSignUrl: string;
      emailInvite?: { sent: boolean; skipped: boolean };
    };
    error?: string;
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? 'Falha ao solicitar assinatura');
  }
  return json.data;
}

export type RentalSignAuditEvent = {
  id: string;
  eventType: string;
  label: string;
  occurredAt: string;
  actor?: string;
  metadata?: Record<string, unknown>;
};

export async function downloadRentalSignAuditExport(params: {
  format: 'csv' | 'json';
  unitId: string;
  requestId?: string;
}): Promise<Blob> {
  const q = new URLSearchParams({ format: params.format, unitId: params.unitId });
  if (params.requestId) q.set('requestId', params.requestId);
  const res = await fetch(
    `${fase1ApiBase()}/api/v1/rental-contracts/admin/sign-audit/export?${q}`,
    { headers: authHeaders() },
  );
  if (!res.ok) throw new Error('Exportação indisponível ou sem permissão');
  return res.blob();
}

export async function fetchRentalSignEvents(
  requestId: string,
  unitId: string,
): Promise<RentalSignAuditEvent[]> {
  const q = new URLSearchParams({ unitId });
  const res = await fetch(
    `${fase1ApiBase()}/api/v1/rental-contracts/sign-requests/${encodeURIComponent(requestId)}/events?${q}`,
    { headers: authHeaders() },
  );
  const json = (await res.json()) as { success: boolean; data?: { items: RentalSignAuditEvent[] } };
  if (!res.ok || !json.success) throw new Error('Falha ao carregar auditoria');
  return json.data?.items ?? [];
}

export async function revokeRentalSignRequest(requestId: string, unitId: string): Promise<void> {
  const res = await fetch(
    `${fase1ApiBase()}/api/v1/rental-contracts/sign/${encodeURIComponent(requestId)}/revoke?unitId=${encodeURIComponent(unitId)}`,
    { method: 'POST', headers: authHeaders() },
  );
  const json = (await res.json()) as { success: boolean };
  if (!res.ok || !json.success) throw new Error('Não foi possível revogar a solicitação');
}

export async function fetchRentalSignRequests(unitId: string): Promise<RentalSignListItem[]> {
  const res = await fetch(
    `${fase1ApiBase()}/api/v1/rental-contracts/sign-requests?unitId=${encodeURIComponent(unitId)}`,
    { headers: authHeaders() },
  );
  const json = (await res.json()) as { success: boolean; data?: { items: RentalSignListItem[] } };
  if (!res.ok || !json.success) return [];
  return json.data?.items ?? [];
}

export async function fetchPublicSignView(
  requestId: string,
  token: string,
): Promise<{
  id: string;
  status: string;
  signerName: string;
  unitName: string;
  address: string;
  termMonths: number;
  depositType: string;
  monthlyRent: number;
  expiresAt: string;
}> {
  const q = new URLSearchParams({ token });
  const res = await fetch(
    `${fase1ApiBase()}/api/v1/rental-contracts/public/sign/${encodeURIComponent(requestId)}?${q}`,
  );
  const json = (await res.json()) as { success: boolean; data?: Record<string, unknown>; error?: string };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? 'Link inválido');
  }
  return json.data as Awaited<ReturnType<typeof fetchPublicSignView>>;
}

export function publicSignPdfUrl(requestId: string, token: string): string {
  const q = new URLSearchParams({ token });
  return `${fase1ApiBase()}/api/v1/rental-contracts/public/sign/${encodeURIComponent(requestId)}/pdf?${q}`;
}

export async function completePublicSign(requestId: string, token: string): Promise<void> {
  const res = await fetch(
    `${fase1ApiBase()}/api/v1/rental-contracts/public/sign/${encodeURIComponent(requestId)}/complete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, acceptTerms: true }),
    },
  );
  const json = (await res.json()) as { success: boolean; error?: string };
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? 'Não foi possível registrar a assinatura');
  }
}