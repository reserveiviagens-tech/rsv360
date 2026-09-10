import {
  CONFIG_RESERVA_MSG_MAX,
  summarizeConfigReserva,
  validateListingConfigReserva,
} from '../../../../server/modules/acomodacoes/services/listing-config-reserva.util';

describe('listing-config-reserva.util', () => {
  it('accepts null with defaults', () => {
    expect(validateListingConfigReserva(null)).toEqual({
      ok: true,
      value: { modoReserva: 'aprovar', exigirBomHistorico: false },
    });
  });

  it('rejects non-object payload', () => {
    expect(validateListingConfigReserva('x').ok).toBe(false);
    expect(validateListingConfigReserva([]).ok).toBe(false);
  });

  it('accepts valid reservation modes', () => {
    expect(validateListingConfigReserva({ modoReserva: 'instantanea' })).toEqual({
      ok: true,
      value: { modoReserva: 'instantanea', exigirBomHistorico: false },
    });
    expect(validateListingConfigReserva({ modoReserva: 'aprovar' })).toEqual({
      ok: true,
      value: { modoReserva: 'aprovar', exigirBomHistorico: false },
    });
  });

  it('rejects invalid modoReserva', () => {
    expect(validateListingConfigReserva({ modoReserva: 'auto' }).ok).toBe(false);
    expect(validateListingConfigReserva({ modoReserva: 1 }).ok).toBe(false);
  });

  it('coerces exigirBomHistorico to boolean when instantanea', () => {
    expect(
      validateListingConfigReserva({
        modoReserva: 'instantanea',
        exigirBomHistorico: 'true',
      }),
    ).toEqual({
      ok: true,
      value: { modoReserva: 'instantanea', exigirBomHistorico: true },
    });
  });

  it('forces exigirBomHistorico false when modo is aprovar', () => {
    expect(
      validateListingConfigReserva({
        modoReserva: 'aprovar',
        exigirBomHistorico: true,
      }),
    ).toEqual({
      ok: true,
      value: { modoReserva: 'aprovar', exigirBomHistorico: false },
    });
  });

  it('accepts empty mensagemPreReserva', () => {
    expect(
      validateListingConfigReserva({
        modoReserva: 'instantanea',
        mensagemPreReserva: '   ',
      }),
    ).toEqual({
      ok: true,
      value: { modoReserva: 'instantanea', exigirBomHistorico: false },
    });
  });

  it('sanitizes mensagemPreReserva', () => {
    expect(
      validateListingConfigReserva({
        modoReserva: 'instantanea',
        mensagemPreReserva: '  Olá!\u0007  ',
      }),
    ).toEqual({
      ok: true,
      value: {
        modoReserva: 'instantanea',
        exigirBomHistorico: false,
        mensagemPreReserva: 'Olá!',
      },
    });
  });

  it('rejects oversized mensagemPreReserva', () => {
    const r = validateListingConfigReserva({
      modoReserva: 'instantanea',
      mensagemPreReserva: 'a'.repeat(CONFIG_RESERVA_MSG_MAX + 1),
    });
    expect(r.ok).toBe(false);
  });

  it('summarizes card preview', () => {
    expect(summarizeConfigReserva('instantanea')).toBe('Reserva Instantânea');
    expect(summarizeConfigReserva('aprovar')).toBe('Pedidos a serem aprovados');
    expect(summarizeConfigReserva(undefined)).toBe('Pedidos a serem aprovados');
  });
});
