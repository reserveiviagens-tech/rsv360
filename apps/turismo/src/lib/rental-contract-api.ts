import { fase1ApiBase } from './fase1-api';

function authHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('rsv_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function downloadRentalContractPreview(body: {
  unitId: string;
  unitName: string;
  address: string;
  tenantName: string;
  monthlyRent: number;
  termMonths?: number;
  startDate: string;
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
  signerEmail: string;
  signerName: string;
}): Promise<{ requestId: string; signingToken: string; expiresAt: string }> {
  const res = await fetch(`${fase1ApiBase()}/api/v1/rental-contracts/sign-request`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    success: boolean;
    data?: { requestId: string; signingToken: string; expiresAt: string };
    error?: string;
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? 'Falha ao solicitar assinatura');
  }
  return json.data;
}