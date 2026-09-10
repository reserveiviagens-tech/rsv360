/**
 * Reservation settings on listing metadata (flat keys: modoReserva, exigirBomHistorico, mensagemPreReserva).
 */

export const CONFIG_RESERVA_MSG_MAX = 400;

export const MODOS_RESERVA = ['instantanea', 'aprovar'] as const;

export type ModoReservaListing = (typeof MODOS_RESERVA)[number];

export type ListingConfigReserva = {
  modoReserva: ModoReservaListing;
  exigirBomHistorico: boolean;
  mensagemPreReserva?: string;
};

export type ConfigReservaValidationOk = { ok: true; value: ListingConfigReserva };
export type ConfigReservaValidationErr = {
  ok: false;
  error: 'config_reserva_invalido';
  message: string;
};

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const MODOS_SET = new Set<string>(MODOS_RESERVA);

function coerceBoolean(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true' || raw === 1 || raw === '1') return true;
  if (raw === 'false' || raw === 0 || raw === '0') return false;
  return Boolean(raw);
}

function sanitizeMensagem(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(CONTROL_CHARS, '').trim();
}

export function validateListingConfigReserva(
  raw: unknown,
): ConfigReservaValidationOk | ConfigReservaValidationErr {
  if (raw == null) {
    return {
      ok: true,
      value: { modoReserva: 'aprovar', exigirBomHistorico: false },
    };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      error: 'config_reserva_invalido',
      message: 'Configurações de reserva inválidas',
    };
  }

  const src = raw as Record<string, unknown>;
  const value: ListingConfigReserva = {
    modoReserva: 'aprovar',
    exigirBomHistorico: false,
  };

  if (Object.prototype.hasOwnProperty.call(src, 'modoReserva')) {
    if (typeof src.modoReserva !== 'string') {
      return {
        ok: false,
        error: 'config_reserva_invalido',
        message: 'Modo de reserva inválido',
      };
    }
    const modo = src.modoReserva.trim();
    if (!MODOS_SET.has(modo)) {
      return {
        ok: false,
        error: 'config_reserva_invalido',
        message: 'Modo de reserva inválido',
      };
    }
    value.modoReserva = modo as ModoReservaListing;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'exigirBomHistorico')) {
    if (
      src.exigirBomHistorico != null &&
      typeof src.exigirBomHistorico !== 'boolean' &&
      typeof src.exigirBomHistorico !== 'string' &&
      typeof src.exigirBomHistorico !== 'number'
    ) {
      return {
        ok: false,
        error: 'config_reserva_invalido',
        message: 'exigirBomHistorico deve ser boolean',
      };
    }
    value.exigirBomHistorico = coerceBoolean(src.exigirBomHistorico);
  }

  if (value.modoReserva === 'aprovar') {
    value.exigirBomHistorico = false;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'mensagemPreReserva')) {
    if (typeof src.mensagemPreReserva !== 'string' && src.mensagemPreReserva != null) {
      return {
        ok: false,
        error: 'config_reserva_invalido',
        message: 'Mensagem pré-reserva inválida',
      };
    }
    const text = typeof src.mensagemPreReserva === 'string' ? src.mensagemPreReserva : '';
    if (text.length > CONFIG_RESERVA_MSG_MAX) {
      return {
        ok: false,
        error: 'config_reserva_invalido',
        message: `Mensagem pré-reserva deve ter no máximo ${CONFIG_RESERVA_MSG_MAX} caracteres`,
      };
    }
    const cleaned = sanitizeMensagem(text);
    if (cleaned) {
      value.mensagemPreReserva = cleaned;
    }
  }

  return { ok: true, value };
}

/** Card preview for reservation settings section. */
export function summarizeConfigReserva(
  modoReserva: ModoReservaListing | unknown,
): 'Reserva Instantânea' | 'Pedidos a serem aprovados' {
  const modo =
    typeof modoReserva === 'string' && MODOS_SET.has(modoReserva.trim())
      ? (modoReserva.trim() as ModoReservaListing)
      : 'aprovar';
  return modo === 'instantanea' ? 'Reserva Instantânea' : 'Pedidos a serem aprovados';
}
