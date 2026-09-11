/**
 * Cancellation policy fields on listing (flat keys on pricing-defaults patch).
 */

export const POLITICAS_CANCELAMENTO_CURTA = [
  'flexivel',
  'moderada',
  'limitada',
  'restrita',
] as const;

export const POLITICAS_CANCELAMENTO_LONGA = ['restrita_longa', 'flexivel_longa'] as const;

export type PoliticaCancelamentoCurta = (typeof POLITICAS_CANCELAMENTO_CURTA)[number];
export type PoliticaCancelamentoLonga = (typeof POLITICAS_CANCELAMENTO_LONGA)[number];

export type ListingCancelamento = {
  politicaCancelamentoCurta: PoliticaCancelamentoCurta;
  politicaCancelamentoLonga: PoliticaCancelamentoLonga;
  opcaoNaoReembolsavel: boolean;
};

export type CancelamentoValidationOk = { ok: true; value: Partial<ListingCancelamento> };
export type CancelamentoValidationErr = {
  ok: false;
  error: 'cancelamento_invalido';
  message: string;
};

const CURTA_SET = new Set<string>(POLITICAS_CANCELAMENTO_CURTA);
const LONGA_SET = new Set<string>(POLITICAS_CANCELAMENTO_LONGA);

const LABEL_CURTA: Record<PoliticaCancelamentoCurta, string> = {
  flexivel: 'Flexível',
  moderada: 'Moderada',
  limitada: 'Limitada',
  restrita: 'Restrita',
};

const LABEL_LONGA: Record<PoliticaCancelamentoLonga, string> = {
  restrita_longa: 'Restrita (longa duração)',
  flexivel_longa: 'Flexível (longa duração)',
};

function coerceBoolean(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true' || raw === 1 || raw === '1') return true;
  if (raw === 'false' || raw === 0 || raw === '0') return false;
  return Boolean(raw);
}

export function validateListingCancelamento(
  raw: unknown,
): CancelamentoValidationOk | CancelamentoValidationErr {
  if (raw == null) {
    return {
      ok: true,
      value: {
        politicaCancelamentoCurta: 'limitada',
        politicaCancelamentoLonga: 'restrita_longa',
        opcaoNaoReembolsavel: false,
      },
    };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      error: 'cancelamento_invalido',
      message: 'Política de cancelamento inválida',
    };
  }

  const src = raw as Record<string, unknown>;
  const value: Partial<ListingCancelamento> = {};

  if (Object.prototype.hasOwnProperty.call(src, 'politicaCancelamentoCurta')) {
    if (typeof src.politicaCancelamentoCurta !== 'string') {
      return {
        ok: false,
        error: 'cancelamento_invalido',
        message: 'Política de cancelamento (curta duração) inválida',
      };
    }
    const curta = src.politicaCancelamentoCurta.trim();
    if (!CURTA_SET.has(curta)) {
      return {
        ok: false,
        error: 'cancelamento_invalido',
        message: 'Política de cancelamento (curta duração) inválida',
      };
    }
    value.politicaCancelamentoCurta = curta as PoliticaCancelamentoCurta;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'politicaCancelamentoLonga')) {
    if (typeof src.politicaCancelamentoLonga !== 'string') {
      return {
        ok: false,
        error: 'cancelamento_invalido',
        message: 'Política de cancelamento (longa duração) inválida',
      };
    }
    const longa = src.politicaCancelamentoLonga.trim();
    if (!LONGA_SET.has(longa)) {
      return {
        ok: false,
        error: 'cancelamento_invalido',
        message: 'Política de cancelamento (longa duração) inválida',
      };
    }
    value.politicaCancelamentoLonga = longa as PoliticaCancelamentoLonga;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'opcaoNaoReembolsavel')) {
    if (
      src.opcaoNaoReembolsavel != null &&
      typeof src.opcaoNaoReembolsavel !== 'boolean' &&
      typeof src.opcaoNaoReembolsavel !== 'string' &&
      typeof src.opcaoNaoReembolsavel !== 'number'
    ) {
      return {
        ok: false,
        error: 'cancelamento_invalido',
        message: 'opcaoNaoReembolsavel deve ser boolean',
      };
    }
    value.opcaoNaoReembolsavel = coerceBoolean(src.opcaoNaoReembolsavel);
  }

  return { ok: true, value };
}

/** Card preview for cancellation policy section. */
export function summarizeCancelamento(input: {
  politicaCancelamentoCurta?: unknown;
  politicaCancelamentoLonga?: unknown;
  opcaoNaoReembolsavel?: unknown;
}): string {
  const curtaRaw =
    typeof input.politicaCancelamentoCurta === 'string'
      ? input.politicaCancelamentoCurta.trim()
      : 'limitada';
  const longaRaw =
    typeof input.politicaCancelamentoLonga === 'string'
      ? input.politicaCancelamentoLonga.trim()
      : 'restrita_longa';

  const curta = CURTA_SET.has(curtaRaw)
    ? LABEL_CURTA[curtaRaw as PoliticaCancelamentoCurta]
    : 'Limitada';
  const longa = LONGA_SET.has(longaRaw)
    ? LABEL_LONGA[longaRaw as PoliticaCancelamentoLonga]
    : 'Restrita (longa duração)';

  const naoReemb = coerceBoolean(input.opcaoNaoReembolsavel ?? false);
  const base = `${curta} · ${longa}`;
  return naoReemb ? `${base} · Não reembolsável` : base;
}
