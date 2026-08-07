/**
 * Serviço de Sugestão de Split com IA
 * Analisa histórico e sugere % de comissão ótimo
 * Híbrido: regras + OpenAI opcional
 * PR-13b: context allowlisted / sanitized (no free-form dump)
 */

import { queryDatabase } from '../db';
import type { ServiceType } from './types';
import { llmChatCompletion, sanitizeSplitAiContext } from '@rsv360/shared';

const DEFAULT_PCT: Record<ServiceType, number> = {
  rent: 20,
  ticket: 15,
  package: 18,
};

const ANOMALY_THRESHOLD = 10;

export interface SplitSuggestion {
  platform_pct: number;
  partner_pct: number;
  confidence: number;
  source: 'historical' | 'default' | 'ai';
  anomaly_detected?: boolean;
  message?: string;
}

/**
 * Sugerir % de split baseado em histórico do parceiro e tipo de serviço
 */
export async function suggestSplit(
  receiverId?: number,
  serviceType: ServiceType = 'rent'
): Promise<SplitSuggestion> {
  if (!receiverId) {
    return {
      platform_pct: DEFAULT_PCT[serviceType],
      partner_pct: 100 - DEFAULT_PCT[serviceType],
      confidence: 0.5,
      source: 'default',
      message: 'Sem histórico do parceiro. Use valor padrão.',
    };
  }

  const rows = await queryDatabase(
    `SELECT 
       platform_amount,
       total_amount,
       service_type
     FROM marketplace_split_transactions
     WHERE receiver_id = $1 AND status = 'completed'
     ORDER BY created_at DESC
     LIMIT 50`,
    [receiverId]
  );

  if (rows.length < 3) {
    return {
      platform_pct: DEFAULT_PCT[serviceType],
      partner_pct: 100 - DEFAULT_PCT[serviceType],
      confidence: 0.6,
      source: 'default',
      message: `Poucos dados (${rows.length} transações). Use valor padrão.`,
    };
  }

  const filtered = rows.filter((r: { service_type: string }) => r.service_type === serviceType);
  const toUse = filtered.length >= 2 ? filtered : rows;

  const avgPct =
    toUse.reduce(
      (sum: number, r: { platform_amount: number; total_amount: number }) =>
        sum + (r.total_amount > 0 ? (r.platform_amount / r.total_amount) * 100 : 0),
      0
    ) / toUse.length;

  const rounded = Math.round(avgPct * 10) / 10;
  const defaultPct = DEFAULT_PCT[serviceType];
  const diff = Math.abs(rounded - defaultPct);
  const anomalyDetected = diff > ANOMALY_THRESHOLD;

  const confidence = Math.min(0.95, 0.6 + toUse.length * 0.02);

  return {
    platform_pct: rounded,
    partner_pct: 100 - rounded,
    confidence,
    source: 'historical',
    anomaly_detected: anomalyDetected,
    message: anomalyDetected
      ? `Sugestão (${rounded}%) difere do padrão (${defaultPct}%). Revise manualmente.`
      : undefined,
  };
}

/**
 * Sugestão via OpenAI (opcional, para contexto adicional)
 * PR-13e: via shared llmChatCompletion gateway
 */
export async function suggestSplitWithAI(
  receiverId?: number,
  serviceType: ServiceType = 'rent',
  context?: string
): Promise<SplitSuggestion> {
  const base = await suggestSplit(receiverId, serviceType);

  const safeContext = sanitizeSplitAiContext(context);
  if (!safeContext) {
    return base;
  }

  const prompt = `Você é um assistente fiscal para plataforma de aluguéis por temporada e ingressos.
Analise o contexto e sugira um percentual de comissão (platform_pct) para a plataforma.
- Tipo de serviço: ${serviceType}
- Sugestão baseada em histórico: ${base.platform_pct}%
- Contexto adicional (sanitizado): ${safeContext}

Responda APENAS com um JSON válido: {"platform_pct": number, "reason": "string curta"}
O platform_pct deve estar entre 5 e 35.`;

  const result = await llmChatCompletion({
    surface: 'split-suggest',
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 150,
    messages: [{ role: 'user', content: prompt }],
  });

  if (!result.ok) return base;

  const match = result.content.match(/\{"platform_pct":\s*(\d+(?:\.\d+)?)/);
  if (match) {
    const aiPct = parseFloat(match[1]);
    if (aiPct >= 5 && aiPct <= 35) {
      return {
        platform_pct: aiPct,
        partner_pct: 100 - aiPct,
        confidence: 0.85,
        source: 'ai',
        message: base.message,
      };
    }
  }

  return base;
}
