/**
 * Serviço de chat tributário com IA
 * Simulador conversacional para Perse, Goyazes, deduções
 * PR-13b: sanitize message + allowlisted context
 * PR-13e: OpenAI via shared llmChatCompletion gateway
 */

import { simulateTax } from './tax-optimization-service';
import { checkPerseEligibility } from './perse-enrollment-service';
import {
  LLM_MAX_MESSAGE_CHARS,
  llmChatCompletion,
  sanitizeLlmText,
  sanitizeTaxChatContext,
  type SanitizedTaxChatContext,
} from '@rsv360/shared';

export async function processTaxChat(
  userMessage: string,
  context?: SanitizedTaxChatContext | Record<string, unknown>
): Promise<string> {
  const safeMessage = sanitizeLlmText(userMessage, LLM_MAX_MESSAGE_CHARS);
  if (!safeMessage) {
    return 'Envie uma pergunta válida sobre tributação (texto não vazio).';
  }
  const safeContext = sanitizeTaxChatContext(context);
  const systemContext = await buildContext(safeContext);

  const result = await llmChatCompletion({
    surface: 'tax-chat',
    model: 'gpt-4o-mini',
    temperature: 0.5,
    maxTokens: 400,
    messages: [
      {
        role: 'system',
        content: `Você é um assistente fiscal para plataforma de aluguéis por temporada e ingressos em Caldas Novas/Rio Quente (GO), com sede em Cuiabá (MT).
Responda de forma clara e objetiva sobre: Perse (0% federais até dez/2026), Goyazes (crédito ICMS), deduções, split de pagamento, Simples Nacional.
${systemContext}
Não dê consultoria jurídica. Recomende sempre um contador para validação.`,
      },
      { role: 'user', content: safeMessage },
    ],
  });

  if (!result.ok) {
    return getFallbackResponse(safeMessage, safeContext);
  }
  return result.content || getFallbackResponse(safeMessage, safeContext);
}

async function buildContext(ctx?: SanitizedTaxChatContext): Promise<string> {
  if (!ctx?.grossRevenue) return '';

  const sim = await simulateTax(ctx.grossRevenue, 'simples', 'services');
  const perse = await checkPerseEligibility(ctx.cnae);

  return `
Dados do usuário (allowlist):
- Faturamento bruto: R$ ${ctx.grossRevenue.toLocaleString('pt-BR')}
- Deduções: R$ ${(ctx.deductions ?? sim.deductions).toLocaleString('pt-BR')}
- Base tributável: R$ ${sim.taxable_base.toLocaleString('pt-BR')}
- Imposto Simples (${sim.rate_pct}%): R$ ${sim.tax_amount.toLocaleString('pt-BR')}
- Perse elegível: ${perse.eligible ? 'Sim' : 'Não'}
`;
}

function getFallbackResponse(
  message: string,
  ctx?: SanitizedTaxChatContext
): string {
  const m = message.toLowerCase();
  if (m.includes('perse')) {
    return 'O Perse (Lei 14.148/2021) zera PIS/COFINS/CSLL/IRPJ até dez/2026 para CNAEs de turismo (agências, hospedagem, parques). Habilite-se na Receita Federal. Consulte um contador.';
  }
  if (m.includes('goyazes')) {
    return 'O Goyazes permite abater até 100% do ICMS devido ao patrocinar projetos culturais aprovados em GO. Inscrições via Baru 2.0 (editaiscultura.sistemas.go.gov.br).';
  }
  if (m.includes('economiz') || m.includes('quanto')) {
    const rev = ctx?.grossRevenue ?? 600000;
    const sim = { tax_amount: rev * 0.15, perse_savings: rev * 0.15 };
    return `Com faturamento de R$ ${rev.toLocaleString('pt-BR')}/ano, sem Perse você pagaria cerca de R$ ${sim.tax_amount.toLocaleString('pt-BR')} em federais. Com Perse (0% até dez/2026), a economia pode chegar a esse valor. Consulte um contador para números exatos.`;
  }
  return 'Para dúvidas tributárias, consulte um contador especializado em turismo. O sistema pode simular cenários em /dashboard/tributacao.';
}
