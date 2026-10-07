import {
  montarUrlIndicacao,
  resolveIndicadorIdFromAuth,
} from '../../../../server/modules/propostas/mgm';

describe('mgm — montarUrlIndicacao', () => {
  it('monta URL com ref e canal', () => {
    const url = montarUrlIndicacao('http://localhost:3000', 'tok-abc', 42, 'whatsapp');
    expect(url).toBe('http://localhost:3000/proposta/tok-abc?ref=42&canal=whatsapp');
  });

  it('omite canal quando ausente', () => {
    const url = montarUrlIndicacao('http://localhost:3000/', 'tok', 1);
    expect(url).toBe('http://localhost:3000/proposta/tok?ref=1');
  });
});

describe('mgm — G-D.10 binding (family)', () => {
  it('auth id prevalece; body mismatch DENY', () => {
    expect(resolveIndicadorIdFromAuth({ authenticatedUserId: 5 }).indicadorId).toBe(5);
    expect(
      resolveIndicadorIdFromAuth({ authenticatedUserId: 5, bodyIndicadorId: 6 }).ok,
    ).toBe(false);
  });
});
