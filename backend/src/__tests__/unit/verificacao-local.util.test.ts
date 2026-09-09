import {
  applyStaffVerificacaoLocalDecision,
  sanitizeVerificacaoLocalHostPatch,
} from '../../../../server/modules/acomodacoes/services/verificacao-local.util';

describe('verificacao-local.util', () => {
  it('blocks host from self-approving via metadata patch', () => {
    const next = sanitizeVerificacaoLocalHostPatch(
      { verificacaoLocal: { status: 'enviado' } },
      { status: 'aprovado', evidencias: [{ url: 'https://example.com/a.jpg' }] },
    );
    expect(next.status).toBe('enviado');
    expect(next.evidencias).toHaveLength(1);
  });

  it('allows host to submit enviado', () => {
    const next = sanitizeVerificacaoLocalHostPatch({}, { status: 'enviado', metodo: 'videos' });
    expect(next.status).toBe('enviado');
    expect(next.metodo).toBe('videos');
  });

  it('staff approve sets aprovado + revisadoEm', () => {
    const meta = applyStaffVerificacaoLocalDecision(
      { verificacaoLocal: { status: 'enviado', metodo: 'videos' } },
      'aprovar',
    );
    const ver = meta.verificacaoLocal as Record<string, unknown>;
    expect(ver.status).toBe('aprovado');
    expect(typeof ver.revisadoEm).toBe('string');
  });

  it('staff reject stores motivo', () => {
    const meta = applyStaffVerificacaoLocalDecision(
      { verificacaoLocal: { status: 'enviado' } },
      'rejeitar',
      'Fotos ilegíveis',
    );
    const ver = meta.verificacaoLocal as Record<string, unknown>;
    expect(ver.status).toBe('rejeitado');
    expect(ver.motivoRejeicao).toBe('Fotos ilegíveis');
  });
});
