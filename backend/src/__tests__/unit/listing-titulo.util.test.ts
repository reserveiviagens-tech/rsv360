import {
  NOME_INTERNO_MAX,
  TITULO_PUBLICO_MAX,
  sanitizeNomeInterno,
  sanitizeTituloPublico,
  validateListingTitles,
} from '../../../../server/modules/acomodacoes/services/listing-titulo.util';

describe('listing-titulo.util', () => {
  it('sanitizes and truncates public title', () => {
    expect(sanitizeTituloPublico('  Casa   linda\n ')).toBe('Casa linda');
    expect(sanitizeTituloPublico('x'.repeat(60)).length).toBe(TITULO_PUBLICO_MAX);
  });

  it('requires public title when updating', () => {
    const r = validateListingTitles({
      titulo: '   ',
      updatingTitulo: true,
      updatingNomeInterno: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('titulo_obrigatorio');
  });

  it('accepts valid public + internal names', () => {
    const r = validateListingTitles({
      titulo: 'Apt no centro',
      nomeInterno: 'Torre B 203',
      updatingTitulo: true,
      updatingNomeInterno: true,
    });
    expect(r).toEqual({
      ok: true,
      titulo: 'Apt no centro',
      nomeInterno: 'Torre B 203',
    });
  });

  it('rejects oversized internal name before sanitize slice ambiguity', () => {
    const r = validateListingTitles({
      nomeInterno: 'y'.repeat(NOME_INTERNO_MAX + 5),
      updatingTitulo: false,
      updatingNomeInterno: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('nome_interno_muito_longo');
  });

  it('allows clearing internal name', () => {
    const r = validateListingTitles({
      nomeInterno: '',
      updatingTitulo: false,
      updatingNomeInterno: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.nomeInterno).toBe('');
  });

  it('sanitizeNomeInterno strips controls', () => {
    expect(sanitizeNomeInterno('Apto\u0000 12')).toBe('Apto 12');
  });
});
