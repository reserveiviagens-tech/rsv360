import {
  COMISSOES_OFICIAL_RESERVEI,
  type ComissoesSugestaoIaInput,
} from '../schema';
import { llmChatCompletion, sanitizeComissoesIaPromptFields } from '@rsv360/shared';

export interface ComissoesSugestaoIaResult {
  taxaPlataformaPct: number;
  taxaCorretorPct: number;
  margemProprietarioPct: number;
  fonte: 'oficial_reservei' | 'heuristica' | 'openai';
  confianca: number;
  motivo: string;
}

const HEURISTICAS: Record<
  NonNullable<ComissoesSugestaoIaInput['objetivo']>,
  { plataforma: number; corretor: number; motivo: string; confianca: number }
> = {
  padrao: {
    plataforma: COMISSOES_OFICIAL_RESERVEI.taxaPlataformaPct,
    corretor: COMISSOES_OFICIAL_RESERVEI.taxaCorretorPct,
    motivo: COMISSOES_OFICIAL_RESERVEI.notas,
    confianca: 0.95,
  },
  captar_corretores: {
    plataforma: 18,
    corretor: 7,
    motivo:
      'Maior fatia ao corretor Reservei (7%) para incentivar carteira ativa; plataforma RSV360 18%; anfitrião 75%.',
    confianca: 0.82,
  },
  max_margem_plataforma: {
    plataforma: 22,
    corretor: 5,
    motivo:
      'Prioriza margem da plataforma RSV360 (22%) mantendo corretor em 5%; anfitrião 73%.',
    confianca: 0.78,
  },
  competir_otas: {
    plataforma: 18,
    corretor: 5,
    motivo:
      'Plataforma mais enxuta (18%) para competitividade vs OTAs; corretor Reservei 5%; anfitrião 77%.',
    confianca: 0.8,
  },
};

function heuristica(input: ComissoesSugestaoIaInput): ComissoesSugestaoIaResult {
  const objetivo = input.objetivo ?? 'padrao';
  const base = HEURISTICAS[objetivo];
  const margem = Math.max(0, 100 - base.plataforma - base.corretor);
  let motivo = base.motivo;
  if (input.contexto?.trim()) {
    motivo += ` Contexto informado: ${input.contexto.trim().slice(0, 200)}.`;
  }
  return {
    taxaPlataformaPct: base.plataforma,
    taxaCorretorPct: base.corretor,
    margemProprietarioPct: margem,
    fonte: objetivo === 'padrao' ? 'oficial_reservei' : 'heuristica',
    confianca: base.confianca,
    motivo,
  };
}

async function openAiSuggest(input: ComissoesSugestaoIaInput): Promise<ComissoesSugestaoIaResult | null> {
  // PR-13b: allowlisted lines — never JSON.stringify(user input object)
  // PR-13e: shared llm gateway
  const userContent = sanitizeComissoesIaPromptFields({
    objetivo: input.objetivo ?? 'padrao',
    contexto: input.contexto,
    oficialPlataformaPct: COMISSOES_OFICIAL_RESERVEI.taxaPlataformaPct,
    oficialCorretorPct: COMISSOES_OFICIAL_RESERVEI.taxaCorretorPct,
  });

  const result = await llmChatCompletion({
    surface: 'comissoes-ia',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    temperature: 0.2,
    maxTokens: 300,
    jsonObject: true,
    messages: [
      {
        role: 'system',
        content:
          'Você é consultor financeiro da Reservei Viagens / RSV360 (marketplace turismo Caldas Novas). ' +
          'Sugira taxa_plataforma_pct e taxa_corretor_pct (0-100, soma <= 100). ' +
          'Padrão oficial: plataforma 20%, corretor 5%, anfitrião residual. ' +
          'Retorne JSON: {"taxa_plataforma_pct":number,"taxa_corretor_pct":number,"motivo":string,"confianca":number}.',
      },
      {
        role: 'user',
        content: userContent,
      },
    ],
  });

  if (!result.ok) return null;

  try {
    const parsed = JSON.parse(result.content) as {
      taxa_plataforma_pct?: number;
      taxa_corretor_pct?: number;
      motivo?: string;
      confianca?: number;
    };
    const plataforma = Number(parsed.taxa_plataforma_pct);
    const corretor = Number(parsed.taxa_corretor_pct);
    if (!Number.isFinite(plataforma) || !Number.isFinite(corretor)) return null;
    if (plataforma < 0 || corretor < 0 || plataforma + corretor > 100) return null;

    return {
      taxaPlataformaPct: plataforma,
      taxaCorretorPct: corretor,
      margemProprietarioPct: Math.max(0, 100 - plataforma - corretor),
      fonte: 'openai',
      confianca: Math.min(1, Math.max(0, Number(parsed.confianca) || 0.75)),
      motivo: String(parsed.motivo ?? 'Sugestão gerada por IA.'),
    };
  } catch {
    return null;
  }
}

export async function sugerirPercentuaisComissoes(
  input: ComissoesSugestaoIaInput,
): Promise<ComissoesSugestaoIaResult> {
  const ia = await openAiSuggest(input);
  if (ia) return ia;
  return heuristica(input);
}
