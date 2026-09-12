/**
 * Host listing discount resolution and competitive tip heuristics (RSV360°).
 * Discounts do not stack — the highest matching rule wins.
 */

export type HostDiscountPolicy = {
  descontoSemanalPct: number;
  descontoMensalPct: number;
  descontoUltimaHoraPct: number;
  descontoUltimaHoraDias: number;
  descontoAntecipadaPct: number;
  descontoAntecipadaDias: number;
  descontoNovoAnuncioPct: number;
  descontoNovoAnuncioLimite: number;
  descontoAvaliacaoPct: number;
  descontoAvaliacaoMinNota: number;
  descontoAvaliacaoMinReviews: number;
};

export type HostDiscountContext = {
  noites: number;
  diasAntecedencia: number;
  reservasConfirmadasAnuncio: number;
  guestRating?: number | null;
  guestReviews?: number | null;
};

/** Minimal review aggregate input (matches anfitriao-reviews.service). */
export type ReviewAggInput = {
  media: number | null;
  total: number;
};

export type GuestReviewPricingFields = {
  guestRating: number | null;
  guestReviews: number;
};

/** Maps guest feedback aggregate to rate-calendar / pricing context fields. */
export function mapReviewAggToGuestPricingFields(
  agg: ReviewAggInput | null | undefined,
): GuestReviewPricingFields {
  if (!agg) {
    return { guestRating: null, guestReviews: 0 };
  }
  const total =
    Number.isFinite(agg.total) && agg.total > 0 ? Math.max(0, Math.floor(agg.total)) : 0;
  const guestRating =
    total > 0 && agg.media != null && Number.isFinite(agg.media) ? agg.media : null;
  return { guestRating, guestReviews: total };
}

export function isDescontoAvaliacaoElegivel(
  policy: Pick<
    HostDiscountPolicy,
    'descontoAvaliacaoPct' | 'descontoAvaliacaoMinNota' | 'descontoAvaliacaoMinReviews'
  >,
  guestRating: number | null | undefined,
  guestReviews: number | null | undefined,
): boolean {
  const reviews = guestReviews ?? 0;
  return (
    policy.descontoAvaliacaoPct > 0 &&
    guestRating != null &&
    guestRating >= policy.descontoAvaliacaoMinNota &&
    reviews >= policy.descontoAvaliacaoMinReviews
  );
}

export function resolverDescontoHospede(
  policy: HostDiscountPolicy,
  ctx: HostDiscountContext,
): { pct: number; regra: string } {
  const candidates: Array<{ pct: number; regra: string }> = [];

  if (ctx.noites >= 28 && policy.descontoMensalPct > 0) {
    candidates.push({ pct: policy.descontoMensalPct, regra: 'mensal' });
  } else if (ctx.noites >= 7 && policy.descontoSemanalPct > 0) {
    candidates.push({ pct: policy.descontoSemanalPct, regra: 'semanal' });
  }

  if (
    policy.descontoUltimaHoraPct > 0 &&
    ctx.diasAntecedencia <= Math.max(0, policy.descontoUltimaHoraDias)
  ) {
    candidates.push({ pct: policy.descontoUltimaHoraPct, regra: 'ultima_hora' });
  }

  if (
    policy.descontoAntecipadaPct > 0 &&
    ctx.diasAntecedencia >= Math.max(1, policy.descontoAntecipadaDias)
  ) {
    candidates.push({ pct: policy.descontoAntecipadaPct, regra: 'antecipada' });
  }

  if (
    policy.descontoNovoAnuncioPct > 0 &&
    ctx.reservasConfirmadasAnuncio < Math.max(1, policy.descontoNovoAnuncioLimite)
  ) {
    candidates.push({ pct: policy.descontoNovoAnuncioPct, regra: 'novo_anuncio' });
  }

  const rating = ctx.guestRating;
  const reviews = ctx.guestReviews ?? 0;
  if (
    policy.descontoAvaliacaoPct > 0 &&
    rating != null &&
    rating >= policy.descontoAvaliacaoMinNota &&
    reviews >= policy.descontoAvaliacaoMinReviews
  ) {
    candidates.push({ pct: policy.descontoAvaliacaoPct, regra: 'avaliacao' });
  }

  if (candidates.length === 0) return { pct: 0, regra: 'nenhum' };
  candidates.sort((a, b) => b.pct - a.pct);
  return candidates[0];
}

export function sugerirPrecoCompetitivo(precoBase: number | null): {
  precoSugerido: number;
  ganhoBuscasPct: number;
} {
  if (precoBase == null || !Number.isFinite(precoBase) || precoBase <= 0) {
    return { precoSugerido: 199, ganhoBuscasPct: 26 };
  }
  const sugerido = Math.max(99, Math.round(precoBase * 0.85));
  if (sugerido >= precoBase) {
    return { precoSugerido: Math.round(precoBase), ganhoBuscasPct: 5 };
  }
  const ganho = Math.min(40, Math.max(5, Math.round(((precoBase - sugerido) / precoBase) * 100)));
  return { precoSugerido: sugerido, ganhoBuscasPct: ganho };
}

export function clampSmartPrice(
  preco: number,
  ativo: boolean,
  min: number | null,
  max: number | null,
): number {
  if (!ativo) return preco;
  let v = preco;
  if (min != null && Number.isFinite(min)) v = Math.max(v, min);
  if (max != null && Number.isFinite(max)) v = Math.min(v, max);
  return Math.round(v * 100) / 100;
}

export function parseWeekdayList(raw: unknown): number[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const days = raw
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return days.length ? [...new Set(days)].sort((a, b) => a - b) : null;
}

/** Weekday → minimum nights (0=Sun … 6=Sat). Null = use global min only. */
export type MinNoitesPorCheckin = Record<string, number>;

export function normalizeMinNoitesPorCheckin(
  raw: unknown,
  fallbackMin = 1,
): MinNoitesPorCheckin | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: MinNoitesPorCheckin = {};
  let any = false;
  for (let d = 0; d <= 6; d += 1) {
    const key = String(d);
    const n = Number((raw as Record<string, unknown>)[key]);
    if (Number.isFinite(n) && n >= 1) {
      out[key] = Math.min(365, Math.floor(n));
      any = true;
    } else {
      out[key] = Math.max(1, Math.floor(fallbackMin) || 1);
    }
  }
  return any ? out : null;
}

/** Effective min stay for a check-in ISO date (local noon). */
export function resolverMinNoitesCheckin(
  isoDate: string,
  globalMin: number,
  porCheckin: MinNoitesPorCheckin | null | undefined,
): number {
  const base = Math.max(1, Math.floor(globalMin) || 1);
  if (!porCheckin) return base;
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return base;
  const key = String(d.getDay());
  const n = Number(porCheckin[key]);
  return Number.isFinite(n) && n >= 1 ? Math.min(365, Math.floor(n)) : base;
}

export type RegrasEstadiaAcomodacao = {
  minNoites: number;
  maxNoites: number;
  minNoitesPorCheckin?: MinNoitesPorCheckin | null;
  antecedenciaDias: number;
  avisoPrevioMesmoDia?: string | null;
  /** When lead time is same-day: false blocks check-in today. Default true. */
  permitirPedidosMesmoDia?: boolean;
  periodoDisponibilidadeMeses?: number;
  checkinDiasPermitidos?: number[] | null;
  checkoutDiasPermitidos?: number[] | null;
};

export type RegrasEstadiaResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

function parseIsoDateLocal(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function calendarDaysBetween(fromIso: string, toIso: string): number {
  const a = parseIsoDateLocal(fromIso);
  const b = parseIsoDateLocal(toIso);
  if (!a || !b) return NaN;
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function todayIsoLocal(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseCutoffHhMm(raw: string | null | undefined): { h: number; m: number } | null {
  if (!raw || typeof raw !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return { h, m: min };
}

/**
 * Server-side stay rules for a unit (min/max nights, lead time, cutoff, weekdays, window).
 * Pure — pass `now` for tests.
 */
export function validarRegrasEstadiaAcomodacao(
  checkIn: string,
  checkOut: string,
  regras: RegrasEstadiaAcomodacao,
  now: Date = new Date(),
): RegrasEstadiaResult {
  const checkInDate = parseIsoDateLocal(checkIn);
  const checkOutDate = parseIsoDateLocal(checkOut);
  if (!checkInDate || !checkOutDate) {
    return { ok: false, code: 'datas_invalidas', message: 'Datas de check-in/check-out inválidas.' };
  }

  const nights = calendarDaysBetween(checkIn, checkOut);
  if (!Number.isFinite(nights) || nights <= 0) {
    return {
      ok: false,
      code: 'datas_invalidas',
      message: 'Check-out deve ser posterior ao check-in.',
    };
  }

  const minEfetivo = resolverMinNoitesCheckin(
    checkIn,
    regras.minNoites,
    regras.minNoitesPorCheckin,
  );
  if (nights < minEfetivo) {
    return {
      ok: false,
      code: 'min_noites',
      message: `Estadia mínima de ${minEfetivo} noite(s) para esta data de check-in.`,
    };
  }

  const maxNoites = Math.max(1, Math.floor(regras.maxNoites) || 30);
  if (nights > maxNoites) {
    return {
      ok: false,
      code: 'max_noites',
      message: `Estadia máxima de ${maxNoites} noite(s) para esta unidade.`,
    };
  }

  const checkinAllowed = regras.checkinDiasPermitidos;
  if (checkinAllowed && checkinAllowed.length > 0) {
    const dow = checkInDate.getDay();
    if (!checkinAllowed.includes(dow)) {
      return {
        ok: false,
        code: 'checkin_dia',
        message: 'Check-in não permitido neste dia da semana.',
      };
    }
  }

  const checkoutAllowed = regras.checkoutDiasPermitidos;
  if (checkoutAllowed && checkoutAllowed.length > 0) {
    const dow = checkOutDate.getDay();
    if (!checkoutAllowed.includes(dow)) {
      return {
        ok: false,
        code: 'checkout_dia',
        message: 'Checkout não permitido neste dia da semana.',
      };
    }
  }

  const today = todayIsoLocal(now);
  const leadDays = calendarDaysBetween(today, checkIn);
  if (!Number.isFinite(leadDays)) {
    return { ok: false, code: 'datas_invalidas', message: 'Datas de check-in/check-out inválidas.' };
  }
  if (leadDays < 0) {
    return {
      ok: false,
      code: 'checkin_passado',
      message: 'Check-in não pode ser em data passada.',
    };
  }

  let requiredLead = Math.max(0, Math.floor(regras.antecedenciaDias) || 0);
  if (requiredLead === 0 && regras.permitirPedidosMesmoDia === false) {
    requiredLead = 1;
  }
  if (leadDays < requiredLead) {
    return {
      ok: false,
      code: 'antecedencia',
      message:
        requiredLead === 0
          ? 'Antecedência insuficiente para reservar.'
          : `É necessário reservar com pelo menos ${requiredLead} dia(s) de antecedência.`,
    };
  }

  if (leadDays === 0 && requiredLead === 0) {
    const cutoff = parseCutoffHhMm(regras.avisoPrevioMesmoDia);
    if (cutoff) {
      const minutesNow = now.getHours() * 60 + now.getMinutes();
      const minutesCut = cutoff.h * 60 + cutoff.m;
      if (minutesNow > minutesCut) {
        return {
          ok: false,
          code: 'aviso_mesmo_dia',
          message: `Reservas para o mesmo dia só até ${regras.avisoPrevioMesmoDia}.`,
        };
      }
    }
  }

  const janelaRaw = regras.periodoDisponibilidadeMeses;
  const janelaMeses =
    janelaRaw == null ? 12 : Math.max(0, Math.floor(Number(janelaRaw)) || 0);
  if (janelaMeses <= 0) {
    return {
      ok: false,
      code: 'janela_disponibilidade',
      message: 'Datas indisponíveis por padrão neste anúncio.',
    };
  }
  const horizon = new Date(now.getFullYear(), now.getMonth() + janelaMeses, now.getDate());
  const horizonIso = todayIsoLocal(horizon);
  if (calendarDaysBetween(horizonIso, checkIn) > 0) {
    return {
      ok: false,
      code: 'janela_disponibilidade',
      message: `Check-in além do período de disponibilidade (${janelaMeses} meses).`,
    };
  }

  return { ok: true };
}

