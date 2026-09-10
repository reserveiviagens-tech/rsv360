import { APIRequestContext } from '@playwright/test';

const backendBase = process.env.RSV_FASE5_BACKEND_URL || 'http://localhost:3002';

export async function loginStaffToken(request: APIRequestContext): Promise<string> {
  const email = process.env.SEED_TEST_USER_EMAIL || 'test@local.dev';
  const password = process.env.SEED_TEST_USER_PASSWORD || 'dev-only-fallback-do-not-use-in-prod';

  const res = await request.post(`${backendBase}/api/v1/auth/login`, {
    data: { email, password },
    headers: { 'X-Forwarded-For': `fase5-${Date.now()}` },
  });

  if (res.status() !== 200) {
    throw new Error(`Login falhou (${res.status()}): ${await res.text()}`);
  }

  const body = await res.json();
  return body.data.access_token as string;
}

export async function createPublicProposta(request: APIRequestContext, token: string) {
  const res = await request.post(`${backendBase}/api/v1/propostas`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      titulo: `Proposta E2E ${Date.now()}`,
      clienteNome: 'Cliente E2E Fase5',
      clienteEmail: 'e2e-fase5@test.local',
      valorTotal: '2500.00',
      status: 'sent',
      isPublica: true,
      conteudo: {
        itens: [{ descricao: 'Pacote Caldas Novas 4 dias', valor: 2500 }],
      },
    },
  });

  if (res.status() !== 201) {
    throw new Error(`Criar proposta falhou (${res.status()}): ${await res.text()}`);
  }

  const body = await res.json();
  const data = body.data as { id: number; titulo: string; tokenPublico?: string };
  if (!data?.tokenPublico) {
    throw new Error('Criar proposta: tokenPublico ausente na resposta');
  }
  return data as { id: number; titulo: string; tokenPublico: string };
}

export { backendBase };
