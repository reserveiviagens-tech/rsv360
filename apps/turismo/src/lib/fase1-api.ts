import { DEFAULT_API_URL } from './auth-v1';

export const FASE1_API_BASE = DEFAULT_API_URL;

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('access_token') || localStorage.getItem('token') || '';
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${FASE1_API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || json.message || res.statusText);
  return json as T;
}

export const fase1Api = {
  // Orçamentos
  listOrcamentos: () => fetchJson<{ success: boolean; data: unknown[] }>('/api/v1/orcamentos'),
  getOrcamento: (id: number) => fetchJson<{ success: boolean; data: unknown }>(`/api/v1/orcamentos/${id}`),
  createOrcamento: (body: Record<string, unknown>) =>
    fetchJson('/api/v1/orcamentos', { method: 'POST', body: JSON.stringify(body) }),
  updateOrcamento: (id: number, body: Record<string, unknown>) =>
    fetchJson(`/api/v1/orcamentos/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteOrcamento: (id: number) => fetchJson(`/api/v1/orcamentos/${id}`, { method: 'DELETE' }),
  addOrcamentoItem: (id: number, body: Record<string, unknown>) =>
    fetchJson(`/api/v1/orcamentos/${id}/itens`, { method: 'POST', body: JSON.stringify(body) }),
  convertOrcamento: (id: number) =>
    fetchJson(`/api/v1/orcamentos/${id}/converter-proposta`, { method: 'POST', body: '{}' }),

  // Propostas
  listPropostas: (status?: string) =>
    fetchJson<{ success: boolean; data: unknown[] }>(
      `/api/v1/propostas${status ? `?status=${status}` : ''}`,
    ),
  getProposta: (id: number) => fetchJson<{ success: boolean; data: unknown }>(`/api/v1/propostas/${id}`),
  createProposta: (body: Record<string, unknown>) =>
    fetchJson('/api/v1/propostas', { method: 'POST', body: JSON.stringify(body) }),
  updateProposta: (id: number, body: Record<string, unknown>) =>
    fetchJson(`/api/v1/propostas/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  listTemplates: () => fetchJson<{ success: boolean; data: unknown[] }>('/api/v1/propostas/templates'),
  getHitl: (id: number) => fetchJson<{ success: boolean; data: unknown }>(`/api/v1/propostas/${id}/hitl`),
  takeoverHitl: (id: number) =>
    fetchJson(`/api/v1/propostas/${id}/hitl/takeover`, { method: 'POST', body: '{}' }),
  releaseHitl: (id: number) =>
    fetchJson(`/api/v1/propostas/${id}/hitl/release`, { method: 'POST', body: '{}' }),

  // Passageiros
  listPassageiros: () => fetchJson<{ success: boolean; data: unknown[] }>('/api/v1/passageiros'),
  getPassageiro: (id: number) => fetchJson<{ success: boolean; data: unknown }>(`/api/v1/passageiros/${id}`),
  createPassageiro: (body: Record<string, unknown>) =>
    fetchJson('/api/v1/passageiros', { method: 'POST', body: JSON.stringify(body) }),
  updatePassageiro: (id: number, body: Record<string, unknown>) =>
    fetchJson(`/api/v1/passageiros/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  createFnrh: (passageiroId: number, body: Record<string, unknown>) =>
    fetchJson(`/api/v1/passageiros/${passageiroId}/fnrh`, { method: 'POST', body: JSON.stringify(body) }),

  // Financeiro
  financeiroDashboard: () => fetchJson<{ success: boolean; data: unknown }>('/api/v1/financeiro/dashboard'),
  fluxoCaixa: () => fetchJson<{ success: boolean; data: unknown }>('/api/v1/financeiro/fluxo-caixa'),
  listTransacoes: () => fetchJson<{ success: boolean; data: unknown[] }>('/api/v1/financeiro/transacoes'),
  createTransacao: (body: Record<string, unknown>) =>
    fetchJson('/api/v1/financeiro/transacoes', { method: 'POST', body: JSON.stringify(body) }),
  listContasReceber: () => fetchJson<{ success: boolean; data: unknown[] }>('/api/v1/financeiro/contas-receber'),
  listContasPagar: () => fetchJson<{ success: boolean; data: unknown[] }>('/api/v1/financeiro/contas-pagar'),

  // Campanhas
  listCampanhas: () => fetchJson<{ success: boolean; data: unknown[] }>('/api/v1/campanhas'),
  campanhasMetricas: () => fetchJson<{ success: boolean; data: unknown }>('/api/v1/campanhas/metricas'),
  createCampanha: (body: Record<string, unknown>) =>
    fetchJson('/api/v1/campanhas', { method: 'POST', body: JSON.stringify(body) }),
  listCupons: () => fetchJson<{ success: boolean; data: unknown[] }>('/api/v1/campanhas/cupons'),

  // Logística
  logisticaDashboard: () => fetchJson<{ success: boolean; data: unknown }>('/api/v1/logistica'),
  listFornecedores: () => fetchJson<{ success: boolean; data: unknown[] }>('/api/v1/logistica/fornecedores'),
  listReservas: () => fetchJson<{ success: boolean; data: unknown[] }>('/api/v1/logistica/reservas'),
  listVouchers: () => fetchJson<{ success: boolean; data: unknown[] }>('/api/v1/logistica/vouchers'),
  createVoucher: (body: Record<string, unknown>) =>
    fetchJson('/api/v1/logistica/vouchers', { method: 'POST', body: JSON.stringify(body) }),

  // Relatórios
  relatoriosDashboard: () => fetchJson<{ success: boolean; data: unknown }>('/api/v1/relatorios/dashboard'),
  exportCsvUrl: (tipo: string) => `${FASE1_API_BASE}/api/v1/relatorios/export/csv?tipo=${tipo}`,
  exportPdfUrl: (tipo: string) => `${FASE1_API_BASE}/api/v1/relatorios/export/pdf?tipo=${tipo}`,

  // Configurações — modulo_propostas (configuracoes_sistema)
  getModuloPropostas: () =>
    fetchJson<{
      success: boolean;
      data: {
        validadeCotacaoHoras: number;
        urgenciaEstilo: 'countdown' | 'badge' | 'nenhum';
        avisoExpiracaoHoras: number;
        permitirApenasHotel?: boolean;
        disparoAutomatizadoCaldasAi?: boolean;
        delayDisparoMinutos?: number;
      };
    }>('/api/v1/configuracoes/modulo-propostas'),
  updateModuloPropostas: (body: {
    validadeCotacaoHoras?: number;
    urgenciaEstilo?: 'countdown' | 'badge' | 'nenhum';
    avisoExpiracaoHoras?: number;
  }) =>
    fetchJson('/api/v1/configuracoes/modulo-propostas', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  // Anfitrião / parceiros (PR 24B)
  anfitriaoDashboard: () =>
    fetchJson<{ success: boolean; data: { total: number; incompletas: number; emAprovacao: number; publicadas: number } }>(
      '/api/v1/acomodacoes/anfitriao/dashboard',
    ),

  anfitriaoDesempenho: (mes?: string) =>
    fetchJson<{
      success: boolean;
      data: {
        periodo: { de: string; ate: string; mes: string };
        resumo: {
          unidadesTotal: number;
          unidadesPublicadas: number;
          reservas: number;
          receitaTotal: number;
          noitesReservadas: number;
          noitesDisponiveisEstimadas: number;
          ocupacaoPct: number | null;
        };
        qualidade: {
          scoreMedio: number | null;
          categorias: Array<{ id: string; label: string; pct: number }>;
          porUnidade: Array<{
            id: number;
            titulo: string;
            score: number;
            categorias: Array<{
              id: string;
              label: string;
              pct: number;
              checks: Array<{ id: string; ok: boolean; label: string }>;
            }>;
          }>;
          dicas: string[];
        };
        conversao: {
          reservas: number;
          unidadesAtivas: number;
          reservasPorUnidade: number | null;
          nota: string;
        };
        porUnidade: Array<{
          acomodacaoId: number;
          titulo: string;
          statusPublicacao: string;
          reservas: number;
          receita: number;
          noites: number;
        }>;
        oportunidades?: Array<{
          id: string;
          titulo: string;
          categoria: string;
          pct: number;
          done: boolean;
          ctaPath?: string;
          ctaLabel?: string;
          ctaUnitId?: number;
          ctaUnitTitulo?: string;
        }>;
        oportunidadesResumo?: {
          pendentes: number;
          concluidas: number;
          pctNaoConcluidas: number;
        };
      };
    }>(
      `/api/v1/acomodacoes/anfitriao/desempenho${mes ? `?mes=${encodeURIComponent(mes)}` : ''}`,
    ),

  /** NFSe draft only — status nfse_pending, no municipal authorization. */
  anfitriaoPrepararNfse: (unidadeId: number, mes?: string) =>
    fetchJson<{
      success: boolean;
      data: {
        id: string;
        mes: string;
        receita: number;
        aliquotaPct: number | null;
        isento: boolean;
        impostoEstimado: number | null;
        status: 'nfse_pending' | 'nfse_cancelled';
        criadoEm: string;
      };
      message?: string;
    }>(`/api/v1/acomodacoes/anfitriao/unidades/${unidadeId}/nfse/preparar`, {
      method: 'POST',
      body: JSON.stringify(mes ? { mes } : {}),
    }),

  anfitriaoListarNfseRascunhos: (unidadeId: number) =>
    fetchJson<{
      success: boolean;
      data: Array<{
        id: string;
        mes: string;
        receita: number;
        aliquotaPct: number | null;
        isento: boolean;
        impostoEstimado: number | null;
        status: 'nfse_pending' | 'nfse_cancelled';
        criadoEm: string;
      }>;
    }>(`/api/v1/acomodacoes/anfitriao/unidades/${unidadeId}/nfse/rascunhos`),

  anfitriaoMinhas: (page = 1, pageSize = 20, ativo?: 'true' | 'false' | 'all') => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (ativo) params.set('ativo', ativo);
    return fetchJson<{
      success: boolean;
      data: {
        items: Array<{
          id: number;
          titulo: string;
          hotelId?: string;
          statusPublicacao?: string;
          precoDiaria?: string | number | null;
          midia?: unknown;
          ativo?: boolean | null;
          quartos?: number | null;
          capacidadeMax?: number | null;
          capacidadeBase?: number | null;
          configBanheiro?: string | null;
          configSala?: string | null;
          amenidades?: unknown;
          utensilios?: unknown;
          eletrodomesticos?: unknown;
        }>;
        total: number;
        page: number;
        pageSize: number;
      };
    }>(`/api/v1/acomodacoes/anfitriao/minhas?${params.toString()}`);
  },
  anfitriaoMinhasComissoes: (page = 1) =>
    fetchJson<{
      success: boolean;
      data: {
        items: Array<{
          id: number;
          propostaId: number;
          acomodacaoId: number | null;
          papel: string;
          baseValor: string;
          percentual: string;
          valorComissao: string;
          status: string;
          propostaCodigo: string | null;
          propostaTitulo: string;
          criadoEm: string | null;
        }>;
        page: number;
        pageSize: number;
        moduloAtivo: boolean;
      };
    }>(`/api/v1/comissoes/minhas-comissoes?page=${page}`),
  anfitriaoUnidade: (id: number) =>
    fetchJson<{ success: boolean; data: unknown }>(`/api/v1/acomodacoes/anfitriao/unidades/${id}`),
  atualizarAnfitriaoUnidade: (id: number, body: Record<string, unknown>) =>
    fetchJson(`/api/v1/acomodacoes/anfitriao/unidades/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  /** Upload image → server converts to light WebP and sets midia.trilhoThumb. */
  anfitriaoUploadTrilhoThumb: async (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${FASE1_API_BASE}/api/v1/acomodacoes/anfitriao/unidades/${id}/trilho-thumb`, {
      method: 'POST',
      headers: {
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: form,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || json.message || res.statusText);
    return json as {
      success: boolean;
      data: { unidade: unknown; trilhoThumb: string; bytes: number };
    };
  },
  anfitriaoUploadAcessibilidadeFoto: async (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(
      `${FASE1_API_BASE}/api/v1/acomodacoes/anfitriao/unidades/${id}/acessibilidade-foto`,
      {
        method: 'POST',
        headers: {
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: form,
      },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || json.message || res.statusText);
    return json as { success: boolean; data: { url: string; bytes: number } };
  },
  anfitriaoUploadGaleriaFoto: async (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(
      `${FASE1_API_BASE}/api/v1/acomodacoes/anfitriao/unidades/${id}/galeria-foto`,
      {
        method: 'POST',
        headers: {
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: form,
      },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || json.message || res.statusText);
    return json as {
      success: boolean;
      data: { unidade: unknown; url: string; bytes: number };
    };
  },
  anfitriaoPatchGaleria: (
    id: number,
    body: {
      removeUrl?: string;
      moveUrl?: string;
      direction?: 'left' | 'right';
      setCapaUrl?: string;
      setCategoriaUrl?: string;
      categoria?: string | null;
      setCaptionUrl?: string;
      caption?: string | null;
    },
  ) =>
    fetchJson<{ success: boolean; data: unknown }>(
      `/api/v1/acomodacoes/anfitriao/unidades/${id}/galeria`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
    ),
  anfitriaoDefinirTrilhoCapa: (id: number, url: string) =>
    fetchJson<{ success: boolean; data: unknown }>(
      `/api/v1/acomodacoes/anfitriao/unidades/${id}/trilho-capa`,
      {
        method: 'PATCH',
        body: JSON.stringify({ url }),
      },
    ),
  enviarAprovacaoUnidade: (id: number) =>
    fetchJson(`/api/v1/acomodacoes/anfitriao/unidades/${id}/enviar-aprovacao`, {
      method: 'POST',
      body: '{}',
    }),
  anfitriaoArquivarUnidade: (id: number, body?: { motivo?: string }) =>
    fetchJson<{
      success: boolean;
      data: { unidade: unknown; already_archived: boolean };
    }>(`/api/v1/acomodacoes/anfitriao/unidades/${id}/arquivar`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),
  anfitriaoDesarquivarUnidade: (id: number, body?: { motivo?: string }) =>
    fetchJson<{
      success: boolean;
      data: { unidade: unknown; already_restored: boolean };
    }>(`/api/v1/acomodacoes/anfitriao/unidades/${id}/desarquivar`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),
  anfitriaoExportImpostosCsv: async (ativo?: 'true' | 'false' | 'all') => {
    const params = new URLSearchParams();
    if (ativo) params.set('ativo', ativo);
    const qs = params.toString();
    const url = `${FASE1_API_BASE}/api/v1/acomodacoes/anfitriao/impostos/export.csv${qs ? `?${qs}` : ''}`;
    const res = await fetch(url, {
      headers: {
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || json.message || res.statusText);
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'impostos-anfitriao-rsv360.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  },
  anfitriaoSmsConfigStatus: () =>
    fetchJson<{
      success: boolean;
      data: {
        configured: boolean;
        hasAccountSid: boolean;
        hasAuthToken: boolean;
        hasFromNumber: boolean;
      };
    }>('/api/v1/acomodacoes/anfitriao/comunicacao/sms-status'),

  anfitriaoConvidarCoanfitriao: (
    id: number,
    body: { nome: string; email: string; papel: string; telefone?: string },
  ) =>
    fetchJson<{
      success: boolean;
      data: unknown[];
      emailStatus?: 'sent' | 'skipped' | 'failed';
      smsStatus?: 'sent' | 'skipped' | 'failed';
    }>(`/api/v1/acomodacoes/anfitriao/unidades/${id}/coanfitrioes`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  anfitriaoAceitarConvitePorToken: (token: string) =>
    fetchJson<{
      success: boolean;
      data: { acomodacaoId: number; titulo: string; coanfitrioes: unknown[] };
    }>(`/api/v1/acomodacoes/anfitriao/coanfitrioes/aceitar-token`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  anfitriaoRevogarCoanfitriao: (id: number, coId: string) =>
    fetchJson<{ success: boolean; data: unknown[] }>(
      `/api/v1/acomodacoes/anfitriao/unidades/${id}/coanfitrioes/${encodeURIComponent(coId)}/revogar`,
      { method: 'POST', body: '{}' },
    ),
  anfitriaoReenviarCoanfitriao: (id: number, coId: string) =>
    fetchJson<{
      success: boolean;
      data: unknown[];
      emailStatus?: 'sent' | 'skipped' | 'failed';
      smsStatus?: 'sent' | 'skipped' | 'failed';
    }>(
      `/api/v1/acomodacoes/anfitriao/unidades/${id}/coanfitrioes/${encodeURIComponent(coId)}/reenviar`,
      { method: 'POST', body: '{}' },
    ),
  anfitriaoAceitarCoanfitriao: (id: number, coId: string) =>
    fetchJson<{ success: boolean; data: unknown[] }>(
      `/api/v1/acomodacoes/anfitriao/unidades/${id}/coanfitrioes/${encodeURIComponent(coId)}/aceitar`,
      { method: 'POST', body: '{}' },
    ),
  anfitriaoRemoverCoanfitriao: (id: number, coId: string) =>
    fetchJson<{ success: boolean; data: unknown[] }>(
      `/api/v1/acomodacoes/anfitriao/unidades/${id}/coanfitrioes/${encodeURIComponent(coId)}`,
      { method: 'DELETE' },
    ),

  anfitriaoDesarquivarUnidadesBulk: (ids: number[], motivo?: string) =>
    fetchJson<{
      success: boolean;
      data: {
        results: Array<
          | { id: number; ok: true; already_restored?: boolean }
          | { id: number; ok: false; error: 'not_found' | 'forbidden' | 'invalid_motivo' }
        >;
        restored: number;
        already_restored: number;
        failed: number;
      };
    }>(`/api/v1/acomodacoes/anfitriao/unidades/desarquivar-bulk`, {
      method: 'POST',
      body: JSON.stringify(motivo != null && motivo !== '' ? { ids, motivo } : { ids }),
    }),

  anfitriaoDisponibilidade: (id: number, de: string, ate: string) =>
    fetchJson<{ success: boolean; data: unknown[] }>(
      `/api/v1/acomodacoes/anfitriao/unidades/${id}/disponibilidade?de=${de}&ate=${ate}`,
    ),

  anfitriaoCalendario: (id: number, de: string, ate: string) =>
    fetchJson<{
      success: boolean;
      data: Array<{
        data: string;
        estado: 'livre' | 'bloqueado' | 'reservado';
        disponivel: boolean;
        precoOverride: string | null;
        observacao: string | null;
        readOnly: boolean;
      }>;
    }>(`/api/v1/acomodacoes/anfitriao/unidades/${id}/calendario?de=${de}&ate=${ate}`),

  anfitriaoReservas: (de: string, ate: string, acomodacaoId?: number) => {
    const qs = new URLSearchParams({ de, ate });
    if (acomodacaoId != null) qs.set('acomodacaoId', String(acomodacaoId));
    return fetchJson<{ success: boolean; data: unknown[] }>(
      `/api/v1/acomodacoes/anfitriao/reservas?${qs.toString()}`,
    );
  },

  anfitriaoHoje: (hoje?: string) =>
    fetchJson<{
      success: boolean;
      data: {
        hoje: string;
        proximosAte: string;
        checkIns: unknown[];
        checkOuts: unknown[];
        hospedados: unknown[];
        proximos: unknown[];
      };
    }>(
      `/api/v1/acomodacoes/anfitriao/hoje${hoje ? `?hoje=${encodeURIComponent(hoje)}` : ''}`,
    ),

  anfitriaoInboxMensagens: (de: string, ate: string) =>
    fetchJson<{
      success: boolean;
      data: Array<{
        propostaId: number;
        codigo: string | null;
        titulo: string;
        status: string;
        acomodacaoId: number;
        checkIn: string;
        checkOut: string;
        valorTotal: string;
        clienteNome: string;
        clienteEmail: string | null;
        clienteTelefone: string | null;
        unread: boolean;
        lastMessage: {
          id: number;
          senderType: string;
          preview: string;
          createdAt: string | null;
        } | null;
      }>;
    }>(
      `/api/v1/acomodacoes/anfitriao/mensagens?de=${encodeURIComponent(de)}&ate=${encodeURIComponent(ate)}`,
    ),

  anfitriaoMensagensUnreadCount: (de: string, ate: string) =>
    fetchJson<{
      success: boolean;
      data: { unread: number };
    }>(
      `/api/v1/acomodacoes/anfitriao/mensagens/unread-count?de=${encodeURIComponent(de)}&ate=${encodeURIComponent(ate)}`,
    ),

  anfitriaoMensagensThread: (propostaId: number) =>
    fetchJson<{
      success: boolean;
      data: {
        propostaId: number;
        messages: Array<{
          id: number;
          senderType: string;
          senderName: string | null;
          message: string;
          createdAt: string | null;
        }>;
      };
    }>(`/api/v1/acomodacoes/anfitriao/reservas/${propostaId}/mensagens`),

  anfitriaoEnviarMensagem: (propostaId: number, message: string, senderName?: string) =>
    fetchJson<{
      success: boolean;
      data: {
        id: number;
        senderType: string;
        senderName: string | null;
        message: string;
        createdAt: string | null;
      };
    }>(`/api/v1/acomodacoes/anfitriao/reservas/${propostaId}/mensagens`, {
      method: 'POST',
      body: JSON.stringify({ message, senderName }),
    }),

  anfitriaoAprovarPedido: (propostaId: number) =>
    fetchJson<{ success: boolean; data: unknown }>(
      `/api/v1/acomodacoes/anfitriao/reservas/${propostaId}/aprovar`,
      { method: 'POST', body: JSON.stringify({}) },
    ),

  anfitriaoRejeitarPedido: (propostaId: number) =>
    fetchJson<{ success: boolean; data: unknown }>(
      `/api/v1/acomodacoes/anfitriao/reservas/${propostaId}/rejeitar`,
      { method: 'POST', body: JSON.stringify({}) },
    ),

  anfitriaoListarVerificacoesLocal: (status: 'enviado' | 'aprovado' | 'rejeitado' | 'all' = 'enviado') =>
    fetchJson<{ success: boolean; data: unknown[] }>(
      `/api/v1/acomodacoes/anfitriao/admin/verificacoes-local?status=${encodeURIComponent(status)}`,
    ),

  anfitriaoAprovarVerificacaoLocal: (id: number) =>
    fetchJson<{ success: boolean; data: unknown }>(
      `/api/v1/acomodacoes/anfitriao/admin/unidades/${id}/verificacao-local/aprovar`,
      { method: 'POST', body: JSON.stringify({}) },
    ),

  anfitriaoRejeitarVerificacaoLocal: (id: number, motivo?: string) =>
    fetchJson<{ success: boolean; data: unknown }>(
      `/api/v1/acomodacoes/anfitriao/admin/unidades/${id}/verificacao-local/rejeitar`,
      { method: 'POST', body: JSON.stringify({ motivo }) },
    ),

  salvarAnfitriaoDisponibilidade: (
    id: number,
    dias: Array<{ data: string; disponivel: boolean; precoOverride?: string; observacao?: string }>,
  ) =>
    fetchJson(`/api/v1/acomodacoes/anfitriao/unidades/${id}/disponibilidade`, {
      method: 'PUT',
      body: JSON.stringify({ dias }),
    }),

  anfitriaoBulkBloquear: (id: number, datas: string[], observacao?: string) =>
    fetchJson(`/api/v1/acomodacoes/anfitriao/unidades/${id}/disponibilidade/bloquear`, {
      method: 'POST',
      body: JSON.stringify({ datas, observacao }),
    }),

  anfitriaoBulkDesbloquear: (id: number, datas: string[]) =>
    fetchJson(`/api/v1/acomodacoes/anfitriao/unidades/${id}/disponibilidade/desbloquear`, {
      method: 'POST',
      body: JSON.stringify({ datas }),
    }),

  anfitriaoAjustarPreco: (id: number, datas: string[], preco: number | null) =>
    fetchJson(`/api/v1/acomodacoes/anfitriao/unidades/${id}/disponibilidade/preco`, {
      method: 'POST',
      body: JSON.stringify({ datas, preco }),
    }),

  anfitriaoRateCalendar: (id: number, de: string, ate: string) =>
    fetchJson<{
      success: boolean;
      data: {
        acomodacaoId: number;
        titulo: string;
        pricingDefaults: {
          precoDiaria: number | null;
          precoFimSemana: number | null;
          minNoites: number;
          maxNoites: number;
          minNoitesPorCheckin?: Record<string, number> | null;
          antecedenciaDias: number;
          avisoPrevioMesmoDia: string | null;
          permitirPedidosMesmoDia?: boolean;
          descontoSemanalPct: number;
          descontoMensalPct: number;
          taxaLimpeza: number | null;
          taxaPet: number | null;
          taxaHospedeExtra: number | null;
          politicaCancelamentoCurta: string;
          politicaCancelamentoLonga: string;
          opcaoNaoReembolsavel: boolean;
          precoInteligenteAtivo?: boolean;
          precoInteligenteMin?: number | null;
          precoInteligenteMax?: number | null;
          descontoUltimaHoraPct?: number;
          descontoUltimaHoraDias?: number;
          descontoAntecipadaPct?: number;
          descontoAntecipadaDias?: number;
          descontoNovoAnuncioPct?: number;
          descontoNovoAnuncioLimite?: number;
          descontoAvaliacaoPct?: number;
          descontoAvaliacaoMinNota?: number;
          descontoAvaliacaoMinReviews?: number;
          guestRating?: number | null;
          guestReviews?: number;
          tempoPreparacaoNoites?: number;
          tempoPreparacaoHoras?: number;
          periodoDisponibilidadeMeses?: number;
          checkinDiasPermitidos?: number[] | null;
          checkoutDiasPermitidos?: number[] | null;
          icalToken?: string | null;
        };
        dicas?: {
          precoSugerido: number;
          ganhoBuscasPct: number;
          mensagem: string;
          descontoAvaliacao?: {
            elegivel: boolean;
            guestRating: number | null;
            guestReviews: number;
            mensagem: string;
          };
        };
        dias: Array<{
          data: string;
          estado: 'livre' | 'bloqueado' | 'reservado';
          disponivel: boolean;
          readOnly: boolean;
          precoOverride?: string | null;
          observacao?: string | null;
          precoEfetivo: number;
          precoBase: number;
          tetoDesconto: number;
          weekendApplied?: boolean;
          contexto?: {
            fimDeSemana: boolean;
            feriado: {
              data: string;
              nome: string;
              tipo?: 'nacional' | 'estadual' | 'municipal';
              uf?: string;
              municipio?: string;
            } | null;
            temporada: {
              id: number;
              slug: string;
              nome: string;
              tipo: 'alta' | 'media' | 'baixa' | 'feriado';
            } | null;
            alerta: {
              nivel: 'ok' | 'abaixo' | 'acima';
              mensagem: string;
              faixa: { minSugerido: number; referencia: number; maxSugerido: number };
              tags: string[];
            };
          };
        }>;
        canEditPricing: boolean;
        canApplyDiscount: boolean;
        conjuntosRegras?: Array<{
          id: string;
          nome: string;
          cor: string;
          precoPorNoite?: number;
          ajustePct?: number;
          minNoites?: number;
          maxNoites?: number;
          checkinDiasBloqueados?: number[];
        }>;
      };
    }>(`/api/v1/acomodacoes/anfitriao/unidades/${id}/rate-calendar?de=${de}&ate=${ate}`),

  anfitriaoRateCalendarDay: (
    id: number,
    body: { data: string; preco?: number | null; disponivel?: boolean; observacao?: string },
  ) =>
    fetchJson(`/api/v1/acomodacoes/anfitriao/unidades/${id}/rate-calendar/day`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  anfitriaoPricingDefaults: (id: number, body: Record<string, unknown>) =>
    fetchJson(`/api/v1/acomodacoes/anfitriao/unidades/${id}/pricing-defaults`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  anfitriaoAplicarConjuntoRegras: (
    id: number,
    conjuntoId: string,
    body: { de: string; ate: string },
  ) =>
    fetchJson<{
      success: boolean;
      data: {
        ok: boolean;
        conjuntoId: string;
        de: string;
        ate: string;
        diasNoIntervalo: number;
        diasBloqueados: number;
        precosAplicados: number;
        precoInteligenteAtivo?: boolean;
      };
    }>(
      `/api/v1/acomodacoes/anfitriao/unidades/${id}/conjuntos-regras/${encodeURIComponent(conjuntoId)}/aplicar`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  anfitriaoCriarPreviewLink: (id: number) =>
    fetchJson<{ success: boolean; data: { url: string; expiresAt: string } }>(
      `/api/v1/acomodacoes/anfitriao/unidades/${id}/preview-link`,
      { method: 'POST', body: JSON.stringify({}) },
    ),

  anfitriaoIcalToken: (id: number, opts?: { regenerate?: boolean }) =>
    fetchJson<{ success: boolean; data: { icalToken: string; regenerated?: boolean } }>(
      `/api/v1/acomodacoes/anfitriao/unidades/${id}/ical-token`,
      {
        method: 'POST',
        body: JSON.stringify({ regenerate: Boolean(opts?.regenerate) }),
      },
    ),

  anfitriaoIcalImportUrl: (id: number, url: string | null) =>
    fetchJson<{
      success: boolean;
      data: { icalImportUrl: string | null; icalImportLastStatus: string | null };
    }>(`/api/v1/acomodacoes/anfitriao/unidades/${id}/ical-import`, {
      method: 'PUT',
      body: JSON.stringify({ url }),
    }),

  anfitriaoIcalImportSync: (id: number) =>
    fetchJson<{
      success: boolean;
      data: {
        blocked: number;
        unblocked: number;
        busyNights: number;
        syncedAt: string;
        status: string;
      };
    }>(`/api/v1/acomodacoes/anfitriao/unidades/${id}/ical-import/sync`, {
      method: 'POST',
      body: '{}',
    }),

  anfitriaoAplicarDesconto: (id: number, datas: string[], percentual: number) =>
    fetchJson(`/api/v1/acomodacoes/anfitriao/unidades/${id}/aplicar-desconto`, {
      method: 'POST',
      body: JSON.stringify({ datas, percentual }),
    }),

  tarifasPoliticaDesconto: () =>
    fetchJson<{ success: boolean; data: Array<{ scope: string; maxDescontoPercentual: string }> }>(
      '/api/v1/tarifas/politica-desconto',
    ),

  tarifasSetPoliticaDesconto: (body: {
    scope: string;
    scopeId?: string | null;
    maxDescontoPercentual: number;
  }) =>
    fetchJson('/api/v1/tarifas/politica-desconto', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  anfitriaoCalendarioAgregado: (de: string, ate: string) =>
    fetchJson<{
      success: boolean;
      data: {
        data: Array<{
          acomodacaoId: number;
          titulo: string;
          hotelId: string;
          dias: Array<{
            data: string;
            estado: 'livre' | 'bloqueado' | 'reservado';
            precoOverride: string | null;
          }>;
        }>;
        de: string;
        ate: string;
      };
    }>(`/api/v1/acomodacoes/anfitriao/calendario?de=${de}&ate=${ate}`),

  importPreview: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/v1/acomodacoes/import/preview`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Preview falhou');
    return res.json();
  },

  importCommit: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/v1/acomodacoes/import/commit`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Commit falhou');
    return res.json();
  },

  tarifasConfig: () => fetchJson<{ success: boolean; data: { tarifarioDinamicoAtivo: boolean } }>('/api/v1/tarifas/config'),
  tarifasSetConfig: (tarifarioDinamicoAtivo: boolean) =>
    fetchJson('/api/v1/tarifas/config', {
      method: 'PATCH',
      body: JSON.stringify({ tarifarioDinamicoAtivo }),
    }),
  tarifasCategorias: () => fetchJson<{ success: boolean; data: unknown[] }>('/api/v1/tarifas/categorias'),
  tarifasTemporadas: () => fetchJson<{ success: boolean; data: unknown[] }>('/api/v1/tarifas/temporadas'),
  tarifasRegras: () => fetchJson<{ success: boolean; data: unknown[] }>('/api/v1/tarifas/regras'),
  tarifasSimular: (acomodacaoId: number, data: string, categoria = 'padrao') =>
    fetchJson<{ success: boolean; data: unknown }>(
      `/api/v1/tarifas/simular?acomodacaoId=${acomodacaoId}&data=${data}&categoria=${categoria}`,
    ),
};

export function getWsBaseUrl(): string {
  return process.env.NEXT_PUBLIC_WS_URL || FASE1_API_BASE;
}
